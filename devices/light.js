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
    class LightOnOffNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.client     = config.client;
            this.clientConn = RED.nodes.getNode(this.client);
            this.topicOut   = config.topic;
            this.passthru   = config.passthru;
            this.topicDelim = '/';

            if (!this.clientConn) {
                this.error(RED._("light.errors.missing-config"));
                this.status({fill: "red", shape: "dot", text: "Missing config"});
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("light.errors.missing-bridge"));
                this.status({fill: "red", shape: "dot", text: "Missing SmartHome"});
                return;
            }

            this.states = this.clientConn.register(this, 'light-onoff', config.name);

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
                on: false
            };

            let device = {
                id: client.id,
                properties: {
                    type: 'action.devices.types.LIGHT',
                    traits: ['action.devices.traits.OnOff'],
                    name: {
                        defaultNames: ["Node-RED On/Off Light"],
                        name: name
                    },
                    willReportState: true,
                    attributes: {
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-light-onoff-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    },
                    customData: {
                        "nodeid": client.id,
                        "type": 'light-onoff'
                    }
                }
            };

            device.states = states;

            return device;
        }

        updateStatusIcon() {
            if (this.states.on) {
                this.status({fill: "green", shape: "dot", text: "ON"});
            } else {
                this.status({fill: "red", shape: "dot", text: "OFF"});
            }
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        updated(device) {
            let states = device.states;
            let command = device.command;
            RED.log.debug("LightOnOffNode(updated): states = " + JSON.stringify(states));

            Object.assign(this.states, states);

            this.updateStatusIcon();

            let msg = {
                topic: this.topicOut,
                device_name: device.properties.name.name,
                command: command,
                payload: {
                    online: states.online,
                    on: states.on,
                },
            };

            this.send(msg);
        };

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        onInput(msg) {
            RED.log.debug("LightOnOffNode(input)");

            let topicArr = String(msg.topic).split(this.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("LightOnOffNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'ON') {
                    RED.log.debug("LightOnOffNode(input): ON");
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
                    RED.log.debug("LightOnOffNode(input): ONLINE");
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
                    RED.log.debug("LightOnOffNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("LightOnOffNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    let on     = this.states.on;
                    let online = this.states.online;

                    // on
                    if (object.hasOwnProperty('on')) {
                        on = formats.FormatValue(formats.Formats.BOOL, 'on', object.on);
                    }

                    // online
                    if (object.hasOwnProperty('online')) {
                        online = formats.FormatValue(formats.Formats.BOOL, 'online', object.online);
                    }

                    if (this.states.on !== on || this.states.online !== online){
                        this.states.on     = on;
                        this.states.online = online;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload             = {};
                            msg.payload.online      = this.states.online;
                            msg.payload.on          = this.states.on;
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
                this.clientConn.remove(this, 'light-onoff');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'light-onoff');
            }

            done();
        }
    }

    RED.nodes.registerType("google-light-onoff", LightOnOffNode);

    /******************************************************************************************************************
     *
     *
     */
    class LightDimmableNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.client     = config.client;
            this.clientConn = RED.nodes.getNode(this.client);
            this.topicOut   = config.topic;
            this.passthru   = config.passthru;
            this.topicDelim = '/';

            if (!this.clientConn) {
                this.error(RED._("light.errors.missing-config"));
                this.status({fill: "red", shape: "dot", text: "Missing config"});
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("light.errors.missing-bridge"));
                this.status({fill: "red", shape: "dot", text: "Missing SmartHome"});
                return;
            }

            this.states = this.clientConn.register(this, 'light-dimmable', config.name);

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
                on: false,
                brightness: 100     // integer, absolute brightness, from 0 to 100
            };

            let device = {
                id: client.id,
                properties: {
                    type: 'action.devices.types.LIGHT',
                    traits: [
                        'action.devices.traits.OnOff',
                        'action.devices.traits.Brightness'
                    ],
                    name: {
                        defaultNames: ["Node-RED Dimmable Light"],
                        name: name
                    },
                    willReportState: true,
                    attributes: {
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-light-dimmable-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    },
                    customData: {
                        "nodeid": client.id,
                        "type": 'light-dimmable'
                    }
                }
            };

            device.states = states;

            return device;
        }

        updateStatusIcon() {
            if (this.states.on) {
                this.status({fill: "green", shape: "dot", text: "ON"});
            } else {
                this.status({fill: "red", shape: "dot", text: "OFF"});
            }
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        updated(device) {
            let states = device.states;
            let command = device.command;
            RED.log.debug("LightDimmableNode(updated): states = " + JSON.stringify(states));

            Object.assign(this.states, states);

            this.updateStatusIcon();

            let msg = {
                topic: this.topicOut,
                device_name: device.properties.name.name,
                command: command,
                payload: {
                    online: states.online,
                    on: states.on,
                    brightness: states.brightness,
                },
            };

            this.send(msg);
        };

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        onInput(msg) {
            RED.log.debug("LightDimmableNode(input)");

            let topicArr = String(msg.topic).split(this.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("LightDimmableNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'ON') {
                    RED.log.debug("LightDimmableNode(input): ON");
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
                    RED.log.debug("LightDimmableNode(input): ONLINE");
                    let online = formats.FormatValue(formats.Formats.BOOL, 'online', msg.payload);

                    if (this.states.online !== online) {
                        this.states.online = online;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.online;
                            this.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'BRIGHTNESS') {
                    RED.log.debug("LightDimmableNode(input): BRIGHTNESS");
                    let brightness = formats.FormatBrightness(formats.FormatValue(formats.Formats.INT, 'brightness', msg.payload));

                    if (this.states.brightness !== brightness) {
                        this.states.brightness = brightness;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.brightness;
                            this.send(msg);
                        }
                    }
                } else {
                    RED.log.debug("LightDimmableNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("LightDimmableNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    let on         = this.states.on;
                    let online     = this.states.online;
                    let brightness = this.states.brightness;

                    // on
                    if (object.hasOwnProperty('on')) {
                        on = formats.FormatValue(formats.Formats.BOOL, 'on', object.on);
                    }

                    // online
                    if (object.hasOwnProperty('online')) {
                        online = formats.FormatValue(formats.Formats.BOOL, 'online', object.online);
                    }

                    // brightness
                    if (object.hasOwnProperty('brightness')) {
                        brightness = formats.FormatBrightness(formats.FormatValue(formats.Formats.INT, 'brightness', object.brightness));
                    }

                    if (this.states.on !== on || this.states.online !== online || this.states.brightness !== brightness){
                        this.states.on         = on;
                        this.states.online     = online;
                        this.states.brightness = brightness;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload             = {};
                            msg.payload.online      = this.states.online;
                            msg.payload.on          = this.states.on;
                            msg.payload.brightness  = this.states.brightness;
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
                this.clientConn.remove(this, 'light-dimmable');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'light-dimmable');
            }

            done();
        }
    }

    RED.nodes.registerType("google-light-dimmable", LightDimmableNode);

    /******************************************************************************************************************
     *
     *
     */
    class LightColorTempNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.client     = config.client;
            this.clientConn = RED.nodes.getNode(this.client);
            this.topicOut   = config.topic;
            this.passthru   = config.passthru;
            this.topicDelim = '/';

            if (!this.clientConn) {
                this.error(RED._("light.errors.missing-config"));
                this.status({fill: "red", shape: "dot", text: "Missing config"});
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("light.errors.missing-bridge"));
                this.status({fill: "red", shape: "dot", text: "Missing SmartHome"});
                return;
            }

            this.states = this.clientConn.register(this, 'light-temperature', config.name);

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
                on: false,
                brightness: 100,     // integer, absolute brightness, from 0 to 100
                color: {
                    name: "",
                    temperatureK: 4000,
                }
            };

            let device = {
                id: client.id,
                properties: {
                    type: 'action.devices.types.LIGHT',
                    traits: [
                        'action.devices.traits.OnOff',
                        'action.devices.traits.Brightness',
                        'action.devices.traits.ColorSetting'
                    ],
                    name: {
                        defaultNames: ["Node-RED ColorTemp Light"],
                        name: name
                    },
                    willReportState: true,
                    attributes: {
                        // this is the default range used by Googles color presets in the Home App
                        colorTemperatureRange: {
                            temperatureMinK: 2000,
                            temperatureMaxK: 6000
                        },
                        commandOnlyColorSetting: false,
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-light-temperature-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    },
                    customData: {
                        "nodeid": client.id,
                        "type": 'light-temperature'
                    }
                }
            };

            device.states = states;

            return device;
        }

        updateStatusIcon() {
            if (this.states.on) {
                this.status({fill: "green", shape: "dot", text: "ON"});
            } else {
                this.status({fill: "red", shape: "dot", text: "OFF"});
            }
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        updated(device) {
            let states = device.states;
            let command = device.command;
            RED.log.debug("LightColorTempNode(updated): states = " + JSON.stringify(states));

            Object.assign(this.states, states);

            this.updateStatusIcon();

            let msg = {
                topic: this.topicOut,
                device_name: device.properties.name.name,
                command: command,
                payload: {
                    online: states.online,
                    on: states.on,
                    brightness: states.brightness,
                    temperature: states.color.temperature,
                },
            };

            this.send(msg);
        };

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        onInput(msg) {
            RED.log.debug("LightColorTempNode(input)");

            let topicArr = String(msg.topic).split(this.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("LightColorTempNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'ON') {
                    RED.log.debug("LightColorTempNode(input): ON");
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
                    RED.log.debug("LightColorTempNode(input): ONLINE");
                    let online = formats.FormatValue(formats.Formats.BOOL, 'online', msg.payload);

                    if (this.states.online !== online) {
                        this.states.online = online;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.online;
                            this.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'BRIGHTNESS') {
                    RED.log.debug("LightColorTempNode(input): BRIGHTNESS");
                    let brightness = formats.FormatBrightness(formats.FormatValue(formats.Formats.INT, 'brightness', msg.payload));

                    if (this.states.brightness !== brightness) {
                        this.states.brightness = brightness;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.brightness;
                            this.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'TEMPERATURE') {
                    RED.log.debug("LightColorTempNode(input): TEMPERATURE");
                    let temperature = formats.FormatColorTemperature(formats.FormatValue(formats.Formats.INT, 'temperature', msg.payload));

                    if (this.states.color.temperatureK !== temperature) {
                        this.states.color.temperatureK = temperature;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.color.temperatureK;
                            this.send(msg);
                        }
                    }
                } else {
                    RED.log.debug("LightColorTempNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("LightColorTempNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    let on = this.states.on;
                    let online = this.states.online;
                    let brightness = this.states.brightness;
                    let temperature = this.states.color.temperatureK;

                    // on
                    if (object.hasOwnProperty('on')) {
                        on = formats.FormatValue(formats.Formats.BOOL, 'on', object.on);
                    }

                    // online
                    if (object.hasOwnProperty('online')) {
                        online = formats.FormatValue(formats.Formats.BOOL, 'online', object.online);
                    }

                    // brightness
                    if (object.hasOwnProperty('brightness')) {
                        brightness = formats.FormatBrightness(formats.FormatValue(formats.Formats.INT, 'brightness', object.brightness));
                    }

                    // color
                    if (object.hasOwnProperty('temperature')) {
                        temperature = formats.FormatColorTemperature(formats.FormatValue(formats.Formats.INT, 'temperature', object.temperature));
                    }

                    if (this.states.on !== on || this.states.online !== online || this.states.brightness !== brightness || this.states.color.temperatureK !== temperature) {
                        this.states.on = on;
                        this.states.online = online;
                        this.states.brightness = brightness;
                        this.states.color.temperatureK = temperature;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = {};
                            msg.payload.online = this.states.online;
                            msg.payload.on = this.states.on;
                            msg.payload.brightness = this.states.brightness;
                            msg.payload.temperature = this.states.color.temperatureK;
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
                this.clientConn.remove(this, 'light-temperature');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'light-temperature');
            }

            done();
        }
    }

    RED.nodes.registerType("google-light-temperature", LightColorTempNode);

    /******************************************************************************************************************
     *
     *
     */
    class LightHsvNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.client     = config.client;
            this.clientConn = RED.nodes.getNode(this.client);
            this.topicOut   = config.topic;
            this.passthru   = config.passthru;
            this.topicDelim = '/';

            if (!this.clientConn) {
                this.error(RED._("light.errors.missing-config"));
                this.status({fill: "red", shape: "dot", text: "Missing config"});
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("light.errors.missing-bridge"));
                this.status({fill: "red", shape: "dot", text: "Missing SmartHome"});
                return;
            }

            this.states = this.clientConn.register(this, 'light-hsv', config.name);

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
                on: false,
                brightness: 100,            // integer, absolute brightness, from 0 to 100
                color: {
                    name: "",
                    spectrumHsv: {
                        hue: 0.0,           // float, representing hue as positive degrees in the range of [0.0, 360.0)
                        saturation: 0.0,    // float, representing saturation as a percentage in the range [0.0, 1.0]
                        value: 1            // float, representing value as a percentage in the range [0.0, 1.0]
                    }
                }
            };

            let device = {
                id: client.id,
                properties: {
                    type: 'action.devices.types.LIGHT',
                    traits: [
                        'action.devices.traits.OnOff',
                        'action.devices.traits.Brightness',
                        'action.devices.traits.ColorSetting'
                    ],
                    name: {
                        defaultNames: ["Node-RED HSV Light"],
                        name: name
                    },
                    willReportState: true,
                    attributes: {
                        colorModel: "hsv",
                        commandOnlyColorSetting: false,
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-light-hsv-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    },
                    customData: {
                        "nodeid": client.id,
                        "type": 'light-hsv'
                    }
                }
            };

            device.states = states;

            return device;
        }

        updateStatusIcon() {
            if (this.states.on) {
                this.status({fill: "green", shape: "dot", text: "ON"});
            } else {
                this.status({fill: "red", shape: "dot", text: "OFF"});
            }
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        updated(device) {
            let states = device.states;
            let command = device.command;
            RED.log.debug("LightHsvNode(updated): states = " + JSON.stringify(states));

            Object.assign(this.states, states);

            this.updateStatusIcon();

            let msg = {
                topic: this.topicOut,
                device_name: device.properties.name.name,
                command: command,
                payload: {
                    online: states.online,
                    on: states.on,
                    hue: states.color.spectrumHsv.hue,
                    saturation: states.color.spectrumHsv.saturation * 100,  // rescale
                    value: states.color.spectrumHsv.value * 100,            // rescale
                    name: states.color.name,
                    brightness: states.brightness,
                },
            };

            this.send(msg);
        };

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        onInput(msg) {
            RED.log.debug("LightHsvNode(input)");

            let topicArr = String(msg.topic).split(this.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("LightHsvNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'ON') {
                    RED.log.debug("LightHsvNode(input): ON");
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
                    RED.log.debug("LightHsvNode(input): ONLINE");
                    let online = formats.FormatValue(formats.Formats.BOOL, 'online', msg.payload);

                    if (this.states.online !== online) {
                        this.states.online = online;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.online;
                            this.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'BRIGHTNESS') {  // Integer, 0 - 100
                    RED.log.debug("LightHsvNode(input): BRIGHTNESS");
                    let brightness = formats.FormatBrightness(formats.FormatValue(formats.Formats.INT, 'brightness', msg.payload));

                    if (this.states.brightness !== brightness) {
                        this.states.brightness = brightness;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = brightness;
                            this.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'HUE') {  // Float, 0.0 - 360.0
                    RED.log.debug("LightHsvNode(input): HUE");
                    let hue = formats.FormatHue(formats.FormatValue(formats.Formats.FLOAT, 'hue', msg.payload));

                    if (this.states.color.spectrumHsv.hue !== hue) {
                        this.states.color.spectrumHsv.hue = hue;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = hue;
                            this.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'SATURATION') {  // Float, 0.0 - 100.0
                    RED.log.debug("LightHsvNode(input): SATURATION");
                    let saturation = formats.FormatSaturation(formats.FormatValue(formats.Formats.FLOAT, 'saturation', msg.payload)) / 100;

                    if (this.states.color.spectrumHsv.saturation !== saturation) {
                        this.states.color.spectrumHsv.saturation = saturation / 100;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = saturation;
                            this.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'VALUE') {  // Float, 0.0 - 100.0
                    RED.log.debug("LightHsvNode(input): VALUE");
                    let value = formats.FormatSaturation(formats.FormatValue(formats.Formats.FLOAT, 'value', msg.payload)) / 100;

                    if (this.states.color.spectrumHsv.value !== value) {
                        this.states.color.spectrumHsv.value = value / 100;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = value;
                            this.send(msg);
                        }
                    }
                } else {
                    RED.log.debug("LightHsvNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("LightHsvNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    let on         = this.states.on;
                    let online     = this.states.online;
                    let brightness = this.states.brightness;
                    let hue        = this.states.color.spectrumHsv.hue;
                    let saturation = this.states.color.spectrumHsv.saturation;
                    let value      = this.states.color.spectrumHsv.value;

                    // on
                    if (object.hasOwnProperty('on')) {
                        on = formats.FormatValue(formats.Formats.BOOL, 'on', object.on);
                    }

                    // online
                    if (object.hasOwnProperty('online')) {
                        online = formats.FormatValue(formats.Formats.BOOL, 'online', object.online);
                    }

                    // brightness
                    if (object.hasOwnProperty('brightness')) {
                        brightness = formats.FormatBrightness(formats.FormatValue(formats.Formats.INT, 'brightness', object.brightness));
                    }

                    // hue
                    if (object.hasOwnProperty('hue')) {
                        hue = formats.FormatHue(formats.FormatValue(formats.Formats.FLOAT, 'hue', object.hue));
                    }

                    // saturation
                    if (object.hasOwnProperty('saturation')) {
                        saturation = formats.FormatSaturation(formats.FormatValue(formats.Formats.FLOAT, 'saturation', object.saturation)) / 100;
                    }

                    // value
                    if (object.hasOwnProperty('value')) {
                        saturation = formats.FormatSaturation(formats.FormatValue(formats.Formats.FLOAT, 'value', object.value)) / 100;
                    }

                    if (this.states.on !== on || this.states.online !== online || this.states.brightness !== brightness || this.states.color.spectrumHsv.hue !== hue || this.states.color.spectrumHsv.saturation !== saturation || this.states.color.spectrumHsv.value !== value) {
                        this.states.on                              = on;
                        this.states.online                          = online;
                        this.states.brightness                      = brightness;
                        this.states.color.spectrumHsv.hue           = hue;
                        this.states.color.spectrumHsv.saturation    = saturation;
                        this.states.color.spectrumHsv.value         = value;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload             = {};
                            msg.payload.online      = this.states.online;
                            msg.payload.on          = this.states.on;
                            msg.payload.hue         = this.states.color.spectrumHsv.hue;
                            msg.payload.saturation  = this.states.color.spectrumHsv.saturation * 100;   // rescale
                            msg.payload.value       = this.states.color.spectrumHsv.value * 100;        // rescale
                            msg.payload.name        = this.states.color.name;
                            msg.payload.brightness  = this.states.brightness;
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
                this.clientConn.remove(this, 'light-hsv');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'light-hsv');
            }

            done();
        }
    }

    RED.nodes.registerType("google-light-hsv", LightHsvNode);

    /******************************************************************************************************************
     *
     *
     */
    class LightRgbNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.client     = config.client;
            this.clientConn = RED.nodes.getNode(this.client);
            this.topicOut   = config.topic;
            this.passthru   = config.passthru;
            this.topicDelim = '/';

            if (!this.clientConn) {
                this.error(RED._("light.errors.missing-config"));
                this.status({fill: "red", shape: "dot", text: "Missing config"});
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("light.errors.missing-bridge"));
                this.status({fill: "red", shape: "dot", text: "Missing SmartHome"});
                return;
            }

            this.states = this.clientConn.register(this, 'light-rgb', config.name);

            this.status({fill: "yellow", shape: "dot", text: "Ready"});

            this.on('input', this.onInput);
            this.on('close', this.onClose);
        }

        /******************************************************************************************************************
         * called to register device
         *
         */
        registerDevice(client, name) {
            // according to Googles own doc.'s, 'color.spectrumRGB' should actually be 'color.spectrumRgb'
            let states = {
                online: true,
                on: false,
                brightness: 100,            // integer, absolute brightness, from 0 to 100
                color: {
                    name: "",
                    spectrumRGB: 16777215   // red = 16711680, green = 65280, blue = 255
                }
            };

            let device = {
                id: client.id,
                properties: {
                    type: 'action.devices.types.LIGHT',
                    traits: [
                        'action.devices.traits.OnOff',
                        'action.devices.traits.Brightness',
                        'action.devices.traits.ColorSetting'
                    ],
                    name: {
                        defaultNames: ["Node-RED RGB Light"],
                        name: name
                    },
                    willReportState: true,
                    attributes: {
                        colorModel: "rgb",
                        commandOnlyColorSetting: false,
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-light-rgb-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    },
                    customData: {
                        "nodeid": client.id,
                        "type": 'light-rgb'
                    }
                }
            };

            device.states = states;

            return device;
        }

        updateStatusIcon() {
            if (this.states.on) {
                this.status({fill: "green", shape: "dot", text: "ON"});
            } else {
                this.status({fill: "red", shape: "dot", text: "OFF"});
            }
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        updated(device) {
            let states = device.states;
            let command = device.command;
            RED.log.debug("LightRgbNode(updated): states = " + JSON.stringify(states));

            Object.assign(this.states, states);

            this.updateStatusIcon();

            let msg = {
                topic: this.topicOut,
                device_name: device.properties.name.name,
                command: command,
                payload: {
                    online: states.online,
                    on: states.on,
                    rgb: states.color.spectrumRGB,
                    name: states.color.name,
                    brightness: states.brightness,
                },
            };

            this.send(msg);
        };

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        onInput(msg) {
            RED.log.debug("LightRgbNode(input)");

            let topicArr = String(msg.topic).split(this.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("LightRgbNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'ON') {
                    RED.log.debug("LightRgbNode(input): ON");
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
                    RED.log.debug("LightRgbNode(input): ONLINE");
                    let online = formats.FormatValue(formats.Formats.BOOL, 'online', msg.payload);

                    if (this.states.online !== online) {
                        this.states.online = online;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.online;
                            this.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'BRIGHTNESS') {  // Integer, 0 - 100
                    RED.log.debug("LightRgbNode(input): BRIGHTNESS");
                    let brightness = formats.FormatBrightness(formats.FormatValue(formats.Formats.INT, 'brightness', msg.payload));

                    if (this.states.brightness !== brightness) {
                        this.states.brightness = brightness;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = brightness;
                            this.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'RGB') {  // Integer, 0 - 16777215
                    RED.log.debug("LightRgbNode(input): RGB");
                    let rgb = formats.FormatRGB(formats.FormatValue(formats.Formats.INT, 'rgb', msg.payload));

                    if (this.states.color.spectrumRGB !== rgb) {
                        this.states.color.spectrumRGB = rgb;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = rgb;
                            this.send(msg);
                        }
                    }
                } else {
                    RED.log.debug("LightRgbNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("LightRgbNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    let on         = this.states.on;
                    let online     = this.states.online;
                    let brightness = this.states.brightness;
                    let rgb        = this.states.color.spectrumRGB;

                    // on
                    if (object.hasOwnProperty('on')) {
                        on = formats.FormatValue(formats.Formats.BOOL, 'on', object.on);
                    }

                    // online
                    if (object.hasOwnProperty('online')) {
                        online = formats.FormatValue(formats.Formats.BOOL, 'online', object.online);
                    }

                    // brightness
                    if (object.hasOwnProperty('brightness')) {
                        brightness = formats.FormatBrightness(formats.FormatValue(formats.Formats.INT, 'brightness', object.brightness));
                    }

                    // rgb
                    if (object.hasOwnProperty('rgb')) {
                        rgb = formats.FormatRGB(formats.FormatValue(formats.Formats.INT, 'rgb', object.rgb));
                    }

                    if (this.states.on !== on || this.states.online !== online || this.states.brightness !== brightness || this.states.color.spectrumRGB !== rgb) {
                        this.states.on                  = on;
                        this.states.online              = online;
                        this.states.brightness          = brightness;
                        this.states.color.spectrumRGB   = rgb;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload             = {};
                            msg.payload.online      = this.states.online;
                            msg.payload.on          = this.states.on;
                            msg.payload.rgb         = this.states.color.spectrumRGB;
                            msg.payload.brightness  = this.states.brightness;
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
                this.clientConn.remove(this, 'light-rgb');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'light-rgb');
            }

            done();
        }
    }

    RED.nodes.registerType("google-light-rgb", LightRgbNode);

    /******************************************************************************************************************
     *
     *
     */
    class LightRgbTempNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.client     = config.client;
            this.clientConn = RED.nodes.getNode(this.client);
            this.topicOut   = config.topic;
            this.passthru   = config.passthru;
            this.topicDelim = '/';

            if (!this.clientConn) {
                this.error(RED._("light.errors.missing-config"));
                this.status({fill: "red", shape: "dot", text: "Missing config"});
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("light.errors.missing-bridge"));
                this.status({fill: "red", shape: "dot", text: "Missing SmartHome"});
                return;
            }

            this.states = this.clientConn.register(this, 'light-rgb-temp', config.name);

            this.status({fill: "yellow", shape: "dot", text: "Ready"});

            this.on('input', this.onInput);
            this.on('close', this.onClose);
        }

        /******************************************************************************************************************
         * called to register device
         *
         */
        registerDevice(client, name) {
            // according to Googles own doc.'s, 'color.spectrumRGB' should actually be 'color.spectrumRgb'
            let states = {
                online: true,
                on: false,
                brightness: 100,            // integer, absolute brightness, from 0 to 100
                color: {
                    name: "",
                    spectrumRGB: 16777215,   // red = 16711680, green = 65280, blue = 255
                    temperatureK: 4000
                }
            };

            let device = {
                id: client.id,
                properties: {
                    type: 'action.devices.types.LIGHT',
                    traits: [
                        'action.devices.traits.OnOff',
                        'action.devices.traits.Brightness',
                        'action.devices.traits.ColorSetting'
                    ],
                    name: {
                        defaultNames: ["Node-RED RGB/Temp Light"],
                        name: name
                    },
                    willReportState: true,
                    attributes: {
                        colorModel: "rgb",
                        colorTemperatureRange: {
                            temperatureMinK: 2000,
                            temperatureMaxK: 6000
                        },
                        commandOnlyColorSetting: false,
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-light-rgb-temp-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    },
                    customData: {
                        "nodeid": client.id,
                        "type": 'light-rgb-temp'
                    }
                }
            };

            device.states = states;

            return device;
        }

        updateStatusIcon() {
            if (this.states.on) {
                this.status({fill: "green", shape: "dot", text: "ON"});
            } else {
                this.status({fill: "red", shape: "dot", text: "OFF"});
            }
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        updated(device) {
            let states = device.states;
            let command = device.command;
            RED.log.debug("LightRgbTempNode(updated): states = " + JSON.stringify(states));

            Object.assign(this.states, states);

            this.updateStatusIcon();

            let msg = {
                topic: this.topicOut,
                device_name: device.properties.name.name,
                command: command,
                payload: {
                    online: states.online,
                    on: states.on,
                    rgb: states.color.spectrumRGB,
                    temperature: states.color.temperature,
                    name: states.color.name,
                    brightness: states.brightness,
                },
            };

            this.send(msg);
        };

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        onInput(msg) {
            RED.log.debug("LightRgbTempNode(input)");

            let topicArr = String(msg.topic).split(this.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("LightRgbTempNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'ON') {
                    RED.log.debug("LightRgbTempNode(input): ON");
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
                    RED.log.debug("LightRgbTempNode(input): ONLINE");
                    let online = formats.FormatValue(formats.Formats.BOOL, 'online', msg.payload);

                    if (this.states.online !== online) {
                        this.states.online = online;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.online;
                            this.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'BRIGHTNESS') {  // Integer, 0 - 100
                    RED.log.debug("LightRgbTempNode(input): BRIGHTNESS");
                    let brightness = formats.FormatBrightness(formats.FormatValue(formats.Formats.INT, 'brightness', msg.payload));

                    if (this.states.brightness !== brightness) {
                        this.states.brightness = brightness;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = brightness;
                            this.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'RGB') {  // Integer, 0 - 16777215
                    RED.log.debug("LightRgbTempNode(input): RGB");
                    let rgb = formats.FormatRGB(formats.FormatValue(formats.Formats.INT, 'rgb', msg.payload));

                    if (this.states.color.spectrumRGB !== rgb) {
                        this.states.color.spectrumRGB = rgb;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = rgb;
                            this.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'TEMPERATURE') {
                    RED.log.debug("LightColorRgbTempNode(input): TEMPERATURE");
                    let temperature = formats.FormatColorTemperature(formats.FormatValue(formats.Formats.INT, 'temperature', msg.payload));

                    if (this.states.color.temperatureK !== temperature) {
                        this.states.color.temperatureK = temperature;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload = this.states.color.temperatureK;
                            this.send(msg);
                        }
                    }
                } else {
                    RED.log.debug("LightRgbTempNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("LightRgbTempNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    let on         = this.states.on;
                    let online     = this.states.online;
                    let brightness = this.states.brightness;
                    let rgb        = this.states.color.spectrumRGB;
                    let temperature = this.states.color.temperatureK;

                    // on
                    if (object.hasOwnProperty('on')) {
                        on = formats.FormatValue(formats.Formats.BOOL, 'on', object.on);
                    }

                    // online
                    if (object.hasOwnProperty('online')) {
                        online = formats.FormatValue(formats.Formats.BOOL, 'online', object.online);
                    }

                    // brightness
                    if (object.hasOwnProperty('brightness')) {
                        brightness = formats.FormatBrightness(formats.FormatValue(formats.Formats.INT, 'brightness', object.brightness));
                    }

                    // rgb
                    if (object.hasOwnProperty('rgb')) {
                        rgb = formats.FormatRGB(formats.FormatValue(formats.Formats.INT, 'rgb', object.rgb));
                    }

                    // color
                    if (object.hasOwnProperty('temperature')) {
                        temperature = formats.FormatColorTemperature(formats.FormatValue(formats.Formats.INT, 'temperature', object.temperature));
                    }

                    if (this.states.on !== on || this.states.online !== online || this.states.brightness !== brightness || this.states.color.spectrumRGB !== rgb || this.states.color.temperatureK !== temperature) {
                        this.states.on                  = on;
                        this.states.online              = online;
                        this.states.brightness          = brightness;
                        this.states.color.spectrumRGB   = rgb;
                        this.states.color.temperatureK  = temperature;

                        this.clientConn.setState(this, this.states);  // tell Google ...

                        if (this.passthru) {
                            msg.payload             = {};
                            msg.payload.online      = this.states.online;
                            msg.payload.on          = this.states.on;
                            msg.payload.rgb         = this.states.color.spectrumRGB;
                            msg.payload.temperature = this.states.color.temperatureK;
                            msg.payload.brightness  = this.states.brightness;
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
                this.clientConn.remove(this, 'light-rgb-temp');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'light-rgb-temp');
            }

            done();
        }
    }

    RED.nodes.registerType("google-light-rgb-temp", LightRgbTempNode);
}
