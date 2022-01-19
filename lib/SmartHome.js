/**
 * NodeRED Google SmartHome
 * Copyright (C) 2021 Michael Jacobsen.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

const http          = require('http');
const https         = require('https');
const express       = require('express');
const stoppable     = require('stoppable');
const helmet        = require('helmet');
const morgan        = require('morgan');
const cors          = require('cors');
const fs            = require('fs');
const events        = require('events');
const dnssd         = require('dnssd');

const Aggregation   = require('./Aggregation.js');
const Auth          = require('./Auth.js');
const Devices       = require('./Devices.js');
const HttpAuth      = require('./HttpAuth.js');
const HttpActions   = require('./HttpActions.js');

/******************************************************************************************************************
 * GoogleSmartHome
 *
 */
class GoogleSmartHome extends Aggregation(Auth, Devices, HttpAuth, HttpActions) {
    constructor(mgmtNode, nodeId, userDir, httpNodeRoot, useGoogleLogin, googleClientId, emails, username, password, accessTokenDuration, usehttpnoderoot,
        httpPath, httpsPort, ssloffload, publicKey, privateKey, jwtkey, clientid, 
        clientsecret, reportStateInterval, requestSyncDelay, setStateDelay, debug, debug_function) {
        super();

        this._nodeId                = nodeId;
        this._mgmtNode              = mgmtNode;
        this._reportStateTimer      = null;
        this._reportStateInterval   = reportStateInterval;  // minutes
        this._httpNodeRoot          = httpNodeRoot;
        this._httpPath              = this.Path_join('/', httpPath || '');
        this._httpsPort             = httpsPort;
        this._sslOffload            = ssloffload;
        this._publicKey             = publicKey;
        this._privateKey            = privateKey;
        this._jwtKey                = jwtkey;
        this._requestSyncDelay      = requestSyncDelay * 1000;
        this._setStateDelay         = setStateDelay * 1000;
        this._debug                 = debug;
        this._userDir               = userDir;
        this._httpServerRunning     = false;
        this._dnssdAdRunning         = false;
        this._syncScheduled         = false;
        this._getStateScheduled     = false;
        this._httpPath              = this.Path_join((usehttpnoderoot ? this._httpNodeRoot || '/' : '/'), this._httpPath);
        this.debug_function         = debug_function;

        this.debug('GoogleSmartHome.constructor');
        this.loadAuth(nodeId, userDir, username || 'dummy');
        this.setClientIdSecret(clientid, clientsecret);
        if (useGoogleLogin) {
            this.setGoogleClientIdAndEmails(googleClientId, emails);
        } else {
            this.setUsernamePassword(username, password);
        }
        this.setAccessTokenDuration(accessTokenDuration);

        this.emitter = new events.EventEmitter();

        if (httpsPort > 0) {
            // create express middleware
            this.app = express();
            this.app.use(helmet());
            this.app.use(cors());
            this.app.use(morgan('dev'));
            this.app.use(express.json());
            this.app.use(express.urlencoded({extended: true}));
            this.app.set('trust proxy', 1); // trust first proxy

            // frontend UI
            this.app.set('jsonp callback name', 'cid');

            this.httpAuthRegister(this._httpPath, this.app);        // login and oauth http interface
            this.httpActionsRegister(this._httpPath, this.app);     // actual SmartHome http interface
        }
    }
    //
    //
    //
    Path_join() {
        let full_path = '';
        for (var i = 0; i < arguments.length; i++) {
            let ipath=arguments[i];
            let fpe = full_path.endsWith('/');
            let ips = ipath.startsWith('/');
            if (fpe && ips) {
                full_path += ipath.substring(1);
            } else if (!fpe && !ips) {
                full_path += '/' + ipath;
            } else {
                full_path += ipath;
            }
        }
        return full_path;
    }
    //
    //
    //
    GetRouteType(route) {
        if (route) {
            if (route.route.methods['get'] && route.route.methods['post']) return "all";
            if (route.route.methods['get']) return "get";
            if (route.route.methods['post']) return "post";
            if (route.route.methods['options']) return "options";
        }
        return 'unknown';
    }
    //
    //
    //
    UnregisterUrl(REDapp) {
        let me = this;
        if (this._httpNodeRoot !== false && REDapp._router) {
            me.debug("SmartHome:UnregisterUrl(): use the Node-RED server port, path " + this._httpPath);
            var get_urls = [me.Path_join(me._httpPath, 'oauth'), me.Path_join(me._httpPath, 'check')];
            var post_urls = [me.Path_join(me._httpPath, 'oauth'), me.Path_join(me._httpPath, 'smarthome')];
            var options_urls = [me.Path_join(me._httpPath, 'smarthome')];
            var all_urls = [me.Path_join(me._httpPath, 'token')];

            let to_remove = [];
            REDapp._router.stack.forEach(function (route, i/*, routes*/) {
                if (route.route && (
                    (route.route.methods['get'] && get_urls.includes(route.route.path)) ||
                    (route.route.methods['post'] && post_urls.includes(route.route.path)) ||
                    (route.route.methods['options'] && options_urls.includes(route.route.path)) ||
                    (all_urls.includes(route.route.path))
                )) {
                    me.debug('SmartHome:Stop(): removing url: ' + route.route.path + " registred for " + me.GetRouteType(route));
                    to_remove.unshift(i);
                    // routes.splice(i, 1);
                }
            });
            to_remove.forEach(i => REDapp._router.stack.splice(i, 1));
            REDapp._router.stack.forEach(function (route) {
                if (route.route) me.debug('SmartHome:Stop(): remaining url: ' + route.route.path + " registred for " + me.GetRouteType(route));
            });
        }
    }
    //
    //
    //
    Start(REDapp, REDserver) {
        try {
            const graceMilliseconds = 500;
            let me                  = this;

            if (this._jwtKey) {
                this.setJwtKey(this._jwtKey, this._userDir);     // will throw if file cannot be read

                if (this._reportStateInterval > 0) {
                
                    this._reportStateTimer = setInterval(function() { 
                        let states = me.getStates();

                        if (states) {
                            me.reportState(undefined, states);
                        }
                    }, this._reportStateInterval * 60 * 1000);
                }
            }

            if (this._httpsPort > 0) {
                if (this._sslOffload) {
                    me.debug('SmartHome:Start(listen): using external SSL offload');

                    // create our HTTP server
                    this.httpServer = stoppable(http.createServer(this.app), graceMilliseconds);
                } else {
                    me.debug('SmartHome:Start(listen): using internal SSL');

                    // set SSL certificate
                    const httpsOptions = {
                        key  : fs.readFileSync(this._privateKey),
                        cert : fs.readFileSync(this._publicKey)
                    };

                    // create our HTTPS server
                    this.httpServer = stoppable(https.createServer(httpsOptions, this.app), graceMilliseconds);
                }

                // start server
                this.httpServer.listen(this._httpsPort, () => {
                    me._httpServerRunning = true;

                    const host = me.httpServer.address().address;
                    const port = me.httpServer.address().port;

                    me.debug('SmartHome:Start(listen): listening at ' + host + ':' + port);

                    process.nextTick(() => {
                        me.emitter.emit('server', 'start', me._httpsPort);
                    });
                });

                this.httpServer.on('error', function (err) {
                    me._mgmtNode.error('SmartHome:Start(): err:' + err);

                    process.nextTick(() => {
                        me.emitter.emit('server', 'error', err);
                    });
                });

                me.debug('SmartHome:Start(): registered routes:');
                this.app._router.stack.forEach((r) => {
                    if (r.route && r.route.path) {
                        me.debug('SmartHome:Start(): ' + r.route.path);
                    }
                });

                this.dnssdAd = dnssd.createAdvertisement(dnssd.tcp('node-red-google-smarthome', this._httpsPort, {txtRecord: {clientId: this._nodeId}}))
                this.dnssdAd.start();
                this._dnssdAdRunning = true;

                this.dnssdAd.on('error', function (err) {
                    me._mgmtNode.error('SmartHome:Start(): dnssdAd: err:' + err);

                    process.nextTick(() => {
                        me.emitter.emit('dnssdad', 'error', err);
                    });
                });
            } else {
                if (this._httpNodeRoot !== false) {
                    me.UnregisterUrl(REDapp);
                    me.debug("SmartHome:Start(): use the Node-RED server port, path " + this._httpPath);
                    this.httpAuthRegister(this._httpPath, REDapp);        // login and oauth http interface
                    this.httpActionsRegister(this._httpPath, REDapp);     // actual SmartHome http interface
                    REDapp._router.stack.forEach((r) => {
                        if (r.route && r.route.path && r.route.path.startsWith(this._httpPath)) {
                            me.debug('SmartHome:Start(): url ' + r.route.path + " registred for " + me.GetRouteType(r));
                        }
                    });

                    this.dnssdAd = dnssd.createAdvertisement(dnssd.tcp('node-red-google-smarthome', REDserver.address().port, {txtRecord: {clientId: this._nodeId}}))
                    this.dnssdAd.start();
                    this._dnssdAdRunning = true;

                    this.dnssdAd.on('error', function (err) {
                        me._mgmtNode.error('SmartHome:Start(): dnssdAd: err:' + err);

                        process.nextTick(() => {
                            me.emitter.emit('dnssdad', 'error', err);
                        });
                    });
                }
            }
        } catch (err) {
            return err;
        }

        return true;
    }
    //
    //
    //
    Stop(REDapp, done) {
        let me = this;
        if (this._reportStateTimer !== null) {
            clearTimeout(this._reportStateTimer);
            this._reportStateTimer  = null;
        }

        if (this._dnssdAdRunning) {
            this._dnssdAdRunning = false;
            
            this.dnssdAd.stop();
        }

        if (this._httpsPort > 0) {
            if (this._httpServerRunning) {
                this._httpServerRunning = false;

                this.httpServer.stop(function() {
                    process.nextTick(() => {
                        me.emitter.emit('server', 'stop', 0);
                    });

                    if (typeof done === 'function') {
                        done();
                    }
                });

                setImmediate(function(){
                    me.httpServer.emit('close');
                });
            } else {
                process.nextTick(() => {
                    me.emitter.emit('server', 'stop', 0);
                });

                if (typeof done === 'function') {
                    done();
                }
            }
        } else {
            me.UnregisterUrl(REDapp);
            process.nextTick(() => {
                me.emitter.emit('server', 'stop', 0);
            });

            if (typeof done === 'function') {
                done();
            }
        }
    }
    //
    //
    //
    Restart(REDapp, REDserver) {
        let me = this;

        this.Stop(REDapp, function() {
            me.debug('SmartHome:Restart(): Stop done');

            me.Start(REDapp, REDserver);

            me.debug('SmartHome:Restart(): Start done');
        });
    }

