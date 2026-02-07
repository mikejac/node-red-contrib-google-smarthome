/**
 * node-red-contrib-google-smarthome
 * Copyright (C) 2025 Michael Jacobsen and others.
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

/**
 * https://github.com/actions-on-google/actions-on-google-nodejs
 *
 * https://github.com/actions-on-google/smart-home-nodejs
 * 
 * https://developers.google.com/assistant/smarthome/
 */

import https from 'https';
import { Node, NodeAPI, NodeDef } from 'node-red';
import { GoogleSmartHome, setRED, RED } from './lib/SmartHome';
import { MgmtNode } from './google-mgmt';
import { DeviceNode } from './devices/device';


interface GoogleSmartHomeNodeConfig extends NodeDef {
    id: string;
    name: string;
    enabledebug: boolean;
    default_lang: string;
    usegooglelogin: boolean;
    port: string;
    httppath: string;
    usehttpnoderoot: boolean;
    ssloffload: boolean;
    local_scan_port: string;
    local_scan_type: string;
    localport: string;
    accesstokenduration: string;
    reportinterval: string;
    request_sync_delay: string;
    set_state_delay: string;
}

interface GoogleSmartHomeCredentials {
    loginclientid: string;
    emails: string[];
    username: string;
    password: string;
    clientid: string;
    clientsecret: string;
    jwtkey: string;
    publickey: string;
    privatekey: string;
}

export interface GoogleSmartHomeNode extends Node<GoogleSmartHomeCredentials> {}

export class GoogleSmartHomeNode {
    public app: GoogleSmartHome;
    public mgmtNodes: Record<string, MgmtNode> = {};
    public default_lang: string;
    public enabledebug: boolean;


    constructor(config: GoogleSmartHomeNodeConfig) {

        RED.nodes.createNode(this, config);

        this.default_lang = config.default_lang || 'en';
        this.enabledebug = config.enabledebug;

        this.app = new GoogleSmartHome(
            this,
            RED.settings.userDir,
            RED.settings.httpNodeRoot,
            config.usegooglelogin,
            this.credentials.loginclientid || '',
            this.credentials.emails || [],
            this.credentials.username || '',
            this.credentials.password || '',
            parseInt(config.accesstokenduration || '60'), // minutes
            config.usehttpnoderoot,
            config.httppath,
            parseInt(config.port || '0'),
            config.local_scan_type || '',
            parseInt(config.local_scan_port || '0'),
            parseInt(config.localport || '0'),
            RED.server instanceof https.Server,
            config.ssloffload,
            this.credentials.publickey || '',
            this.credentials.privatekey || '',
            this.credentials.jwtkey || '',
            this.credentials.clientid || '',
            this.credentials.clientsecret || '',
            config.reportinterval,     // minutes
            parseInt(config.request_sync_delay || '10'),
            parseInt(config.set_state_delay || '0'),
            this.enabledebug,
            (msg) => { this._debug(msg); },
            (msg) => { this._error(msg); }
        );

        let err = this.app.Start(RED.httpNode || RED.httpAdmin, RED.server);
        if (err !== true) {
            this._debug("GoogleSmartHomeNode(constructor): error " + JSON.stringify(err));
            RED.log.error(err);
            return;
        }

        this.on('close', (removed, done) => {
            this.app.Stop(RED.httpNode || RED.httpAdmin, done);

            if (removed) {
                // this node has been deleted
            } else {
                // this node is being restarted
                this._debug("GoogleSmartHomeNode(on-close): restarting");
            }
        });

        /******************************************************************************************************************
         * notifications coming from the application server
         *
         */
        this.app.emitter.on('server', (state, param1) => {
            this._debug("GoogleSmartHomeNode(on-server): state  = " + state);
            this._debug("GoogleSmartHomeNode(on-server): param1 = " + param1);

            this.callMgmtFuncs({
                _type: 'server',
                state: state,
                param1: param1
            });
        });

        this.app.emitter.on('actions-reportstate', (msg) => {
            this._debug("GoogleSmartHomeNode(on-actions-reportstate): msg = " + JSON.stringify(msg));

            this.callMgmtFuncs({
                _type: 'actions-reportstate',
                msg: msg
            });
        });

        this.app.emitter.on('actions-requestsync', (msg) => {
            this._debug("GoogleSmartHomeNode(on-actions-requestsync): msg = " + JSON.stringify(msg));

            this.callMgmtFuncs({
                _type: 'actions-requestsync',
                msg: msg
            });
        });

        this.app.emitter.on('/login', (msg, username, password) => {
            this._debug("GoogleSmartHomeNode(on-login): msg      = " + msg);
            this._debug("GoogleSmartHomeNode(on-login): username = " + username);
            this._debug("GoogleSmartHomeNode(on-login): password = " + password);

            this.callMgmtFuncs({
                _type: 'login',
                msg: msg
            });
        });
    }

    _debug(msg) {
        if (this.enabledebug) {
            console.log(msg)
        } else {
            RED.log.debug(msg);
        }
    }

    _error(msg) {
        if (typeof msg === 'object') {
            this._debug(JSON.stringify(msg));
        }
        RED.log.error(msg);
    }

    // call all management nodes
    callMgmtFuncs(obj) {
        Object.keys(this.mgmtNodes).forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(this.mgmtNodes, key)) {
                this._debug("GoogleSmartHomeNode(on-server): found mgmt client");

                this.mgmtNodes[key].updated(obj);
            }
        });
    }

    /******************************************************************************************************************
     * functions called by our 'clients'
     *
     */
    register(client, type) {
        this._debug("GoogleSmartHomeNode(): register; type = " + type + ' ' + client.id);

        if (type === 'mgmt') {
            this.mgmtNodes[client.id] = client;
        } else {
            this.app.devices.registerDevice(client);
        }
    }

    deregister(client, type) {
        this._debug("GoogleSmartHomeNode(): deregister; type = " + type);

        if (type === 'mgmt' && this.mgmtNodes[client.id]) {
            delete this.mgmtNodes[client.id];
        }
    }

    remove(client, type) {
        this._debug("GoogleSmartHomeNode(): remove; type = " + type);

        if (type === 'mgmt' && this.mgmtNodes[client.id]) {
            delete this.mgmtNodes[client.id];
        } else {
            this.app.devices.DeleteDevice(client);
        }
    }

    sendNotifications(client: DeviceNode, notifications) {
        this._debug("GoogleSmartHomeNode:sendNotifications(): notifications = " + JSON.stringify(notifications));
        this.app.devices.SendNotifications(client.id, notifications);
    }

    reportState(deviceId: string) {
        this.app.devices.ReportState(deviceId);
    }

    getIdFromName(name) {
        return this.app.devices.GetIdFromName(name);
    }

    getProperties(deviceIds) {
        return this.app.devices.getProperties(deviceIds);
    }
}


export default module.exports = function(RED:NodeAPI) {
    setRED(RED);

    RED.nodes.registerType("googlesmarthome-client", GoogleSmartHomeNode, {
        credentials: {
            loginclientid: { type: "text" },
            emails: { type: "text" },
            username: { type: "text" },
            password: { type: "password" },
            publickey: { type: "text" },
            privatekey: { type: "text" },
            jwtkey: { type: "text" },
            clientid: { type: "text" },
            clientsecret: { type: "password" },
        }
    });
};
