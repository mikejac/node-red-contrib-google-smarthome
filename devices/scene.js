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

    /******************************************************************************************************************
     *
     *
     */
    class SceneNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.client     = config.client;
            this.clientConn = RED.nodes.getNode(this.client);
            this.topicOut   = config.topic;
            this.topicDelim = '/';

            if (!this.clientConn) {
                this.error(RED._("scene.errors.missing-config"));
                this.status({fill: "red", shape: "dot", text: "Missing config"});
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("scene.errors.missing-bridge"));
                this.status({fill: "red", shape: "dot", text: "Missing SmartHome"});
                return;
            }

            this.clientConn.register(this, 'scene', config.name, config.scenereversible);

            this.status({fill: "yellow", shape: "dot", text: "Ready"});

            this.on('input', this.onInput);
            this.on('close', this.onClose);
        }

        /******************************************************************************************************************
         * called to register device
         *
         */
        registerDevice(client, name, sceneReversible) {
            let states = {
                online: true
            };

            let device = {
                id: client.id,
                properties: {
                    type: 'action.devices.types.SCENE',
                    traits: ['action.devices.traits.Scene'],
                    name: {
                        defaultNames: [],
                        name: name
                    },
                    willReportState: false,
                    attributes: {
                        sceneReversible: sceneReversible
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-scene-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    },
                    customData: {
                        "nodeid": client.id,
                        "type": 'scene'
                    }
                }
            };

            device.states = states;

            return device;
        }

        updateStatusIcon(deactivate) {
            if (!deactivate) {
                this.status({fill: "green", shape: "dot", text: "Activate"});
            } else {
                this.status({fill: "red", shape: "dot", text: "Deactivate"});
            }

            setTimeout(() => { this.status({}) }, 10000);
        }

        execCommand(device, command) {
            let params = {};
            let executionStates = [];
            const ok_result = {
                online: true,
                'params' : params,
                'executionStates': executionStates
            };
            if (typeof command.params.deactivate !== "undefined") {
                params['deactivate'] = command.params.deactivate;
            }
            return ok_result;
        }

        debug(msg) {
            if (this.clientConn && typeof this.clientConn.debug === 'function') {
                this.clientConn.debug(msg);
            } else {
                RED.log.debug(msg);
            }
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        updated(device, params) {
            let states = device.states;
            let command = device.command;
            RED.log.debug("SceneNode(updated): states = " + JSON.stringify(states));

            // Don't assign states object here. Scenes don't have a persistent state.

            this.updateStatusIcon(states.deactivate);

            let msg = {
                topic: this.topicOut,
                device_name: device.properties.name.name,
                command: command,
                payload: !params.deactivate,
            };

            this.send(msg);
        };

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        onInput(msg) {
            RED.log.debug("SceneNode(input)");

            let topicArr = String(msg.topic).split(this.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("SceneNode(input): topic = " + topic);

            if (topic.toUpperCase() === 'ON') {
                RED.log.debug("SceneNode(input): ON");

                this.send(msg);
            }
        }

        onClose(removed, done) {
            if (removed) {
                // this node has been deleted
                this.clientConn.remove(this, 'scene');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'scene');
            }

            done();
        }
    }

    RED.nodes.registerType("google-scene", SceneNode);
}
