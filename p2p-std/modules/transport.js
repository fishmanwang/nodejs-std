var Router = require('../helper/router'),
    async = require('async'),
    request = require('request'),
    ip = require('ip'),
    util = require('util'),
    _ = require('underscore'),
    extend = require('extend'),
    crypto = require('crypto'),
    bignum = require('../helper/bignum'),
    sandboxHelper = require('../helper/sandbox');

// private fields
var modules, library, self, privated = {}, shared = {};

privated.headers = {};
privated.loaded = true;
privated.messages = {};

// Constructor
function Transport(cb, scope) {
    library = scope;
    self = this;
    self.__private = privated;
    privated.attachApi();

    setImmediate(cb, null, self);
}

// private methods
privated.attachApi = function () {
    var router = new Router();

    router.use(function (req, res, next) {
        if (modules && privated.loaded) return next();
        res.status(500).send({success: false, error: "Block chain is loading"});
    });

    router.use(function (req, res, next) {
        var peerIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        if (peerIp == '127.0.0.1') {
            return next();
        }

        if (!peerIp) {
            return res.status(500).send({success: false, error: "wrong header data"});
        }

        req.headers.port = parseInt(req.headers.port);
        req.headers['share-port'] = parseInt(req.headers['share-port']);

        req.sanitize(req.headers, {
            type: 'object',
            properties: {
                port: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 65535
                },
                os: {
                    type: 'string',
                    maxLength: 64
                },
                'share-port': {
                    type: 'integer',
                    minimum: 0,
                    maximum: 1
                },
                'version': {
                    type: 'string',
                    maxLength: 11
                }
            },
            required: ["port", 'share-port', 'version']
        }, function (err, report, headers) {
            if (err) return next(err);
            if (!report.isValid) return res.status(500).send({status: false, error: report.issues})

            var peer = {
                ip: ip.toLong(peerIp),
                port: headers.port,
                state: 2,
                os: headers.os,
                sharePort: Number(headers['share-port']),
                version: headers.version
            };

            if (req.body && req.body.dappid) {
                peer.dappid = req.body.dappid;
            }

            if (peer.port > 0 && peer.port <= 65535 && peer.version == library.config.version) {
                modules.peer.update(peer);
            }

            next();
        });
    });

    router.get('/list', function (req, res) {
        res.set(privated.headers);
        modules.peer.list({limit: 100}, function (err, peers) {
            return res.status(200).json({peers: !err ? peers : []});
        })
    });

    router.use(function (req, res, next) {
        res.status(500).send({success: false, error: "API endpoint not found"});
    });

    library.network.app.use('/peer', router);

    library.network.app.use(function (err, req, res, next) {
        if (!err) return next();
        library.logger.error(req.url, err.stack);
        res.status(500).send({success: false, error: err.toString()});
    });

};

Transport.prototype.broadcast = function (config, options, cb) {
    config.limit = config.limit || 1;
    modules.peer.list(config, function (err, peers) {
        if (!err) {
            async.eachLimit(peers, 3, function (peer, cb) {
                self.getFromPeer(peer, options);
                setImmediate(cb);
            }, function () {
                cb && cb(null, {body: null, peer: peers})
            });
        } else {
            cb && setImmediate(cb, err);
        }
    });
};

Transport.prototype.getFromRandomPeer = function (config, options, cb) {
    if (typeof(options) == 'function') {
        cb = options;
        options = config;
        config = {};
    }
    config.limit = 1;
    async.retry(20, function (cb) {
        modules.peer.list(config, function (err, peers) {
            if (!err && peers.length) {
                var peer = peers[0];
                self.getFromPeer(peer, options, cb);
            } else {
                return cb(err || "No peers in db");
            }
        });
    }, function (err, rs) {
        cb(err, rs);
    });
};

/**
 * Send request to selected peer
 * @param peer
 * @param options
 * @param cb
 */
Transport.prototype.getFromPeer = function (peer, options, cb) {
    var url;
    if (options.api) {
        url = '/peer' + options.api;
    } else {
        url = options.url;
    }

    var req = {
        url: 'http://' + ip.fromLong(peer.ip) + ":" + peer.port + url,
        method: options.method,
        json: true,
        headers: _.extend({}, privated.headers, options.headers),
        timeout: library.config.peers.options.timeout
    };

    if (Object.prototype.toString.call(options.data) === '[object Object]' || util.isArray(options.data)) {
        req.json = options.data;
    } else {
        req.body = options.data;
    }

    return request(req, function (err, response, body) {
        if (err || response.statusCode != 200) {
            library.logger.debug('Request', {
                url: req.url,
                statusCode: response ? response.statusCode : 'unknown',
                err: err
            });

            if (peer) {
                if (err && (err.code == 'ETIMEDOUT' || err.code == "ESOCKETTIMEDOUT" || err.code == "ECONNREFUSED")) {
                    modules.peer.remove(peer.ip, peer.port, function (err) {
                        if (!err) {
                            library.logger.info('Removing peer ' + req.method + ' ' + req.url);
                        }
                    });
                } else {
                    if (!options.not_ban) {
                        modules.peer.state(peer.ip, peer.port, 0, 600, function (err) {
                            if (!err) {
                                // 禁止10分钟
                                library.logger.info('Ban 10 min ' + req.method + ' ' + req.url);
                            }
                        });
                    }
                }
            }
            cb && cb(err || ('request status code ' + response.statusCode));
            return;
        }

        response.headers.port = parseInt(response.headers.port);
        response.headers['share-port'] = parseInt(response.headers['share-port']);

        var report = library.scheme.validate(response.headers, {
            type: 'object',
            properties: {
                os: {
                    type: "string",
                    maxLength: 64
                },
                port: {
                    type: "integer",
                    minimum: 1,
                    maximum: 65535
                },
                'share-port': {
                    type: "integer",
                    minimum: 0,
                    maximum: 1
                },
                version: {
                    type: "string",
                    maxLength: 11
                }
            },
            required: ['port', 'share-port', 'version']
        });

        if (!report) {
            return cb && cb(null, {body: body, peer: peer});
        }

        var port = response.headers.port;
        if (port > 0 && port <= 65535 && response.headers['version'] == library.config.version) {
            modules.peer.update({
                ip: peer.ip,
                port: port,
                state: 2,
                os: response.headers['os'],
                sharePort: Number(!!response.headers['share-port']),
                version: response.headers['version']
            });
        }

        cb && cb(null, {body: body, peer: peer});

    });

};

Transport.prototype.sandboxApi = function (call, args, cb) {
    sandboxHelper.callMethod(shared, call, args, cb);
}

Transport.prototype.onBind = function (scope) {
    modules = scope;

    privated.headers = {
        os: modules.system.getOS(),
        version: modules.system.getVersion(),
        port: modules.system.getPort(),
        'share-port': modules.system.getSharePort()
    }
};

Transport.prototype.cleanup = function (cb) {
    privated.loaded = false;
    cb();
};

// Export
module.exports = Transport;