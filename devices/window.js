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
    const util    = require('util');

    /******************************************************************************************************************
     *
     *
     */
    class WindowNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.client     = config.client;
            this.clientConn = RED.nodes.getNode(this.client);
            this.topicOut   = config.topic;
            this.passthru   = config.passthru;
            this.topicDelim = '/';

            if (!this.clientConn) {
                this.error(RED._("window.errors.missing-config"));
                this.status({fill: "red", shape: "dot", text: "Missing config"});
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("window.errors.missing-bridge"));
                this.status({fill: "red", shape: "dot", text: "Missing SmartHome"});
                return;
            }

            this.states = this.clientConn.register(this, 'window', config.name);

            this.status({fill: "yellow", shape: "dot", text: "Ready"});

            this.on('input', this.onInput);
            this.on('close', this.onClose);
        }

        /******************************************************************************************************************
         * called to register device
         *
         */
        registerDevice(client, name) {
            let states = {
                online: true,
                openPercent: 0
            };

            let device = {
                id: client.id,
                properties: {
                    type: 'action.devices.types.WINDOW',
                    traits: ['action.devices.traits.OpenClose'],
                    name: {
                        defaultNames: ["Node-RED Window"],
                        name: name
                    },
                    willReportState: true,
                    attributes: {
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-window-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    },
                    customData: {
                        "nodeid": client.id,
                        "type": 'window'
                    }
                }
            };

            device.states = states;

            return device;
        }

        updateStatusIcon() {
            if (this.states.openPercent === 0) {
                this.status({fill: "green", shape: "dot", text: "CLOSED"});
            } else {
                this.status({fill: "red", shape: "dot", text: util.format("OPEN %d%%", this.states.openPercent)});
            }
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        updated(device) {
            let states = device.states;
            let command = device.command;
            RED.log.debug("WindowNode(updated): states = " + JSON.stringify(states));

            Object.assign(this.states, states);

            this.updateStatusIcon();

            let msg = {
                topic: this.topicOut,
                device_name: device.properties.name.name,
                command: command,
                payload: {
                    online: states.online,
                    openPercent: states.openPercent,
                },
            };

            this.send(msg);
        };

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        onInput(msg) {
            RED.log.debug("WindowNode(input)");

            let topicArr = String(msg.topic).split(this.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("WindowNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'OPENPERCENT') {
                    RED.log.debug("WindowNode(input): OPEN/OPENPERCENT");
                    let openPercent;
                    if(msg.payload.toString().toUpperCase() === 'TRUE')
                        openPercent = 100;
                    else if(msg.payload.toString().toUpperCase() === 'FALSE')
                        openPercent = 0;
                    else
                        openPercent = formats.FormatValue(formats.Formats.INT, 'openPercent', msg.payload);

                    if (this.states.openPercent !== openPercent) {
                        this.states.openPercent = openPercent;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.openPercent;
                            this.send(msg);
                        }

                        this.updateStatusIcon();
                    }
                } else if (topic.toUpperCase() === 'ONLINE') {
                    RED.log.debug("WindowNode(input): ONLINE");
                    let online = formats.FormatValue(formats.Formats.BOOL, 'online', msg.payload);

                    if (this.states.online !== online) {
                        this.states.online = online;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.online;
                            this.send(msg);
                        }
                    }
                } else {
                    RED.log.debug("WindowNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("WindowNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    let openPercent     = this.states.openPercent;
                    let online = this.states.online;

                    // openPercent
                    if (object.hasOwnProperty('openPercent')) {
                        if(object.openPercent.toString().toUpperCase() === 'TRUE')
                            openPercent = 100;
                        else if(object.openPercent.toString().toUpperCase() === 'FALSE')
                            openPercent = 0;
                        else
                            openPercent = formats.FormatValue(formats.Formats.INT, 'openPercent', object.openPercent);
                    }

                    // online
                    if (object.hasOwnProperty('online')) {
                        online = formats.FormatValue(formats.Formats.BOOL, 'online', object.online);
                    }

                    if (this.states.openPercent !== openPercent || this.states.online !== online){
                        this.states.openPercent     = openPercent;
                        this.states.online = online;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states;
                            this.send(msg);
                        }

                        this.updateStatusIcon();
                    }
                }
            } catch (err) {
                RED.log.error(err);
            }
        }

        onClose(removed, done) {
            if (removed) {
                // this node has been deleted
                this.clientConn.remove(this, 'window');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'window');
            }

            done();
        }
    }

    RED.nodes.registerType("google-window", WindowNode);
}
