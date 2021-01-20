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
                states['currentToggleSettings'] = {}; // TODO Key/value pair with the toggle name of the device as the key, and the current state as the value.
            }
            if (me.has_modes) {
                states['currentModeSettings'] = {}; // TODO Key/value pair with the mode name of the device as the key, and the current setting_name as the value.
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
                            }
                        } else {
                            if (!this.writeJson(this.available_modes_file, msg.payload)) {
                                RED.log.error("Error saving Modes to file " + this.available_modes_file);
                            } else {
                                this.available_modes = msg.payload;
                            }
                        }
                    } else {
                        this.available_modes = undefined;
                        RED.log.error("Modes disabled");
                    }
                } else if (topic.toUpperCase() === 'TRAITS') {
                    if (this.has_traits) {
                        if (typeof msg.payload === undefined) {
                            this.available_traits = this.loadJson(this.available_traits_file, []);
                            if (this.available_traits === undefined) {
                                RED.log.error("Traits " +  this.available_traits_file + "file not found.")
                            }
                        } else {
                            if (!this.writeJson(this.available_traits_file, msg.payload)) {
                                RED.log.error("Error saving Traits to file " + this.available_traits_file);
                            } else {
                                this.available_traits = msg.payload;
                            }
                        }
                    } else {
                        this.available_traits = undefined;
                        RED.log.error("Traits disabled");
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
                new_value = value;
            }
            let differs = false;
            if (new_value !== undefined) {
                differs = states['key'] === new_value;
                states['key'] = new_value;
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
            const ok_result = {
                status: 'SUCCESS',
                states: this.states,
                executionStates: Object.keys(this.states)
            };

            RED.log.debug("MediaNode:execCommand(command) " +  JSON.stringify(command));
            RED.log.debug("MediaNode:execCommand(states) " +  JSON.stringify(this.states));
            // RED.log.debug("MediaNode:execCommand(device) " +  JSON.stringify(device));

            // Applications
            if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.appInstall') {
                const params = command.params;
                if (params.hasOwnProperty('newApplication')) {
                    const newApplication = params['newApplication'];
                    return ok_result;
                }
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.appSearch') {
                const params = command.params;
                if (params.hasOwnProperty('newApplication')) {
                    const newApplication = params['newApplication'];
                    return ok_result;
                }
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.appSelect') {
                const params = command.params;
                if (params.hasOwnProperty('newApplication')) {
                    const newApplication = params['newApplication'];
                    return ok_result;
                }
            }
            // Inputs
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.SetInput') {
                const params = command.params;
                if (params.hasOwnProperty('newInput')) {
                    const newInput = params['newInput'];
                    return ok_result;
                }
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.NextInput') {
                return ok_result;
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.PreviousInput') {
                return ok_result;
            }
            // On/Off
            /*else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.OnOff') {
                const params = command.params;
                if (params.hasOwnProperty('on')) {
                    const on_param = params['on'];
                    return ok_result;
                }
            }*/
            // TransportControl
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.mediaStop') {
                return ok_result;
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.mediaNext') {
                return ok_result;
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.mediaPrevious') {
                return ok_result;
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.mediaPause') {
                return ok_result;
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.mediaResume') {
                return ok_result;
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.mediaSeekRelative') {
                const params = command.params;
                if (params.hasOwnProperty('relativePositionMs')) {
                    const relative_position_ms = params['relativePositionMs'];
                    return ok_result;
                }
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.mediaSeekToPosition') {
                const params = command.params;
                if (params.hasOwnProperty('absPositionMs')) {
                    const abs_position_ms = params['absPositionMs'];
                    return ok_result;
                }
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.mediaRepeatMode') {
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
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.mediaShuffle') {
                return ok_result;
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.mediaClosedCaptioningOn') {
                const params = command.params;
                if (params.hasOwnProperty('closedCaptioningLanguage')) {
                    const closedCaptioningLanguage = params['closedCaptioningLanguage'];
                }
                if (params.hasOwnProperty('userQueryLanguage')) {
                    const userQueryLanguage = params['userQueryLanguage'];
                }
                return ok_result;
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.mediaClosedCaptioningOff') {
                return ok_result;
            }
            // Volume
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.mute') {
                const params = command.params;
                if (params.hasOwnProperty('mute')) {
                    const mute = params['mute'];
                    return ok_result;
                }
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.setVolume') {
                const params = command.params;
                if (params.hasOwnProperty('volumeLevel')) {
                    const volumeLevel = params['volumeLevel'];
                    return ok_result;
                }
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.volumeRelative') {
                const params = command.params;
                if (params.hasOwnProperty('relativeSteps')) {
                    const relativeSteps = params['relativeSteps'];
                    return ok_result;
                }
            }
            // Channels
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.selectChannel') {
                const params = command.params;
                if (params.hasOwnProperty('channelCode')) {
                    const channelCode = params['channelCode'];
                }
                if (params.hasOwnProperty('channelName')) {
                    const channelName = params['channelName'];
                }
                if (params.hasOwnProperty('channelNumber')) {
                    const channelNumber = params['channelNumber'];
                }
                return ok_result;
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.relativeChannel') {
                const params = command.params;
                if (params.hasOwnProperty('relativeChannelChange')) {
                    const relativeChannelChange = params['relativeChannelChange'];
                    return ok_result;
                }
            }
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.returnChannel') {
                return ok_result;
            }
            // Modes
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.SetModes') {
                const params = command.params;
                if (params.hasOwnProperty('updateModeSettings')) {
                    const updateModeSettings = params['updateModeSettings'];
                    return ok_result;
                }
            }
            // Traits
            else if (command.hasOwnProperty('params') && command.command == 'action.devices.commands.SetToggles') {
                const params = command.params;
                if (params.hasOwnProperty('updateToggleSettings')) {
                    const updateToggleSettings = params['updateToggleSettings'];
                    return ok_result;
                }
            }
        }
    }

    RED.nodes.registerType("google-media", MediaNode);
}
