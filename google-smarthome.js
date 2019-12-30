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

/**
 * https://github.com/actions-on-google/actions-on-google-nodejs
 *
 * https://github.com/actions-on-google/smart-home-nodejs
 * 
 * https://developers.google.com/actions/smarthome/
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

        this.app = new GoogleSmartHome(config.username, config.password, 
            parseInt(config.port),
            config.ssloffload,
            config.publickey, 
            config.privatekey,
            config.jwtkey,
            config.clientid, 
            config.clientsecret,
            config.reportinterval,     // minutes
            config.enabledebug);

        let err = this.app.Start();
        if (err !== true) {
            RED.log.error(err);
            return;
        }

        /******************************************************************************************************************
         * functions called by our 'clients'
         *
         */
        this.register = function(client, type, name, param1) {
            RED.log.debug("GoogleSmartHomeNode(): register; type = " + type);

            let states = {};

            switch (type) {
                case 'light-onoff':
                    states = node.app.NewLightOnOff(client, name);
                    break;

                case 'light-dimmable':
                    states = node.app.NewLightDimmable(client, name);
                    break;

                case 'light-hsv':
                    states = node.app.NewLightHSV(client, name);
                    break;

                case 'light-rgb':
                    states = node.app.NewLightRGB(client, name);
                    break;

                case 'outlet':
                    states = node.app.NewOutlet(client, name);
                    break;

                case 'scene':
                    states = node.app.NewScene(client, name, param1);
                    break;

                case 'window':
                    states = node.app.NewWindow(client, name);
                    break;

                case 'mgmt':
                    node.mgmtNodes[client.id] = client;
                    break;
            }

            return states;
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

        this.setState = function(client, state) {
            RED.log.debug("GoogleSmartHomeNode:setState(): state = " + JSON.stringify(state));
            node.app.SetState(client.id, state);
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
        this.app.on('server', function(state, param1) {
            RED.log.debug("GoogleSmartHomeNode(on-server): state  = " + state);
            RED.log.debug("GoogleSmartHomeNode(on-server): param1 = " + param1);

            node.callMgmtFuncs({
                _type: 'server',
                state: state,
                param1: param1
            });
        });

        this.app.on('actions-reportstate', function(msg) {
            RED.log.debug("GoogleSmartHomeNode(on-actions-reportstate): msg = " + JSON.stringify(msg));

            node.callMgmtFuncs({
                _type: 'actions-reportstate',
                msg: msg
            });
        });

        this.app.on('actions-requestsync', function(msg) {
            RED.log.debug("GoogleSmartHomeNode(on-actions-requestsync): msg = " + JSON.stringify(msg));

            node.callMgmtFuncs({
                _type: 'actions-requestsync',
                msg: msg
            });
        });

        this.app.on('/login', function(msg, username, password) {
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

    RED.nodes.registerType("googlesmarthome-client", GoogleSmartHomeNode);

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