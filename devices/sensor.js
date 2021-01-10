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
    class SensorNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.client     = config.client;
            this.clientConn = RED.nodes.getNode(this.client);
            this.topicOut   = config.topic;
            this.passthru   = config.passthru;
            this.topicDelim = '/';

            if (!this.clientConn) {
                this.error(RED._("sensor.errors.missing-config"));
                this.status({fill: "red", shape: "dot", text: "Missing config"});
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("sensor.errors.missing-bridge"));
                this.status({fill: "red", shape: "dot", text: "Missing SmartHome"});
                return;
            }

            this.states = this.clientConn.register(this, 'sensor', config.name);

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

        updateStatusIcon() {
            let txt = "";
            if (this.states.temperatureAmbientCelsius !== undefined)
                txt += states.temperatureAmbientCelsius + "\xB0C ";

            if (states.humidityAmbientPercent !== undefined)
                txt += states.humidityAmbientPercent + "% ";

            this.status({fill: "green", shape: "dot", text: txt});
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        updated(device) {
            let states = device.states;
            let command = device.command;
            RED.log.debug("SensorNode(updated): states = " + JSON.stringify(states));

            Object.assign(this.states, states);

            let msg = {
                topic: this.topicOut,
                device_name: device.properties.name.name,
                command: command,
                payload: {
                    temperatureAmbientCelsius: states.temperatureAmbientCelsius,
                    temperatureSetpointCelsius: states.temperatureSetpointCelsius,
                },
            };

            this.send(msg);
        };

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        onInput(msg) {
            RED.log.debug("SensorNode(input)");

            let topicArr = String(msg.topic).split(this.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("SensorNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'TEMPERATUREAMBIENTCELSIUS') {
                    RED.log.debug("SensorNode(input): temperatureAmbientCelsius");
                    let temperatureAmbientCelsius = formats.FormatValue(formats.Formats.FLOAT, 'temperatureAmbientCelsius', msg.payload);

                    if (this.states.temperatureAmbientCelsius !== temperatureAmbientCelsius) {
                        this.states.temperatureAmbientCelsius = temperatureAmbientCelsius;
                        this.states.temperatureSetpointCelsius = temperatureAmbientCelsius;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.temperatureAmbientCelsius;
                            this.send(msg);
                        }

                        this.updateStatusIcon();
                    }
                } else if (topic.toUpperCase() === 'HUMIDITYAMBIENTPERCENT') {
                    RED.log.debug("SensorNode(input): humidityAmbientPercent");
                    let humidityAmbientPercent = Math.round(formats.FormatValue(formats.Formats.INT, 'humidityAmbientPercent', msg.payload));

                    if (this.states.humidityAmbientPercent !== humidityAmbientPercent) {
                        this.states.humidityAmbientPercent = humidityAmbientPercent;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.humidityAmbientPercent;
                            this.send(msg);
                        }
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

                    let temperatureAmbientCelsius  = this.states.temperatureAmbientCelsius;
                    let humidityAmbientPercent = this.states.humidityAmbientPercent;

                    // temperatureAmbientCelsius
                    if (object.hasOwnProperty('temperatureAmbientCelsius')) {
                        temperatureAmbientCelsius = formats.FormatValue(formats.Formats.FLOAT, 'temperatureAmbientCelsius', object.temperatureAmbientCelsius);
                    }

                    // humidityAmbientPercent
                    if (object.hasOwnProperty('humidityAmbientPercent')) {
                        humidityAmbientPercent = Math.round(formats.FormatValue(formats.Formats.INT, 'humidityAmbientPercent', object.humidityAmbientPercent));
                    }

                    if (this.states.temperatureAmbientCelsius !== temperatureAmbientCelsius || this.states.humidityAmbientPercent !== humidityAmbientPercent){
                        this.states.temperatureAmbientCelsius  = temperatureAmbientCelsius;
                        this.states.temperatureSetpointCelsius = temperatureAmbientCelsius;
                        this.states.humidityAmbientPercent = humidityAmbientPercent;

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
                this.clientConn.remove(this, 'sensor');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'sensor');
            }

            done();
        }
    }

    RED.nodes.registerType("google-sensor", SensorNode);
}
