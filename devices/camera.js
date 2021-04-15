/**
 * NodeRED Google SmartHome
 * Copyright (C) 2020 Claudio Chimera.
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
    class CameraNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.client              = config.client;
            this.clientConn          = RED.nodes.getNode(this.client);
            this.topicOut            = config.topic;
            this.room_hint           = config.room_hint;
            this.hlsUrl              = config.hls.trim();
            this.hlsAppId            = config.hls_app_id.trim();
            this.dashUrl             = config.dash.trim();
            this.dashAppId           = config.dash_app_id.trim();
            this.smoothStreamUrl     = config.smooth_stream.trim();
            this.smoothStreamAppId   = config.smooth_stream_app_id.trim();
            this.progressiveMp4Url   = config.progressive_mp4.trim();
            this.progressiveMp4AppId = config.progressive_mp4_app_id.trim();
            this.authToken           = config.auth_token.trim();

            if (!this.clientConn) {
                this.error(RED._("camera.errors.missing-config"));
                this.status({fill: "red", shape: "dot", text: "Missing config"});
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("camera.errors.missing-bridge"));
                this.status({fill: "red", shape: "dot", text: "Missing SmartHome"});
                return;
            }

            this.protocols = [];
            if (this.hlsUrl) {
                this.protocols.push('hls');
            }
            if (this.dashUrl) {
                this.protocols.push('dash');
            }
            if (this.smoothStreamUrl) {
                this.protocols.push('smooth_stream');
            }
            if (this.progressiveMp4Url) {
                this.protocols.push('progressive_mp4');
            }

            this.states = this.clientConn.register(this, 'camera', config.name, this);

            this.status({fill: "yellow", shape: "dot", text: "Ready"});

            this.on('input', this.onInput);
            this.on('close', this.onClose);
        }

        /******************************************************************************************************************
         * called to register device
         *
         */
        registerDevice(client, name, me) {
            const needAuthToken = me.authToken.length > 0;
            let states = {
                online: true
            };

            let device = {
                id: client.id,
                properties: {
                    type: 'action.devices.types.CAMERA',
                    traits: ['action.devices.traits.CameraStream'],
                    name: {
                        defaultNames: ["Node-RED Camera"],
                        name: name
                    },
                    roomHint: me.room_hint,
                    willReportState: true,
                    attributes: {
                        cameraStreamSupportedProtocols: me.protocols,
                        cameraStreamNeedAuthToken: needAuthToken
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-camera-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    },
                    customData: {
                        "nodeid": client.id,
                        "type": 'camera'
                    }
                }
            };

            device.states = states;

            return device;
        }

        updateStatusIcon() {
            if (this.states.online) {
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
            RED.log.debug("CameraNode(updated): states = " + JSON.stringify(states));

            Object.assign(this.states, states);

            this.updateStatusIcon();

            let msg = {
                topic: this.topicOut,
                device_name: device.properties.name.name,
                command: command,
                payload: {
                    online: states.online
                },
            };

            this.send(msg);
        };

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        onInput(msg) {
            RED.log.debug("CameraNode(input)");

            let topicArr = String(msg.topic).split(this.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("CameraNode(input): topic = " + topic);
            try {
                if (topic.toUpperCase() === 'ONLINE') {
                    RED.log.debug("CameraNode(input): ONLINE");
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
                    RED.log.debug("CameraNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("CameraNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    let online = this.states.online;

                    // online
                    if (object.hasOwnProperty('online')) {
                        online = formats.FormatValue(formats.Formats.BOOL, 'online', object.online);
                    }

                    if (this.states.online !== online){
                        this.states.online = online;

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
                this.clientConn.remove(this, 'camera');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'camera');
            }

            done();
        }

        getStreamUrl(protocol_type) {
            switch(protocol_type) {
                case 'hls':
                    return this.hlsUrl;
                case 'dash':
                    return this.dashUrl;
                case 'smooth_stream':
                    return this.smoothStreamUrl;
                case 'progressive_mp4':
                    return this.progressiveMp4Url;
            }
            return '';
        }

        getAppId(protocol_type) {
            switch(protocol_type) {
                case 'hls':
                    return this.hlsAppId;
                case 'dash':
                    return this.dashAppId;
                case 'smooth_stream':
                    return this.smoothStreamAppId;
                case 'progressive_mp4':
                    return this.progressiveMp4AppId;
            }
            return '';
        }

        execCommand(device, command) {
            let me = this;

            RED.log.debug("CameraNode:execCommand(command) " +  JSON.stringify(command));

            if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.GetCameraStream') {
                const params = command.params;
                if (params.hasOwnProperty('SupportedStreamProtocols')) {
                    const supported_protocols = params['SupportedStreamProtocols'];
                    let protocol = '';
                    let stramUrl = '';
                    supported_protocols.forEach(function (supported_protocol) {
                        let url = me.getStreamUrl(supported_protocol);
                        if (url) {
                            protocol = supported_protocol;
                            stramUrl = url;
                        }
                    });
                    if (protocol.length > 0) {
                        let executionStates = ['online', 'cameraStreamAccessUrl', 'cameraStreamProtocol'];
                        if (me.authToken.length > 0) {
                            executionStates.push('cameraStreamAuthToken');
                        }
                        const appId = this.getAppId(protocol);
                        if (appId.length > 0) {
                            executionStates.push('cameraStreamReceiverAppId');
                        }
                        return {
                            status: 'SUCCESS',
                            states: {
                                online: true,
                                cameraStreamAccessUrl: stramUrl,
                                cameraStreamReceiverAppId: appId,
                                cameraStreamAuthToken: me.authToken,
                                cameraStreamProtocol: protocol
                            },
                            executionStates: executionStates,
                        };
                    }
                }
            }
        }
    }

    RED.nodes.registerType("google-camera", CameraNode);
}
