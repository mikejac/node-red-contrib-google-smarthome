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
    function SensorNode(config) {
        RED.nodes.createNode(this, config);

        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);
        this.topicOut   = config.topic;
        this.passthru   = config.passthru;
        this.topicDelim = '/';

        if (!this.clientConn) {
            this.error(RED._("sensor.errors.missing-config"));
            this.status({fill:"red", shape:"dot", text:"Missing config"});
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("sensor.errors.missing-bridge"));
            this.status({fill:"red", shape:"dot", text:"Missing SmartHome"});
            return;
        }

        let node = this;

        RED.log.debug("SensorNode(): node.topicOut = " + node.topicOut);

        this.registerDevice = function (client, name) {
            let states = {
                temperatureAmbientCelsius: undefined,
                temperatureSetpointCelsius: undefined,
                humidityAmbientPercent: undefined
            };

            let device = {
                id: client.id,
                properties: {
                    type: 'action.devices.types.SENSOR',
                    traits: ['action.devices.traits.TemperatureControl', 'action.devices.traits.HumiditySetting'],
                    name: {
                        defaultNames: ["Node-RED Sensor"],
                        name: name
                    },
                    willReportState: true,
                    attributes: {
                        temperatureUnitForUX: 'C',
                        queryOnlyHumiditySetting: true,
                        queryOnlyTemperatureControl: true,
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-sensor-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    },
                    customData: {
                        "nodeid": client.id,
                        "type": 'sensor'
                    }
                }
            };

            device.states = states;

            return device;
        }

        this.updateStatusIcon = function(states) {
            let txt = "";
            if (node.states.temperatureAmbientCelsius !== undefined)
                txt += node.states.temperatureAmbientCelsius + "\xB0C ";

            if (node.states.humidityAmbientPercent !== undefined)
                txt += node.states.humidityAmbientPercent + "% ";

            node.status({fill: "green", shape: "dot", text: txt});
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        this.updated = function(device) {   // this must be defined before the call to clientConn.register()
            let states = device.states;
            let command = device.command;
            RED.log.debug("SensorNode(updated): states = " + JSON.stringify(states));

            let msg = {
                topic: node.topicOut,
                device_name: device.properties.name.name,
                command: command,
                payload: {
                    temperatureAmbientCelsius: states.temperatureAmbientCelsius,
                    temperatureSetpointCelsius: states.temperatureSetpointCelsius,
                },
            };

            node.send(msg);
        };

        this.states = this.clientConn.register(this, 'sensor', config.name);

        this.status({fill:"yellow", shape:"dot", text:"Ready"});

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("SensorNode(input)");

            let topicArr = String(msg.topic).split(node.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("SensorNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'TEMPERATUREAMBIENTCELSIUS') {
                    RED.log.debug("SensorNode(input): temperatureAmbientCelsius");
                    let temperatureAmbientCelsius = formats.FormatValue(formats.Formats.FLOAT, 'temperatureAmbientCelsius', msg.payload);

                    if (node.states.temperatureAmbientCelsius !== temperatureAmbientCelsius) {
                        node.states.temperatureAmbientCelsius = temperatureAmbientCelsius;
                        node.states.temperatureSetpointCelsius = temperatureAmbientCelsius;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.temperatureAmbientCelsius;
                            node.send(msg);
                        }

                        node.updateStatusIcon(node.states);
                    }
                } else if (topic.toUpperCase() === 'HUMIDITYAMBIENTPERCENT') {
                    RED.log.debug("SensorNode(input): humidityAmbientPercent");
                    let humidityAmbientPercent = Math.round(formats.FormatValue(formats.Formats.INT, 'humidityAmbientPercent', msg.payload));

                    if (node.states.humidityAmbientPercent !== humidityAmbientPercent) {
                        node.states.humidityAmbientPercent = humidityAmbientPercent;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.humidityAmbientPercent;
                            node.send(msg);
                        }

                        node.updateStatusIcon(node.states);
                    }
                } else {
                    RED.log.debug("SensorNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("SensorNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    let temperatureAmbientCelsius  = node.states.temperatureAmbientCelsius;
                    let humidityAmbientPercent = node.states.humidityAmbientPercent;

                    // temperatureAmbientCelsius
                    if (object.hasOwnProperty('temperatureAmbientCelsius')) {
                        temperatureAmbientCelsius = formats.FormatValue(formats.Formats.FLOAT, 'temperatureAmbientCelsius', object.temperatureAmbientCelsius);
                    }

                    // humidityAmbientPercent
                    if (object.hasOwnProperty('humidityAmbientPercent')) {
                        humidityAmbientPercent = Math.round(formats.FormatValue(formats.Formats.INT, 'humidityAmbientPercent', object.humidityAmbientPercent));
                    }

                    if (node.states.temperatureAmbientCelsius !== temperatureAmbientCelsius || node.states.humidityAmbientPercent !== humidityAmbientPercent){
                        node.states.temperatureAmbientCelsius  = temperatureAmbientCelsius;
                        node.states.temperatureSetpointCelsius = temperatureAmbientCelsius;
                        node.states.humidityAmbientPercent = humidityAmbientPercent;

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
                node.clientConn.remove(node, 'sensor');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'sensor');
            }

            done();
        });
    }

    RED.nodes.registerType("google-sensor", SensorNode);
}
