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
    class ThermostatNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.client     = config.client;
            this.clientConn = RED.nodes.getNode(this.client);
            this.topicOut   = config.topic;
            this.room_hint  = config.room_hint;
            this.passthru   = config.passthru;
            this.topicDelim = '/';

            if (!this.clientConn) {
                this.error(RED._("thermostat.errors.missing-config"));
                this.status({fill: "red", shape: "dot", text: "Missing config"});
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("thermostat.errors.missing-bridge"));
                this.status({fill: "red", shape: "dot", text: "Missing SmartHome"});
                return;
            }

            this.states = this.clientConn.register(this, 'thermostat', config.name);

            this.status({fill: "yellow", shape: "dot", text: "Ready"});

            this.on('input', this.onInput);
            this.on('close', this.onClose);
        }

        registerDevice(client, name) {
            let states = {
                online: true,
                thermostatMode: "heat",
                thermostatTemperatureSetpoint: 20,
                thermostatTemperatureAmbient: 10,
            };

            let device = {
                id: client.id,
                properties: {
                    type: 'action.devices.types.THERMOSTAT',
                    traits: ['action.devices.traits.TemperatureSetting'],
                    name: {
                        defaultNames: ["Node-RED Thermostat"],
                        name: name
                    },
                    roomHint: me.room_hint,
                    willReportState: true,
                    attributes: {
                        availableThermostatModes: "heat",
                        thermostatTemperatureUnit: "C",
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-thermostat-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    },
                    customData: {
                        "nodeid": client.id,
                        "type": 'thermostat'
                    }
                }
            };

            device.states = states;

            return device;
        }

        updateStatusIcon() {
            this.status({fill: "green", shape: "dot", text: "T: " + this.states.thermostatTemperatureAmbient + " °C | S: " + this.states.thermostatTemperatureSetpoint + " °C"});
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        updated(device) {
            let states = device.states;
            let command = device.command;
            RED.log.debug("ThermostatNode(updated): states = " + JSON.stringify(states));

            Object.assign(this.states, states);

            this.updateStatusIcon();

            let msg = {
                topic: this.topicOut,
                device_name: device.properties.name.name,
                command: command,
                payload: {
                    online: states.online,
                    thermostatMode: states.thermostatMode,
                    thermostatTemperatureSetpoint: states.thermostatTemperatureSetpoint,
                    thermostatTemperatureAmbient: states.thermostatTemperatureAmbient,
                },
            };

            this.send(msg);
        };

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        onInput(msg) {
            RED.log.debug("ThermostatNode(input)");

            let topicArr = String(msg.topic).split(this.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("ThermostatNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'THERMOSTATTEMPERATUREAMBIENT') {
                    RED.log.debug("ThermostatNode(input): thermostatTemperatureAmbient");
                    let thermostatTemperatureAmbient = formats.FormatValue(formats.Formats.FLOAT, 'thermostatTemperatureAmbient', msg.payload);

                    if (this.states.thermostatTemperatureAmbient !== thermostatTemperatureAmbient) {
                        this.states.thermostatTemperatureAmbient = thermostatTemperatureAmbient;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.thermostatTemperatureAmbient;
                            this.send(msg);
                        }

                        this.updateStatusIcon();
                    }
                } else if (topic.toUpperCase() === 'THERMOSTATTEMPERATURESETPOINT') {
                    RED.log.debug("ThermostatNode(input): thermostatTemperatureSetpoint");
                    let thermostatTemperatureSetpoint = formats.FormatValue(formats.Formats.FLOAT, 'thermostatTemperatureSetpoint', msg.payload);

                    if (this.states.thermostatTemperatureSetpoint !== thermostatTemperatureSetpoint) {
                        this.states.thermostatTemperatureSetpoint = thermostatTemperatureSetpoint;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.thermostatTemperatureSetpoint;
                            this.send(msg);
                        }

                        this.updateStatusIcon();
                    }

                } else if (topic.toUpperCase() === 'ONLINE') {
                    RED.log.debug("ThermostatNode(input): ONLINE");
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
                    RED.log.debug("ThermostatNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("ThermostatNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    let thermostatTemperatureAmbient  = this.states.thermostatTemperatureAmbient;
                    let thermostatTemperatureSetpoint = this.states.thermostatTemperatureSetpoint;
                    let online                        = this.states.online;

                    // thermostatTemperatureAmbient
                    if (object.hasOwnProperty('thermostatTemperatureAmbient')) {
                        thermostatTemperatureAmbient = formats.FormatValue(formats.Formats.FLOAT, 'thermostatTemperatureAmbient', object.thermostatTemperatureAmbient);
                    }

                    // thermostatTemperatureSetpoint
                    if (object.hasOwnProperty('thermostatTemperatureSetpoint')) {
                        thermostatTemperatureSetpoint = formats.FormatValue(formats.Formats.FLOAT, 'thermostatTemperatureSetpoint', object.thermostatTemperatureSetpoint);
                    }

                    // online
                    if (object.hasOwnProperty('online')) {
                        online = formats.FormatValue(formats.Formats.BOOL, 'online', object.online);
                    }

                    if (this.states.thermostatTemperatureAmbient !== thermostatTemperatureAmbient || this.states.thermostatTemperatureSetpoint !== thermostatTemperatureSetpoint || this.states.online !== online){
                        this.states.thermostatTemperatureAmbient  = thermostatTemperatureAmbient;
                        this.states.thermostatTemperatureSetpoint = thermostatTemperatureSetpoint;
                        this.states.online                        = online;

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
                this.clientConn.remove(this, 'thermostat');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'thermostat');
            }

            done();
        }
    }

    RED.nodes.registerType("google-thermostat", ThermostatNode);
}
