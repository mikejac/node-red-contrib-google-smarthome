/**
 * node-red-contrib-google-smarthome
 * Copyright (C) 2026 Michael Jacobsen, Andreas Schuster and others.
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

import http from 'http';
import https from 'https';
import express from 'express';
import stoppable from 'stoppable';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import dnssd from '@gravitysoftware/dnssd';
import dgram from 'dgram';
import { NodeAPI } from 'node-red';

import Auth from './Auth';
import Devices from './Devices';
import HttpAuth from './HttpAuth';
import HttpActions from './HttpActions';
import { GoogleSmartHomeNode } from '../google-smarthome';

const REPORT_STATE_INTERVAL_MINUTES = 60;
const REQUEST_SYNC_DELAY_MS = 10 * 1000;
const SET_STATE_DELAY_MS = 0;

/******************************************************************************************************************
 * GoogleSmartHome
 *
 */
export class GoogleSmartHome {
    public auth: Auth;
    public devices: Devices;
    public httpActions: HttpActions;
    public httpAuth: HttpAuth;
    public configNode: GoogleSmartHomeNode;
    public app: express.Express;
    public localApp: express.Express;
    private httpServer!: http.Server & stoppable.WithStop;
    private localHttpServer!: http.Server & stoppable.WithStop;
    private _httpLocalPath: string
    private _httpPath: string;
    private _httpNodeRoot: string;
    private _localScanType: string;
    private _httpServerRunning: boolean = false;
    private _dnssdAdRunning: boolean = false;
    private _syncScheduled: boolean = false;
    private _getStateScheduled: boolean = false;
    private debug_function: (data: any) => void;
    private error_function: (data: any) => void

    private _localScanPacket: string = 'node-red-contrib-google-smarthome';


