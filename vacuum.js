/**
 * NodeRED Google SmartHome
 * Copyright (C) 2018 Michael Jacobsen.
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

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        this.updated = function (states) {   // this must be defined before the call to clientConn.register()
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

            let topicArr = msg.topic.split(node.topicDelim);
            let topic = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("VacuumNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'SET') {
                    /*RED.log.debug("VacuumNode(input): SET");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("VacuumNode(input): typeof payload = " + typeof msg.payload);
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
                    }*/
                } else if (topic.toUpperCase() === 'ON') {
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
