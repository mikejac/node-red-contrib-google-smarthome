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

module.exports = function (RED) {
    "use strict";

    const formats = require('./formatvalues.js');

    /******************************************************************************************************************
     *
     *
     */
    function VacuumNode(config) {
        RED.nodes.createNode(this, config);

        this.client = config.client;
        this.clientConn = RED.nodes.getNode(this.client);
        this.topicOut = config.topic;
        this.passthru = config.passthru;
        this.topicDelim = '/';

        if (!this.clientConn) {
            this.error(RED._("vacuum.errors.missing-config"));
            this.status({ fill: "red", shape: "dot", text: "Missing config" });
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("vacuum.errors.missing-bridge"));
            this.status({ fill: "red", shape: "dot", text: "Missing SmartHome" });
            return;
        }

        let node = this;

        RED.log.debug("VacuumNode(): node.topicOut = " + node.topicOut);

        this.registerDevice = function (client, name) {
            let states = {
                online: true,
                on: false,
                currentModeSettings: { power: "standard" },
                capacityRemaining: { rawValue: 100, unit: "PERCENTAGE" },
                isCharging: true,
            };

            let device = {
                id: client.id,
                properties: {
                    type: 'action.devices.types.VACUUM',
                    traits: [
                        'action.devices.traits.OnOff',
                        'action.devices.traits.Dock',
                        'action.devices.traits.Modes',
                        'action.devices.traits.EnergyStorage',
                        'action.devices.traits.Locator',
                    ],
                    name: {
                        defaultNames: ["Node-RED Vacuum"],
                        name: name
                    },
                    willReportState: false,
                    attributes: {
                        availableModes: [{
                            name: 'power',
                            name_values: [{
                                name_synonym: ['power', 'level'],
                                lang: 'en'
                            }, {
                                name_synonym: ['Stufe', 'Leistung'],
                                lang: 'de'
                            }],
                            settings: [{
                                setting_name: 'quiet',
                                setting_values: [{
                                    setting_synonym: ['quiet', 'silent', 'low'],
                                    lang: 'en'
                                }, {
                                    setting_synonym: ['Still', 'Leise'],
                                    lang: 'de'
                                }]
                            }, {
                                setting_name: 'standard',
                                setting_values: [{
                                    setting_synonym: ['standard', 'normal', 'default'],
                                    lang: 'en'
                                }, {
                                    setting_synonym: ['Standard', 'Normal'],
                                    lang: 'de'
                                }]
                            }, {
                                setting_name: 'medium',
                                setting_values: [{
                                    setting_synonym: ['medium'],
                                    lang: 'en'
                                }, {
                                    setting_synonym: ['Mittel'],
                                    lang: 'de'
                                }]
                            }, {
                                setting_name: 'turbo',
                                setting_values: [{
                                    setting_synonym: ['turbo', 'maximum', 'highest'],
                                    lang: 'en'
                                }, {
                                    setting_synonym: ['Turbo', 'Maximum', 'Höchstleistung'],
                                    lang: 'de'
                                }]
                            }],
                            ordered: true
                        }],
                        isRechargeable: true,
                        queryOnlyEnergyStorage: true
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-vacuum-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    },
                    customData: {
                        "nodeid": client.id,
                        "type": 'vacuum'
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
        this.updated = function (device) {   // this must be defined before the call to clientConn.register()
            let states = device.states;
            RED.log.debug("VacuumNode(updated): states = " + JSON.stringify(states));

            if (states.on) {
                node.status({ fill: "green", shape: "dot", text: "ON" });
            } else {
                node.status({ fill: "red", shape: "dot", text: "OFF" });
            }

            //clean up the message
            if (states.updateModeSettings) {
                states.currentModeSettings = states.updateModeSettings
                delete states.updateModeSettings
            }

            let msg = {
                topic: node.topicOut,
                device_name: device.properties.name.name,
                payload: states
            };

            node.send(msg);
        };

        this.states = this.clientConn.register(this, 'vacuum', config.name);

        this.status({ fill: "yellow", shape: "dot", text: "Ready" });

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("VacuumNode(input)");

            let topicArr = String(msg.topic).split(node.topicDelim);
            let topic = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("VacuumNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'ON') {
                    RED.log.debug("VacuumNode(input): ON");
                    let on = formats.FormatValue(formats.Formats.BOOL, 'on', msg.payload);

                    if (node.states.on !== on) {
                        node.states.on = on;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.on;
                            node.send(msg);
                        }

                        if (node.states.on) {
                            node.status({ fill: "green", shape: "dot", text: "ON" });
                        } else {
                            node.status({ fill: "red", shape: "dot", text: "OFF" });
                        }
                    }
                } else if (topic.toUpperCase() === 'ONLINE') {
                    RED.log.debug("VacuumNode(input): ONLINE");
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
                    RED.log.debug("VacuumNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("VacuumNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    RED.log.debug("VacuumNode object " + JSON.stringify(object));
                    RED.log.debug("VacuumNode node states = " + JSON.stringify(node.states));
                    let on = node.states.on;
                    let online = node.states.online;

                    let currentModeSettings = {};
                    currentModeSettings.power = node.states.currentModeSettings.power;

                    let capacityRemaining = {};
                    capacityRemaining.rawValue = node.states.capacityRemaining.rawValue;
                    capacityRemaining.unit = "PERCENTAGE";

                    let isCharging = node.states.isCharging;

                    // power level 
                    if (object.hasOwnProperty('currentModeSettings.power')) {
                        power = formats.FormatValue(formats.Formats.STRING, 'power', object.currentModeSettings.power);
                    }

                    // battery level
                    if (object.hasOwnProperty('currentModeSettings.rawValue')) {
                        rawValue = formats.FormatValue(formats.Formats.INT, 'battery', object.capacityRemaining.rawValue);
                    }

                    // charging
                    if (object.hasOwnProperty('isCharging')) {
                        isCharging = formats.FormatValue(formats.Formats.BOOL, 'isCharging', object.isCharging);
                    }

                    // on
                    if (object.hasOwnProperty('on')) {
                        on = formats.FormatValue(formats.Formats.BOOL, 'on', object.on);
                    }

                    // online
                    if (object.hasOwnProperty('online')) {
                        online = formats.FormatValue(formats.Formats.BOOL, 'online', object.online);
                    }

                    if (node.states.on !== on || node.states.online !== online || node.states.currentModeSettings.power !== currentModeSettings.power || node.states.capacityRemaining.rawValue !== capacityRemaining.rawValue || node.states.isCharging !== isCharging) {
                        node.states.on = on;
                        node.states.online = online;

                        node.states.currentModeSettings = currentModeSettings;
                        node.states.capacityRemaining = capacityRemaining;
                        node.states.isCharging = isCharging;

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

        this.on('close', function (removed, done) {
            if (removed) {
                // this node has been deleted
                node.clientConn.remove(node, 'vacuum');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'vacuum');
            }

            done();
        });
    }

    RED.nodes.registerType("google-vacuum", VacuumNode);
}
