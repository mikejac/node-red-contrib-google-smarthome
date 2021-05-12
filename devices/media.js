/**
 * NodeRED Google SmartHome
 * Copyright (C) 2021 Claudio Chimera.
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
            this.room_hint                      = config.room_hint;
            this.device_type					= config.device_type;
            this.has_apps                       = config.has_apps;
            this.available_applications_file    = config.available_applications_file;
            this.available_applications         = [];
            this.has_channels                   = config.has_channels;
            this.available_channels_file        = config.available_channels_file;
            this.available_channels             = [];
            this.has_inputs                     = config.has_inputs;
            this.available_inputs_file          = config.available_inputs_file;
            this.available_inputs               = [];
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
            this.volume_max_level               = parseInt(config.volume_max_level) || 100;
            this.can_mute_and_unmute            = config.can_mute_and_unmute;
            this.volume_default_percentage      = parseInt(config.volume_default_percentage) || 40;
            this.level_step_size                = parseInt(config.level_step_size) || 1;
            this.command_only_volume            = config.command_only_volume;
            this.has_modes                      = config.has_modes;
            this.available_modes_file           = config.available_modes_file;
            this.available_modes                = [];
            this.command_only_modes             = config.command_only_modes;
            this.query_only_modes               = config.query_only_modes;
            this.has_toggles                    = config.has_toggles;
            this.available_toggles_file         = config.available_toggles_file;
            this.available_toggles              = [];
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
                    error_msg += ' Applications file error.';
                    RED.log.error("Applications " +  this.available_applications_file + "file error.");
                }
            } else {
                this.available_applications = undefined;
                this.debug(".constructor: Applications disabled");
            }

            if (this.has_channels) {
                this.available_channels = this.loadJson(this.available_channels_file, []);
                if (this.available_channels === undefined) {
                    error_msg += ' Channels file error.';
                    RED.log.error("Channels " +  this.available_channels_file + "file error.");
                }
            } else {
                this.available_channels = undefined;
                this.debug(".constructor: Channels disabled");
            }

            if (this.has_inputs) {
                this.available_inputs = this.loadJson(this.available_inputs_file, []);
                if (this.available_inputs === undefined) {
                    error_msg += ' Inputs file error.';
                    RED.log.error("Inputs " +  this.available_inputs_file + "file error.");
                }
            } else {
                this.available_inputs = undefined;
                this.debug(".constructor Inputs disabled");
            }

            if (this.has_modes) {
                this.available_modes = this.loadJson(this.available_modes_file, []);
                if (this.available_modes === undefined) {
                    error_msg += ' Modes file error.';
                    RED.log.error("Modes " +  this.available_modes_file + "file error.");
                }
            } else {
                this.available_modes = undefined;
                this.debug(".constructor: Modes disabled");
            }

            if (this.has_toggles) {
                this.available_toggles = this.loadJson(this.available_toggles_file, []);
                if (this.available_toggles === undefined) {
                    error_msg += ' Toggles file error.';
                    RED.log.error("Toggles " +  this.available_toggles_file + "file error.");
                }
            } else {
                this.available_toggles = undefined;
                this.debug(".constructor: Toggles disabled");
            }

            this.states = this.clientConn.register(this, 'media', config.name);

            if (error_msg.length == 0) {
                this.status({fill: "yellow", shape: "dot", text: "Ready"});
            } else {
                this.status({fill: "red", shape: "dot", text: error_msg});
            }

            this.on('input', this.onInput);
            this.on('close', this.onClose);
        }

        debug(msg) {
            msg = 'google-smarthome:MediaNode' + msg;
            if (this.clientConn && typeof this.clientConn.debug === 'function') {
                this.clientConn.debug(msg);
            } else {
                RED.log.debug(msg);
            }
        }

        /******************************************************************************************************************
         * called to register device
         *
         */
        registerDevice(client, name) {
            this.debug(".registerDevice: device_type " + this.device_type);
            let states = {
                online: true
            };

            const default_name = this.getDefaultName(this.device_type);
            const default_name_type = default_name.replace(/\s+/g, '-').toLowerCase();
            let device = {
                id: client.id,
                properties: {
                    type: 'action.devices.types.' + this.device_type,
                    traits: this.getTraits(this.device_type),
                    name: {
                        defaultNames: ["Node-RED " + default_name],
                        name: name
                    },
                    roomHint: this.room_hint,
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
            this.updateAttributesForTraits(device);
            this.updateStatesForTraits(device);

            this.debug(".registerDevice: device = " + JSON.stringify(device));

            return device;
        }

        updateAttributesForTraits(device) {
            let me = this;
            let attributes = device.properties.attributes;

            if (me.has_apps) {
                attributes['availableApplications'] = me.available_applications;
            }
            if (me.has_inputs) {
                attributes['availableInputs'] = me.available_inputs;
                attributes['commandOnlyInputSelector'] = me.command_only_input_selector;
                attributes['orderedInputs'] = me.ordered_inputs;
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

        updateStatesForTraits(device) {
            let me = this;
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
        updated(device, params, original_params) {
            let states = device.states;
            let command = device.command;
            this.debug(".updated: states = " + JSON.stringify(states));
            this.debug(".updated: params = " + JSON.stringify(params));
            this.debug(".updated: original_params = " + JSON.stringify(original_params));

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

             Object.keys(params).forEach(function (key) {
                 if (!msg.payload.hasOwnProperty(key)) {
                    msg.payload[key] = params[key];
                 }
             });

             if (command === 'action.devices.commands.mediaSeekRelative') {
                 if (original_params.hasOwnProperty('relativePositionMs')) {
                     msg.payload.relativePositionMs = original_params.relativePositionMs;
                 }
             } else if (command === 'action.devices.commands.mediaSeekToPosition') {
                if (original_params.hasOwnProperty('absPositionMs')) {
                    msg.payload.absPositionMs = original_params.absPositionMs;
                }
            }

            this.send(msg);
        };

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        onInput(msg) {
            const me = this;
            me.debug(".input: topic = " + msg.topic);

            let topicArr = String(msg.topic).split(this.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            try {
                if (topic.toUpperCase() === 'APPLICATIONS') {
                    if (this.has_apps) {
                        if (typeof msg.payload === 'undefined') {
                            this.available_applications = this.loadJson(this.available_applications_file, []);
                            if (this.available_applications === undefined) {
                                RED.log.error("Applications " +  this.available_applications_file + "file not found.");
                            }
                        } else {
                            if (!this.writeJson(this.available_applications_file, msg.payload)) {
                                RED.log.error("Error saving Applications to file " + this.available_applications_file);
                            } else {
                                this.available_applications = msg.payload;
                            }
                        }
                    } else {
                        this.available_applications = [];
                        RED.log.error("Applications disabled");
                    }
                } else if (topic.toUpperCase() === 'CHANNELS') {
                    if (this.has_channels) {
                        if (typeof msg.payload === 'undefined') {
                            this.available_channels = this.loadJson(this.available_channels_file, []);
                            if (this.available_channels === undefined) {
                                RED.log.error("Channels " +  this.available_channels_file + "file not found.");
                            }
                        } else {
                            if (!this.writeJson(this.available_channels_file, msg.payload)) {
                                RED.log.error("Error saving Channels to file " + this.available_channels_file);
                            } else {
                                this.available_channels = msg.payload;
                            }
                        }
                    } else {
                        this.available_channels = [];
                        RED.log.error("Channels disabled");
                    }
                } else if (topic.toUpperCase() === 'INPUTS') {
                    if (this.has_inputs) {
                        if (typeof msg.payload === 'undefined') {
                            this.available_inputs = this.loadJson(this.available_inputs_file, []);
                            if (this.available_inputs === undefined) {
                                RED.log.error("Inputs " +  this.available_inputs_file + "file not found.");
                            }
                        } else {
                            if (!this.writeJson(this.available_inputs_file, msg.payload)) {
                                RED.log.error("Error saving Inputs to file " + this.available_inputs_file);
                            } else {
                                this.available_inputs = msg.payload;
                            }
                        }
                    } else {
                        this.available_inputs = [];
                        RED.log.error("Inputs disabled");
                    }
                } else if (topic.toUpperCase() === 'MODES') {
                    if (this.has_modes) {
                        if (typeof msg.payload === 'undefined') {
                            this.available_modes = this.loadJson(this.available_modes_file, []);
                            if (this.available_modes === undefined) {
                                RED.log.error("Modes " +  this.available_modes_file + "file not found.");
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
                        this.available_modes = [];
                        RED.log.error("Modes disabled");
                    }
                } else if (topic.toUpperCase() === 'TOGGLES') {
                    if (this.has_toggles) {
                        if (typeof msg.payload === 'undefined') {
                            this.available_toggles = this.loadJson(this.available_toggles_file, []);
                            if (this.available_toggles === undefined) {
                                RED.log.error("Toggles " +  this.available_toggles_file + "file not found.");
                            } else {
                                this.updateTogglesState(me, me);
                            }
                        } else {
                            if (!this.writeJson(this.available_toggles_file, msg.payload)) {
                                RED.log.error("Error saving Toggles to file " + this.available_toggles_file);
                            } else {
                                this.available_toggles = msg.payload;
                                this.updateTogglesState(me, me);
                            }
                        }
                    } else {
                        this.available_toggles = [];
                        RED.log.error("Toggles disabled");
                    }
                } else {
                    let state_key = '';
                    Object.keys(this.states).forEach(function (key) {
                        if (topic.toUpperCase() == key.toUpperCase()) {
                            state_key = key;
                            me.debug(".input: found state " + key);
                        }
                    });

                    if (state_key !== '') {
                        const differs = me.setState(state_key, msg.payload, this.states);
                        if (differs) {
                            me.debug(".input: " + state_key + ' ' + msg.payload);
                            this.clientConn.setState(this, this.states);  // tell Google ...
        
                            if (this.passthru) {
                                msg.payload = this.states[state_key];
                                this.send(msg);
                            }

                            this.updateStatusIcon();
                        }
                    } else {
                        me.debug(".input: some other topic");
                        let differs = false;
                        Object.keys(this.states).forEach(function (key) {
                            if (msg.payload.hasOwnProperty(key)) {
                                me.debug(".input: set state " + key + ' to ' + msg.payload[key]);
                                if (me.setState(key, msg.payload[key], me.states)) {
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
            let states = device.states || {};
            const currentToggleSettings = states['currentToggleSettings']
            let new_toggles = {};
            me.available_toggles.forEach(function (toggle) {
                let value = false;
                if (typeof currentToggleSettings[toggle.name] === 'boolean') {
                    value = currentToggleSettings[toggle.name];
                }
                new_toggles[toggle.name] = value;
            });
            states['currentToggleSettings'] = new_toggles;
        }

        updateModesState(me, device) {
            // Key/value pair with the mode name of the device as the key, and the current setting_name as the value.
            me.debug(".updateModesState");
            let states = device.states || {};
            const currentModeSettings = states['currentModeSettings']
            let new_modes = {};
            me.available_modes.forEach(function (mode) {
                let value = '';
                if (typeof currentModeSettings[mode.name] === 'string') {
                    value = currentModeSettings[mode.name];
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
            let new_state = undefined;
            if (val_type === 'number') {
                if (value % 1 === 0) {
                    new_state = formats.FormatValue(formats.Formats.INT, key, value);
                } else {
                    new_state = formats.FormatValue(formats.Formats.FLOAT, key, value);
                }
            } else if (val_type === 'string') {
                new_state = formats.FormatValue(formats.Formats.STRING, key, value);
            } else if (val_type === 'boolean') {
                new_state = formats.FormatValue(formats.Formats.BOOL, key, value);
            } else if (val_type === 'object') {
                if (typeof value === "object") {
                    Object.keys(old_state).forEach(function (key) {
                        if (typeof new_state[key] !== 'undefined') {
                            if (me.setState(key, new_state[key], old_state)) {
                                differs = true;
                            }
                        }
                    });
                }
            }
            if (val_type !== 'object') {
                if (new_state !== undefined) {
                    differs = old_state !== new_state;
                    states[key] = new_state;
                }
            }
            return differs;
        }

        loadJson(filename, defaultValue) {
            if (!filename.startsWith(path.sep)) {
                const userDir = RED.settings.userDir;
                filename = path.join(userDir, filename);
            }
            this.debug('.loadJson: filename ' + filename);
        
            try {
                let jsonFile = fs.readFileSync(
                    filename,
                    {
                        'encoding': 'utf8',
                        'flag': fs.constants.R_OK | fs.constants.W_OK | fs.constants.O_CREAT
                    });
    
                if (jsonFile === '') {
                    this.debug('.loadJson: empty data');
                    return defaultValue;
                } else {
                    this.debug('.loadJson: data loaded');
                    const json = JSON.parse(jsonFile);
                    this.debug('.loadJson: json = ' + JSON.stringify(json));
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
            this.debug('.writeJson: filename ' + filename);
            if (typeof value === 'object') {
                value = JSON.stringify(value);
            }
            try {    
                fs.writeFileSync(
                    filename,
                    value,
                    {
                        'encoding': 'utf8',
                        'flag': fs.constants.W_OK | fs.constants.O_CREAT | fs.constants.O_TRUNC
                    });
    
                this.debug('writeJson: data saved');
                return true;
            }
            catch (err) {
                RED.log.error('Error on saving ' + filename + ': ' + err.toString());
                return false;
            }
        }

        execCommand(device, command) {
            let me = this;
            let params = {};
            let executionStates = [];
            const ok_result = {
                'params' : params,
                'executionStates': executionStates
            };

            me.debug(".execCommand: command " +  JSON.stringify(command));
            me.debug(".execCommand: states " +  JSON.stringify(this.states));
            // me.debug(".execCommand: device " +  JSON.stringify(device));

            // Applications
            if ((command.command == 'action.devices.commands.appInstall') ||
                (command.command == 'action.devices.commands.appSearch') ||
                (command.command == 'action.devices.commands.appSelect')) {
                if (command.params.hasOwnProperty('newApplication')) {
                    const newApplication = command.params['newApplication'];
                    let application_index = -1;
                    this.available_applications.forEach(function(application, index) {
                        if (application.key === newApplication) {
                            application_index = index;
                        }
                    });
                    if (application_index < 0) {
                        return {
                            status: 'ERROR',
                            errorCode: 'noAvailableApp'
                        };
                    }
                    executionStates.push('online', 'currentApplication');
                    params['currentApplication'] = newApplication;
                    return ok_result;
                }
                if (command.params.hasOwnProperty('newApplicationName')) {
                    const newApplicationName = command.params['newApplicationName'];
                    let application_key = '';
                    this.available_applications.forEach(function(application, index) {
                        application.names.forEach(function(name) {
                            if (name.name_synonym.includes(newApplicationName)) {
                                application_key = application.key;
                            }
                        });
                    });
                    if (application_key === '') {
                        return {
                            status: 'ERROR',
                            errorCode: 'noAvailableApp'
                        };
                    }
                    params['currentApplication'] = application_key;
                    executionStates.push('online', 'currentApplication');
                    return ok_result;
                }
            }
            // Inputs
            else if (command.command == 'action.devices.commands.SetInput') {
                if (command.params.hasOwnProperty('newInput')) {
                    const newInput = command.params['newInput'];
                    let current_input_index = -1;
                    this.available_inputs.forEach(function(input_element, index) {
                        if (input_element.key === newInput) {
                            current_input_index = index;
                        }
                    });
                    if (current_input_index < 0) {
                        return {
                            status: 'ERROR',
                            errorCode: 'unsupportedInput'
                        };
                    }
                    this.current_input_index = current_input_index;
                    params['currentInput'] = newInput;
                    executionStates.push('online', 'currentInput');
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.NextInput') {
                this.current_input_index++;
                if (this.current_input_index >= this.available_inputs.length) {
                    this.current_input_index = 0;
                }
                executionStates.push('online', 'currentInput');
                params['currentInput'] = this.available_inputs[this.current_input_index].names[0].key;
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.PreviousInput') {
                if (this.current_input_index <= 0) {
                    this.current_input_index = this.available_inputs.length;
                }
                this.current_input_index --;
                executionStates.push('online', 'currentInput');
                params['currentInput'] = this.available_inputs[this.current_input_index].names[0].key;
            }
            // On/Off
            /*else if (command.command == 'action.devices.commands.OnOff') {
                if (command.params.hasOwnProperty('on')) {
                    const on_param = command.params['on'];
                    return ok_result;
                }
            }*/
            // TransportControl
            else if (command.command == 'action.devices.commands.mediaStop') {
                params['playbackState'] = 'STOPPED';
                executionStates.push('online', 'playbackState');
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.mediaNext') {
                params['playbackState'] = 'FAST_FORWARDING';
                executionStates.push('online', 'playbackState');
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.mediaPrevious') {
                params['playbackState'] = 'REWINDING';
                executionStates.push('online', 'playbackState');
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.mediaPause') {
                params['playbackState'] = 'PAUSED';
                executionStates.push('online', 'playbackState');
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.mediaResume') {
                params['playbackState'] = 'PLAYING';
                executionStates.push('online', 'playbackState');
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.mediaSeekRelative') {
                if (command.params.hasOwnProperty('relativePositionMs')) {
                    //const relative_position_ms = command.params['relativePositionMs'];
                    params['playbackState'] = 'PLAYING';
                    executionStates.push('online', 'playbackState');
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.mediaSeekToPosition') {
                if (command.params.hasOwnProperty('absPositionMs')) {
                    //const abs_position_ms = command.params['absPositionMs'];
                    params['playbackState'] = 'PLAYING';
                    executionStates.push('online', 'playbackState');
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.mediaRepeatMode') {
                // TODO
                if (command.params.hasOwnProperty('isOn')) {
                    //const is_on = command.params['isOn'];
                    return ok_result;
                }
                if (command.params.hasOwnProperty('isSingle')) {
                    //const is_single = command.params['isSingle'];
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.mediaShuffle') {
                // TODO
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.mediaClosedCaptioningOn') {
                if (command.params.hasOwnProperty('closedCaptioningLanguage')) {
                    //const closedCaptioningLanguage = command.params['closedCaptioningLanguage'];
                    params['playbackState'] = this.states['playbackState'];
                }
                if (command.params.hasOwnProperty('userQueryLanguage')) {
                    //const userQueryLanguage = command.params['userQueryLanguage'];
                    params['playbackState'] = this.states['playbackState'];
                }
                executionStates.push('online', 'playbackState');
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.mediaClosedCaptioningOff') {
                executionStates.push('online', 'playbackState');
                return ok_result;
            }
            // Volume
            else if (command.command == 'action.devices.commands.mute') {
                if (command.params.hasOwnProperty('mute')) {
                    const mute = command.params['mute'];
                    params['isMuted'] = mute;
                    executionStates.push('online', 'isMuted', 'currentVolume');
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.setVolume') {
                if (command.params.hasOwnProperty('volumeLevel')) {
                    let volumeLevel = command.params['volumeLevel'];
                    if (volumeLevel > this.volumeMaxLevel) {
                        volumeLevel = this.volumeMaxLevel;
                    }
                    params['currentVolume'] = volumeLevel;
                    executionStates.push('online', 'isMuted', 'currentVolume');
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.volumeRelative') {
                if (command.params.hasOwnProperty('relativeSteps')) {
                    const relativeSteps = command.params['relativeSteps'];
                    let current_volume = this.states['currentVolume'];
                    if (current_volume >= this.volumeMaxLevel && relativeSteps > 0) {
                        return {
                            status: 'ERROR',
                            errorCode: 'volumeAlreadyMax'
                        };
                    } else if (current_volume <= 0 && relativeSteps < 0) {
                        return {
                            status: 'ERROR',
                            errorCode: 'volumeAlreadyMin'
                        };
                    }
                    current_volume += relativeSteps;
                    if (current_volume > this.volumeMaxLevel) {
                        current_volume = volumeMaxLevel;
                    } else if (current_volume < 0) {
                        current_volume = 0;
                    }
                    params['currentVolume'] = current_volume;
                    executionStates.push('online', 'currentVolume');
                    return ok_result;
                }
            }
            // Channels
            else if (command.command == 'action.devices.commands.selectChannel') {
                if (command.params.hasOwnProperty('channelCode')) {
                    const channelCode = command.params['channelCode'];
                    let new_channel_index = -1;
                    let new_channel_key = '';
                    let new_channel_number = '';
                    this.available_channels.forEach(function(channel, index) {
                        if (channel.key === channelCode) {
                            new_channel_index = index;
                            new_channel_key = channel.key;
                            new_channel_number = channel.number || '';
                        }
                    });
                    if (new_channel_index < 0) {
                        return {
                            status: 'ERROR',
                            errorCode: 'noAvailableChannel'
                        };
                    }
                    this.current_channel_index = new_channel_index;
                    params['currentChannel'] = new_channel_key;
                    params['currentChannelNumber'] = new_channel_number;
                    // executionStates.push('online', 'currentChannel');
                    return ok_result;
                }
                /*if (command.params.hasOwnProperty('channelName')) {
                    const channelName = command.params['channelName'];
                }*/
                if (command.params.hasOwnProperty('channelNumber')) {
                    const channelNumber = command.params['channelNumber'];
                    let new_channel_index = -1;
                    let new_channel_key = '';
                    let new_channel_number = '';
                    this.available_channels.forEach(function(channel, index) {
                        if (channel.number === channelNumber) {
                            new_channel_index = index;
                            new_channel_key = channel.key;
                            new_channel_number = channel.number || '';
                        }
                    });
                    if (new_channel_index < 0) {
                        return {
                            status: 'ERROR',
                            errorCode: 'noAvailableChannel'
                        };
                    }
                    me.current_channel_index = new_channel_index;
                    params['currentChannel'] = new_channel_key;
                    params['currentChannelNumber'] = new_channel_number;
                    // executionStates.push('online', 'currentChannel');
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.relativeChannel') {
                if (command.params.hasOwnProperty('relativeChannelChange')) {
                    const relativeChannelChange = command.params['relativeChannelChange'];
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
                    params['currentChannel'] = this.available_channels[current_channel_index].key;
                    params['currentChannelNumber'] = this.available_channels[current_channel_index].number || '';
                    // executionStates.push('online', 'currentChannel');
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
                params['currentChannel'] = this.available_channels[this.current_channel_index].key;
                params['currentChannelNumber'] = this.available_channels[current_channel_index].number || '';
                // executionStates.push('online', 'currentChannel');
                return ok_result;
            }
            // Modes
            else if (command.command == 'action.devices.commands.SetModes') {
                if (command.params.hasOwnProperty('updateModeSettings')) {
                    const updateModeSettings = command.params['updateModeSettings'];
                    let new_modes = {};
                    this.available_modes.forEach(function (mode) {
                        if (typeof updateModeSettings[mode.name] === 'string') {
                            let mode_value = updateModeSettings[mode.name];
                            mode.settings.forEach(function(setting) {
                                if (setting.setting_name === mode_value) {
                                    new_modes[mode.name] = mode_value;
                                }
                            });
                        }
                    });
                    params['currentModeSettings'] = new_modes;
                    executionStates.push('online', 'currentModeSettings');
                    return ok_result;
                }
            }
            // Traits
            else if (command.command == 'action.devices.commands.SetToggles') {
                if (command.params.hasOwnProperty('updateToggleSettings')) {
                    const updateToggleSettings = command.params['updateToggleSettings'];
                    let toggles = this.states['currentToggleSettings'];
                    this.available_toggles.forEach(function (toggle) {
                        if (typeof updateToggleSettings[toggle.name] === 'boolean') {
                            toggles[toggle.name] = updateToggleSettings[toggle.name];
                        }
                    });
                    params['currentToggleSettings'] = toggles;
                    executionStates.push('online', 'currentToggleSettings');
                    return ok_result;
                }
            }
            return false;
        }
    }

    RED.nodes.registerType("google-media", MediaNode);
}
