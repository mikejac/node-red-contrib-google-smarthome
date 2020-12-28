/**
 * NodeRED Google SmartHome
 * Copyright (C) 2020 Michael Jacobsen.
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
 **/

module.exports = function(RED) {
    "use strict";

    const formats = require('../formatvalues.js');

    /******************************************************************************************************************
     *
     *
     */
    function OutletNode(config) {
        RED.nodes.createNode(this, config);

        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);
        this.topicOut   = config.topic;
        this.passthru   = config.passthru;
        this.topicDelim = '/';

        if (!this.clientConn) {
            this.error(RED._("outlet.errors.missing-config"));
            this.status({fill:"red", shape:"dot", text:"Missing config"});
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("outlet.errors.missing-bridge"));
            this.status({fill:"red", shape:"dot", text:"Missing SmartHome"});
            return;
        }

        let node = this;

        RED.log.debug("OutletNode(): node.topicOut = " + node.topicOut);

        this.registerDevice = function (client, name) {
            let states = {
                online: true,
                on: false
            };

            let device = {
                id: client.id,
                properties: {
                    type: 'action.devices.types.OUTLET',
                    traits: ['action.devices.traits.OnOff'],
                    name: {
                        defaultNames: ["Node-RED Outlet"],
                        name: name
                    },
                    willReportState: true,
                    attributes: {
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-outlet-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    },
                    customData: {
                        "nodeid": client.id,
                        "type": 'outlet'
                    }
                }
            };

            device.states = states;

            return device;
        }

        this.updateStatusIcon = function(states) {
            if (states.on) {
                node.status({fill: "green", shape: "dot", text: "ON"});
            } else {
                node.status({fill: "red", shape: "dot", text: "OFF"});
            }
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        this.updated = function(device) {   // this must be defined before the call to clientConn.register()
            let states = device.states;
            let command = device.command;
            RED.log.debug("OutletNode(updated): states = " + JSON.stringify(states));

            node.updateStatusIcon(states);

            let msg = {
                topic: node.topicOut,
                device_name: device.properties.name.name,
                command: command,
                payload: {
                    online: states.online,
                    on: states.on,
                },
            };

            node.send(msg);
        };

        this.states = this.clientConn.register(this, 'outlet', config.name);

        this.status({fill:"yellow", shape:"dot", text:"Ready"});

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("OutletNode(input)");

            let topicArr = String(msg.topic).split(node.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("OutletNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'ON') {
                    RED.log.debug("OutletNode(input): ON");
                    let on = formats.FormatValue(formats.Formats.BOOL, 'on', msg.payload);

                    if (node.states.on !== on) {
                        node.states.on = on;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.on;
                            node.send(msg);
                        }
                        
                        node.updateStatusIcon(node.states);
                    }
                } else if (topic.toUpperCase() === 'ONLINE') {
                    RED.log.debug("OutletNode(input): ONLINE");
                    let online = formats.FormatValue(formats.Formats.BOOL, 'online', msg.payload);

                    if (node.states.online !== online) {
                        node.states.online = online;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.online;
                            node.send(msg);
                        }
                    }
                } else {
                    RED.log.debug("OutletNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("OutletNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    let on     = node.states.on;
                    let online = node.states.online;

                    // on
                    if (object.hasOwnProperty('on')) {
                        on = formats.FormatValue(formats.Formats.BOOL, 'on', object.on);
                    }

                    // online
                    if (object.hasOwnProperty('online')) {
                        online = formats.FormatValue(formats.Formats.BOOL, 'online', object.online);
                    }

                    if (node.states.on !== on || node.states.online !== online){
                        node.states.on     = on;
                        node.states.online = online;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states;
                            node.send(msg);
                        }

                        node.updateStatusIcon(node.states);
                    }
                }
            } catch (err) {
                RED.log.error(err);
            }
        });

        this.on('close', function(removed, done) {
            if (removed) {
                // this node has been deleted
                node.clientConn.remove(node, 'outlet');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'outlet');
            }
            
            done();
        });
    }

    RED.nodes.registerType("google-outlet", OutletNode);
}
