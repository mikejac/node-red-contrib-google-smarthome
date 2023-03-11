/**
 * NodeRED Google SmartHome
 * Copyright (C) 2023 Michael Jacobsen and others.
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

const https = require('https');

module.exports = function (RED) {
    "use strict";

    const GoogleSmartHome = require('./lib/SmartHome.js');

    /******************************************************************************************************************
     *
     *
     */
    class GoogleSmartHomeNode {
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
                parseInt(config.accesstokenduration || '30'), // minutes
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

    /******************************************************************************************************************
     *
     *
     */
    class MgmtNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.client = config.client;
            /** @type {GoogleSmartHomeNode} */
            this.clientConn = RED.nodes.getNode(this.client);

            if (!this.clientConn) {
                this.error(RED._("googlesmarthome.errors.missing-config"));
                this.status({ fill: "red", shape: "dot", text: "Missing config" });
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("googlesmarthome.errors.missing-bridge"));
                this.status({ fill: "red", shape: "dot", text: "Missing SmartHome" });
                return;
            }

            this.enabledebug = config.enabledebug || false;
            this.set_state_type = config.set_state_type || 'filtered_by_id';

            this.clientConn.register(this, 'mgmt', config.name);

            this.status({ fill: "yellow", shape: "dot", text: "Ready" });

            this.on('input', this.onInput);
            this.on('close', this.onClose);
        }

        _debug(msg) {
            if (this.enabledebug) {
                console.log(msg)
            } else {
                RED.log.debug(msg);
            }
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        updated(data) {   // this must be defined before the call to clientConn.register()
            const node = this;
            node._debug("MgmtNode(updated): data = " + JSON.stringify(data));

            let msg = {
                topic: "management",
                payload: data
            };

            node.send(msg);
        }

        /**
         * respond to inputs from NodeRED
         *
         * @param {object} msg - The incoming message
         * @param {Function} send - Function to send outgoing messages
         * @param {Function} done - Function to inform the runtime that this node has finished its operation
         */
        onInput(msg, send, done) {
            const node = this;
            node._debug("MgmtNode(input)");

            let topicArr = (msg.topic || '').split(node.topicDelim);
            let topic = topicArr[topicArr.length - 1];   // get last part of topic
            const topic_upper = topic.toUpperCase();

            node._debug("MgmtNode(input): topic = " + topic);

            try {
                if (topic_upper === 'RESTART_SERVER') {
                    node._debug("MgmtNode(input): RESTART_SERVER");

                    this.clientConn.app.Restart(RED.httpNode || RED.httpAdmin, RED.server);
                } else if (topic_upper === 'REPORT_STATE') {
                    node._debug("MgmtNode(input): REPORT_STATE");

                    this.clientConn.app.ReportAllStates();
                } else if (topic_upper === 'REQUEST_SYNC') {
                    node._debug("MgmtNode(input): REQUEST_SYNC");

                    this.clientConn.app.RequestSync();
                } else if (topic_upper === 'GET_STATE' || topic_upper === 'GETSTATE') {
                    let onlyPersistent = ['filtered_by_id', 'filtered_by_name'].includes(node.set_state_type );
                    let useNames = ['all_by_name', 'filtered_by_name'].includes(node.set_state_type );
                    let deviceIds = undefined;
                    if (typeof msg.payload === 'boolean') {
                        onlyPersistent = msg.payload;
                    } else if (typeof msg.payload === 'string') {
                        deviceIds = [msg.payload];
                    } else if (Array.isArray(msg.payload)) {
                        deviceIds = msg.payload;
                    } else if (typeof msg.payload === 'object') {
                        if (typeof msg.payload.onlyPersistent === 'boolean') {
                            onlyPersistent = msg.payload.onlyPersistent;
                        }
                        if (typeof msg.payload.useNames === 'boolean') {
                            useNames = msg.payload.useNames;
                        }
                        if (typeof msg.payload.devices === 'string') {
                            deviceIds = [msg.payload.devices];
                        } else if (Array.isArray(msg.payload.devices)) {
                            deviceIds = msg.payload.devices;
                        }
                    }
                    let states = this.clientConn.app.devices.getStates(deviceIds, onlyPersistent, useNames);
                    if (states) {
                        send({
                            topic: topic,
                            payload: states
                        });
                    }
                } else if (topic_upper === 'SET_STATE' || topic_upper === 'SETSTATE') {
                    if (typeof msg.payload === 'object') {
                        this.clientConn.app.devices.setStates(msg.payload);
                    }
                }

                done();
            } catch (err) {
                done(err);
            }
        }

        /**
         * Called by the runtime when this node is being removed or restarted
         *
         * @param {boolean} removed - true if the is being removed, false on restart
         * @param {Function} done - Function to inform the runtime that this node has finished its operation
         */
        onClose(removed, done) {
            if (removed) {
                // this node has been deleted
                this.clientConn.remove(this, 'mgmt');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'mgmt');
            }

            done();
        }

        sendSetState() {
            if (this.set_state_type === 'no_nodes') return;
            let onlyPersistent = ['filtered_by_id', 'filtered_by_name'].includes(this.set_state_type);
            let useNames = ['all_by_name', 'filtered_by_name'].includes(this.set_state_type);
            let states = this.clientConn.app.devices.getStates(undefined, onlyPersistent, useNames);
            if (states) {
                this.send({
                    topic: 'set_state',
                    payload: states
                });
            }
        }
    }

    RED.nodes.registerType("google-mgmt", MgmtNode);
}
