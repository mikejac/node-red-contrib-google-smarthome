/**
 * NodeRED Google SmartHome
 * Copyright (C) 2018 Michael Jacobsen.
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

const bodyParser    = require('body-parser');
const http          = require('http');
const https         = require('https');
const express       = require('express');
const stoppable     = require('stoppable');
const helmet        = require('helmet');
const morgan        = require('morgan');
const cors          = require('cors');
const fs            = require('fs');
const events        = require('events');

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
    constructor(nodeId, userDir, username, password, accessTokenDuration, httpsPort, ssloffload, publicKey, privateKey, jwtkey, clientid, clientsecret, reportStateInterval, debug) {
        super();

        this._reportStateTimer      = null;
        this._reportStateInterval   = reportStateInterval;  // minutes
        this._httpsPort             = httpsPort;
        this._sslOffload            = ssloffload;
        this._publicKey             = publicKey;
        this._privateKey            = privateKey;
        this._jwtKey                = jwtkey;
        this._debug                 = debug;
        this._httpServerRunning     = false;

        this.loadAuth(nodeId, userDir);
        this.setClientIdSecret(clientid, clientsecret);
        this.setUsernamePassword(username, password);
        this.setAccessTokenDuration(accessTokenDuration);

        this.emitter = new events.EventEmitter();

        // create express middleware
        this.app = express();
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(morgan('dev'));
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: true}));
        this.app.set('trust proxy', 1); // trust first proxy

        // frontend UI
        this.app.set('jsonp callback name', 'cid');

        this.httpAuthRegister();        // login and oauth http interface
        this.httpActionsRegister();     // actual SmartHome http interface
    }
    //
    //
    //
    Start() {
        try {
            const graceMilliseconds = 500;
            let me                  = this;

            this.setJwtKey(this._jwtKey);     // will throw if file cannot be read
            
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

                if (this._reportStateInterval > 0) {
                    this._reportStateTimer = setInterval(function() { 
                        let states = me.getStates();

                        if (states) {
                            me.reportState(undefined, states);
                        }
                    }, this._reportStateInterval * 60 * 1000);
                }

                process.nextTick(() => {
                    me.emitter.emit('server', 'start', me._httpsPort);
                });
            });

            this.httpServer.on('error', function (err) {
                me.debug('SmartHome:Start(): err:' + err);

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
        } catch (err) {
            return err;
        }

        return true;
    }
    //
    //
    //
    Stop(done) {
        let me = this;
        this._httpServerRunning = false;

        if (this._reportStateTimer !== null) {
            clearTimeout(this._reportStateTimer);
            this._reportStateTimer  = null;
        }

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
    }
    //
    //
    //
    Restart() {
        let me = this;

        this.Stop(function() {
            me.debug('SmartHome:Restart(): Stop done');

            me.Start();

            me.debug('SmartHome:Restart(): Start done');
        });
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
    IsHttpServerRunning() {
        return this._httpServerRunning;
    }
    //
    //
    //
    debug(data) {
        if (this._debug) { console.log(data); }
    }
}

module.exports = GoogleSmartHome;