    constructor(configNode: GoogleSmartHomeNode, userDir: string, httpNodeRoot: string, useGoogleLogin, googleClientId, emails, username, password, usehttpnoderoot,
        httpPath, httpPort, localScanType, localScanPort, httpLocalPort, nodeRedUsesHttps, ssloffload: boolean, publicKey, privateKey, jwtkeyFile, clientid,
        clientsecret, debug, debug_function: (data: any) => void, error_function: (data: any) => void) {

        this.auth                   = new Auth(this);
        this.devices                = new Devices(this);
        this.httpActions            = new HttpActions(this);
        this.httpAuth               = new HttpAuth(this);

        this.configNode             = configNode;
        this._reportStateTimer      = null;
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
        this._debug                 = debug;
        this._userDir               = userDir;
        this._httpLocalPath         = this.Path_join(this._httpNodeRoot || '/', this._httpPath);
        this._httpPath              = this.Path_join((usehttpnoderoot ? this._httpNodeRoot || '/' : '/'), this._httpPath);
        this.debug_function         = debug_function;
        this.error_function         = error_function;
        this._localUDPServers       = {};
        this._localDiscoveryPort    = null;
        this._localExecutionPort    = null;
        this.dnssdAd                = null;

        if (nodeRedUsesHttps && httpLocalPort <= 0)
        {
            error_function("GoogleSmartHome: Node-RED is using HTTPS but no local http port was defined, local execution will fail.");
        }

        this.debug('GoogleSmartHome.constructor');
        this.auth.loadAuthStorage(configNode.id, userDir);
        this.auth.setClientIdSecret(clientid, clientsecret);
        if (useGoogleLogin) {
            this.auth.setGoogleClientIdAndEmails(googleClientId, emails);
        } else {
            this.auth.setUsernamePassword(username, password);
        }

        this.emitter = new EventEmitter();

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

    /**
     * Retrieves the router instance from an Express app object.
     * This method provides compatibility for Express 4 (app._router) and Express 5 (app.router).
     *
     * @param appInstance - The Express application instance.
     * @returns {object|undefined} The router object if found, otherwise undefined.
     */
    getRouter(appInstance: express.Express) {
        return appInstance._router || appInstance.router;
    }

    /**
     * Joins multiple path segments into a single path.
     *
     * @param {...string} paths - The path segments to join
     * @returns The joined path
     */
    Path_join(...paths): string {
        let full_path = '';

        for (const ipath of paths) {
            const fpe = full_path.endsWith('/');
            const ips = ipath.startsWith('/');

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

    /**
     * Determines the type of a HTTP route (GET, POST, OPTIONS, etc.).
     *
     * @param {object} route - The route object
     * @returns {string} The type of the route
     */
    GetRouteType(route): string {
        if (route) {
            if (route.route.methods['get'] && route.route.methods['post']) return "all";
            if (route.route.methods['get']) return "get";
            if (route.route.methods['post']) return "post";
            if (route.route.methods['options']) return "options";
        }
        return 'unknown';
    }

    /**
     * Unregisters all URLs we registered with Node-RED's webserver.
     * This is only necessary if the webserver from Node-RED is used. If we
     * use our own webserver, routes are automatically removed when we
     * stop the webserver.
     *
     * @param {express.Express} REDapp - the Express server from Node-RED
     */
    UnregisterUrl(REDapp: express.Express) {
        // Skip if we are using our own webserver instead of Node-RED's webserver
        if (this._httpPort > 0) {
            return;
        }

        const redAppRouter = this.getRouter(REDapp);

        if (redAppRouter) {
            this.debug("SmartHome:UnregisterUrl(): use the Node-RED server port, path '" + this._httpPath + "' local path '" + this._httpLocalPath + "'");
            let get_urls = [this.Path_join(this._httpPath, 'oauth'), this.Path_join(this._httpPath, 'check')];
            let post_urls = [this.Path_join(this._httpPath, 'oauth'), this.Path_join(this._httpPath, 'smarthome')];
            let options_urls = [this.Path_join(this._httpPath, 'smarthome')];
            let all_urls = [this.Path_join(this._httpPath, 'token')];

            let to_remove = [];
            redAppRouter.stack.forEach((route, i) => {
                if (route.route && (
                    (route.route.methods['get'] && get_urls.includes(route.route.path)) ||
                    (route.route.methods['post'] && post_urls.includes(route.route.path)) ||
                    (route.route.methods['options'] && options_urls.includes(route.route.path)) ||
                    (all_urls.includes(route.route.path))
                )) {
                    this.debug('SmartHome:Stop(): removing url: ' + route.route.path + " registered for " + this.GetRouteType(route));
                    to_remove.unshift(i);
                }
            });
            to_remove.forEach(i => redAppRouter.stack.splice(i, 1));
            redAppRouter.stack.forEach((route) => {
                if (route.route) this.debug('SmartHome:Stop(): remaining url: ' + route.route.path + " registered for " + this.GetRouteType(route));
            });
        }
    }
    //
    //
    //
    StartDeviceScanServer(): void {
        if (this._localScanType === "UDP") {
            this.StartUDPDeviceScanServer();
        } else if (this._localScanType === "MDNS") {
            this.StartMDNSAdvertisement();
        }
    }
    //
    //
    //
    StopDeviceScanServer(): void {
        this.StopUDPDeviceScanServer();
        this.StopMDNSAdvertisement();
    }
    //
    //
    //
    StopUDPDeviceScanServer(): void {
        ['udp4', /*'udp6'*/].forEach((type) => {
            if (Object.prototype.hasOwnProperty.call(this._localUDPServers, type) && this._localUDPServers[type] !== null) {
                this._localUDPServers[type].close();
                delete this._localUDPServers[type];
            }
        });
    }
    //
    //
    //
    StartUDPDeviceScanServer(): void {
        const me = this;
        this.debug('Starting service Scan UDP server on port ' + this._localDiscoveryPort);

        this.StopUDPDeviceScanServer();

        function onError(error) {
            me.debug('Service Scan UDP server: ' + error);
            me.StopUDPDeviceScanServer();
        }

        function onMessage(this: dgram.Socket, msg: Buffer, info: dgram.RemoteInfo) {
            const data = msg.toString().trim();
            // Accept packet with quotes too in case user sends test packet with quotes (echo "..." | nc -...)
            if (data === me._localScanPacket || data === '"' + me._localScanPacket + '"') {
                const sync_res = Buffer.from(JSON.stringify({clientId: me.configNode.id}), 'utf8');
                this.send(sync_res, info.port, info.address, function(error){
                    if(error) {
                        me.debug("Service Scan UDP server: error sending message " + error);
                    }
                });
            } else {
                me.debug('Service Scan UDP server: error wrong message received');
            }
        }

        function onListening(this: dgram.Socket) {
            const address = this.address();
            me.debug(`Service Scan UDP server: listening on: ${address.family} ${address.address}:${address.port}`);
        }

        function onClose(this: dgram.Socket) {
            me._localUDPServers[this.type] = null;
            me.debug(`Service Scan UDP server: server ${this.type} server closed`);
        }

        ['udp4', /*'udp6'*/].forEach((type) => {
            this._localUDPServers[type] = dgram.createSocket({type: type, ipv6Only: type === 'udp6'});
            this._localUDPServers[type].on('error', onError);
            this._localUDPServers[type].on('message', onMessage);
            this._localUDPServers[type].on('listening', onListening);
            this._localUDPServers[type].on('close', onClose);
            this._localUDPServers[type].bind(this._localDiscoveryPort);
        });
    }

    /**
     * Stops the mDNS advertisement for local fulfillment.
     */
    StopMDNSAdvertisement(): void {
        if (this._dnssdAdRunning) {
            this._dnssdAdRunning = false;
            
            this.dnssdAd.stop();
            this.dnssdAd = null;
        }
    }

    /**
     * Starts the mDNS advertisement for local fulfillment.
     */
    StartMDNSAdvertisement(): void {
        const me = this;
        this.StopMDNSAdvertisement();

        this.dnssdAd = dnssd.Advertisement(dnssd.tcp('nodered-google'), this._localDiscoveryPort, {txt: {clientId: this.configNode.id}})
        this.dnssdAd.start();
        this._dnssdAdRunning = true;

        this.debug('SmartHome:Start(): dnssd-ad: port:' + this._localDiscoveryPort);
        this.dnssdAd.on('error', (err) => {
            this.error('SmartHome:Start(): dnssd-ad: err:' + err);
        });
    }
    //
    //
    //
    Start(REDapp: express.Express, REDserver) {
        // httpNodeRoot is the root url for nodes that provide HTTP endpoints. If set to false, all node-based HTTP endpoints are disabled. 
        if (this._httpNodeRoot === false) return;

        this._localDiscoveryPort    = this._localScanPort || this._httpLocalPort || REDserver.address().port;
        this._localExecutionPort    = this._httpLocalPort || REDserver.address().port;

        try {
            const graceMilliseconds = 500;
            const me                = this;

            if (this._jwtKeyFile) {
                this.auth.loadJwtKeyFile(this._jwtKeyFile, this._userDir);     // will throw if file cannot be read

                if (REPORT_STATE_INTERVAL_MINUTES > 0) {
                
                    this._reportStateTimer = setInterval(() => { 
                        let states = this.devices.getStates();

                        if (states) {
                            this.httpActions.reportState(undefined, states);
                        }
                    }, REPORT_STATE_INTERVAL_MINUTES * 60 * 1000);
                }
            }

            if (this._httpPort > 0) {
                if (this._sslOffload) {
                    this.debug('SmartHome:Start(listen): using external SSL offload');

                    // create our HTTP server
                    this.httpServer = stoppable(http.createServer(this.app), graceMilliseconds);
                } else {
                    this.debug('SmartHome:Start(listen): using internal SSL');

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
                        this.debug('SmartHome:Start(listen): Certificate file change detected. Updating HTTPS server in 30 seconds.');
                        clearTimeout(waitForRenewalTimeout);
                        waitForRenewalTimeout = setTimeout(() => {
                            let context = {
                                key: fs.readFileSync(this._privateKey),
                                cert: fs.readFileSync(this._publicKey)
                            }
                            this.httpServer.setSecureContext(context);
                            this.debug('SmartHome:Start(listen): HTTPS server updated after certificate file change');
                        }, 30000);
                    });
                }

                // start server
                this.httpServer.listen(this._httpPort, () => {
                    this._httpServerRunning = true;

                    const host = this.httpServer.address().address;
                    const port = this.httpServer.address().port;

                    this.debug('SmartHome:Start(listen): listening at ' + host + ':' + port);

                    process.nextTick(() => {
                        this.emitter.emit('server', 'start', this._httpPort);
                    });
                });

                this.httpServer.on('error', (err) => {
                    this.error('SmartHome:Start(): err:' + err);

                    process.nextTick(() => {
                        this.emitter.emit('server', 'error', err);
                    });
                });

                this.debug('SmartHome:Start(): registered routes:');
                const appRouter = this.getRouter(this.app);
                appRouter.stack.forEach((r) => {
                    if (r.route && r.route.path) {
                        this.debug('SmartHome:Start(): url ' + r.route.path + " registered for " + this.GetRouteType(r));
                    }
                });
            }

            if (this._httpLocalPort > 0) {
                this.debug('SmartHome:Start(listen): starting local fulfillment');
                this.localHttpServer = stoppable(http.createServer(this.localApp), graceMilliseconds);

                // start server
                this.localHttpServer.listen(this._httpLocalPort, () => {
                    this._localHttpServerRunning = true;

                    const host = this.localHttpServer.address().address;
                    const port = this.localHttpServer.address().port;

                    this.debug('SmartHome:Start(listen): listening for local fullfullment at ' + host + ':' + port);
                });

                this.localHttpServer.on('error', (err) => {
                    this.error('SmartHome:Start(): local err:' + err);
                });

                this.debug('SmartHome:Start(): local registered routes:');
                const localAppRouter = this.getRouter(this.localApp);
                localAppRouter.stack.forEach((r) => {
                    if (r.route && r.route.path) {
                        this.debug('SmartHome:Start(): url ' + r.route.path + " registered for " + this.GetRouteType(r));
                    }
                });
            }

            this.StartDeviceScanServer();
            
            if (this._httpPort <= 0) {
                this.UnregisterUrl(REDapp);

                if (this._httpPort <= 0) {
                    this.debug("SmartHome:Start(): use the Node-RED server port, path " + this._httpPath);
                    this.httpAuth.httpAuthRegister(this._httpPath, REDapp);        // login and oauth http interface
                    this.httpActions.httpActionsRegister(this._httpPath, REDapp);     // actual SmartHome http interface
                }

                const redAppRouter = this.getRouter(REDapp);
                redAppRouter.stack.forEach((r) => {
                    if (r.route && r.route.path && (r.route.path.startsWith(this._httpPath) || r.route.path.startsWith(this._httpLocalPath))) {
                        this.debug('SmartHome:Start(): url ' + r.route.path + " registered for " + this.GetRouteType(r));
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
    Stop(REDapp: express.Express, done) {
        // httpNodeRoot is the root url for nodes that provide HTTP endpoints. If set to false, all node-based HTTP endpoints are disabled. 
        if (this._httpNodeRoot === false) return;

        const me = this;
        if (this._reportStateTimer !== null) {
            clearTimeout(this._reportStateTimer);
            this._reportStateTimer  = null;
        }
        
        this.UnregisterUrl(REDapp);

        this.StopDeviceScanServer();

        if (this._httpLocalPort > 0) {
            if (this._localHttpServerRunning) {
                this._localHttpServerRunning = false;

                this.localHttpServer.stop();

                setImmediate(() => {
                    this.localHttpServer.emit('close');
                });
            }
        }

        if (this._httpPort > 0) {
            if (this._httpServerRunning) {
                this._httpServerRunning = false;

                this.httpServer.stop(() => {
                    process.nextTick(() => {
                        this.emitter.emit('server', 'stop', 0);
                    });

                    if (typeof done === 'function') {
                        done();
                    }
                });

                setImmediate(() => {
                    this.httpServer.emit('close');
                });
            } else {
                process.nextTick(() => {
                    this.emitter.emit('server', 'stop', 0);
                });

                if (typeof done === 'function') {
                    done();
                }
            }
        } else {
            process.nextTick(() => {
                this.emitter.emit('server', 'stop', 0);
            });

            if (typeof done === 'function') {
                done();
            }
        }
    }
    //
    //
    //
    Restart(REDapp: express.Express, REDserver) {
        this.Stop(REDapp, () => {
            this.debug('SmartHome:Restart(): Stop done');

            this.Start(REDapp, REDserver);

            this.debug('SmartHome:Restart(): Start done');
        });
    }

    getCustomData() {
        if (this._localScanType) {
            return {
                httpPort: this._localExecutionPort,
                httpPathPrefix: this.Path_join(this._httpLocalPath, ""),
                clientId: this.configNode.id,
                accessToken: this.auth.getLocalAuthCode(),
            }
        }
        return {};
    }

    /**
     * Reports the states of all devices to Google.
     */
    ReportAllStates(): void {
        let states = this.devices.getStates();

        if (states) {
            this.httpActions.reportState(undefined, states);
        }

    }

    /**
     * Sends a SYNC request to Google.
     */
    RequestSync(): void {
        this.httpActions.requestSync();
    }
    
    /**
     * Waits 10 seconds, then sends a SYNC request to Google.
     * Multiple calls to this method during the delay are buffered into the same SYNC call.
     */
    ScheduleRequestSync(): void {
        const delay = REQUEST_SYNC_DELAY_MS;
        if (delay > 0 && !this._syncScheduled) {
            this._syncScheduled = true;
            setTimeout(() => {
                this._syncScheduled = false;
                this.httpActions.requestSync();
            }, delay);
        }
    }
    //
    //
    //
    ScheduleGetState(): void {
        const delay = SET_STATE_DELAY_MS;
        if (delay > 0 && !this._getStateScheduled) {
            this._getStateScheduled = true;
            setTimeout(() => {
                this._getStateScheduled = false;
                Object.keys(this.configNode.mgmtNodes).forEach(key => this.configNode.mgmtNodes[key].sendSetState());
            }, delay);
        }
    }

    /**
     * Checks if the app.js script running on the smart speaker is the most up-to-date version.
     *
     * During the IDENTIFY request, the app.js script running on the smart speaker sends its version number. Here, we
     * read the local app.js file, parse the version number out of the file and compare the version numbers with each
     * other. If the version numbers do not match, the user gets a message on Node-RED's debug panel.
     *
     * @param {string} remoteAppJsVersion - version number of the script running on the speaker
     */
    checkAppJsVersion(remoteAppJsVersion: string): void {
        const appJsPath = path.resolve(__dirname, '../../local-execution/app.js');
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
                this.configNode.warn('SmartHome:checkAppJsVersion(): app.js on smart speaker did not report version number. Please upload latest app.js as explained on https://github.com/mikejac/node-red-contrib-google-smarthome/blob/master/docs/local_fulfillment.md#updating-appjs.');
            } else {
                this.configNode.warn('SmartHome:checkAppJsVersion(): app.js version on smart speaker did not match local app. Expected ' + localAppJsVersion + ', got ' + remoteAppJsVersion + '. Please upload latest app.js as explained on https://github.com/mikejac/node-red-contrib-google-smarthome/blob/master/docs/local_fulfillment.md#updating-appjs.');
            }
        });
    }

    //
    //
    //
    IsHttpServerRunning(): boolean {
        return this._httpServerRunning || this._httpPort <= 0;
    }

    /**
     * Logs debug information.
     *
     * @param {string} data - The debug information to log.
     */
    debug(data) {
        this.debug_function(data);
    }

    /**
     * Logs error information.
     *
     * @param {string} data - The error information to log.
     */
    error(data) {
        this.error_function(data);
    }
}

/******************************************************************************************************************/

/** Global Node-RED instance */
export let RED: NodeAPI;

/**
 * Set the global Node-RED instance.
 * @param val The Node-RED instance to set.
 */
export function setRED(val: NodeAPI): void {
    RED = val;
}
