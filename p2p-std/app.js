var program = require('commander');
var Logger = require('./logger');
var appConfig = require('./config.json');
var async = require('async');
var path = require('path');
var z_schema = require('z-schema');
var Sequence = require('./helper/sequence');

process.stdin.resume();

program
    .version('1.0.0')
    .option('-c, --config <path>', 'Config file path')
    .option('-p, --port <port>', 'Listening port number')
    .option('-a, --address <ip>', 'Listening host name or ip')
    .option('-x, --peers [peers...]', 'Peers list')
    .option('-l, --log<leve>', 'Log level')
    .parse(process.argv);

if (typeof(gc) !== 'uncefined') {
    setInterval(function () {
        gc();
    }, 60000);
}

if (program.config) {
    appConfig = require(path.resolve(process.cwd(), program.config));
}

if (program.port) {
    appConfig.port = program.port;
}

if (program.address) {
    appConfig.address = program.address;
}

if (program.peers) {
    if (typeof(program.peers) === 'string') {
        appConfig.peers.list = program.peers.split(',').map(function (peer) {
            peer = peer.split(':');
            return {
                ip: peer.shift(),
                port: peer.shift() || appConfig.port
            }
        });
    } else {
        appConfig.peers.list = [];
    }
}

if (program.log) {
    appConfig.consoleLogLevel = program.log;
}

process.on('uncaughtException', function (err) {
    // handle the error safely
    logger.fatal('System error', {message: err.message, stack: err.stack});
    process.emit('cleanup');
});

var config = {
    "db": program.blockchain || "./blockchain.db",
    "modules": {
        "transport": "./modules/transport.js",
        "system": "./modules/system.js",
        "peer": "./modules/peer.js",
        "sql": "./modules/sql.js"
    }
};

var logger = new Logger({echo: appConfig.consoleLogLevel, errorLevel: appConfig.fileLogLevel});

var d = require('domain').create();
d.on('error', function (err) {
    logger.fatal('Domain master', {message: err.message, stack: err.stack});
    process.exit(0);
});
d.run(function () {
    var modules = [];
    async.auto({
        config: function (cb) {
            cb(null, appConfig);
        },

        logger: function (cb) {
            cb(null, logger);
        },

        build: function (cb) {
            cb(null, "");
        },

        schema: function (cb) {
            cb(null, new z_schema());
        },

        network: ['config', function (scope, cb) {
            var express = require('express');
            var app = express();
            var server = require('http').createServer(app);
            var io = require('socket.io')(server);

            cb(null, {
                express: express,
                app: app,
                server: server,
                io: io,
                https: undefined,
                https: undefined
            });

        }],

        dbSequence: ['logger', function (scope, cb) {
            var sequence = new Sequence({
                onWarning: function (current, limit) {
                    scope.logger.warn("DB queue", current);
                }
            });
            cb(null, sequence);
        }],

        sequence: ["logger", function (scope, cb) {
            var sequence = new Sequence({
                onWarning: function (current, limit) {
                    scope.logger.warn("Main queue", current)
                }
            });
            cb(null, sequence);
        }],

        connect: ['config', 'logger', 'network', function (scope, cb) {
            var bodyParser = require('body-parser');
            var methodOverride = require('method-override');
            var queryParser = require('express-query-int')

            scope.network.app.use(require('express-domain-middleware'));
            scope.network.app.use(bodyParser.urlencoded({extended: true, parameterLimit: 5000}));
            scope.network.app.use(bodyParser.json());
            scope.network.app.use(methodOverride());

            var ignore = ['id', 'name', 'lastBlockId', 'blockId', 'username', 'transactionId', 'address', 'recipientId', 'senderId', 'senderUsername', 'recipientUsername', 'previousBlock'];
            scope.network.app.use(queryParser({
                parser: function (value, radix, name) {
                    if (ignore.indexOf(name) >= 0) {
                        return value;
                    }

                    if (isNaN(value) || parseInt(value) != value || isNaN(parseInt(value, radix))) {
                        return value;
                    }

                    return parseInt(value);
                }
            }));

            scope.network.app.use(require('./helper/zscheme-express')(scope.scheme));

            scope.network.app.use(function (req, res, next) {
                var parts = req.url.split('/');
                var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                if (parts.length > 1) {
                    if (parts[1] == 'api') {
                        if (score.config.api.access.withList.length > 0) {
                            if (scope.config.api.access.whiteList.indexOf(ip) < 0) {
                                res.sendStatus(403);
                            } else {
                                next();
                            }
                        } else {
                            next()
                        }
                    } else if (parts[1] == 'peer') {
                        if (scope.config.peers.blackList.length > 0) {
                            if (scope.config.peers.blackList.indexOf(ip) >= 0) {
                                res.sendStatus(403);
                            } else {
                                next();
                            }
                        } else {
                            next();
                        }
                    } else {
                        next();
                    }
                } else {
                    next()
                }
            });

            scope.network.server.listen(scope.config.port, scope.config.address, function (err) {
                scope.logger.log('P2P started: ' + scope.config.address + ":" + scope.config.port);

                if (!err) {
                    cb(null, scope.network);
                } else {
                    cb(err, scope.network)
                }
            });
        }],

        bus: function (cb) {
            var changeCase = require('change-case');
            var bus = function() {
                this.message = function() {
                    var args = [];
                    Array.prototype.push.apply(args, arguments);
                    var topic = args.shift();
                    modules.forEach(function(module) {
                       var eventName = 'on' + changeCase.pascalCase(topic);
                       if (typeof(module[eventName]) == 'function'){
                           module[eventName].apply(module[eventName], args);
                       }
                    });
                }
            };
            cb(null, new bus)
        },

        dbLite: function (cb) {
            var dbLite = require('./helper/dbLite');
            dbLite.connect(config.db, cb);
        },

        modules: ['network', 'connect', 'config', 'logger', 'bus', 'sequence', 'dbSequence', 'dbLite', function(scope, cb) {
            var tasks = {};
            Object.keys(config.modules).forEach(function(name) {
               tasks[name] = function(cb) {
                   var d = require('domain').create();

                   d.on('error', function(err) {
                       scope.logger.fatal('Domain ' + name, {message: err.message, stack: err.stack})
                   });

                   d.run(function() {
                      logger.debug('Loading module', name);
                      var Klass = require(config.modules[name]);
                      var obj = new Klass(cb, scope);
                      modules.push(obj);
                   });
               }
            });
            async.parallel(tasks, function(err, rs) {
                cb(err, rs);
            })
        }],

        ready: ['modules', 'bus', function(scope, cb) {
            scope.bus.message('bind', scope.modules);
            cb();
        }]
    }, function(err, scope) {
        if (err) {
            logger.fatal(err);
        } else {
            scope.logger.info('Modules ready adn launched');

            process.once('cleanup', function() {
                scope.logger.info('Cleaning up...');
                async.eachSeries(modules, function(module, cb) {
                   if (typeof(module.cleanup) == 'function') {
                       module.cleanup(cb);
                   } else {
                       setImmediate(cb);
                   }
                }, function(err) {
                    if (err) {
                        scope.logger.error(err);
                    } else {
                        scope.logger.info('Cleaned up successfully');
                    }
                    process.exit(1);
                });
            });

            process.once('SIGTERM', function() {
                process.emit('cleanup');
            });

            process.once('exit', function() {
                process.emit('cleanup');
            })

            process.once('SIGINT', function () {
                process.emit('cleanup');
            });
        }
    });
});
























