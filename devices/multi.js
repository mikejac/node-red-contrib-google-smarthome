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
    class MultiNode {
        constructor(config) {
            RED.nodes.createNode(this,config);
            var node = this;

            this.client                         = config.client;
            this.clientConn                     = RED.nodes.getNode(this.client);
            this.debug("MultiNode config " + JSON.stringify(config));
            this.trait = {
                appselector: config.trait_appselector || false,
                armdisarm: config.trait_armdisarm || false,
                brightness: config.trait_brightness || false,
                camerastream: config.trait_camerastream || false,
                channel: config.trait_channel || false,
                colorsetting: config.trait_colorsetting || false,
                cook: config.trait_cook || false,
                dispense: config.trait_dispense || false,
                dock: config.trait_dock || false,
                energystorage: config.trait_energystorage || false,
                fanspeed: config.trait_fanspeed || false,
                fill: config.trait_fill || false,
                humiditysetting: config.trait_humiditysetting || false,
                inputselector: config.trait_inputselector || false,
                lighteffects: config.trait_lighteffects || false,
                locator: config.trait_locator || false,
                lockunlock: config.trait_lockunlock || false,
                mediastate: config.trait_mediastate || false,
                modes: config.trait_modes || false,
                toggles: config.trait_toggles || false,
                networkcontrol: config.trait_networkcontrol || false,
                objectdetection: config.objectdetection || false,
                onoff: config.trait_onoff || false,
                openclose: config.trait_openclose || false,
                reboot: config.trait_reboot || false,
                rotation: config.trait_rotation || false,
                runcycle: config.trait_runcycle || false,
                sensorstate: config.trait_sensorstate || false,
                scene: config.trait_scene || false,
                softwareupdate: config.trait_softwareupdate || false,
                startstop: config.trait_startstop || false,
                statusreport: config.trait_statusreport || false,
                temperaturecontrol: config.trait_temperaturecontrol || false,
                temperaturesetting: config.trait_temperaturesetting || false,
                timer: config.trait_timer || false,
                toggles: config.trait_toggles || false,
                transportcontrol: config.trait_transportcontrol || false,
                volume: config.trait_volume || false,
            };
            this.topicOut                               = config.topic;
            this.device_type					        = config.device_type;
            this.appselector_file                       = config.appselector_file;
            this.available_applications                 = [];
            this.channel_file                           = config.channel_file;
            this.available_channels                     = [];
            this.inputselector_file                     = config.inputselector_file;
            this.available_inputs                       = [];
            this.command_only_input_selector            = config.command_only_input_selector;
            this.ordered_inputs                         = config.ordered_inputs;
            this.support_activity_state                 = config.support_activity_state;
            this.support_playback_state                 = config.support_playback_state;
            this.command_only_onoff                     = config.command_only_onoff;
            this.query_only_onoff                       = config.query_only_onoff;
            this.supported_commands                     = config.supported_commands;
            this.volume_max_level                       = parseInt(config.volume_max_level) || 100;
            this.can_mute_and_unmute                    = config.can_mute_and_unmute;
            this.volume_default_percentage              = parseInt(config.volume_default_percentage) || 40;
            this.level_step_size                        = parseInt(config.level_step_size) || 1;
            this.command_only_volume                    = config.command_only_volume;
            this.modes_file                             = config.modes_file;
            this.available_modes                        = [];
            this.command_only_modes                     = config.command_only_modes;
            this.query_only_modes                       = config.query_only_modes;
            this.toggles_file                           = config.toggles_file;
            this.available_toggles                      = [];
            this.command_only_toggles                   = config.command_only_toggles;
            this.query_only_toggles                     = config.query_only_toggles;
            this.last_channel_index                     = '';
            this.current_channel_index                  = -1;
            this.current_input_index                    = -1;
            this.command_only_brightness                = config.command_only_brightness;
            this.command_only_colorsetting              = config.command_only_colorsetting;
            this.temperature_min_k                      = parseInt(config.temperature_min_k) || 2000;
            this.temperature_max_k                      = parseInt(config.temperature_max_k) || 9000;
            this.color_model                            = config.color_model || 'temp';
            this.hlsUrl                                 = config.hls.trim();
            this.hlsAppId                               = config.hls_app_id.trim();
            this.dashUrl                                = config.dash.trim();
            this.dashAppId                              = config.dash_app_id.trim();
            this.smoothStreamUrl                        = config.smooth_stream.trim();
            this.smoothStreamAppId                      = config.smooth_stream_app_id.trim();
            this.progressiveMp4Url                      = config.progressive_mp4.trim();
            this.progressiveMp4AppId                    = config.progressive_mp4_app_id.trim();
            this.authToken                              = config.auth_token.trim();
            this.scene_reversible                       = config.scene_reversible;
            this.command_only_timer                     = config.command_only_timer;
            this.max_timer_limit_sec                    = config.max_timer_limit_sec;
            this.trait_temperaturesetting               = config.trait_temperaturesetting;
            this.available_thermostat_modes             = config.available_thermostat_modes;
            this.min_threshold_celsius                  = parseInt(config.min_threshold_celsius) || 0;
            this.max_threshold_celsius                  = parseInt(config.max_threshold_celsius) || 40;
            this.thermostat_temperature_unit            = config.thermostat_temperature_unit || "C";
            this.buffer_range_celsius                   = parseInt(config.buffer_range_celsius) || 2;
            this.command_only_temperaturesetting        = config.command_only_temperaturesetting;
            this.query_only_temperaturesetting          = config.query_only_temperaturesetting;
            this.target_temp_reached_estimate_unix_timestamp_sec = undefined;
            this.thermostat_humidity_ambient            = undefined;
            this.tc_min_threshold_celsius               = config.tc_min_threshold_celsius;
            this.tc_max_threshold_celsius               = config.tc_max_threshold_celsius;
            this.tc_temperature_step_celsius            = config.tc_temperature_step_celsius;
            this.tc_temperature_unit_for_ux             = config.tc_temperature_unit_for_ux;
            this.tc_command_only_temperaturecontrol     = config.tc_command_only_temperaturecontrol;
            this.tc_query_only_temperaturecontrol       = config.tc_query_only_temperaturecontrol;
            this.min_percent                            = parseInt(config.min_percent) || 0;
            this.max_percent                            = parseInt(config.max_percent) || 100;
            this.command_only_humiditysetting           = config.command_only_humiditysetting;
            this.query_only_humiditysetting             = config.query_only_humiditysetting;
            this.discrete_only_openclose                = config.discrete_only_openclose;
            this.open_direction                         = config.open_direction;
            this.command_only_openclose                 = config.command_only_openclose;
            this.query_only_openclose                   = config.query_only_openclose;

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

            if (!this.clientConn) {
                this.error(RED._("multi.errors.missing-config"));
                this.status({fill: "red", shape: "dot", text: "Missing config"});
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("multi.errors.missing-bridge"));
                this.status({fill: "red", shape: "dot", text: "Missing SmartHome"});
                return;
            }

            // Sets required traits
            switch (this.device_type) {
                case "AC_UNIT": // Air conditioning unit
                    this.trait.temperaturesetting = true;
                    break;
                case "AIRCOOLER": // Air cooler
                    this.trait.temperaturesetting = true;
                    break;
                case "AIRFRESHENER": // Air freshener
                    this.trait.onoff = true;
                    break;
                case "AIRPURIFIER": // Air purifier
                    this.trait.onoff = true;
                    break;
                case "AUDIO_VIDEO_RECEIVER": // Audio-Video receiver
                    this.trait.inputselector = true;
                    this.trait.onoff	 = true;
                    this.trait.volume = true;
                    break;
                case "AWNING": // Awning
                    this.trait.openclose = true;
                    break;
                case "BATHTUB": // Bathtub
                    this.trait.fill = true;
                    this.trait.temperaturecontrol = true;
                    this.trait.startstop = true;
                    break;
                case "BED": // Bed
                    this.trait.modes = true;
                    break;
                case "BLENDER": // Blender
                    this.trait.onoff = true;
                    break;
                case "BLINDS": // Blinds
                    this.trait.openclose = true;
                    break;
                case "BOILER": // Boiler
                    this.trait.onoff = true;
                    break;
                case "CAMERA": // Camera
                    this.trait.camerastream = true;
                    break;
                case "CARBON_MONOXIDE_DETECTOR": // Carbon monoxide detector
                    this.trait.sensorstate = true;
                    break;
                case "CHARGER": // Charger
                    this.trait.energystorage = true;
                    break;
                case "CLOSET": // Closet
                    this.trait.closet = true;
                    break;
                case "COFFEE_MAKER": // Coffee Maker
                    this.trait.onoff = true;
                    break;
                case "COOKTOP": // Cooktop
                    this.trait.onoff = true;
                    break;
                case "CURTAIN": // Curtain
                    this.trait.openclose = true;
                    break;
                case "DEHUMIDIFIER": // Dehumidifier
                    this.trait.onoff = true;
                    break;
                case "DEHYDRATOR": // Dehydrator
                    this.trait.onoff = true;
                    break;
                case "DISHWASHER": // Dishwasher
                    this.trait.startstop = true;
                    break;
                case "DOOR": // Door
                    this.trait.openclose = true;
                    break;
                case "DRAWER": // Drawer
                    this.trait.openclose = true;
                    break;
                case "DRYER": // Dryer
                    this.trait.startstop = true;
                    break;
                case "FAN": // Fan
                    this.trait.onoff = true;
                    break;
                case "FAUCET": // Faucet
                    break;
                case "FIREPLACE": // Fireplace
                    break;
                case "FREEZER": // Freezer
                    this.trait.temperaturecontrol = true;
                    break;
                case "FRYER": // Fryer
                    this.trait.onoff = true;
                    break;
                case "GARAGE": // Garage
                    this.trait.openclose = true;
                    break;
                case "GATE": // Gate
                    this.trait.openclose = true;
                    break;
                case "GRILL": // Grill
                    this.trait.startstop = true;
                    break;
                case "HEATER": // Heater
                    this.trait.temperaturesetting = true;
                    break;
                case "HOOD": // Hood
                    this.trait.onoff = true;
                    break;
                case "HUMIDIFIER": // Humidifier
                    this.trait.onoff = true;
                    break;
                case "KETTLE": // Kettle
                    this.trait.onoff = true;
                    break;
                case "LIGHT": // Light
                    this.trait.onoff = true;
                    break;
                case "LOCK": // Lock
                    this.trait.lockunlock = true;
                    break;
                case "MICROWAVE": // Microwave
                    this.trait.startstop = true;
                    break;
                case "MOP": // Mop
                    this.trait.startstop = true;
                    break;
                case "MOWER": // Mower
                    this.trait.startstop = true;
                    break;
                case "MULTICOOKER": // Multicooker
                    this.trait.onoff = true;
                    break;
                case "NETWORK": // Network
                    this.trait.networkcontrol = true;
                    break;
                case "OUTLET": // Outlet
                    this.trait.onoff = true;
                    break;
                case "OVEN": // Oven
                    this.trait.onoff = true;
                    break;
                case "PERGOLA": // Pergola
                    this.trait.openclose = true;
                    break;
                case "PETFEEDER": // Pet feeder
                    this.trait.dispense = true;
                    break;
                case "PRESSURECOOKER": // Pressure cooker
                    this.trait.onoff = true;
                    break;
                case "RADIATOR": // Radiator
                    this.trait.onoff = true;
                    break;
                case "REFRIGERATOR": // Refrigerator
                    this.trait.temperaturecontrol = true;
                    break;
                case "REMOTECONTROL": // Remote control
                    this.trait.inputselector	 = true;
                    this.trait.mediastate	 = true;
                    this.trait.onoff	 = true;
                    this.trait.transportcontrol	 = true;
                    this.trait.volume = true;
                    break;
                case "ROUTER": // Router
                    this.trait.networkcontrol = true;
                    break;
                case "SCENE": // Scene
                    this.trait.scene = true;
                    break;
                case "SECURITYSYSTEM": // Security system
                    this.trait.armdisarm = true;
                    break;
                case "SENSOR": // Sensor
                    this.trait.sensorstate = true;
                    break;
                case "SETTOP": // Settop
                    this.trait.appselector = true;
                    this.trait.mediastate = true;
                    this.trait.channel = true;
                    this.trait.transportcontrol = true;
                    break;
                case "SHOWER": // Shower
                    this.trait.openclose = true;
                    break;
                case "SHUTTER": // Shutter
                    this.trait.openclose = true;
                    break;
                case "SMOKE_DETECTOR": // Smoke detector
                    break;
                case "SOUNDBAR": // Soundbar
                    this.trait.volume = true;
                    break;
                case "SOUSVIDE": // Sousvide
                    this.trait.onoff = true;
                    break;
                case "SPEAKER": // Speaker
                    this.trait.volunme = true;
                    break;
                case "SPRINKLER": // Sprinkler
                    this.trait.startstop = true;
                    break;
                case "STANDMIXER": // Stand mixer
                    this.trait.onoff = true;
                    break;
                case "STREAMING_BOX": // Streaming box
                    this.trait.appselector = true;
                    this.trait.mediastate = true;
                    this.trait.transportcontrol	 = true;
                    this.trait.volume = true;
                    break;
                case "STREAMING_SOUNDBAR": // Streaming soundbar
                    this.trait.appselector = true;
                    this.trait.mediastate = true;
                    this.trait.transportcontrol = true;
                    this.trait.volume = true;
                    break;
                case "STREAMING_STICK": // Streaming stick
                    this.trait.appselector = true;
                    this.trait.mediastate = true;
                    this.trait.transportcontrol = true;
                    this.trait.volume = true;
                    break;
                case "SWITCH": // Switch
                    this.trait.onoff = true;
                    break;
                case "THERMOSTAT": // Thermostat
                    this.trait.temperaturesetting = true;
                    break;
                case "TV": // Television
                    this.trait.appselector = true;
                    this.trait.mediastate = true;
                    this.trait.onoff = true;
                    this.trait.transportcontrol = true;
                    this.trait.volume = true;
                    break;
                case "VACUUM": // Vacuum
                    this.trait.startstop = true;
                    break;
                case "VALVE": // Valve
                    this.trait.openclose = true;
                    break;
                case "WASHER": // Washer
                    this.trait.startstop = true;
                    break;
                case "WATERHEATER": // Water heater
                    this.trait.onoff = true;
                    break;
                case "WATERPURIFIER": // Water purifier
                    break;
                case "WATERSOFTENER": // Water softener
                    break;
                case "WINDOW": // Window
                    this.trait.openclose = true;
                    break;
                case "YOGURTMAKER": // Yogurt maker
                    this.trait.onoff = true;
                    break;
            }
            
            let error_msg = '';
            if (this.trait.apps) {
                this.available_applications = this.loadJson(this.appselector_file, []);
                if (this.available_applications === undefined) {
                    error_msg += ' Applications file error.';
                    RED.log.error("Applications " +  this.appselector_file + "file error.");
                }
            } else {
                this.available_applications = undefined;
                this.debug(".constructor: Applications disabled");
            }

            if (this.trait.channel) {
                this.available_channels = this.loadJson(this.channel_file, []);
                if (this.available_channels === undefined) {
                    error_msg += ' Channels file error.';
                    RED.log.error("Channels " +  this.channel_file + "file error.");
                }
            } else {
                this.available_channels = undefined;
                this.debug(".constructor: Channels disabled");
            }

            if (this.trait.inputselector) {
                this.available_inputs = this.loadJson(this.inputselector_file, []);
                if (this.available_inputs === undefined) {
                    error_msg += ' Inputs file error.';
                    RED.log.error("Inputs " +  this.inputselector_file + "file error.");
                }
            } else {
                this.available_inputs = undefined;
                this.debug(".constructor Inputs disabled");
            }

            if (this.trait.modes) {
                this.available_modes = this.loadJson(this.modes_file, []);
                if (this.available_modes === undefined) {
                    error_msg += ' Modes file error.';
                    RED.log.error("Modes " +  this.modes_file + "file error.");
                }
            } else {
                this.available_modes = undefined;
                this.debug(".constructor: Modes disabled");
            }

            if (this.trait.toggles) {
                this.available_toggles = this.loadJson(this.toggles_file, []);
                if (this.available_toggles === undefined) {
                    error_msg += ' Toggles file error.';
                    RED.log.error("Toggles " +  this.toggles_file + "file error.");
                }
            } else {
                this.available_toggles = undefined;
                this.debug(".constructor: Toggles disabled");
            }

            this.states = this.clientConn.register(this, 'multi', config.name, this);

            if (error_msg.length == 0) {
                this.status({fill: "yellow", shape: "dot", text: "Ready"});
            } else {
                this.status({fill: "red", shape: "dot", text: error_msg});
            }

            this.on('input', this.onInput);
            this.on('close', this.onClose);
        }

        debug(msg) {
            msg = 'google-smarthome:MultiNode' + msg;
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
        registerDevice(client, name, me) {
            me.debug(".registerDevice: device_type " + me.device_type);

            const default_name = me.getDefaultName(me.device_type);
            const default_name_type = default_name.replace(/[_ ()/]+/g, '-').toLowerCase();
            let device = {
                id: client.id,
                states: {
                    online: true
                },
                properties: {
                    type: 'action.devices.types.' + me.device_type,
                    traits: me.getTraits(me),
                    name: {
                        defaultNames: ["Node-RED " + default_name],
                        name: name
                    },
                    willReportState: true,
                    attributes: {
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-multi-' + default_name_type + '-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    },
                    customData: {
                        "nodeid": client.id,
                        "type": default_name_type
                    }
                }
            };

            this.updateAttributesForTraits(me, device);
            this.updateStatesForTraits(me, device);

            me.debug(".registerDevice: device = " + JSON.stringify(device));

            return device;
        }

        updateAttributesForTraits(me, device) {
            let attributes = device.properties.attributes;

            if (me.trait.apps) {
                attributes['availableApplications'] = me.available_applications;
            }
            if (me.trait.brightness) {
                attributes['commandOnlyBrightness'] = me.command_only_brightness;
            }
            if (me.trait.channels) {
                attributes['availableChannels'] = me.available_channels;
            }
            if (me.trait.colorsetting) {
                attributes["commandOnlyColorSetting"] = me.command_only_colorsetting;
                if (me.color_model !== "rgb" && me.color_model !== "rgb_temp") {
                    attributes['colorModel'] =  "rgb";
                }
                else if (me.color_model !== "hsv" && me.color_model !== "hsv_temp") {
                    attributes['colorModel'] =  "hsv";
                }
                if (me.color_model !== "rgb" && me.color_model !== "hsv") {
                    attributes['colorTemperatureRange'] =  {
                        "temperatureMinK": me.temperature_min_k,
                        "temperatureMaxK": me.temperature_max_k
                    };
                }
            }
            if (me.trait.openclose) {
                attributes['discreteOnlyOpenClose'] = me.discrete_only_openclose;
                attributes['openDirection'] = me.open_direction;
                attributes['commandOnlyOpenClose'] = me.command_only_openclose;
                attributes['queryOnlyOpenClose'] = me.query_only_openclose;
            }
            if (me.trait.humiditysetting) {
                attributes['humiditySetpointRange'] = {
                    minPercent: me.min_percent,
                    maxPercent: me.max_percent
                };
                attributes['commandOnlyHumiditySetting'] = me.command_only_humiditysetting;
                attributes['queryOnlyHumiditySetting'] = me.query_only_humiditysetting;
            }
            if (me.trait.inputs) {
                attributes['availableInputs'] = me.available_inputs;
                attributes['commandOnlyInputSelector'] = me.command_only_input_selector;
                attributes['orderedInputs'] = me.ordered_inputs;
            }
            if (me.trait.media_state) {
                attributes['supportActivityState'] = me.support_activity_state;
                attributes['supportPlaybackState'] = me.support_playback_state;
            }
            if (me.trait.modes) {
                attributes['availableModes'] = me.available_modes;
                attributes['commandOnlyModes'] = me.command_only_modes;
                attributes['queryOnlyModes'] = me.query_only_modees;
            }
            if (me.trait.onoff) {
                attributes['commandOnlyOnOff'] = me.command_only_onoff;
                attributes['queryOnlyOnOff'] = me.query_only_onoff;
            }
            if (me.trait.scene) {
                attributes['sceneReversible'] = me.scene_reversible;
            }
            if (me.trait.temperaturecontrol) {
                attributes['temperatureRange'] = {
                    minThresholdCelsius: me.tc_min_threshold_celsius,
                    maxThresholdCelsius: me.tc_max_threshold_celsius
                }
                attributes['temperatureStepCelsius'] = me.tc_temperature_step_celsius;
                attributes['temperatureUnitForUX'] = me.tc_temperature_unit_for_ux;
                attributes['commandOnlyTemperatureSetting'] = me.command_only_temperaturesetting;
                attributes['queryOnlyTemperatureSetting'] = me.query_only_temperaturesetting;
            }
            if (me.trait.temperaturesetting) {
                attributes['availableThermostatModes'] = me.available_thermostat_modes;
                attributes['thermostatTemperatureRange'] = {
                    minThresholdCelsius: me.min_threshold_celsius,
                    maxThresholdCelsius: me.max_threshold_celsius
                }
                attributes['thermostatTemperatureUnit'] = me.thermostat_temperature_unit;
                attributes['bufferRangeCelsius'] = me.buffer_range_celsius;
                attributes['commandOnlyTemperatureSetting'] = me.command_only_temperaturesetting;
                attributes['queryOnlyTemperatureSetting'] = me.query_only_temperaturesetting;
            }
            if (me.trait.timer) {
                attributes['maxTimerLimitSec'] = me.max_timer_limit_sec;
                attributes['commandOnlyTimer'] = me.command_only_timer;
            }
            if (me.trait.toggles) {
                attributes['availableToggles'] = me.available_toggles;
                attributes['commandOnlyToggles'] = me.command_only_toggles;
                attributes['queryOnlyToggles'] = me.query_only_toggles;
            }
            if (me.trait.transport_control) {
                attributes['transportControlSupportedCommands'] = me.supported_commands;
            }
            if (me.trait.volume) {
                attributes['volumeMaxLevel'] = me.volume_max_level;
                attributes['volumeCanMuteAndUnmute'] = me.can_mute_and_unmute;
                attributes['volumeDefaultPercentage'] = me.volume_default_percentage;
                attributes['levelStepSize'] = me.level_step_size;
                attributes['commandOnlyVolume'] = me.command_only_volume;
            }
        }

        updateStatesForTraits(me, device) {
            let states = device.states;

            if (me.trait.apps) {
                states['currentApplication'] = '';
            }
            if (me.trait.brightness) {
                states['brightness'] = 50;
            }
            if (me.trait.colorsetting) {
                if (me.color_model === "rgb") {
                    states['color'] = { spectrumRgb : 16777215 };
                } else if (me.color_model === "hsv") {
                    states['color'] = { spectrumHsv : {
                        hue: 0.0,           // float, representing hue as positive degrees in the range of [0.0, 360.0)
                        saturation: 0.0,    // float, representing saturation as a percentage in the range [0.0, 1.0]
                        value: 1            // float, representing value as a percentage in the range [0.0, 1.0]
                        }
                    };
                } else {
                    states['color'] = { temperatureK : me.temperature_max_k || 6000 };
                }
            }
            if (me.trait.dock) {
                states['isDocked'] = false;
            }
            if (me.trait.lockunlock) {
                states['isLocked'] = false;
                states['isJammed'] = false;
            }
            if (me.trait.openclose) {
                if (me.open_direction.length < 2) {
                    states['openPercent'] = 0;
                } else {
                    openState = [];
                    states['openState'] = openState;
                    me.open_direction.forEach(direction => {
                        openState.push({
                            openPercent: 0,
                            openDirection: direction
                        });
                    });
                }
            }
            if (me.trait.inputs) {
                states['humiditySetpointPercent'] = 50;
                states['humidityAmbientPercent'] = 50;
            }
            if (me.trait.inputs) {
                states['currentInput'] = '';
            }
            if (me.trait.media_state) {
                // INACTIVE STANDBY ACTIVE
                states['activityState'] = 'INACTIVE';
                // PAUSED PLAYING FAST_FORWARDING REWINDING BUFFERING STOPPED
                states['playbackState'] = 'STOPPED';
            }
            if (me.trait.modes) {
                states['currentModeSettings'] = {};
                this.updateModesState(me, device);
            }
            if (me.trait.onoff) {
                states['on'] = false;
            }
            if (me.trait.temperaturecontrol) {
                states['temperatureSetpointCelsius'] = 10;
                states['temperatureAmbientCelsius'] = 10;
            }
            if (me.trait.temperaturesetting) {
                states['activeThermostatMode'] = "none";
                states['thermostatMode'] = "none";
                states['thermostatTemperatureAmbient'] = 10;
                states['thermostatTemperatureSetpoint'] = 10;
            }
            if (me.trait.timer) {
                states['timerRemainingSec'] = -1;
                states['timerPaused'] = false;
            }
            if (me.trait.toggles) {
                states['currentToggleSettings'] = {};
                this.updateTogglesState(me, device);
            }
            if (me.trait.volume) {
                states['currentVolume'] = me.volume_default_percentage;
                states['isMuted'] = false;
            }
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

             Object.keys(original_params).forEach(function (key) {
                if (!msg.payload.hasOwnProperty(key)) {
                   msg.payload[key] = original_params[key];
                }
            });

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
                    if (this.trait.apps) {
                        if (typeof msg.payload === undefined) {
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
                    if (this.trait.channels) {
                        if (typeof msg.payload === undefined) {
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
                    if (this.trait.inputs) {
                        if (typeof msg.payload === undefined) {
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
                    if (this.trait.modes) {
                        if (typeof msg.payload === undefined) {
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
                    if (this.trait.toggles) {
                        if (typeof msg.payload === undefined) {
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
                this.clientConn.remove(this, 'multi');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'multi');
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
            return RED._('multi.device_type.' + device_type);
        }

        getTraits(me) {
            const trait =me.trait;
            let traits=[];

            if (trait.appselector) {
                traits.push("action.devices.traits.AppSelector");
            }
            if (trait.armdisarm) {
                traits.push("action.devices.traits.ArmDisarm");
            }
            if (trait.brightness) {
                traits.push("action.devices.traits.Brightness");
            }
            if (trait.camerastream) {
                traits.push("action.devices.traits.CameraStream");
            }
            if (trait.channel) {
                traits.push("action.devices.traits.Channel");
            }
            if (trait.colorsetting) {
                traits.push("action.devices.traits.ColorSetting");
            }
            if (trait.cook) {
                traits.push("action.devices.traits.Cook");
            }
            if (trait.dispense) {
                traits.push("action.devices.traits.Dispense");
            }
            if (trait.dock) {
                traits.push("action.devices.traits.Dock");
            }
            if (trait.energystorage) {
                traits.push("action.devices.traits.EnergyStorage");
            }
            if (trait.fanspeed) {
                traits.push("action.devices.traits.FanSpeed");
            }
            if (trait.fill) {
                traits.push("action.devices.traits.Fill");
            }
            if (trait.humiditysetting) {
                traits.push("action.devices.traits.HumiditySetting");
            }
            if (trait.inputselector) {
                traits.push("action.devices.traits.InputSelector");
            }
            if (trait.LightEffects) {
                traits.push("action.devices.traits.LightEffects");
            }
            if (trait.locator) {
                traits.push("action.devices.traits.Locator");
            }
            if (trait.lockunlock) {
                traits.push("action.devices.traits.LockUnlock");
            }
            if (trait.mediastate) {
                traits.push("action.devices.traits.MediaState");
            }
            if (trait.modes) {
                traits.push("action.devices.traits.Modes");
            }
            if (trait.networkcontrol) {
                traits.push("action.devices.traits.NetworkControl");
            }
            if (trait.objectdetection) {
                traits.push("action.devices.traits.ObjectDetection");
            }
            if (trait.onoff) {
                traits.push("action.devices.traits.OnOff");
            }
            if (trait.openclose) {
                traits.push("action.devices.traits.OpenClose");
            }
            if (trait.reboot) {
                traits.push("action.devices.traits.Reboot");
            }
            if (trait.rotation) {
                traits.push("action.devices.traits.Rotation");
            }
            if (trait.runcycle) {
                traits.push("action.devices.traits.RunCycle");
            }
            if (trait.sensorstate) {
                traits.push("action.devices.traits.SensorState");
            }
            if (trait.scene) {
                traits.push("action.devices.traits.Scene");
            }
            if (trait.softwareupdate) {
                traits.push("action.devices.traits.SoftwareUpdate");
            }
            if (trait.startstop) {
                traits.push("action.devices.traits.StartStop");
            }
            if (trait.statusreport) {
                traits.push("action.devices.traits.StatusReport");
            }
            if (trait.temperaturecontrol) {
                traits.push("action.devices.traits.TemperatureControl");
            }
            if (trait.temperaturesetting) {
                traits.push("action.devices.traits.TemperatureSetting");
            }
            if (trait.timer) {
                traits.push("action.devices.traits.Timer ");
            }
            if (trait.toggles) {
                traits.push("action.devices.traits.Toggles");
            }
            if (trait.transportcontrol) {
                traits.push("action.devices.traits.TransportControl");
            }
            if (trait.volume) {
                traits.push("action.devices.traits.Volume");
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
                Object.keys(old_state).forEach(function (key) {
                    if (typeof new_state[key] !== undefined) {
                        if (me.setState(key, new_state[key], old_State)) {
                            differs = true;
                        }
                    }
                });
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
            // Dock
            else if (command.command == 'action.devices.commands.Dock') {
                executionStates.push('online', 'isDocked');
            }
            // HumiditySetting
            else if (command.command == 'action.devices.commands.SetHumidity') {
                const humidity = command.params['humidity'];
                me.states['humiditySetpointPercent'] = humidity;
            }
            else if (command.command == 'action.devices.commands.HumidityRelative') {
                if (command.params.hasOwnProperty('humidityRelativePercent')) {
                    const humidityRelativePercent = command.params['humidityRelativePercent'];
                    me.states['humiditySetpointPercent'] = me.states['humiditySetpointPercent']  * (1 + humidityRelativePercent / 100);
                }
                if (command.params.hasOwnProperty('humidityRelativeWeight')) {
                    const humidityRelativeWeight = command.params['humidityRelativeWeight'];
                    me.states['humidityRelativeWeight'] = me.states['humidityRelativeWeight']  + humidityRelativeWeight;
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
                params['currentInput'] = this.available_inputs[this.current_input_index].names[0].name_synonym[0]; // Ignore Language?
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.PreviousInput') {
                if (this.current_input_index <= 0) {
                    this.current_input_index = this.available_inputs.length;
                }
                this.current_input_index --;
                executionStates.push('online', 'currentInput');
                params['currentInput'] = this.available_inputs[this.current_input_index].names[0].name_synonym[0]; // Ignore Language?
                return ok_result;
            }
            // On/Off
            else if (command.command == 'action.devices.commands.OnOff') {
                if (command.params.hasOwnProperty('on')) {
                    const on_param = command.params['on'];
                    executionStates.push('online', 'on');
                    params['on'] = on_param;
                    return ok_result;
                }
            }
            // OpenClose
            else if (command.command == 'action.devices.commands.OpenClose') {
                const openPercent = parseInt(command.params[openPercent]) || 0;
                // TODO
            }
            else if (command.command == 'action.devices.commands.OpenCloseRelative') {
                const openPercent = parseInt(command.params[openPercent]) || 0;
                // TODO
            }
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
                    const relative_position_ms = command.params['relativePositionMs'];
                    params['playbackState'] = 'PLAYING';
                    executionStates.push('online', 'playbackState');
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.mediaSeekToPosition') {
                if (command.params.hasOwnProperty('absPositionMs')) {
                    const abs_position_ms = command.params['absPositionMs'];
                    params['playbackState'] = 'PLAYING';
                    executionStates.push('online', 'playbackState');
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.mediaRepeatMode') {
                // TODO
                if (command.params.hasOwnProperty('isOn')) {
                    const is_on = command.params['isOn'];
                    return ok_result;
                }
                if (command.params.hasOwnProperty('isSingle')) {
                    const is_single = command.params['isSingle'];
                    return ok_result;
                }
            }
            else if (command.command == 'action.devices.commands.mediaShuffle') {
                // TODO
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.mediaClosedCaptioningOn') {
                if (command.params.hasOwnProperty('closedCaptioningLanguage')) {
                    const closedCaptioningLanguage = command.params['closedCaptioningLanguage'];
                    params['playbackState'] = this.states['playbackState'];
                }
                if (command.params.hasOwnProperty('userQueryLanguage')) {
                    const userQueryLanguage = command.params['userQueryLanguage'];
                    params['playbackState'] = this.states['playbackState'];
                }
                executionStates.push('online', 'playbackState');
                return ok_result;
            }
            else if (command.command == 'action.devices.commands.mediaClosedCaptioningOff') {
                executionStates.push('online', 'playbackState');
                return ok_result;
            }
            // TempreatureControl
            else if (command.command == 'action.devices.commands.SetTemperature') {
                const temperature = parseInt(temperature) || 0;
                me.states['temperatureSetpointCelsius'] = temperature;
            }
            // TemperatureSetting 
            else if (command.command == 'action.devices.commands.ThermostatTemperatureSetpoint') {
                delete me.states['thermostatTemperatureSetpointHigh'];
                delete me.states['thermostatTemperatureSetpointLow'];
                const thermostatTemperatureSetpoint = command.params['thermostatTemperatureSetpoint'];
                me.states['thermostatTemperatureSetpointLow'] = parseInt(thermostatTemperatureSetpoint) || 0;
            }
            else if (command.command == 'action.devices.commands.ThermostatTemperatureSetRange') {
                delete me.states['thermostatTemperatureSetpoint'];
                const thermostatTemperatureSetpointHigh = command.params['thermostatTemperatureSetpointHigh'];
                me.states['thermostatTemperatureSetpointHigh'] = parseInt(thermostatTemperatureSetpointHigh) || 0;
                const thermostatTemperatureSetpointLow = command.params['thermostatTemperatureSetpointLow'];
                me.states['thermostatTemperatureSetpointLow'] = parseInt(thermostatTemperatureSetpointLow) || 0;
            }
            //else if (command.command == 'action.devices.commands.ThermostatSetMode') {
            //}
            else if (command.command == 'action.devices.commands.TemperatureRelative') {
                if (command.params.hasOwnProperty('thermostatTemperatureRelativeDegree')) {
                    const thermostatTemperatureRelativeDegree = command.params['thermostatTemperatureRelativeDegree'];
                    // TODO
                }
                if (command.params.hasOwnProperty('thermostatTemperatureRelativeWeight')) {
                    const thermostatTemperatureRelativeWeight = command.params['thermostatTemperatureRelativeWeight'];
                    // TODO
                }                    
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
                    let modes = this.states['currentModeSettings'];
                    this.available_modes.forEach(function (mode) {
                        if (typeof updateModeSettings[mode.name] === 'string') {
                            modes[mode.name] = updateModeSettings[mode];
                        }
                    });
                    params['currentModeSettings'] = modes;
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
                        if (typeof updateToggleSettings[toggle].name === 'boolean') {
                            toggles[toggle.name] = updateToggleSettings[toggle.name];
                        }
                    });
                    params['currentToggleSettings'] = toggles;
                    executionStates.push('online', 'currentToggleSettings');
                    return ok_result;
                }
            }
            // Brigthness
            else if (command.command == 'action.devices.commands.BrightnessAbsolute') {
                const brightness = command.params['brightness'];
                params['brightness'] = brightness;
                executionStates.push('online', 'brightness');
            }
            else if (command.command == 'action.devices.commands.BrightnessRelative') {
                let brightness = this.states['brightness'];
                if (command.params.hasOwnProperty('brightnessRelativePercent')) {
                    const brightnessRelativePercent = command.params['brightnessRelativePercent'];
                    brightness = brightness * (1 + parseInt(brightnessRelativePercent) / 100);
                }
                if (command.params.hasOwnProperty('brightnessRelativeWeight')) {
                    const brightnessRelativeWeight = command.params['brightnessRelativeWeight'];
                    brightness = brightness + parseInt(brightnessRelativePercent);
                }
                params['brightness'] = brightness;
                executionStates.push('online', 'brightness');
                return ok_result;
            }
            // ColorSetting
            else if (command.command == 'action.devices.commands.ColorAbsolute') {
                if (command.params.hasOwnProperty('color')) {
                    params['color'] = command.params.color;
                    /*if (command.params.color.hasOwnProperty('name')) {
                        params.color.name = command.params.color.name;
                    }*/
                    if (command.params.color.hasOwnProperty('temperature')) {
                        params['color'] = { temperatureK: command.params.color.temperature};
                    } else if (command.params.color.hasOwnProperty('spectrumRGB')) {
                        params['color'] = { spectrumRgb: command.params.color.spectrumRGB };
                    } else if (command.params.color.hasOwnProperty('spectrumHSV')) {
                        params['color'] = { spectrumHsv: command.params.color.spectrumHSV};
                    }
                    executionStates.push('online', 'color');
                    return ok_result;
                }
            }
            // Camera
            else if (command.command == 'action.devices.commands.GetCameraStream') {
                if (command.params.hasOwnProperty('SupportedStreamProtocols')) {
                    const supported_protocols = command.params['SupportedStreamProtocols'];
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

            return false;
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
    }

    RED.nodes.registerType("google-multi", MultiNode);
}
