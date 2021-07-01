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

/**
 * https://github.com/actions-on-google/actions-on-google-nodejs
 *
 * https://github.com/actions-on-google/smart-home-nodejs
 * 
 * https://developers.google.com/assistant/smarthome/
*/

module.exports = function(RED) {
    "use strict";

    const GoogleSmartHome = require('./lib/SmartHome.js');

    /******************************************************************************************************************
     *
     *
     */
    function GoogleSmartHomeNode(config) {
        RED.nodes.createNode(this, config);

        this.mgmtNodes = {};

        var node = this;
        /*console.log("credentials " + JSON.stringify(node.credentials));
        console.log("config.loginclientid " + JSON.stringify(config.loginclientid));
        console.log("config.emails " + JSON.stringify(config.emails));
        console.log("config.username " + JSON.stringify(config.username));
        console.log("config.password " + JSON.stringify(config.password));
        console.log("config.publickey " + JSON.stringify(config.publickey));
        console.log("config.privatekey " + JSON.stringify(config.privatekey));
        console.log("config.jwtkey " + JSON.stringify(config.jwtkey));
        console.log("config.clientid " + JSON.stringify(config.clientid));
        console.log("config.clientsecret " + JSON.stringify(config.clientsecret));*/

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
            config.ssloffload,
            node.credentials.publickey || '', 
            node.credentials.privatekey || '',
            node.credentials.jwtkey || '',
            node.credentials.clientid || '', 
            node.credentials.clientsecret || '',
            config.reportinterval,     // minutes
            config.enabledebug);

        let err = this.app.Start(RED.httpNode || RED.httpAdmin);
        if (err !== true) {
            RED.log.error(err);
            return;
        }

        /******************************************************************************************************************
         * functions called by our 'clients'
         *
         */
        this.register = function(client, type, name) {
            RED.log.debug("GoogleSmartHomeNode(): register; type = " + type);

            if(type === 'mgmt') {
                node.mgmtNodes[client.id] = client;
                return {};
            }

            let device = client.registerDevice(client, name);
            let states = device.states;

            if (this.app.registerDevice(client, device)) {
                RED.log.debug('GoogleSmartHomeNode:register(): sucessfully registered device ' + type + ' ' + client.id);
                return JSON.parse(JSON.stringify(states));
            } else {
                this.debug('GoogleSmartHomeNode:register(): registering device ' + type + ' ' + client.id + ' failed');
                return {};
            }
        };

        this.deregister = function(client, type) {
            RED.log.debug("GoogleSmartHomeNode(): deregister; type = " + type);

            if (type === 'mgmt' && node.mgmtNodes[client.id]) {
                delete node.mgmtNodes[client.id];
            }
        };

        this.remove = function(client, type) {
            RED.log.debug("GoogleSmartHomeNode(): remove; type = " + type);

            if (type === 'mgmt' && node.mgmtNodes[client.id]) {
                delete node.mgmtNodes[client.id];
            } else {
                node.app.DeleteDevice(client);
            }
        };

        this.sendNotifications = function(client, notifications) {
            RED.log.debug("GoogleSmartHomeNode:sendNotifications(): notifications = " + JSON.stringify(notifications));
            node.app.SendNotifications(client.id, notifications);
        };

        this.setState = function(client, state) {
            RED.log.debug("GoogleSmartHomeNode:setState(): state = " + JSON.stringify(state));
            node.app.SetState(client.id, state);
        };

        this.getIdFromName = function(name) {
            return node.app.GetIdFromName(name);
        }

        this.getProperties = function(deviceIds) {
            return node.app.getProperties(deviceIds);
        }

        this.debug = function(msg) {
            if (config.enabledebug) {
                console.log(msg)
            } else {
                RED.log.debug(msg);
            }
        };

        this.on('close', function(removed, done) {
            node.app.Stop(done);
            
            if (removed) {
                // this node has been deleted
            } else {
                // this node is being restarted
                RED.log.debug("GoogleSmartHomeNode(on-close): restarting");
            }
        });

        /******************************************************************************************************************
         * notifications coming from the application server
         *
         */
        this.app.emitter.on('server', function(state, param1) {
            RED.log.debug("GoogleSmartHomeNode(on-server): state  = " + state);
            RED.log.debug("GoogleSmartHomeNode(on-server): param1 = " + param1);

            node.callMgmtFuncs({
                _type: 'server',
                state: state,
                param1: param1
            });
        });

        this.app.emitter.on('actions-reportstate', function(msg) {
            RED.log.debug("GoogleSmartHomeNode(on-actions-reportstate): msg = " + JSON.stringify(msg));

            node.callMgmtFuncs({
                _type: 'actions-reportstate',
                msg: msg
            });
        });

        this.app.emitter.on('actions-requestsync', function(msg) {
            RED.log.debug("GoogleSmartHomeNode(on-actions-requestsync): msg = " + JSON.stringify(msg));

            node.callMgmtFuncs({
                _type: 'actions-requestsync',
                msg: msg
            });
        });

        this.app.emitter.on('/login', function(msg, username, password) {
            RED.log.debug("GoogleSmartHomeNode(on-login): msg      = " + msg);
            RED.log.debug("GoogleSmartHomeNode(on-login): username = " + username);
            RED.log.debug("GoogleSmartHomeNode(on-login): password = " + password);

            node.callMgmtFuncs({
                _type: 'login',
                msg: msg
            });
        });

        // call all management nodes
        this.callMgmtFuncs = function(obj) {
            Object.keys(node.mgmtNodes).forEach(function(key) {
                if (node.mgmtNodes.hasOwnProperty(key)) {
                    RED.log.debug("GoogleSmartHomeNode(on-server): found mgmt client");

                    node.mgmtNodes[key].updated(obj);
                }
            });
        };
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
    function MgmtNode(config) {
        RED.nodes.createNode(this, config);

        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);

        if (!this.clientConn) {
            this.error(RED._("googlesmarthome.errors.missing-config"));
            this.status({fill:"red", shape:"dot", text:"Missing config"});
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("googlesmarthome.errors.missing-bridge"));
            this.status({fill:"red", shape:"dot", text:"Missing SmartHome"});
            return;
        }

        let node = this;

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        this.updated = function(data) {   // this must be defined before the call to clientConn.register()
            RED.log.debug("MgmtNode(updated): data = " + JSON.stringify(data));

            let msg = {
                topic: "management",
                payload: data
            };

            node.send(msg);
        };

        this.clientConn.register(this, 'mgmt', config.name);

        this.status({fill:"yellow", shape:"dot", text:"Ready"});

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("MgmtNode(input)");

            let topicArr = msg.topic.split(node.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("MgmtNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'RESTART_SERVER') {
                    RED.log.debug("MgmtNode(input): RESTART_SERVER");

                    this.clientConn.app.Restart();
                } else if (topic.toUpperCase() === 'REPORT_STATE') {
                    RED.log.debug("MgmtNode(input): REPORT_STATE");

                    this.clientConn.app.ReportAllStates();
                } else if (topic.toUpperCase() === 'REQUEST_SYNC') {
                    RED.log.debug("MgmtNode(input): REQUEST_SYNC");

                    this.clientConn.app.RequestSync();
                }
            } catch (err) {
                RED.log.error(err);
            }
        });

        this.on('close', function(removed, done) {
            if (removed) {
                // this node has been deleted
                node.clientConn.remove(node, 'mgmt');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'mgmt');
            }
            
            done();
        });
    }

    RED.nodes.registerType("google-mgmt", MgmtNode);
}
