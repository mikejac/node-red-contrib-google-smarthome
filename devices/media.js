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

const { ok } = require('assert');

module.exports = function(RED) {
    "use strict";

    const formats = require('../formatvalues.js');
    const fs      = require('fs');
    const path    = require('path');

    /******************************************************************************************************************
     *
     *
     */
    class MediaNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.client                         = config.client;
            this.clientConn                     = RED.nodes.getNode(this.client);
            this.topicOut                       = config.topic;
            this.device_type					= config.device_type;
            this.has_apps               = config.has_apps;
            this.available_applications_file    = config.available_applications_file;
            this.has_channels                   = config.has_channels;
            this.available_channels_file        = config.available_channels_file;
            this.has_inputs                     = config.has_inputs;
            this.available_inputs_file          = config.available_inputs_file;
            this.command_only_input_selector    = config.command_only_input_selector;
            this.ordered_inputs                 = config.ordered_inputs;
            this.has_media_state                = config.has_media_state;
            this.support_activity_state         = config.support_activity_state;
            this.support_playback_state         = config.support_playback_state;
            this.has_on_off                     = config.has_on_off;
            this.command_only_on_off            = config.command_only_on_off;
            this.query_only_on_off              = config.query_only_on_off;
            this.has_transport_control          = config.has_transport_control;
            this.supported_commands             = config.supported_commands;
            this.has_volume                     = true; // config.has_volume;
            this.volume_max_level               = config.volume_max_level;
            this.can_mute_and_unmute            = config.can_mute_and_unmute;
            this.volume_default_percentage      = config.volume_default_percentage;
            this.level_step_size                = config.level_step_size;
            this.command_only_volume            = config.command_only_volume;
            this.has_modes                      = config.has_modes;
            this.available_modes_file           = config.available_modes_file;
            this.command_only_modes             = config.command_only_modes;
            this.query_only_modes               = config.query_only_modes;
            this.has_toggles                    = config.has_toggles;
            this.available_toggles_file         = config.available_toggles_file;
            this.command_only_toggles           = config.command_only_toggles;
            this.query_only_toggles             = config.query_only_toggles;
            this.last_channel_index             = '';
            this.current_channel_index          = -1;
            this.current_input_index            = -1;

            if (!this.clientConn) {
                this.error(RED._("media.errors.missing-config"));
                this.status({fill: "red", shape: "dot", text: "Missing config"});
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("media.errors.missing-bridge"));
                this.status({fill: "red", shape: "dot", text: "Missing SmartHome"});
                return;
            }

            switch (this.device_type) {
                case "AUDIO_VIDEO_RECEIVER":
                    // this.has_apps                    = true;
                    this.has_channels                   = false;
                    this.has_inputs                     = true;
                    // this.has_media_state                = true;
                    this.has_on_off                     = true;
                    // this.has_transport_control          = true;
                    this.has_volume                     = true;
                    this.has_modes                      = false;
                    this.has_toggles                    = false;
                    break;
                case "REMOTECONTROL":
                    this.has_apps                       = true;
                    //this.has_channels                   = true;
                    this.has_inputs                     = true;
                    this.has_media_state                = true;
                    this.has_on_off                     = true;
                    this.has_transport_control          = true;
                    this.has_volume                     = true;
                    // this.has_modes                      = true;
                    // this.has_toggles                    = true;
                    break;
                case "SETTOP":
                    this.has_apps                       = true;
                    //this.has_channels                   = true;
                    this.has_inputs                     = true;
                    this.has_media_state                = true;
                    this.has_on_off                     = true;
                    this.has_transport_control          = true;
                    this.has_volume                     = true;
                    this.has_modes                      = false;
                    this.has_toggles                    = false;
                    break;
                case "SOUNDBAR":
                case "SPEAKER":
                    // this.has_apps                     = true;
                    this.has_channels                   = false;
                    //this.has_inputs                     = true;
                    this.has_media_state                = true;
                    //this.has_on_off                     = true;
                    this.has_transport_control          = true;
                    this.has_volume                     = true;
                    this.has_modes                      = false;
                    this.has_toggles                    = false;
                    break;
                case "STREAMING_BOX":
                case "STREAMING_SOUNDBAR":
                case "STREAMING_STICK":
                    this.has_apps                       = true;
                    this.has_channels                   = false;
                    //this.has_inputs                     = true;
                    this.has_media_state                = true;
                    //this.has_on_off                     = true;
                    this.has_transport_control          = true;
                    this.has_volume                     = true;
                    this.has_modes                      = false;
                    this.has_toggles                    = false;
                    break;
                case "TV":
                    this.has_apps                       = true;
                    //this.has_channels                   = true;
                    this.has_inputs                     = true;
                    this.has_media_state                = true;
                    this.has_on_off                     = true;
                    this.has_transport_control          = true;
                    this.has_volume                     = true;
                    //this.has_modes                      = true;
                    //this.has_toggles                    = true;
                    break;
            }

            let error_msg = '';
            if (this.has_apps) {
                this.available_applications = this.loadJson(this.available_applications_file, []);
                if (this.available_applications === undefined) {
                    error_msg += ' Applications file not found.';
                    RED.log.error("Applications " +  this.available_applications_file + "file not found.")
                }
            } else {
                this.available_applications = undefined;
                RED.log.debug("Applications disabled");
            }

            if (this.has_channels) {
                this.available_channels = this.loadJson(this.available_channels_file, []);
                if (this.available_channels === undefined) {
                    error_msg += ' Channels file not found.';
                    RED.log.error("Channels " +  this.available_channels_file + "file not found.")
                }
            } else {
                this.available_channels = undefined;
                RED.log.debug("Channels disabled");
            }

            if (this.has_inputs) {
                this.available_inputs = this.loadJson(this.available_inputs_file, []);
                if (this.available_inputs === undefined) {
                    error_msg += ' Inputs file not found.';
                    RED.log.error("Inputs " +  this.available_inputs_file + "file not found.")
                }
            } else {
                this.available_inputs = undefined;
                RED.log.debug("Inputs disabled");
            }

            if (this.has_modes) {
                this.available_modes = this.loadJson(this.available_modes_file, []);
                if (this.available_modes === undefined) {
                    error_msg += ' Modes file not found.';
                    RED.log.error("Modes " +  this.available_modes_file + "file not found.")
                }
            } else {
                this.available_modes = undefined;
                RED.log.debug("Modes disabled");
            }

            if (this.has_toggles) {
                this.available_toggles = this.loadJson(this.available_toggles_file, []);
                if (this.available_toggles === undefined) {
                    error_msg += ' Toggles file not found.';
                    RED.log.error("Toggles " +  this.available_toggles_file + "file not found.")
                }
            } else {
                this.available_toggles = undefined;
                RED.log.debug("Toggles disabled");
            }

            this.states = this.clientConn.register(this, 'media', config.name, this);

            if (error_msg.length() == 0) {
                this.status({fill: "yellow", shape: "dot", text: "Ready"});
            } else {
                this.status({fill: "red", shape: "dot", text: error_msg});
            }

            this.on('input', this.onInput);
            this.on('close', this.onClose);
        }

        /******************************************************************************************************************
         * called to register device
         *
         */
        registerDevice(client, name, me) {
            RED.log.debug("MediaNode(registerDevice) device_type " + me.device_type);
            let states = {
                online: true
            };

            const default_name = me.getDefaultName(me.device_type);
            const default_name_type = default_name.replace(/\s+/g, '-').toLowerCase();
            let device = {
                id: client.id,
                properties: {
                    type: 'action.devices.types.' + me.device_type,
                    traits: me.getTraits(me.device_type),
                    name: {
                        defaultNames: ["Node-RED " + default_name],
                        name: name
                    },
                    willReportState: true,
                    attributes: {
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-' + default_name_type + '-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    },
                    customData: {
                        "nodeid": client.id,
                        "type": default_name_type
                    }
                }
            };

            device.states = states;
            this.updateAttributesForTraits(me, device);
            this.updateStatesForTraits(me, device);

            RED.log.debug("MediaNode(updated): device = " + JSON.stringify(device));

            return device;
        }

        updateAttributesForTraits(me, device) {
            let attributes = device.properties.attributes;

            if (me.has_apps) {
                attributes['availableApplications'] = me.available_applications;
            }
            if (me.has_inputs) {
                attributes['availableInputs'] = me.available_inputs;
                attributes['commandOnlyInputSelector'] = me.command_only_input_selector;
                attributes['commanorderedInputsOnlyInputSelector'] = me.ordered_inputs;
            }
            if (me.has_media_state) {
                attributes['supportActivityState'] = me.support_activity_state;
                attributes['supportPlaybackState'] = me.support_playback_state;
            }
            if (me.has_on_off) {
                attributes['commandOnlyOnOff'] = me.command_only_on_off;
                attributes['queryOnlyOnOff'] = me.query_only_on_off;
            }
            if (me.has_transport_control) {
                attributes['transportControlSupportedCommands'] = me.supported_commands;
            }
            if (me.has_volume) {
                attributes['volumeMaxLevel'] = me.volume_max_level;
                attributes['volumeCanMuteAndUnmute'] = me.can_mute_and_unmute;
                attributes['volumeDefaultPercentage'] = me.volume_default_percentage;
                attributes['levelStepSize'] = me.level_step_size;
                attributes['commandOnlyVolume'] = me.command_only_volume;
            }
            if (me.has_toggles) {
                attributes['availableToggles'] = me.available_toggles;
                attributes['commandOnlyToggles'] = me.command_only_toggles;
                attributes['queryOnlyToggles'] = me.query_only_toggles;
            }
            if (me.has_modes) {
                attributes['availableModes'] = me.available_modes;
                attributes['commandOnlyModes'] = me.command_only_modes;
                attributes['queryOnlyModes'] = me.query_only_modees;
            }
            if (me.has_channels) {
                attributes['availableChannels'] = me.available_channels;
            }
        }

        updateStatesForTraits(me, device) {
            let states = device.states;

            if (me.has_apps) {
                states['currentApplication'] = '';
            }
            if (me.has_inputs) {
                states['currentInput'] = '';
            }
            if (me.has_media_state) {
                // INACTIVE STANDBY ACTIVE
                states['activityState'] = 'INACTIVE';
                // PAUSED PLAYING FAST_FORWARDING REWINDING BUFFERING STOPPED
                states['playbackState'] = 'STOPPED';
            }
            if (me.has_on_off) {
                states['on'] = false;
            }
            // if (me.has_transport_control) {
            // }
            if (me.has_volume) {
                states['currentVolume'] = me.volume_default_percentage;
                states['isMuted'] = false;
            }
            if (me.has_toggles) {
                states['currentToggleSettings'] = {};
                this.updateTogglesState(me, device);
            }
            if (me.has_modes) {
                states['currentModeSettings'] = {};
                this.updateModesState(me, device);
            }
            // if (me.has_channels) {
            // }
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
            RED.log.debug("MediaNode(updated): states = " + JSON.stringify(states));

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

            Object.keys(states).forEach(function (key) {
                msg.payload[key] = states[key];
             });

            this.send(msg);
        };

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        onInput(msg) {
            const me = this;
            RED.log.debug("MediaNode(input)");

            let topicArr = String(msg.topic).split(this.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("MediaNode(input): topic = " + topic);
            try {
                if (topic.toUpperCase() === 'APPLICATIONS') {
                    if (this.has_apps) {
                        if (typeof msg.payload === undefined) {
                            this.available_applications = this.loadJson(this.available_applications_file, []);
                            if (this.available_applications === undefined) {
                                RED.log.error("Applications " +  this.available_applications_file + "file not found.")
                            }
                        } else {
                            if (!this.writeJson(this.available_applications_file, msg.payload)) {
                                RED.log.error("Error saving Applications to file " + this.available_applications_file);
                            } else {
                                this.available_applications = msg.payload;
                            }
                        }
                    } else {
                        this.available_applications = undefined;
                        RED.log.error("Applications disabled");
                    }
                } else if (topic.toUpperCase() === 'CHANNELS') {
                    if (this.has_channels) {
                        if (typeof msg.payload === undefined) {
                            this.available_channels = this.loadJson(this.available_channels_file, []);
                            if (this.available_channels === undefined) {
                                RED.log.error("Channels " +  this.available_channels_file + "file not found.")
                            }
                        } else {
                            if (!this.writeJson(this.available_channels_file, msg.payload)) {
                                RED.log.error("Error saving Channels to file " + this.available_channels_file);
                            } else {
                                this.available_channels = msg.payload;
                            }
                        }
                    } else {
                        this.available_channels = undefined;
                        RED.log.error("Channels disabled");
                    }
                } else if (topic.toUpperCase() === 'INPUTS') {
                    if (this.has_inputs) {
                        if (typeof msg.payload === undefined) {
                            this.available_inputs = this.loadJson(this.available_inputs_file, []);
                            if (this.available_inputs === undefined) {
                                RED.log.error("Inputs " +  this.available_inputs_file + "file not found.")
                            }
                        } else {
                            if (!this.writeJson(this.available_inputs_file, msg.payload)) {
                                RED.log.error("Error saving Inputs to file " + this.available_inputs_file);
                            } else {
                                this.available_inputs = msg.payload;
                            }
                        }
                    } else {
                        this.available_inputs = undefined;
                        RED.log.error("Inputs disabled");
                    }
                } else if (topic.toUpperCase() === 'MODES') {
                    if (this.has_modes) {
                        if (typeof msg.payload === undefined) {
                            this.available_modes = this.loadJson(this.available_modes_file, []);
                            if (this.available_modes === undefined) {
                                RED.log.error("Modes " +  this.available_modes_file + "file not found.")
                            } else {
                                this.updateModesState(me, me);
                            }
                        } else {
                            if (!this.writeJson(this.available_modes_file, msg.payload)) {
                                RED.log.error("Error saving Modes to file " + this.available_modes_file);
                            } else {
                                this.available_modes = msg.payload;
                                this.updateModesState(me, me);
                            }
                        }
                    } else {
                        this.available_modes = undefined;
                        RED.log.error("Modes disabled");
                    }
                } else if (topic.toUpperCase() === 'TOGGLES') {
                    if (this.has_toggles) {
                        if (typeof msg.payload === undefined) {
                            this.available_toggles = this.loadJson(this.available_toggles_file, []);
                            if (this.available_toggles === undefined) {
                                RED.log.error("Toggles " +  this.available_toggles_file + "file not found.")
                            } else {
                                this.updateTogglesState();
                            }
                        } else {
                            if (!this.writeJson(this.available_toggles_file, msg.payload)) {
                                RED.log.error("Error saving Toggles to file " + this.available_toggles_file);
                            } else {
                                this.available_toggles = msg.payload;
                                this.updateTogglesState();
                            }
                        }
                    } else {
                        this.available_toggles = undefined;
                        RED.log.error("Toggles disabled");
                    }
                } else {
                    let state_key = '';
                    Object.keys(this.states).forEach(function (key) {
                        if (topic.toUpperCase() == key.toUpperCase()) {
                            state_key = key;
                            RED.log.debug("MediaNode(input): " + key);
                        }
                    });

                    if (state_key !== '') {
                        const differs = me.setState(state_key, msg.payload, this.states);
                        if (differs) {
                            RED.log.debug("MediaNode(input): " + state_key + ' ' + msg.payload);
                            this.clientConn.setState(this, this.states);  // tell Google ...
        
                            if (this.passthru) {
                                msg.payload = this.states[state_key];
                                this.send(msg);
                            }

                            this.updateStatusIcon();
                        }
                    } else {
                        RED.log.debug("MediaNode(input): some other topic");
                        let differs = false;
                        Object.keys(this.states).forEach(function (key) {
                            if (msg.payload.hasOwnProperty(key)) {
                                if (me.setState(key, msg.payload[key], me.states)) {
                                    RED.log.debug("MediaNode(input): set state " + key + ' to ' + msg.payload[key]);
                                    differs = true;
                                }
                            }
                        });
        
                        if (differs) {
                            this.clientConn.setState(this, this.states);  // tell Google ...

                            if (this.passthru) {
                                msg.payload = this.states;
                                this.send(msg);
                            }

                            this.updateStatusIcon();
                        }
                    }
                }
            } catch (err) {
                RED.log.error(err);
            }
        }

        onClose(removed, done) {
            if (removed) {
                // this node has been deleted
                this.clientConn.remove(this, 'media');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'media');
            }

            done();
        }

        updateTogglesState(me, device) {
            // Key/value pair with the toggle name of the device as the key, and the current state as the value.
            let states = device.states;
            let new_toggles = {};
            me.available_toggles.forEach(function (toggle) {
                let value = false;
                if (typeof states[toggle.name] === 'boolean') {
                    value = states[toggle.name];
                }
                new_toggles[toggle.name] = value;
            });
            states['currentToggleSettings'] = new_toggles;
        }

        updateModesState(me, device) {
            // Key/value pair with the mode name of the device as the key, and the current setting_name as the value.
            let states = device.states;
            let new_modes = {};
            me.available_modes.forEach(function (mode) {
                let value = '';
                if (typeof states[mode.name] === 'string') {
                    value = states[mode.name];
                }
                new_modes[mode.name] = value;
            });
            states['currentModeSettings'] = new_modes;
        }

        getDefaultName(device_type) {
            switch(device_type) {
                case 'AUDIO_VIDEO_RECEIVER':
                    return "Audio-Video Receiver";
                case 'REMOTECONTROL':
                    return "Media Remote";
                case 'SETTOP':
                    return "Set-top Box";
                case 'SOUNDBAR':
                    return "Soundbar";
                case 'SPEAKER':
                    return "Speaker";
                case 'STREAMING_BOX':
                    return "Streaming Box";
                case 'STREAMING_SOUNDBAR':
                    return "Streaming Soundbar";
                case 'STREAMING_STICK':
                    return "Streaming Stick";
                case 'TV':
                    return "Television";
            }
            return '';
        }

        getTraits(device_type) {
            let traits=[
                "action.devices.traits.AppSelector",
                "action.devices.traits.InputSelector",
                "action.devices.traits.MediaState",
                "action.devices.traits.OnOff",
                "action.devices.traits.TransportControl",
                "action.devices.traits.Volume"
            ];

            if ((device_type === "REMOTECONTROL") || 
                (device_type === "SETTOP") ||
                (device_type === "TV")) {
                    traits.push("action.devices.traits.Channel");
            }
            if ((device_type === "REMOTECONTROL") || 
                (device_type === "TV")) {
                    traits.push("action.devices.traits.Modes");
                    traits.push("action.devices.traits.Toggles");
            }
            return traits;
        }

        setState(key, value, states) {
            const me = this;
            let differs = false;
            const old_state = states[key];
            let val_type = typeof old_state;
            let new_value = undefined;
            if (val_type === 'number') {
                if (value % 1 === 0) {
                    new_value = formats.FormatValue(formats.Formats.INT, key, value);
                } else {
                    new_value = formats.FormatValue(formats.Formats.FLOAT, key, value);
                }
            } else if (val_type === 'string') {
                new_value = formats.FormatValue(formats.Formats.STRING, key, value);
            } else if (val_type === 'boolean') {
                new_value = formats.FormatValue(formats.Formats.BOOL, key, value);
            } else if (val_type === 'object') {
                Object.keys(old_state).forEach(function (key) {
                    if (typeof new_value[key] !== undefined) {
                        if (me.setState(key, new_value[key], old_State)) {
                            differs = true;
                        }
                    }
                });
            }
            if (val_type !== 'object') {
                if (new_value !== undefined) {
                    differs = states['key'] === new_value;
                    states['key'] = new_value;
                }
            }
            return differs;
        }

        loadJson(filename, defaultValue) {
            if (!filename.startsWith(path.sep)) {
                const userDir = RED.settings.userDir;
                filename = path.join(userDir, filename);
            }
            RED.log.debug('MediaNode:loadJson(): loading ' + filename);
        
            try {    
                let jsonFile = fs.readFileSync(
                    filename,
                    {
                        'encoding': 'utf8',
                        'flag': fs.constants.R_OK | fs.constants.W_OK | fs.constants.O_CREAT
                    });
    
                if (jsonFile === '') {
                    RED.log.debug('MediaNode:loadJson(): empty data');
                    return defaultValue;
                } else {
                    RED.log.debug('MediaNode:loadJson(): data loaded');
                    const json = JSON.parse(jsonFile);
                    RED.log.debug('MediaNode:loadAuth(): json = ' + JSON.stringify(json));
                    return json;
                }
            }
            catch (err) {
                RED.log.error('Error on loading ' + filename + ': ' + err.toString());
                return undefined;
            }
        }

        writeJson(filename, value) {
            if (!filename.startsWith(path.sep)) {
                const userDir = RED.settings.userDir;
                filename = path.join(userDir, filename);
            }
            RED.log.debug('MediaNode:writeJson(): loading ' + filename);
            if (typeof value === 'object') {
                value = JSON.stringify(value);
            }
            try {    
                fs.writeFileSync(
                    filename,
                    value,
                    {
                        'encoding': 'utf8',
                        'flag': fs.constants.W_OK | fs.constants.O_CREAT
                    });
    
                RED.log.debug('MediaNode:writeJson(): data saved');
                return true;
            }
            catch (err) {
                RED.log.error('Error on saving ' + filename + ': ' + err.toString());
                return false;
            }
        }

        execCommand(device, command) {
            let me = this;
            const ok_result = {
                status: 'SUCCESS',
                states: {
                    "online" : this.states['online'] 
                },
                executionStates: ['online']
            };

            RED.log.debug("MediaNode:execCommand(command) " +  JSON.stringify(command));
            RED.log.debug("MediaNode:execCommand(states) " +  JSON.stringify(this.states));
            // RED.log.debug("MediaNode:execCommand(device) " +  JSON.stringify(device));

            if (!command.hasOwnProperty('params')) {
                // TransportControl
                if (command.command == 'action.devices.commands.mediaClosedCaptioningOff') {
                    ok_result.states['playbackState'] = this.states['playbackState'];
                    this.executionStates.push('playbackState');
                    return ok_result;
                }
                return false;
            }
            // Applications
            if ((command.command == 'action.devices.commands.appInstall') ||
                (command.command == 'action.devices.commands.appSearch')
                (command.command == 'action.devices.commands.appSelect')) {
                const params = command.params;
                if (params.hasOwnProperty('newApplication')) {
                    const newApplication = params['newApplication'];
                    let application_index = -1;
                    this.available_applications.forEach(function(application, index) {
                        if (application.key === newApplication) {
                            application_index = index;
                            me.states['currentApplication'] = newApplication;
                        }
                    });
                    if (application_index < 0) {
                        return ok_result; // TODO ERROR
                    }
                    this.states['currentApplication'] = newApplication;
                    ok_result.executionStates.push('currentApplication');
                    return ok_result;
                }
                if (params.hasOwnProperty('newApplicationName')) {
                    const newApplicationName = params['newApplicationName'];
                    let application_key = '';
                    this.available_applications.forEach(function(application, index) {
                        application.names.forEach(function(name) {
                            if (name.name_synonym.includes(newApplicationName)) {
                                application_key = application.key;
                            }
                        });
                    });
                    if (application_key === '') {
                        return ok_result; // TODO ERROR
                    }
                    this.states['currentApplication'] = application_key;
                    ok_result.executionStates.push('currentApplication');
                    return ok_result;
                }
            }
            // Inputs
            else if (command.command == 'action.devices.commands.SetInput') {
                const params = command.params;
                if (params.hasOwnProperty('newInput')) {
                    const newInput = params['newInput'];
                    let current_input_index = -1;
                    this.available_inputs.forEach(function(input_element, index) {
                        if (input_element.key === newInput) {
                            me.states['currentInput'] = newInput;
                            me.current_input_index = index;
                            current_input_index = index;
                        }
                    });
                    if (current_input_index < 0) {
                        return ok_result; // TODO ERROR
                    }
                    ok_result.executionStates.push('currentInput');
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.NextInput') {
                this.current_input_index++;
                if (this.current_input_index >= this.available_inputs.length) {
                    this.current_input_index = 0;
                }
                this.states['currentInput'] = this.available_inputs[this.current_input_index].names[0].name_synonym[0]; // Ignore Language?
                ok_result.executionStates.push('currentInput');
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.PreviousInput') {
                if (this.current_input_index <= 0) {
                    this.current_input_index = this.available_inputs.length;
                }
                this.current_input_index --;
                this.states['currentInput'] = this.available_inputs[this.current_input_index].names[0].name_synonym[0]; // Ignore Language?
                ok_result.executionStates.push('currentInput');
                return ok_result;
            }
            // On/Off
            /*else if (command.command == 'action.devices.commands.OnOff') {
                const params = command.params;
                if (params.hasOwnProperty('on')) {
                    const on_param = params['on'];
                    return ok_result;
                }
            }*/
            // TransportControl
            else if (command.command == 'action.devices.commands.mediaStop') {
                this.states['playbackState'] = 'STOPPED';
                this.executionStates.push('playbackState');
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.mediaNext') {
                this.states['playbackState'] = 'FAST_FORWARDING';
                this.executionStates.push('playbackState');
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.mediaPrevious') {
                this.states['playbackState'] = 'REWINDING';
                this.executionStates.push('playbackState');
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.mediaPause') {
                this.states['playbackState'] = 'PAUSED';
                this.executionStates.push('playbackState');
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.mediaResume') {
                this.states['playbackState'] = 'PLAYING';
                this.executionStates.push('playbackState');
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.mediaSeekRelative') {
                const params = command.params;
                if (params.hasOwnProperty('relativePositionMs')) {
                    this.states['playbackState'] = 'PLAYING';
                    const relative_position_ms = params['relativePositionMs'];
                    this.executionStates.push('playbackState');
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.mediaSeekToPosition') {
                const params = command.params;
                if (params.hasOwnProperty('absPositionMs')) {
                    this.states['playbackState'] = 'PLAYING';
                    const abs_position_ms = params['absPositionMs'];
                    this.executionStates.push('playbackState');
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.mediaRepeatMode') {
                // TODO
                const params = command.params;
                if (params.hasOwnProperty('isOn')) {
                    const is_on = params['isOn'];
                    return ok_result;
                }
                if (params.hasOwnProperty('isSingle')) {
                    const is_single = params['isSingle'];
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.mediaShuffle') {
                // TODO
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.mediaClosedCaptioningOn') {
                const params = command.params;
                if (params.hasOwnProperty('closedCaptioningLanguage')) {
                    const closedCaptioningLanguage = params['closedCaptioningLanguage'];
                    ok_result.states['playbackState'] = this.states['playbackState'];
                    ok_result.executionStates.push('playbackState');
                }
                if (params.hasOwnProperty('userQueryLanguage')) {
                    const userQueryLanguage = params['userQueryLanguage'];
                    // TODO
                }
                return ok_result;
            }
            // Volume
            else if (command.command == 'action.devices.commands.mute') {
                const params = command.params;
                if (params.hasOwnProperty('mute')) {
                    const mute = params['mute'];
                    this.states['isMuted'] = mute;
                    ok_result['isMuted'] = mute;
                    ok_result['currentVolume'] = this.states['currentVolume'];
                    ok_result.executionStates.push(['isMuted', 'currentVolume']);
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.setVolume') {
                const params = command.params;
                if (params.hasOwnProperty('volumeLevel')) {
                    const volumeLevel = params['volumeLevel'];
                    if (current_volume > this.volumeMaxLevel) {
                        volumeLevel = this.volumeMaxLevel;
                    }
                    this.states['currentVolume'] = volumeLevel;
                    ok_result['currentVolume'] = volumeLevel;
                    ok_result['isMuted'] = this.states['isMuted'];
                    ok_result.executionStates.push(['isMuted', 'currentVolume']);
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.volumeRelative') {
                const params = command.params;
                if (params.hasOwnProperty('relativeSteps')) {
                    const relativeSteps = params['relativeSteps'];
                    let current_volume = this.states['currentVolume'];
                    current_volume += relativeSteps;
                    if (current_volume > this.volumeMaxLevel) {
                        current_volume = volumeMaxLevel;
                    } else if (current_volume < 0) {
                        current_volume = 0;
                    }
                    this.states['currentVolume'] = current_volume;
                    ok_result.executionStates.push('currentVolume');
                    return ok_result;
                }
            }
            // Channels
            else if (command.command == 'action.devices.commands.selectChannel') {
                const params = command.params;
                if (params.hasOwnProperty('channelCode')) {
                    const channelCode = params['channelCode'];
                    let new_channel_index = -1;
                    this.available_channels.forEach(function(channel, index) {
                        if (channel.key === channelCode) {
                            new_channel_index = index;
                            me.current_channel_index = index;
                            me.states['currentChannel'] = channel.key;
                        }
                    });
                    if (new_channel_index < 0) {
                        return ok_result; // TODO ERROR
                    }
                    // ok_result.executionStates.push('currentChannel');
                    return ok_result;
                }
                /*if (params.hasOwnProperty('channelName')) {
                    const channelName = params['channelName'];
                }*/
                if (params.hasOwnProperty('channelNumber')) {
                    const channelNumber = params['channelNumber'];
                    let new_channel_index = -1;
                    this.available_channels.forEach(function(channel, index) {
                        if (channel.number === channelNumber) {
                            new_channel_index = index;
                            me.current_channel_index = index;
                            me.states['currentChannel'] = channel.key;
                        }
                    });
                    if (new_channel_index < 0) {
                        return ok_result; // TODO ERROR
                    }
                    // ok_result.executionStates.push('currentChannel');
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.relativeChannel') {
                const params = command.params;
                if (params.hasOwnProperty('relativeChannelChange')) {
                    const relativeChannelChange = params['relativeChannelChange'];
                    let current_channel_index = this.current_channel_index;
                    if (current_channel_index < 0) {
                        current_channel_index = 0;
                    }
                    current_channel_index += relativeChannelChange;
                    const channels_num = this.available_channels.length;
                    if (current_channel_index < 0) {
                        current_channel_index += channels_num;
                    } else if (current_channel_index >= channels_num) {
                        current_channel_index -= channels_num;
                    }
                    if (this.current_channel_index != current_channel_index) {
                        this.last_channel_index = this.current_channel_index;
                        this.current_channel_index = current_channel_index;
                    }
                    this.states['currentChannel'] = this.available_channels[current_channel_index].key;
                    // ok_result.executionStates.push('currentChannel');
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.returnChannel') {
                if (this.last_channel_index >= 0) {
                    const current_channel_index = this.current_channel_index;
                    this.current_channel_index = this.last_channel_index;
                    this.last_channel_index = current_channel_index;
                }
                if (this.current_channel_index < 0) {
                    this.current_channel_index = 0;
                }
                this.states['currentChannel'] = this.available_channels[this.current_channel_index].key;
                // ok_result.executionStates.push('currentChannel');
                return ok_result;
            }
            // Modes
            else if (command.command == 'action.devices.commands.SetModes') {
                const params = command.params;
                if (params.hasOwnProperty('updateModeSettings')) {
                    const updateModeSettings = params['updateModeSettings'];
                    let modes = this.states['currentModeeSettings'];
                    this.available_modes.forEach(function (mode) {
                        if (typeof updateModeSettings[mode] === 'string') {
                            modes[mode] = updateModeSettings[mode];
                        }
                    });
                    ok_result.executionStates.push('currentModeeSettings');
                    return ok_result;
                }
            }
            // Traits
            else if (command.command == 'action.devices.commands.SetToggles') {
                const params = command.params;
                if (params.hasOwnProperty('updateToggleSettings')) {
                    const updateToggleSettings = params['updateToggleSettings'];
                    let toggles = this.states['currentToggleSettings'];
                    this.available_toggles.forEach(function (toggle) {
                        if (typeof updateToggleSettings[toggle] === 'boolean') {
                            toggles[toggle] = updateToggleSettings[toggle];
                        }
                    });
                    ok_result.executionStates.push('currentToggleSettings');
                    return ok_result;
                }
            }
        }
    }

    RED.nodes.registerType("google-media", MediaNode);
}