    getCustomData() {
        return {
            httpPort: this._httpsPort,
            httpPathPrefix: this.Path_join(httpRoot, ""),
            clientId: this._nodeId
        }
    }
    //
    //
    //
    ReportAllStates() {
        let states = this.getStates();

        if (states) {
            this.reportState(undefined, states);
        }

    }
    //
    //
    //
    RequestSync() {
        this.requestSync();
    }
    //
    //
    //
    ScheduleRequestSync() {
        const me = this;
        if (me._requestSyncDelay && !me._syncScheduled) {
            me._syncScheduled = true;
            setTimeout(() => {
                me._syncScheduled = false;
                me.requestSync();
            }, me._requestSyncDelay);
        }
    }
    //
    //
    //
    ScheduleGetState() {
        const me = this;
        if (me._setStateDelay && !me._getStateScheduled) {
            me._getStateScheduled = true;
            setTimeout(() => {
                me._getStateScheduled = false;
                Object.keys(me._mgmtNode.mgmtNodes).forEach(key => me._mgmtNode.mgmtNodes[key].sendSetState());
            }, me._setStateDelay);
        }
    }
    //
    //
    //
    IsHttpServerRunning() {
        return this._httpServerRunning || this._httpsPort <= 0;
    }
    //
    //
    //
    debug(data) {
        this.debug_function(data);
    }
}

module.exports = GoogleSmartHome;
