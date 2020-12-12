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
    function ThermostatNode(config) {
        RED.nodes.createNode(this, config);

        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);
        this.topicOut   = config.topic;
        this.passthru   = config.passthru;
        this.topicDelim = '/';

        if (!this.clientConn) {
            this.error(RED._("thermostat.errors.missing-config"));
            this.status({fill:"red", shape:"dot", text:"Missing config"});
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("thermostat.errors.missing-bridge"));
            this.status({fill:"red", shape:"dot", text:"Missing SmartHome"});
            return;
        }

        let node = this;

        RED.log.debug("ThermostatNode(): node.topicOut = " + node.topicOut);

        this.registerDevice = function (client, name) {
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

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        this.updated = function(device) {   // this must be defined before the call to clientConn.register()
            let states = device.states;
            RED.log.debug("ThermostatNode(updated): states = " + JSON.stringify(states));

            node.status({fill:"green", shape:"dot", text:states.thermostatTemperatureSetpoint + " °C"});

            let msg = {
                topic: node.topicOut,
                device_name: device.properties.name.name,
                payload: states
            };

            node.send(msg);
        };

        this.states = this.clientConn.register(this, 'thermostat', config.name);

        this.status({fill:"yellow", shape:"dot", text:"Ready"});

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("ThermostatNode(input)");

            let topicArr = String(msg.topic).split(node.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("ThermostatNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'THERMOSTATTEMPERATUREAMBIENT') {
                    RED.log.debug("ThermostatNode(input): thermostatTemperatureAmbient");
                    let thermostatTemperatureAmbient = formats.FormatValue(formats.Formats.FLOAT, 'thermostatTemperatureAmbient', msg.payload);

                    if (node.states.thermostatTemperatureAmbient !== thermostatTemperatureAmbient) {
                        node.states.thermostatTemperatureAmbient = thermostatTemperatureAmbient;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.thermostatTemperatureAmbient;
                            node.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'THERMOSTATTEMPERATURESETPOINT') {
                    RED.log.debug("ThermostatNode(input): thermostatTemperatureSetpoint");
                    let thermostatTemperatureSetpoint = formats.FormatValue(formats.Formats.FLOAT, 'thermostatTemperatureSetpoint', msg.payload);

                    if (node.states.thermostatTemperatureSetpoint !== thermostatTemperatureSetpoint) {
                        node.states.thermostatTemperatureSetpoint = thermostatTemperatureSetpoint;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.thermostatTemperatureSetpoint;
                            node.send(msg);
                        }
                    }

                } else if (topic.toUpperCase() === 'ONLINE') {
                    RED.log.debug("ThermostatNode(input): ONLINE");
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
                    RED.log.debug("ThermostatNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("ThermostatNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    let thermostatTemperatureAmbient  = node.states.thermostatTemperatureAmbient;
                    let thermostatTemperatureSetpoint = node.states.thermostatTemperatureSetpoint;
                    let online                        = node.states.online;

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

                    if (node.states.thermostatTemperatureAmbient !== thermostatTemperatureAmbient || node.states.thermostatTemperatureSetpoint !== thermostatTemperatureSetpoint || node.states.online !== online){
                        node.states.thermostatTemperatureAmbient  = thermostatTemperatureAmbient;
                        node.states.thermostatTemperatureSetpoint = thermostatTemperatureSetpoint;
                        node.states.online                        = online;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states;
                            node.send(msg);
                        }
                    }
                }
            } catch (err) {
                RED.log.error(err);
            }
        });

        this.on('close', function(removed, done) {
            if (removed) {
                // this node has been deleted
                node.clientConn.remove(node, 'thermostat');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'thermostat');
            }

            done();
        });
    }

    RED.nodes.registerType("google-thermostat", ThermostatNode);
}
