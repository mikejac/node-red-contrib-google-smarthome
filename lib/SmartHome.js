/**
 * node-red-contrib-google-smarthome
 * Copyright (C) 2024 Michael Jacobsen and others.
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
const path          = require('path');
const events        = require('events');
const dnssd         = require('@gravitysoftware/dnssd');
const udp           = require('dgram');

const Auth          = require('./Auth.js');
const Devices       = require('./Devices.js');
const HttpAuth      = require('./HttpAuth.js');
const HttpActions   = require('./HttpActions.js');

/******************************************************************************************************************
 * GoogleSmartHome
 *
 */
class GoogleSmartHome {
    constructor(mgmtNode, nodeId, userDir, httpNodeRoot, useGoogleLogin, googleClientId, emails, username, password, accessTokenDuration, usehttpnoderoot,
        httpPath, httpPort, localScanType, localScanPort, httpLocalPort, nodeRedUsesHttps, ssloffload, publicKey, privateKey, jwtkeyFile, clientid,
        clientsecret, reportStateInterval, requestSyncDelay, setStateDelay, debug, debug_function, error_function) {

        this.auth                   = new Auth(this);
        this.devices                = new Devices(this);
        this.httpActions            = new HttpActions(this);
        this.httpAuth               = new HttpAuth(this);

        this._nodeId                = nodeId;
        this._mgmtNode              = mgmtNode;
        this._reportStateTimer      = null;
        this._reportStateInterval   = reportStateInterval;  // minutes
        this._httpNodeRoot          = httpNodeRoot;
        this._httpPath              = this.Path_join('/', httpPath || '');
        this._httpPort              = httpPort;
        this._localScanType         = localScanType || '';
        this._localScanPort         = localScanPort;
        this._httpLocalPort         = httpLocalPort;
        this._sslOffload            = ssloffload;
        this._publicKey             = publicKey;
        this._privateKey            = privateKey;
        this._jwtKeyFile            = jwtkeyFile;
        this._requestSyncDelay      = requestSyncDelay * 1000;
        this._setStateDelay         = setStateDelay * 1000;
        this._debug                 = debug;
        this._userDir               = userDir;
        this._httpServerRunning     = false;
        this._dnssdAdRunning        = false;
        this._syncScheduled         = false;
        this._getStateScheduled     = false;
        this._httpLocalPath         = this.Path_join(this._httpNodeRoot || '/', this._httpPath);
        this._httpPath              = this.Path_join((usehttpnoderoot ? this._httpNodeRoot || '/' : '/'), this._httpPath);
        this.debug_function         = debug_function;
        this.error_function         = error_function;
        this._localScanPacket       = 'node-red-contrib-google-smarthome';
        this._localUDPServer        = null;
        this._localDiscoveryPort    = null;
        this._localExecutionPort    = null;
        this.dnssdAd                = null;

        if (nodeRedUsesHttps && httpLocalPort <= 0)
        {
            error_function("GoogleSmartHome: Node-RED is using HTTPS but no local http port was defined, local execution will fail.");
        }

        this.debug('GoogleSmartHome.constructor');
        this.auth.loadAuthStorage(nodeId, userDir);
        this.auth.setClientIdSecret(clientid, clientsecret);
        if (useGoogleLogin) {
            this.auth.setGoogleClientIdAndEmails(googleClientId, emails);
        } else {
            this.auth.setUsernamePassword(username, password);
        }
        this.auth.setAccessTokenDuration(accessTokenDuration);

        this.emitter = new events.EventEmitter();

        // httpNodeRoot is the root url for nodes that provide HTTP endpoints. If set to false, all node-based HTTP endpoints are disabled. 
        if (this._httpNodeRoot !== false) {
            if (httpPort > 0) {
                // create express middleware
                this.app = express();
                this.app.use(helmet({ 
                    // opener policy required for Google Sign-In popup
                    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
                }));
                this.app.use(cors());
                if(this._debug)
                    this.app.use(morgan('dev'));
                this.app.use(express.json());
                this.app.use(express.urlencoded({extended: true}));
                this.app.set('trust proxy', 1); // trust first proxy

                // frontend UI
                this.app.set('jsonp callback name', 'cid');

                this.httpAuth.httpAuthRegister(this._httpPath, this.app);        // login and oauth http interface
                this.httpActions.httpActionsRegister(this._httpPath, this.app);     // actual SmartHome http interface
            }
            if (httpLocalPort > 0) {
                // create express middleware
                this.localApp = express();
                this.localApp.use(helmet());
                this.localApp.use(cors());
                if(this._debug)
                    this.localApp.use(morgan('dev'));
                this.localApp.use(express.json());
                this.localApp.use(express.urlencoded({extended: true}));
                this.localApp.set('trust proxy', 1); // trust first proxy

                // frontend UI
                this.localApp.set('jsonp callback name', 'cid');

                this.httpActions.httpLocalActionsRegister(this._httpLocalPath, this.localApp);
            }
        }
    }
    //
    //
    //
    Path_join() {
        let full_path = '';
        for (let i = 0; i < arguments.length; i++) {
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
        const me = this;

        if (REDapp._router) {
            me.debug("SmartHome:UnregisterUrl(): use the Node-RED server port, path '" + this._httpPath + "' local path '" + this._httpLocalPath + "'");
            let get_urls = [me.Path_join(me._httpPath, 'oauth'), me.Path_join(me._httpPath, 'check')];
            let post_urls = [me.Path_join(me._httpPath, 'oauth'), me.Path_join(me._httpPath, 'smarthome')];
            let options_urls = [me.Path_join(me._httpPath, 'smarthome')];
            let all_urls = [me.Path_join(me._httpPath, 'token')];

            let to_remove = [];
            REDapp._router.stack.forEach(function (route, i/*, routes*/) {
                if (route.route && (
                    (route.route.methods['get'] && get_urls.includes(route.route.path)) ||
                    (route.route.methods['post'] && post_urls.includes(route.route.path)) ||
                    (route.route.methods['options'] && options_urls.includes(route.route.path)) ||
                    (all_urls.includes(route.route.path))
                )) {
                    me.debug('SmartHome:Stop(): removing url: ' + route.route.path + " registered for " + me.GetRouteType(route));
                    to_remove.unshift(i);
                    // routes.splice(i, 1);
                }
            });
            to_remove.forEach(i => REDapp._router.stack.splice(i, 1));
            REDapp._router.stack.forEach(function (route) {
                if (route.route) me.debug('SmartHome:Stop(): remaining url: ' + route.route.path + " registered for " + me.GetRouteType(route));
            });
        }
    }
    //
    //
    //
    StartDeviceScanServer() {
        if (this._localScanType === "UDP") {
            this.StartUDPDeviceScanServer();
        } else if (this._localScanType === "MDNS") {
            this.StartMDNSAdvertisement();
        }
    }
    //
    //
    //
    StopDeviceScanServer() {
        this.StopUDPDeviceScanServer();
        this.StopMDNSAdvertisement();
    }
    //
    //
    //
    StopUDPDeviceScanServer() {
        if (this._localUDPServer !== null) {
            this._localUDPServer.close();
            this._localUDPServer = null;
        }
    }
    //
    //
    //
    StartUDPDeviceScanServer() {
        const me = this;
        me.debug('Starting sevice Scan UDP server on port ' + me._localDiscoveryPort);

        me.StopUDPDeviceScanServer();

        me._localUDPServer = udp.createSocket('udp4');

        me._localUDPServer.on('error',function(error){
            me.debug('Server UDP Error: ' + error);
            me.StopUDPDeviceScanServer();
        });
        
        me._localUDPServer.on('message',function(msg,info){
            const data = msg.toString();
            // me.debug('Sevice Scan UDP server received ' + msg.length + ' bytes from ' + info.address + ':' + info.port );
          
            if (data === me._localScanPacket) {
                //  
                const sync_res = Buffer.from(JSON.stringify({clientId: me._nodeId}), 'utf8');
                // const sync_res = JSON.stringify({clientId: me._nodeId});
                // me.debug("Sending response message " + sync_res);

                me._localUDPServer.send(sync_res, info.port, info.address, function(error){
                    if(error){
                        me.debug("Sevice Scan UDP server error sending message " + error);
                    // }else{
                    //    me.debug('Sevice Scan UDP server data sent');
                    }
                });
            } else {
                // me.debug('Sevice Scan UDP server data received : ' + data);
                me.debug("Sevice Scan UDP server error wrong message received!");
            }
        });

        me._localUDPServer.on('listening',function(){
            const address = me._localUDPServer.address();
            const port = address.port;
            // const family = address.family;
            const ipaddr = address.address;
            me.debug('Sevice Scan UDP server listening on: ' + ipaddr + ':' + port);
            // me.debug('Sevice Scan UDP server family: ' + family);
        });
          
        me._localUDPServer.on('close',function(){
            me.debug('Sevice Scan UDP server closed !');
            me._localUDPServer = null;
        });
          
        me._localUDPServer.bind(me._localDiscoveryPort);
    }
    //
    //
    //
    StopMDNSAdvertisement(){
        if (this._dnssdAdRunning) {
            this._dnssdAdRunning = false;
            
            this.dnssdAd.stop();
            this.dnssdAd = null;
        }
    }
    //
    //
    //
    StartMDNSAdvertisement() {
        const me = this;
        this.StopMDNSAdvertisement();

        this.dnssdAd = dnssd.Advertisement(dnssd.tcp('nodered-google'), this._localDiscoveryPort, {txt: {clientId: this._nodeId}})
        this.dnssdAd.start();
        this._dnssdAdRunning = true;

        me.debug('SmartHome:Start(): dnssd-ad: port:' + this._localDiscoveryPort);
        this.dnssdAd.on('error', function (err) {
            me.error('SmartHome:Start(): dnssd-ad: err:' + err);
        });
    }
    //
    //
    //
    Start(REDapp, REDserver) {
        // httpNodeRoot is the root url for nodes that provide HTTP endpoints. If set to false, all node-based HTTP endpoints are disabled. 
        if (this._httpNodeRoot === false) return;

        this._localDiscoveryPort    = this._localScanPort || this._httpLocalPort || REDserver.address().port;
        this._localExecutionPort    = this._httpLocalPort || REDserver.address().port;

        try {
            const graceMilliseconds = 500;
            const me                = this;

            if (this._jwtKeyFile) {
                this.auth.setJwtKey(this._jwtKeyFile, this._userDir);     // will throw if file cannot be read

                if (this._reportStateInterval > 0) {
                
                    this._reportStateTimer = setInterval(function() { 
                        let states = me.devices.getStates();

                        if (states) {
                            me.httpActions.reportState(undefined, states);
                        }
                    }, this._reportStateInterval * 60 * 1000);
                }
            }

            if (this._httpPort > 0) {
                if (this._sslOffload) {
                    me.debug('SmartHome:Start(listen): using external SSL offload');

                    // create our HTTP server
                    this.httpServer = stoppable(http.createServer(this.app), graceMilliseconds);
                } else {
                    me.debug('SmartHome:Start(listen): using internal SSL');

                    let httpsOptions = {};

                    try {
                        if(!this._privateKey) {
                            return 'No private SSL key file specified in configuration.';
                        }

                        httpsOptions.key = fs.readFileSync(this._privateKey)
                    } catch (error) {
                        return `Error while loading private SSL key from file "${this._privateKey}" (${error})`;
                    }

                    try {
                        if(!this._publicKey) {
                            return 'No public SSL key specified in configuration.';
                        }

                        httpsOptions.cert = fs.readFileSync(this._publicKey)
                    } catch (error) {
                        return `Error while loading public SSL key from file "${this._publicKey}" (${error})`;
                    }

                    // create our HTTPS server
                    this.httpServer = stoppable(https.createServer(httpsOptions, this.app), graceMilliseconds);

                    // update server if certificate file changes on disk
                    // timeout is used to give certbot enough time to renew private and public key
                    let waitForRenewalTimeout;
                    fs.watch(this._publicKey, () => {
                        me.debug('SmartHome:Start(listen): Certificate file change detected. Updating HTTPS server in 30 seconds.');
                        clearTimeout(waitForRenewalTimeout);
                        waitForRenewalTimeout = setTimeout(() => {
                            let context = {
                                key: fs.readFileSync(this._privateKey),
                                cert: fs.readFileSync(this._publicKey)
                            }
                            this.httpServer.setSecureContext(context);
                            me.debug('SmartHome:Start(listen): HTTPS server updated after certificate file change');
                        }, 30000);
                    });
                }

                // start server
                this.httpServer.listen(this._httpPort, () => {
                    me._httpServerRunning = true;

                    const host = me.httpServer.address().address;
                    const port = me.httpServer.address().port;

                    me.debug('SmartHome:Start(listen): listening at ' + host + ':' + port);

                    process.nextTick(() => {
                        me.emitter.emit('server', 'start', me._httpPort);
                    });
                });

                this.httpServer.on('error', function (err) {
                    me.error('SmartHome:Start(): err:' + err);

                    process.nextTick(() => {
                        me.emitter.emit('server', 'error', err);
                    });
                });

                me.debug('SmartHome:Start(): registered routes:');
                this.app._router.stack.forEach((r) => {
                    if (r.route && r.route.path) {
                        me.debug('SmartHome:Start(): url ' + r.route.path + " registered for " + me.GetRouteType(r));
                    }
                });
            }

            if (this._httpLocalPort > 0) {
                me.debug('SmartHome:Start(listen): starting local fulfillment');
                this.localHttpServer = stoppable(http.createServer(this.localApp), graceMilliseconds);

                // start server
                this.localHttpServer.listen(this._httpLocalPort, () => {
                    me._localHttpServerRunning = true;

                    const host = me.localHttpServer.address().address;
                    const port = me.localHttpServer.address().port;

                    me.debug('SmartHome:Start(listen): listening for local fullfullment at ' + host + ':' + port);
                });

                this.localHttpServer.on('error', function (err) {
                    me.error('SmartHome:Start(): local err:' + err);
                });

                me.debug('SmartHome:Start(): local registered routes:');
                this.localApp._router.stack.forEach((r) => {
                    if (r.route && r.route.path) {
                        me.debug('SmartHome:Start(): url ' + r.route.path + " registered for " + me.GetRouteType(r));
                    }
                });
                    
            }

            me.StartDeviceScanServer();
            
            if (this._httpPort <= 0) {
                me.UnregisterUrl(REDapp);

                if (this._httpPort <= 0) {
                    me.debug("SmartHome:Start(): use the Node-RED server port, path " + this._httpPath);
                    this.httpAuth.httpAuthRegister(this._httpPath, REDapp);        // login and oauth http interface
                    this.httpActions.httpActionsRegister(this._httpPath, REDapp);     // actual SmartHome http interface
                }

                REDapp._router.stack.forEach((r) => {
                    if (r.route && r.route.path && (r.route.path.startsWith(this._httpPath) || r.route.path.startsWith(this._httpLocalPath))) {
                        me.debug('SmartHome:Start(): url ' + r.route.path + " registered for " + me.GetRouteType(r));
                    }
                });
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
        // httpNodeRoot is the root url for nodes that provide HTTP endpoints. If set to false, all node-based HTTP endpoints are disabled. 
        if (this._httpNodeRoot === false) return;

        const me = this;
        if (this._reportStateTimer !== null) {
            clearTimeout(this._reportStateTimer);
            this._reportStateTimer  = null;
        }
        
        me.UnregisterUrl(REDapp);

        me.StopDeviceScanServer();

        if (this._httpLocalPort > 0) {
            if (this._localHttpServerRunning) {
                this._localHttpServerRunning = false;

                this.localHttpServer.stop();

                setImmediate(function(){
                    me.localHttpServer.emit('close');
                });
            }
        }

        if (this._httpPort > 0) {
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
        if (this._localScanType) {
            return {
                httpPort: this._localExecutionPort,
                httpPathPrefix: this.Path_join(this._httpLocalPath, ""),
                clientId: this._nodeId,
                accessToken: this.auth.getLocalAuthCode(),
            }
        }
        return {};
    }
    //
    //
    //
    ReportAllStates() {
        let states = this.devices.getStates();

        if (states) {
            this.httpActions.reportState(undefined, states);
        }

    }
    //
    //
    //
    RequestSync() {
        this.httpActions.requestSync();
    }
    
    /**
     * Waits 10 seconds, then sends a SYNC request to Google.
     * Multiple calls to this method during the delay are buffered into the same SYNC call.
     */
    ScheduleRequestSync() {
        const me = this;
        if (me._requestSyncDelay && !me._syncScheduled) {
            me._syncScheduled = true;
            setTimeout(() => {
                me._syncScheduled = false;
                me.httpActions.requestSync();
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

    /**
     * Checks if the app.js script running on the smart speaker is the most up-to-date version.
     *
     * During the IDENTIFY request, the app.js script running on the smart speaker sends its version number. Here, we
     * read the local app.js file, parse the version number out of the file and compare the version numbers with each
     * other. If the version numbers do not match, the user gets a message on Node-RED's debug panel.
     *
     * @param {string} remoteAppJsVersion
     */
    checkAppJsVersion(remoteAppJsVersion) {
        const appJsPath = path.resolve(__dirname, '../local-execution/app.js');
        fs.readFile(appJsPath, 'utf8', (err, data) => {
            if (err) {
                this.error('SmartHome:checkAppJsVersion(): Cannot read app.js file (' + err + ')');
                return;
            }

            const regex = /VERSION\s*=\s*'([0-9.]+)'/;
            const matches = data.match(regex);
            const localAppJsVersion = matches[1];

            if(typeof localAppJsVersion === 'undefined') {
                this.error('SmartHome:checkAppJsVersion(): Cannot parse version from app.js file');
                return;
            }

            if(remoteAppJsVersion === localAppJsVersion) {
                this.debug('SmartHome:checkAppJsVersion(): app.js on smart speaker is up to date (v' + localAppJsVersion + ')');
            } else if(typeof remoteAppJsVersion === 'undefined') {
                this._mgmtNode.warn('SmartHome:checkAppJsVersion(): app.js on smart speaker did not report version number. Please upload latest app.js as explained on https://github.com/mikejac/node-red-contrib-google-smarthome/blob/master/docs/local_fulfillment.md#updating-appjs.');
            } else {
                this._mgmtNode.warn('SmartHome:checkAppJsVersion(): app.js version on smart speaker did not match local app. Expected ' + localAppJsVersion + ', got ' + remoteAppJsVersion + '. Please upload latest app.js as explained on https://github.com/mikejac/node-red-contrib-google-smarthome/blob/master/docs/local_fulfillment.md#updating-appjs.');
            }
        });
    }

    //
    //
    //
    IsHttpServerRunning() {
        return this._httpServerRunning || this._httpPort <= 0;
    }
    //
    //
    //
    debug(data) {
        this.debug_function(data);
    }
    //
    //
    //
    error(data) {
        this.error_function(data);
    }
}

module.exports = GoogleSmartHome;
