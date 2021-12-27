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
 **/

module.exports = function(RED) {
    "use strict";

    const formats = require('../formatvalues.js');

    /******************************************************************************************************************
     *
     *
     */
    class VacuumNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.client     = config.client;
            this.clientConn = RED.nodes.getNode(this.client);
            this.topicOut   = config.topic;
            this.room_hint  = config.room_hint;
            this.passthru   = config.passthru;
            this.topicDelim = '/';

            if (!this.clientConn) {
                this.error(RED._("vacuum.errors.missing-config"));
                this.status({fill: "red", shape: "dot", text: "Missing config"});
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("vacuum.errors.missing-bridge"));
                this.status({fill: "red", shape: "dot", text: "Missing SmartHome"});
                return;
            }

            this.states = this.clientConn.register(this, 'vacuum', config.name);

            this.status({fill: "red", shape: "ring", text: "DEPRECATED!"});

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
                    roomHint: this.room_hint,
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
                    }
                }
            };

            device.states = states;

            return device;
        }

        updateStatusIcon() {
            this.status({fill: 'red', shape: 'ring', text: 'DEPRECATED!'});
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        updated(device) {
            let states = device.states;
            let command = device.command;
            RED.log.debug("VacuumNode(updated): states = " + JSON.stringify(states));

            Object.assign(this.states, states);

            this.updateStatusIcon();

            let msg = {
                device_name: device.properties.name.name,
                command: command,
                payload: {
                    online: states.online,
                    on: states.on,
                    currentModeSettings:{
                        "power": states.currentModeSettings.power,
                    },
                    capacityRemaining:{
                        rawValue: states.capacityRemaining.rawValue,
                        unit: "PERCENTAGE",
                    },
                    isCharging:true,
                },
            };

            if(this.topicOut)
                msg.topic = this.topicOut;

            this.send(msg);
        };

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        onInput(msg) {
            RED.log.debug("VacuumNode(input)");

            let topicArr = String(msg.topic).split(this.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("VacuumNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'ON') {
                    RED.log.debug("VacuumNode(input): ON");
                    let on = formats.FormatValue(formats.Formats.BOOL, 'on', msg.payload);

                    if (this.states.on !== on) {
                        this.states.on = on;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.on;
                            this.send(msg);
                        }

                        this.updateStatusIcon();
                    }
                } else if (topic.toUpperCase() === 'ONLINE') {
                    RED.log.debug("VacuumNode(input): ONLINE");
                    let online = formats.FormatValue(formats.Formats.BOOL, 'online', msg.payload);

                    if (this.states.online !== online) {
                        this.states.online = online;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.online;
                            this.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'CURRENTMODESETTINGS.POWER') {
                    RED.log.debug("VacuumNode(input): CURRENTMODESETTINGS.POWER");
                    let power = formats.FormatValue(formats.Formats.STRING, 'currentModeSettings.power', msg.payload);

                    if (this.states.currentModeSettings.power !== power) {
                        this.states.currentModeSettings.power = power;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.currentModeSettings.power;
                            this.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'CAPACITYREMAINING.RAWVALUE') {
                    RED.log.debug("VacuumNode(input): CAPACITYREMAINING.RAWVALUE");
                    let rawValue = formats.FormatValue(formats.Formats.STRING, 'capacityRemaining.rawValue', msg.payload);

                    if (this.states.capacityRemaining.rawValue !== rawValue) {
                        this.states.capacityRemaining.rawValue = rawValue;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.capacityRemaining.rawValue;
                            this.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'ISCHARGING') {
                    RED.log.debug("VacuumNode(input): ISCHARGING");
                    let isCharging = formats.FormatValue(formats.Formats.BOOL, 'isCharging', msg.payload);

                    if (this.states.isCharging !== isCharging) {
                        this.states.isCharging = isCharging;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.isCharging;
                            this.send(msg);
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
                    RED.log.debug("VacuumNode node states = " + JSON.stringify(this.states));
                    let on = this.states.on;
                    let online = this.states.online;

                    let currentModeSettings = {};
                    currentModeSettings.power = this.states.currentModeSettings.power;

                    let capacityRemaining = {};
                    capacityRemaining.rawValue = this.states.capacityRemaining.rawValue;
                    capacityRemaining.unit = "PERCENTAGE";

                    let isCharging = this.states.isCharging;

                    // power level 
                    if (object.hasOwnProperty('currentModeSettings') && object.currentModeSettings.hasOwnProperty('power')) {
                        currentModeSettings.power = formats.FormatValue(formats.Formats.STRING, 'power', object.currentModeSettings.power);
                    }

                    // battery level
                    if (object.hasOwnProperty('capacityRemaining') && object.capacityRemaining.hasOwnProperty('rawValue')) {
                        capacityRemaining.rawValue = formats.FormatValue(formats.Formats.INT, 'battery', object.capacityRemaining.rawValue);
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

                    if (this.states.on !== on || this.states.online !== online || this.states.currentModeSettings.power !== currentModeSettings.power || this.states.capacityRemaining.rawValue !== capacityRemaining.rawValue || this.states.isCharging !== isCharging) {
                        this.states.on = on;
                        this.states.online = online;

                        this.states.currentModeSettings = currentModeSettings;
                        this.states.capacityRemaining = capacityRemaining;
                        this.states.isCharging = isCharging;

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
                this.clientConn.remove(this, 'vacuum');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'vacuum');
            }

            done();
        }
    }

    RED.nodes.registerType("google-vacuum", VacuumNode);
}
