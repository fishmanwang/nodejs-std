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

        network: ['config', function (cb, scope) {
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

        dbSequence: ['logger', function (cb, scope) {
            var sequence = new Sequence({
                onWarning: function (current, limit) {
                    scope.logger.warn("DB queue", current);
                }
            });
            cb(null, sequence);
        }],

        sequence: ["logger", function (cb, scope) {
            var sequence = new Sequence({
                onWarning: function (current, limit) {
                    scope.logger.warn("Main queue", current)
                }
            });
            cb(null, sequence);
        }],

        connect: ['config', 'logger', 'network', function(cb, scope) {
            var path = require('path');
            var bodyParser = require('body-parser');
            var methodOverride = require('method-override');
            var queryParser = require('express-query-int')

            scope.network.app.use(require('express-domain-middleware'));
            scope.network.app.use(bodyParser.urlencoded({extended: true, parameterLimit: 5000}));
            scope.network.app.use(bodyParser.json());
            scope.network.app.use(methodOverride());

        }]


    });
});
























