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
    function LightOnOffNode(config) {
        RED.nodes.createNode(this, config);

        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);
        this.topicOut   = config.topic;
        this.passthru   = config.passthru;
        this.topicDelim = '/';

        if (!this.clientConn) {
            this.error(RED._("light.errors.missing-config"));
            this.status({fill:"red", shape:"dot", text:"Missing config"});
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("light.errors.missing-bridge"));
            this.status({fill:"red", shape:"dot", text:"Missing SmartHome"});
            return;
        }

        let node = this;

        RED.log.debug("LightOnOffNode(): node.topicOut = " + node.topicOut);

        /******************************************************************************************************************
         * called to register device
         *
         */
        this.registerDevice = function (client, name) {
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
            RED.log.debug("LightOnOffNode(updated): states = " + JSON.stringify(states));

            node.updateStatusIcon(states);

            let msg = {
                topic: node.topicOut,
                device_name: device.properties.name.name,
                payload: {
                    online: states.online,
                    on: states.on
                }
            };

            node.send(msg);
        };

        this.states = this.clientConn.register(this, 'light-onoff', config.name);

        this.status({fill:"yellow", shape:"dot", text:"Ready"});

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("LightOnOffNode(input)");

            let topicArr = String(msg.topic).split(node.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("LightOnOffNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'ON') {
                    RED.log.debug("LightOnOffNode(input): ON");
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
                    RED.log.debug("LightOnOffNode(input): ONLINE");
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
                    RED.log.debug("LightOnOffNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("LightOnOffNode(input): typeof payload = " + typeof msg.payload);
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
                            msg.payload             = {};
                            msg.payload.online      = node.states.online;
                            msg.payload.on          = node.states.on;
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
                node.clientConn.remove(node, 'light-onoff');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'light-onoff');
            }
            
            done();
        });
    }

    RED.nodes.registerType("google-light-onoff", LightOnOffNode);

    /******************************************************************************************************************
     *
     *
     */
    function LightDimmableNode(config) {
        RED.nodes.createNode(this, config);

        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);
        this.topicOut   = config.topic;
        this.passthru   = config.passthru;
        this.topicDelim = '/';

        if (!this.clientConn) {
            this.error(RED._("light.errors.missing-config"));
            this.status({fill:"red", shape:"dot", text:"Missing config"});
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("light.errors.missing-bridge"));
            this.status({fill:"red", shape:"dot", text:"Missing SmartHome"});
            return;
        }

        let node = this;

        RED.log.debug("LightDimmableNode(): node.topicOut = " + node.topicOut);

        this.registerDevice = function (client, name) {
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
            RED.log.debug("LightDimmableNode(updated): states = " + JSON.stringify(states));

            node.updateStatusIcon(states);

            let msg = {
                topic: node.topicOut,
                device_name: device.properties.name.name,
                payload: {
                    online: states.online,
                    on: states.on,
                    brightness: states.brightness
                }
            };

            node.send(msg);
        };

        this.states = this.clientConn.register(this, 'light-dimmable', config.name);

        this.status({fill:"yellow", shape:"dot", text:"Ready"});

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("LightDimmableNode(input)");

            let topicArr = String(msg.topic).split(node.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("LightDimmableNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'ON') {
                    RED.log.debug("LightDimmableNode(input): ON");
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
                    RED.log.debug("LightDimmableNode(input): ONLINE");
                    let online = formats.FormatValue(formats.Formats.BOOL, 'online', msg.payload);

                    if (node.states.online !== online) {
                        node.states.online = online;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.online;
                            node.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'BRIGHTNESS') {
                    RED.log.debug("LightDimmableNode(input): BRIGHTNESS");
                    let brightness = formats.FormatBrightness(formats.FormatValue(formats.Formats.INT, 'brightness', msg.payload));

                    if (node.states.brightness !== brightness) {
                        node.states.brightness = brightness;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.brightness;
                            node.send(msg);
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

                    let on         = node.states.on;
                    let online     = node.states.online;
                    let brightness = node.states.brightness;

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

                    if (node.states.on !== on || node.states.online !== online || node.states.brightness !== brightness){
                        node.states.on         = on;
                        node.states.online     = online;
                        node.states.brightness = brightness;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload             = {};
                            msg.payload.online      = node.states.online;
                            msg.payload.on          = node.states.on;
                            msg.payload.brightness  = node.states.brightness;
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
                node.clientConn.remove(node, 'light-dimmable');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'light-dimmable');
            }
            
            done();
        });
    }

    RED.nodes.registerType("google-light-dimmable", LightDimmableNode);

    /******************************************************************************************************************
     *
     *
     */
    function LightColorTempNode(config) {
        RED.nodes.createNode(this, config);

        this.client = config.client;
        this.clientConn = RED.nodes.getNode(this.client);
        this.topicOut = config.topic;
        this.passthru = config.passthru;
        this.topicDelim = '/';

        if (!this.clientConn) {
            this.error(RED._("light.errors.missing-config"));
            this.status({ fill: "red", shape: "dot", text: "Missing config" });
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("light.errors.missing-bridge"));
            this.status({ fill: "red", shape: "dot", text: "Missing SmartHome" });
            return;
        }

        let node = this;

        RED.log.debug("LightColorTempNode(): node.topicOut = " + node.topicOut);

        /******************************************************************************************************************
         * called to register device
         *
         */
        this.registerDevice = function (client, name) {
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
        this.updated = function (device) {   // this must be defined before the call to clientConn.register()
            let states = device.states;
            RED.log.debug("LightColorTempNode(updated): states = " + JSON.stringify(states));

            node.updateStatusIcon(states);

            let msg = {
                topic: node.topicOut,
                device_name: device.properties.name.name,
                payload: {
                    online: states.online,
                    on: states.on,
                    brightness: states.brightness,
                    temperature: states.color.temperature
                }
            };

            node.send(msg);
        };

        this.states = this.clientConn.register(this, 'light-temperature', config.name);

        this.status({ fill: "yellow", shape: "dot", text: "Ready" });

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("LightColorTempNode(input)");

            let topicArr = String(msg.topic).split(node.topicDelim);
            let topic = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("LightColorTempNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'ON') {
                    RED.log.debug("LightColorTempNode(input): ON");
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
                    RED.log.debug("LightColorTempNode(input): ONLINE");
                    let online = formats.FormatValue(formats.Formats.BOOL, 'online', msg.payload);

                    if (node.states.online !== online) {
                        node.states.online = online;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.online;
                            node.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'BRIGHTNESS') {
                    RED.log.debug("LightColorTempNode(input): BRIGHTNESS");
                    let brightness = formats.FormatBrightness(formats.FormatValue(formats.Formats.INT, 'brightness', msg.payload));

                    if (node.states.brightness !== brightness) {
                        node.states.brightness = brightness;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.brightness;
                            node.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'TEMPERATURE') {
                    RED.log.debug("LightColorTempNode(input): TEMPERATURE");
                    let temperature = formats.FormatColorTemperature(formats.FormatValue(formats.Formats.INT, 'temperature', msg.payload));

                    if (node.states.color.temperatureK !== temperature) {
                        node.states.color.temperatureK = temperature;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.color.temperatureK;
                            node.send(msg);
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

                    let on = node.states.on;
                    let online = node.states.online;
                    let brightness = node.states.brightness;
                    let temperature = node.states.color.temperatureK;

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

                    if (node.states.on !== on || node.states.online !== online || node.states.brightness !== brightness || node.states.color.temperatureK !== temperature) {
                        node.states.on = on;
                        node.states.online = online;
                        node.states.brightness = brightness;
                        node.states.color.temperatureK = temperature;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = {};
                            msg.payload.online = node.states.online;
                            msg.payload.on = node.states.on;
                            msg.payload.brightness = node.states.brightness;
                            msg.payload.temperature = node.states.color.temperatureK;
                            node.send(msg);
                        }

                        node.updateStatusIcon(node.states);
                    }
                }
            } catch (err) {
                RED.log.error(err);
            }
        });

        this.on('close', function (removed, done) {
            if (removed) {
                // this node has been deleted
                node.clientConn.remove(node, 'light-temperature');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'light-temperature');
            }

            done();
        });
    }

    RED.nodes.registerType("google-light-temperature", LightColorTempNode);

    /******************************************************************************************************************
     *
     *
     */
    function LightHsvNode(config) {
        RED.nodes.createNode(this, config);

        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);
        this.topicOut   = config.topic;
        this.passthru   = config.passthru;
        this.topicDelim = '/';

        if (!this.clientConn) {
            this.error(RED._("light.errors.missing-config"));
            this.status({fill:"red", shape:"dot", text:"Missing config"});
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("light.errors.missing-bridge"));
            this.status({fill:"red", shape:"dot", text:"Missing SmartHome"});
            return;
        }

        let node = this;

        RED.log.debug("LightHsvNode(): node.topicOut = " + node.topicOut);

        /******************************************************************************************************************
         * called to register device
         *
         */
        this.registerDevice = function (client, name) {
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
            RED.log.debug("LightHsvNode(updated): states = " + JSON.stringify(states));

            node.updateStatusIcon(states);
            
            let msg = {
                topic: node.topicOut,
                device_name: device.properties.name.name,
                payload: {
                    online: states.online,
                    on: states.on,
                    hue: states.color.spectrumHsv.hue,
                    saturation: states.color.spectrumHsv.saturation * 100,  // rescale
                    value: states.color.spectrumHsv.value * 100,            // rescale
                    name: states.color.name,
                    brightness: states.brightness
                }
            };

            node.send(msg);
        };

        this.states = this.clientConn.register(this, 'light-hsv', config.name);

        this.status({fill:"yellow", shape:"dot", text:"Ready"});

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("LightHsvNode(input)");

            let topicArr = String(msg.topic).split(node.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("LightHsvNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'ON') {
                    RED.log.debug("LightHsvNode(input): ON");
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
                    RED.log.debug("LightHsvNode(input): ONLINE");
                    let online = formats.FormatValue(formats.Formats.BOOL, 'online', msg.payload);

                    if (node.states.online !== online) {
                        node.states.online = online;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.online;
                            node.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'BRIGHTNESS') {  // Integer, 0 - 100
                    RED.log.debug("LightHsvNode(input): BRIGHTNESS");
                    let brightness = formats.FormatBrightness(formats.FormatValue(formats.Formats.INT, 'brightness', msg.payload));

                    if (node.states.brightness !== brightness) {
                        node.states.brightness = brightness;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = brightness;
                            node.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'HUE') {  // Float, 0.0 - 360.0
                    RED.log.debug("LightHsvNode(input): HUE");
                    let hue = formats.FormatHue(formats.FormatValue(formats.Formats.FLOAT, 'hue', msg.payload));

                    if (node.states.color.spectrumHsv.hue !== hue) {
                        node.states.color.spectrumHsv.hue = hue;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = hue;
                            node.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'SATURATION') {  // Float, 0.0 - 100.0
                    RED.log.debug("LightHsvNode(input): SATURATION");
                    let saturation = formats.FormatSaturation(formats.FormatValue(formats.Formats.FLOAT, 'saturation', msg.payload)) / 100;

                    if (node.states.color.spectrumHsv.saturation !== saturation) {
                        node.states.color.spectrumHsv.saturation = saturation / 100;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = saturation;
                            node.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'VALUE') {  // Float, 0.0 - 100.0
                    RED.log.debug("LightHsvNode(input): VALUE");
                    let value = formats.FormatSaturation(formats.FormatValue(formats.Formats.FLOAT, 'value', msg.payload)) / 100;

                    if (node.states.color.spectrumHsv.value !== value) {
                        node.states.color.spectrumHsv.value = value / 100;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = value;
                            node.send(msg);
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

                    let on         = node.states.on;
                    let online     = node.states.online;
                    let brightness = node.states.brightness;
                    let hue        = node.states.color.spectrumHsv.hue;
                    let saturation = node.states.color.spectrumHsv.saturation;
                    let value      = node.states.color.spectrumHsv.value;

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

                    if (node.states.on !== on || node.states.online !== online || node.states.color.brightness !== brightness || node.states.color.spectrumHsv.hue !== hue || node.states.color.spectrumHsv.saturation !== saturation || node.states.color.spectrumHsv.value !== value) {
                        node.states.on                              = on;
                        node.states.online                          = online;
                        node.states.brightness                      = brightness;
                        node.states.color.spectrumHsv.hue           = hue;
                        node.states.color.spectrumHsv.saturation    = saturation;
                        node.states.color.spectrumHsv.value         = value;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload             = {};
                            msg.payload.online      = node.states.online;
                            msg.payload.on          = node.states.on;
                            msg.payload.hue         = node.states.color.spectrumHsv.hue;
                            msg.payload.saturation  = node.states.color.spectrumHsv.saturation * 100;   // rescale
                            msg.payload.value       = node.states.color.spectrumHsv.value * 100;        // rescale
                            msg.payload.name        = node.states.color.name;
                            msg.payload.brightness  = node.states.brightness;
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
                node.clientConn.remove(node, 'light-hsv');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'light-hsv');
            }
            
            done();
        });
    }

    RED.nodes.registerType("google-light-hsv", LightHsvNode);

    /******************************************************************************************************************
     *
     *
     */
    function LightRgbNode(config) {
        RED.nodes.createNode(this, config);

        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);
        this.topicOut   = config.topic;
        this.passthru   = config.passthru;
        this.topicDelim = '/';

        if (!this.clientConn) {
            this.error(RED._("light.errors.missing-config"));
            this.status({fill:"red", shape:"dot", text:"Missing config"});
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("light.errors.missing-bridge"));
            this.status({fill:"red", shape:"dot", text:"Missing SmartHome"});
            return;
        }

        let node = this;

        RED.log.debug("LightRgbNode(): node.topicOut = " + node.topicOut);

        /******************************************************************************************************************
         * called to register device
         *
         */
        this.registerDevice = function (client, name) {
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
            RED.log.debug("LightRgbNode(updated): states = " + JSON.stringify(states));

            node.updateStatusIcon(states);
            
            let msg = {
                topic: node.topicOut,
                device_name: device.properties.name.name,
                payload: {
                    online: states.online,
                    on: states.on,
                    rgb: states.color.spectrumRGB,
                    name: states.color.name,
                    brightness: states.brightness
                }
            };

            node.send(msg);
        };

        this.states = this.clientConn.register(this, 'light-rgb', config.name);

        this.status({fill:"yellow", shape:"dot", text:"Ready"});

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("LightRgbNode(input)");

            let topicArr = String(msg.topic).split(node.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("LightRgbNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'ON') {
                    RED.log.debug("LightRgbNode(input): ON");
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
                    RED.log.debug("LightRgbNode(input): ONLINE");
                    let online = formats.FormatValue(formats.Formats.BOOL, 'online', msg.payload);

                    if (node.states.online !== online) {
                        node.states.online = online;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.online;
                            node.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'BRIGHTNESS') {  // Integer, 0 - 100
                    RED.log.debug("LightRgbNode(input): BRIGHTNESS");
                    let brightness = formats.FormatBrightness(formats.FormatValue(formats.Formats.INT, 'brightness', msg.payload));

                    if (node.states.brightness !== brightness) {
                        node.states.brightness = brightness;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = brightness;
                            node.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'RGB') {  // Integer, 0 - 16777215
                    RED.log.debug("LightRgbNode(input): RGB");
                    let rgb = formats.FormatRGB(formats.FormatValue(formats.Formats.INT, 'rgb', msg.payload));

                    if (node.states.color.spectrumRGB !== rgb) {
                        node.states.color.spectrumRGB = rgb;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = rgb;
                            node.send(msg);
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

                    let on         = node.states.on;
                    let online     = node.states.online;
                    let brightness = node.states.brightness;
                    let rgb        = node.states.color.spectrumRGB;

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

                    if (node.states.on !== on || node.states.online !== online || node.states.color.brightness !== brightness || node.states.color.spectrumRGB !== rgb) {
                        node.states.on                  = on;
                        node.states.online              = online;
                        node.states.brightness          = brightness;
                        node.states.color.spectrumRGB   = rgb;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload             = {};
                            msg.payload.online      = node.states.online;
                            msg.payload.on          = node.states.on;
                            msg.payload.rgb         = node.states.color.spectrumRGB;
                            msg.payload.brightness  = node.states.brightness;        
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
                node.clientConn.remove(node, 'light-rgb');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'light-rgb');
            }
            
            done();
        });
    }

    RED.nodes.registerType("google-light-rgb", LightRgbNode);
}
