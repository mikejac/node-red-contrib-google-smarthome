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
import { NodeAPI } from 'node-red';
import { GoogleSmartHome, setRED, RED } from './lib/SmartHome';
import { MgmtNode } from './google-mgmt';

export class GoogleSmartHomeNode {
    public app: GoogleSmartHome;
    private mgmtNodes: Record<string, MgmtNode>;


    constructor(config) {

        RED.nodes.createNode(this, config);

        this.mgmtNodes = {};

        const node = this;
        this.default_lang = config.default_lang || 'en';
        this.enabledebug = config.enabledebug;

        this.app = new GoogleSmartHome(
            this,
            config.id,
            RED.settings.userDir,
            RED.settings.httpNodeRoot,
            config.usegooglelogin,
            node.credentials.loginclientid || '',
            node.credentials.emails || [],
            node.credentials.username || '',
            node.credentials.password || '',
            parseInt(config.accesstokenduration || '60'), // minutes
            config.usehttpnoderoot,
            config.httppath,
            parseInt(config.port || '0'),
            config.local_scan_type || '',
            parseInt(config.local_scan_port || '0'),
            parseInt(config.localport || '0'),
            RED.server instanceof https.Server,
            config.ssloffload,
            node.credentials.publickey || '',
            node.credentials.privatekey || '',
            node.credentials.jwtkey || '',
            node.credentials.clientid || '',
            node.credentials.clientsecret || '',
            config.reportinterval,     // minutes
            parseInt(config.request_sync_delay || '10'),
            parseInt(config.set_state_delay || '0'),
            this.enabledebug, function (msg) { node._debug(msg); }, function (msg) { node._error(msg); });

        let err = this.app.Start(RED.httpNode || RED.httpAdmin, RED.server);
        if (err !== true) {
            node._debug("GoogleSmartHomeNode(constructor): error " + JSON.stringify(err));
            RED.log.error(err);
            return;
        }

        this.on('close', function (removed, done) {
            node.app.Stop(RED.httpNode || RED.httpAdmin, done);

            if (removed) {
                // this node has been deleted
            } else {
                // this node is being restarted
                node._debug("GoogleSmartHomeNode(on-close): restarting");
            }
        });

        /******************************************************************************************************************
         * notifications coming from the application server
         *
         */
        this.app.emitter.on('server', function (state, param1) {
            node._debug("GoogleSmartHomeNode(on-server): state  = " + state);
            node._debug("GoogleSmartHomeNode(on-server): param1 = " + param1);

            node.callMgmtFuncs({
                _type: 'server',
                state: state,
                param1: param1
            });
        });

        this.app.emitter.on('actions-reportstate', function (msg) {
            node._debug("GoogleSmartHomeNode(on-actions-reportstate): msg = " + JSON.stringify(msg));

            node.callMgmtFuncs({
                _type: 'actions-reportstate',
                msg: msg
            });
        });

        this.app.emitter.on('actions-requestsync', function (msg) {
            node._debug("GoogleSmartHomeNode(on-actions-requestsync): msg = " + JSON.stringify(msg));

            node.callMgmtFuncs({
                _type: 'actions-requestsync',
                msg: msg
            });
        });

        this.app.emitter.on('/login', function (msg, username, password) {
            node._debug("GoogleSmartHomeNode(on-login): msg      = " + msg);
            node._debug("GoogleSmartHomeNode(on-login): username = " + username);
            node._debug("GoogleSmartHomeNode(on-login): password = " + password);

            node.callMgmtFuncs({
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
        const node = this;
        Object.keys(node.mgmtNodes).forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(node.mgmtNodes, key)) {
                node._debug("GoogleSmartHomeNode(on-server): found mgmt client");

                node.mgmtNodes[key].updated(obj);
            }
        });
    }

    /******************************************************************************************************************
     * functions called by our 'clients'
     *
     */
    register(client, type) {
        const node = this;
        node._debug("GoogleSmartHomeNode(): register; type = " + type + ' ' + client.id);

        if (type === 'mgmt') {
            node.mgmtNodes[client.id] = client;
        } else {
            node.app.devices.registerDevice(client);
        }
    }

    deregister(client, type) {
        const node = this;
        node._debug("GoogleSmartHomeNode(): deregister; type = " + type);

        if (type === 'mgmt' && node.mgmtNodes[client.id]) {
            delete node.mgmtNodes[client.id];
        }
    }

    remove(client, type) {
        const node = this;
        node._debug("GoogleSmartHomeNode(): remove; type = " + type);

        if (type === 'mgmt' && node.mgmtNodes[client.id]) {
            delete node.mgmtNodes[client.id];
        } else {
            node.app.devices.DeleteDevice(client);
        }
    }

    sendNotifications(client, notifications) {
        const node = this;
        node._debug("GoogleSmartHomeNode:sendNotifications(): notifications = " + JSON.stringify(notifications));
        node.app.devices.SendNotifications(client.id, notifications);
    }

    reportState(deviceId) {
        const node = this;
        node.app.devices.ReportState(deviceId);
    }

    getIdFromName(name) {
        const node = this;
        return node.app.devices.GetIdFromName(name);
    }

    getProperties(deviceIds) {
        const node = this;
        return node.app.devices.getProperties(deviceIds);
    }
}


module.exports = function(RED:NodeAPI) {
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
