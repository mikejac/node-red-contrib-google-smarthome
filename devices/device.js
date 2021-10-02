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

module.exports = function (RED) {
    "use strict";

    const formats = require('../formatvalues.js');
    const fs = require('fs');
    const path = require('path');
    const util = require('util');
    const COOK_SUPPORTED_UNIT = ["UNKNOWN_UNITS", "NO_UNITS", "CENTIMETERS", "CUPS", "DECILITERS", "FEET", "FLUID_OUNCES", "GALLONS", "GRAMS", "INCHES", "KILOGRAMS", "LITERS", "METERS", "MILLIGRAMS", "MILLILITERS", "MILLIMETERS", "OUNCES", "PINCH", "PINTS", "PORTION", "POUNDS", "QUARTS", "TABLESPOONS", "TEASPOONS"];
    const DISPENSE_SUPPORTED_UNIT = ["CENTIMETERS", "CUPS", "DECILITERS", "FLUID_OUNCES", "GALLONS", "GRAMS", "KILOGRAMS", "LITERS", "MILLIGRAMS", "MILLILITERS", "MILLIMETERS", "NO_UNITS", "OUNCES", "PINCH", "PINTS", "PORTION", "POUNDS", "QUARTS", "TABLESPOONS", "TEASPOONS"];

    const Formats = {
        BOOL: 1,
        INT: 2,
        FLOAT: 4,
        STRING: 8,
        MANDATORY: 128,
        COPY_OBJECT: 256,
    };

    /******************************************************************************************************************
     *
     *
     */
    class DeviceNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.device = {};
            this.client = config.client;
            this.clientConn = RED.nodes.getNode(this.client);
            this._debug(".constructor config " + JSON.stringify(config));

            if (!this.clientConn) {
                this.error(RED._("device.errors.missing-config"));
                this.status({ fill: "red", shape: "dot", text: "Missing config" });
                return;
            } else if (typeof this.clientConn.register !== 'function') {
                this.error(RED._("device.errors.missing-bridge"));
                this.status({ fill: "red", shape: "dot", text: "Missing SmartHome" });
                return;
            }

            this.lang = this.clientConn.default_lang || 'en';
            this.state_types = {};
            this.errorCode = undefined;
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
                networkcontrol: config.trait_networkcontrol || false,
                objectdetection: config.trait_objectdetection || false,
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
            this.topicOut = config.topic;
            this.room_hint = config.room_hint;
            this.device_type = config.device_type;

            // AppSelector
            this.appselector_file = config.appselector_file;
            this.available_applications = [];
            // ArmDisarm
            this.available_arm_levels_file = config.available_arm_levels_file;
            this.arm_levels_ordered = config.arm_levels_ordered || false;
            // Brightness
            this.command_only_brightness = config.command_only_brightness;
            // CameraStream
            this.auth_token = config.auth_token.trim();
            this.hls = config.hls.trim();
            this.hls_app_id = config.hls_app_id.trim();
            this.dash = config.dash.trim();
            this.dash_app_id = config.dash_app_id.trim();
            this.smooth_stream = config.smooth_stream.trim();
            this.smooth_stream_app_id = config.smooth_stream_app_id.trim();
            this.progressive_mp4 = config.progressive_mp4.trim();
            this.progressive_mp4_app_id = config.progressive_mp4_app_id.trim();
            this.webrtc = config.webrtc.trim();
            this.webrtc_app_id = config.webrtc_app_id.trim();
            this.camera_stream_supported_protocols = [];
            if (this.hls) {
                this.camera_stream_supported_protocols.push('hls');
            }
            if (this.dash) {
                this.camera_stream_supported_protocols.push('dash');
            }
            if (this.smooth_stream) {
                this.camera_stream_supported_protocols.push('smooth_stream');
            }
            if (this.progressive_mp4) {
                this.camera_stream_supported_protocols.push('progressive_mp4');
            }
            if (this.webrtc) {
                this.camera_stream_supported_protocols.push('webrtc');
            }
            // Channel 
            this.channel_file = config.channel_file;
            this.available_channels = [];
            this.last_channel_index = -1;
            this.current_channel_index = -1;
            // ColorSetting 
            this.command_only_colorsetting = config.command_only_colorsetting;
            this.color_model = config.color_model || 'temp';
            this.temperature_min_k = parseInt(config.temperature_min_k) || 2000;
            this.temperature_max_k = parseInt(config.temperature_max_k) || 9000;
            // Cook
            this.supported_cooking_modes = config.supported_cooking_modes;
            this.food_presets_file = config.food_presets_file;
            this.food_presets = [];
            // Dispense 
            this.supported_dispense_items_file = config.supported_dispense_items_file;
            this.supported_dispense_items = [];
            this.supported_dispense_presets_file = config.supported_dispense_presets_file;
            this.supported_dispense_presets = [];
            // Dock
            // EnergyStorage
            this.energy_storage_distance_unit_for_ux = config.energy_storage_distance_unit_for_ux;
            this.query_only_energy_storage = config.query_only_energy_storage;
            this.is_rechargeable = config.is_rechargeable;
            // FanSpeed
            this.reversible = config.reversible;
            this.command_only_fanspeed = config.command_only_fanspeed;
            this.supports_fan_speed_percent = config.supports_fan_speed_percent;
            this.available_fan_speeds_file = config.available_fan_speeds_file;
            this.fan_speeds_ordered = config.fan_speeds_ordered || false;
            this.available_fan_speeds = [];
            // Fill
            this.available_fill_levels_file = config.available_fill_levels_file;
            this.available_fill_levels = [];
            this.ordered_fill_levels = config.ordered_fill_levels;
            this.supports_fill_percent = config.supports_fill_percent;
            // HumiditySetting 
            this.min_percent = parseInt(config.min_percent) || 0;
            this.max_percent = parseInt(config.max_percent) || 100;
            this.command_only_humiditysetting = config.command_query_humiditysetting === 'command';
            this.query_only_humiditysetting = config.command_query_humiditysetting === 'query';
            // InputSelector 
            this.inputselector_file = config.inputselector_file;
            this.available_inputs = [];
            this.command_only_input_selector = config.command_only_input_selector;
            this.ordered_inputs = config.ordered_inputs;
            this.current_input_index = -1;
            // LightEffects 
            this.default_sleep_duration = parseInt(config.default_sleep_duration) || 1800;
            this.default_wake_duration = parseInt(config.default_wake_duration) || 1800;
            this.supported_effects = config.supported_effects;
            // Locator 
            // LockUnlock 
            // MediaState
            this.support_activity_state = config.support_activity_state;
            this.support_playback_state = config.support_playback_state;
            // Modes 
            this.modes_file = config.modes_file;
            this.available_modes = [];
            this.command_only_modes = config.command_query_modes === 'command';
            this.query_only_modes = config.command_query_modes === 'query';
            // NetworkControl
            this.supports_enabling_guest_network = config.supports_enabling_guest_network;
            this.supports_disabling_guest_network = config.supports_disabling_guest_network;
            this.supports_getting_guest_network_password = config.supports_getting_guest_network_password;
            this.network_profiles = config.network_profiles;
            this.supports_enabling_network_profile = config.supports_enabling_network_profile;
            this.supports_disabling_network_profile = config.supports_disabling_network_profile;
            this.supports_network_download_speedtest = config.supports_network_download_speedtest;
            this.supports_network_upload_speedtest = config.supports_network_upload_speedtest;
            this.guest_network_password = '';
            // ObjectDetection 
            // OnOff 
            this.command_only_onoff = config.command_query_onoff === 'command';
            this.query_only_onoff = config.command_query_onoff === 'query';
            // OpenClose
            this.discrete_only_openclose = config.discrete_only_openclose;
            this.open_direction = config.open_direction;
            this.command_only_openclose = config.command_query_openclose === 'command';
            this.query_only_openclose = config.command_query_openclose === 'query';
            // Reboot 
            // Rotation 
            this.supports_degrees = config.supports_degrees;
            this.supports_percent = config.supports_percent;
            this.rotation_degrees_min = parseInt(config.rotation_degrees_min) || 0;
            this.rotation_degrees_max = parseInt(config.rotation_degrees_max) || 360;
            this.supports_continuous_rotation = config.supports_continuous_rotation;
            this.command_only_rotation = config.command_only_rotation;
            // RunCycle
            // Scene
            this.scene_reversible = config.scene_reversible;
            // SensorState 
            this.sensor_states_supported = config.sensor_states_supported;
            // SoftwareUpdate 
            // StartStop
            this.pausable = config.pausable;
            this.available_zones = config.available_zones;
            // StatusReport 
            // TemperatireControl
            this.tc_min_threshold_celsius = parseInt(config.tc_min_threshold_celsius) || 0;
            this.tc_max_threshold_celsius = parseInt(config.tc_max_threshold_celsius) || 40;
            this.tc_temperature_step_celsius = parseInt(config.tc_temperature_step_celsius) || 1;
            this.tc_temperature_unit_for_ux = config.tc_temperature_unit_for_ux;
            this.command_only_temperaturecontrol = config.tc_command_query_temperaturecontrol === 'command';
            this.query_only_temperaturecontrol = config.tc_command_query_temperaturecontrol === 'query';
            // TemperatureSetting
            this.available_thermostat_modes = config.available_thermostat_modes;
            this.min_threshold_celsius = parseInt(config.min_threshold_celsius) || 10;
            this.max_threshold_celsius = parseInt(config.max_threshold_celsius) || 32;
            this.thermostat_temperature_setpoint = this.min_threshold_celsius;
            this.thermostat_temperature_setpoint_low = this.min_threshold_celsius;
            this.thermostat_temperature_setpoint_hight = this.max_threshold_celsius;
            this.thermostat_temperature_unit = config.thermostat_temperature_unit || "C";
            this.buffer_range_celsius = parseInt(config.buffer_range_celsius) || 2;
            this.command_only_temperaturesetting = config.command_query_temperaturesetting === 'command';
            this.query_only_temperaturesetting = config.command_query_temperaturesetting === 'query';
            this.target_temp_reached_estimate_unix_timestamp_sec = 360;
            this.thermostat_humidity_ambient = 60;
            // Timer 
            this.max_timer_limit_sec = parseInt(config.max_timer_limit_sec) || 86400;
            this.command_only_timer = config.command_only_timer;
            this.timer_end_timestamp = -1;
            // Toggles
            this.toggles_file = config.toggles_file;
            this.available_toggles = [];
            this.command_only_toggles = config.command_query_toggles === 'command';
            this.query_only_toggles = config.command_query_toggles === 'query';
            // TransportControl 
            this.supported_commands = config.supported_commands;
            // Volume 
            this.volume_max_level = parseInt(config.volume_max_level) || 100;
            this.volume_can_mute_and_unmute = config.volume_can_mute_and_unmute;
            this.volume_default_percentage = parseInt(config.volume_default_percentage) || 40;
            this.level_step_size = parseInt(config.level_step_size) || 1;
            this.command_only_volume = config.command_only_volume;

            if (this.device_type != 'SCENE') {
                this.trait.scene = false;
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
                    this.trait.onoff = true;
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
                    this.trait.inputselector = true;
                    this.trait.mediastate = true;
                    this.trait.onoff = true;
                    this.trait.transportcontrol = true;
                    this.trait.volume = true;
                    break;
                case "ROUTER": // Router
                    this.trait.networkcontrol = true;
                    break;
                case "SCENE": // Scene
                    this.trait.scene = true;
                    this.trait = {
                        scene: config.trait_scene || false
                    };
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
                    this.trait.volume = true;
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
                    this.trait.transportcontrol = true;
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
            if (this.trait.appselector) {
                this.available_applications = this.to_available_applications(this.loadJson('Applications', this.appselector_file.replace(/<id>/g, this.id), []));
            } else {
                this.available_applications = [];
                this._debug(".constructor: AppSelector disabled");
            }

            if (this.trait.armdisarm) {
                this.available_arm_levels = this.to_available_arm_levels(this.loadJson('Available arm levels', this.available_arm_levels_file.replace(/<id>/g, this.id), []));
            } else {
                this.available_arm_levels = [];
                this._debug(".constructor: ArmDisarm disabled");
            }

            if (this.trait.channel) {
                this.available_channels = this.to_available_channels(this.loadJson('Channels', this.channel_file.replace(/<id>/g, this.id), []));
            } else {
                this.available_channels = [];
                this._debug(".constructor: Channel disabled");
            }

            if (this.trait.cook) {
                this.food_presets = this.to_food_presets(this.loadJson('Food presets', this.food_presets_file.replace(/<id>/g, this.id), []));
            } else {
                this.food_presets = [];
                this._debug(".constructor: Cook disabled");
            }

            if (this.trait.dispense) {
                this.supported_dispense_items = this.to_supported_dispense_items(this.loadJson('Supported dispense', this.supported_dispense_items_file.replace(/<id>/g, this.id), []));
                this.supported_dispense_presets = this.to_supported_dispense_presets(this.loadJson('Supported dispense presets', this.supported_dispense_presets_file.replace(/<id>/g, this.id), []));
            } else {
                this.supported_dispense_items = [];
                this.supported_dispense_presets = [];
                this._debug(".constructor: Dispense disabled");
            }

            if (this.trait.fanspeed) {
                this.available_fan_speeds = this.to_available_fan_speeds(this.loadJson('Fan speeds', this.available_fan_speeds_file.replace(/<id>/g, this.id), []));
            } else {
                this.available_fan_speeds = [];
                this._debug(".constructor: FanSpeeds disabled");
            }

            if (this.trait.fill) {
                this.available_fill_levels = this.to_available_fill_levels(this.loadJson('Available fill levels', this.available_fill_levels_file.replace(/<id>/g, this.id), []));
            } else {
                this.available_fill_levels = [];
                this._debug(".constructor: Fill disabled");
            }

            if (this.trait.inputselector) {
                this.available_inputs = this.to_available_inputs(this.loadJson('Available inputs', this.inputselector_file.replace(/<id>/g, this.id), []));
            } else {
                this.available_inputs = [];
                this._debug(".constructor InputSelector disabled");
            }

            if (this.trait.modes) {
                this.available_modes = this.to_available_modes(this.loadJson('Modes', this.modes_file.replace(/<id>/g, this.id), []));
            } else {
                this.available_modes = [];
                this._debug(".constructor: Modes disabled");
            }

            if (this.trait.toggles) {
                this.available_toggles = this.to_available_toggles(this.loadJson('Toggles', this.toggles_file.replace(/<id>/g, this.id), []));
            } else {
                this.available_toggles = [];
                this._debug(".constructor: Toggles disabled");
            }

            this.updateStateTypesForTraits();

            this.exclusive_states = {
                color: {
                    temperatureK: ['spectrumRgb', 'spectrumHsv'],
                    spectrumRgb: ['temperatureK', 'spectrumHsv'],
                    spectrumHsv: ['temperatureK', 'spectrumRgb'],
                },
                thermostatTemperatureSetpointLow: ['thermostatTemperatureSetpoint'],
                thermostatTemperatureSetpointHigh: ['thermostatTemperatureSetpoint'],
                thermostatTemperatureSetpoint: ['thermostatTemperatureSetpointLow', 'thermostatTemperatureSetpointHigh'],
            };

            // GoogleSmartHomeNode -> (client.registerDevice -> DeviceNode.registerDevice), app.registerDevice
            this.states = this.clientConn.register(this, 'device', config.name);

            if (error_msg.length == 0) {
                this.updateStatusIcon();
            } else {
                this.status({ fill: "red", shape: "dot", text: error_msg });
            }

            this.on('input', this.onInput);
            this.on('close', this.onClose);
            this.clientConn.app.ScheduleRequestSync();
        }

        _debug(msg) {
            msg = 'google-smarthome:DeviceNode' + msg;
            if (this.clientConn && typeof this.clientConn._debug === 'function') {
                this.clientConn._debug(msg);
            } else {
                this.debug(msg);
            }
        }

        /******************************************************************************************************************
         * called to register device
         *
         */
        registerDevice(client, name) {
            this._debug(".registerDevice: device_type " + this.device_type);

            const default_name = this.getDefaultName(this.device_type);
            const default_name_type = default_name.replace(/[_ ()/]+/g, '-').toLowerCase();
            let states = {
                online: true
            };
            let device = {
                id: client.id,
                states: states,
                properties: {
                    type: 'action.devices.types.' + this.device_type,
                    traits: this.getTraits(this),
                    name: {
                        defaultNames: ["Node-RED " + default_name],
                        name: name
                    },
                    roomHint: this.room_hint,
                    willReportState: true,
                    notificationSupportedByAgent: this.trait.objectdetection || this.trait.runcycle || this.trait.sensorstate
                        || this.trait.lockunlock || this.trait.networkcontrol || this.trait.openclose,
                    attributes: {
                    },
                    deviceInfo: {
                        manufacturer: 'Node-RED',
                        model: 'nr-device-' + default_name_type + '-v1',
                        swVersion: '1.0',
                        hwVersion: '1.0'
                    }
                }
            };

            this.updateAttributesForTraits(device);
            this.updateStatesForTraits(device);

            this._debug(".registerDevice: device = " + JSON.stringify(device));

            this.device = device;
            return device;
        }

        updateStateTypesForTraits() {
            let me = this;
            let state_types = me.state_types;
            state_types['online'] = Formats.BOOL + Formats.MANDATORY;

            if (me.trait.appselector) {
                state_types['currentApplication'] = Formats.STRING + Formats.MANDATORY;
            }
            if (me.trait.armdisarm) {
                state_types['isArmed'] = Formats.BOOL + Formats.MANDATORY;
                state_types['currentArmLevel'] = Formats.STRING + Formats.MANDATORY;
                state_types['exitAllowance'] = Formats.INT;
            }
            if (me.trait.brightness && !me.command_only_brightness) {
                state_types['brightness'] = Formats.INT;
            }
            if (me.trait.colorsetting) {
                if (!me.command_only_colorsetting) {
                    if ((me.color_model === "rgb") || (me.color_model === 'rgb_temp')) {
                        state_types['color'] = {
                            spectrumRgb: Formats.INT + Formats.MANDATORY
                        };
                    } else if ((me.color_model === "hsv") || (me.color_model === "hsv_temp")) {
                        state_types['color'] = {
                            spectrumHsv: {
                                hue: Formats.FLOAT + Formats.MANDATORY,           // float, representing hue as positive degrees in the range of [0.0, 360.0)
                                saturation: Formats.FLOAT + Formats.MANDATORY,    // float, representing saturation as a percentage in the range [0.0, 1.0]
                                value: Formats.FLOAT + Formats.MANDATORY          // float, representing value as a percentage in the range [0.0, 1.0]
                            }
                        };
                    } else {
                        state_types['color'] = {};
                    }
                    if (me.color_model !== "rgb" && me.color_model !== "hsv") {
                        state_types.color.temperatureK = Formats.INT + Formats.MANDATORY;
                    }
                }
            }
            if (me.trait.cook) {
                state_types['currentCookingMode'] = Formats.STRING + Formats.MANDATORY;
                state_types['currentFoodPreset'] = Formats.STRING;
                state_types['currentFoodQuantity'] = Formats.FLOAT;
                state_types['currentFoodUnit'] = Formats.STRING;
            }
            if (me.trait.dispense) {
                state_types['dispenseItems'] = [
                    {
                        itemName: Formats.STRING,
                        amountRemaining: {
                            amount: Formats.FLOAT,
                            unit: Formats.STRING,
                        },
                        amountLastDispensed: {
                            amount: Formats.FLOAT,
                            unit: Formats.STRING,
                        },
                        isCurrentlyDispensing: Formats.BOOL,
                    },
                    {
                        keyId: 'itemName',
                        removeIfNoData: true,
                    }
                ];
            }
            if (me.trait.dock) {
                state_types['isDocked'] = Formats.BOOL;
            }
            if (me.trait.energystorage) {
                state_types['descriptiveCapacityRemaining'] = Formats.STRING + Formats.MANDATORY;
                state_types['capacityRemaining'] = [
                    {
                        rawValue: Formats.INT + Formats.MANDATORY,
                        unit: Formats.STRING + Formats.MANDATORY,
                    },
                    {
                        keyId: "unit",
                        addIfMissing: true,
                        removeIfNoData: true,
                        isValidKey: unit => ['SECONDS', 'MILES', 'KILOMETERS', 'PERCENTAGE', 'KILOWATT_HOURS'].includes(unit)
                    }
                ];
                if (me.is_rechargeable) {
                    state_types['capacityUntilFull'] = [
                        {
                            rawValue: Formats.INT + Formats.MANDATORY,
                            unit: Formats.STRING + Formats.MANDATORY,
                        },
                        {
                            keyId: "unit",
                            addIfMissing: true,
                            removeIfNoData: true,
                            isValidKey: unit => ['SECONDS', 'MILES', 'KILOMETERS', 'PERCENTAGE', 'KILOWATT_HOURS'].includes(unit)
                        }
                    ];
                    state_types['isCharging'] = Formats.BOOL;
                }
                state_types['isPluggedIn'] = Formats.BOOL;
            }
            if (me.trait.fanspeed) {
                if (!me.command_only_fanspeed) {
                    if (me.supports_fan_speed_percent) {
                        state_types['currentFanSpeedPercent'] = Formats.INT + Formats.MANDATORY;
                    } else {
                        state_types['currentFanSpeedPercent'] = Formats.INT;
                    }
                    if (me.available_fan_speeds.length > 0) {
                        state_types['currentFanSpeedSetting'] = Formats.STRING;
                    }
                }
            }
            if (me.trait.fill) {
                state_types['isFilled'] = Formats.BOOL + Formats.MANDATORY;
                if (me.available_fill_levels.length > 0) {
                    state_types['currentFillLevel'] = Formats.STRING + Formats.MANDATORY;
                } else {
                    state_types['currentFillLevel'] = Formats.STRING;
                }
                if (me.supports_fill_percent) {
                    state_types['currentFillPercent'] = Formats.FLOAT + Formats.MANDATORY;
                } else {
                    state_types['currentFillPercent'] = Formats.FLOAT;
                }
            }
            if (me.trait.humiditysetting) {
                if (!me.command_only_humiditysetting) {
                    state_types['humiditySetpointPercent'] = Formats.INT;
                    state_types['humidityAmbientPercent'] = Formats.INT;
                }
            }
            if (me.trait.inputselector) {
                if (!me.command_only_input_selector) {
                    state_types['currentInput'] = Formats.STRING + Formats.MANDATORY;
                }
            }
            if (me.trait.lighteffects) {
                state_types['activeLightEffect'] = Formats.STRING + Formats.MANDATORY;
                state_types['lightEffectEndUnixTimestampSec'] = Formats.INT;
            }
            // Locator
            if (me.trait.lockunlock) {
                state_types['isLocked'] = Formats.BOOL;
                state_types['isJammed'] = Formats.BOOL;
            }
            if (me.trait.mediastate) {
                // INACTIVE STANDBY ACTIVE
                state_types['activityState'] = Formats.STRING;
                // PAUSED PLAYING FAST_FORWARDING REWINDING BUFFERING STOPPED
                state_types['playbackState'] = Formats.STRING;
            }
            if (me.trait.modes) {
                if (!me.command_only_modes) {
                    state_types['currentModeSettings'] = Formats.COPY_OBJECT + Formats.STRING; // Mode keys are not defined in advance, See the docs
                }
            }
            if (me.trait.networkcontrol) {
                state_types['networkEnabled'] = Formats.BOOL;
                state_types['networkSettings'] = {
                    ssid: Formats.STRING + Formats.MANDATORY
                };
                state_types['guestNetworkEnabled'] = Formats.BOOL;
                state_types['guestNetworkSettings'] = {
                    ssid: Formats.STRING + Formats.MANDATORY
                };
                state_types['numConnectedDevices'] = Formats.INT;
                state_types['networkUsageMB'] = Formats.FLOAT;
                state_types['networkUsageLimitMB'] = Formats.FLOAT;
                state_types['networkUsageUnlimited'] = Formats.BOOL;
                state_types['lastNetworkDownloadSpeedTest'] = {
                    downloadSpeedMbps: Formats.FLOAT,
                    unixTimestampSec: Formats.INT,
                    status: Formats.STRING
                };
                state_types['lastNetworkUploadSpeedTest'] = {
                    uploadSpeedMbps: Formats.FLOAT,
                    unixTimestampSec: Formats.INT,
                    status: Formats.STRING
                };
                state_types['networkSpeedTestInProgress'] = Formats.BOOL;
            }
            // ObjectDetection 
            if (me.trait.onoff) {
                if (!me.command_only_onoff) {
                    state_types['on'] = Formats.BOOL;
                }
            }
            if (me.trait.openclose) {
                if (!me.command_only_openclose) {
                    if (me.open_direction.length < 2) {
                        state_types['openPercent'] = Formats.FLOAT + Formats.MANDATORY;
                    } else {
                        state_types['openState'] = [
                            {
                                openPercent: Formats.FLOAT + Formats.MANDATORY,
                                openDirection: Formats.STRING + Formats.MANDATORY
                            },
                            {
                                keyId: 'openDirection',
                                removeIfNoData: true,
                                replaceAll: false,
                                isValidKey: direction => me.open_direction.includes(direction.trim()) ? direction.trim() : undefined
                            }
                        ];
                    }
                }
            }
            // Reboot, no state
            if (me.trait.rotation) {
                if (!me.command_only_rotation) {
                    if (me.supports_degrees) {
                        state_types['rotationDegrees'] = Formats.FLOAT;
                    }
                    if (me.supports_percent) {
                        state_types['rotationPercent'] = Formats.FLOAT;
                    }
                }
            }
            if (me.trait.runcycle) {
                state_types['currentRunCycle'] = [
                    {
                        currentCycle: Formats.STRING + Formats.MANDATORY,
                        nextCycle: Formats.STRING,
                        lang: Formats.STRING + Formats.MANDATORY
                    },
                    {
                        keyId: 'currentCycle',
                        addIfMissing: true,
                        removeIfNoData: true,
                        isValidKey: cycle => cycle.trim().length > 0 ? cycle.trim() : undefined
                    }
                ];
                state_types['currentTotalRemainingTime'] = Formats.INT + Formats.MANDATORY;
                state_types['currentCycleRemainingTime'] = Formats.INT + Formats.MANDATORY;
            }
            // Scene 
            if (me.trait.sensorstate) {
                state_types['currentSensorStateData'] = [
                    {
                        name: Formats.STRING + Formats.MANDATORY,
                        currentSensorState: Formats.STRING,
                        rawValue: Formats.FLOAT
                    },
                    {
                        keyId: 'name',
                        addIfMissing: true,
                        removeIfNoData: true,
                        replaceAll: false,
                        isValidKey: name => me.sensor_states_supported.includes(name.trim()) ? name.trim() : undefined
                    }
                ];
            }
            if (me.trait.softwareupdate) {
                state_types['lastSoftwareUpdateUnixTimestampSec'] = Formats.INT + Formats.MANDATORY;
            }
            if (me.trait.startstop) {
                state_types['isRunning'] = Formats.BOOL + Formats.MANDATORY;
                state_types['isPaused'] = Formats.BOOL;
                state_types['activeZones'] = [
                    Formats.STRING,
                    {
                        addIfMissing: true,
                        removeIfNoData: true,
                        isValidKey: zone => me.available_zones.includes(zone.trim()) ? zone.trim() : undefined
                    }
                ];
            }
            if (me.trait.statusreport) {
                state_types['currentStatusReport'] = [
                    {
                        blocking: Formats.BOOL,
                        deviceTarget: Formats.STRING,
                        priority: Formats.INT,
                        statusCode: Formats.STRING
                    },
                    {
                        keyId: ['deviceTarget', 'statusCode'],
                        addIfMissing: true,
                        removeIfNoData: true,
                        isValidKey: nodeId => Object.keys(me.clientConn.getProperties([nodeId])).length > 0 ? nodeId : me.clientConn.getIdFromName(nodeId)
                    }
                ];
            }
            if (me.trait.temperaturecontrol) {
                if (!me.command_only_temperaturecontrol) {
                    if (me.query_only_temperaturecontrol) { // Required if queryOnlyTemperatureControl set to false
                        state_types['temperatureSetpointCelsius'] = Formats.FLOAT;
                    } else {
                        state_types['temperatureSetpointCelsius'] = Formats.FLOAT + Formats.MANDATORY;
                    }
                    state_types['temperatureAmbientCelsius'] = Formats.FLOAT;
                }
            }
            if (me.trait.temperaturesetting) {
                if (!me.command_only_temperaturesetting) {
                    state_types['activeThermostatMode'] = Formats.STRING;
                    state_types['targetTempReachedEstimateUnixTimestampSec'] = Formats.INT;
                    state_types['thermostatHumidityAmbient'] = Formats.FLOAT;
                    state_types['thermostatMode'] = Formats.STRING + Formats.MANDATORY;
                    state_types['thermostatTemperatureAmbient'] = Formats.FLOAT + Formats.MANDATORY;
                    state_types['thermostatTemperatureSetpoint'] = Formats.FLOAT + Formats.MANDATORY;       // 0 One of
                    state_types['thermostatTemperatureSetpointHigh'] = Formats.FLOAT + Formats.MANDATORY;   // 1 One of
                    state_types['thermostatTemperatureSetpointLow'] = Formats.FLOAT + Formats.MANDATORY;    // 1 One of
                }
            }
            if (me.trait.timer) {
                if (!me.command_only_timer) {
                    state_types['timerRemainingSec'] = Formats.INT + Formats.MANDATORY;
                    state_types['timerPaused'] = Formats.BOOL;
                }
            }
            if (me.trait.toggles) {
                if (!me.command_only_toggles) {
                    state_types['currentToggleSettings'] = Formats.COPY_OBJECT + Formats.BOOL; // Toggles keys are not defined in advance, See the docs
                }
            }
            // TransportControl 
            if (me.trait.volume) {
                if (!me.command_only_volume) {
                    state_types['currentVolume'] = Formats.INT + Formats.MANDATORY;
                    if (me.volume_can_mute_and_unmute) {
                        state_types['isMuted'] = Formats.BOOL + Formats.MANDATORY;
                    } else {
                        state_types['isMuted'] = Formats.BOOL;
                    }
                }
            }
        }

        updateAttributesForTraits(device) {
            let me = this;
            let attributes = device.properties.attributes;

            if (me.trait.appselector) {
                attributes['availableApplications'] = me.available_applications;
            }
            if (me.trait.armdisarm) {
                attributes['availableArmLevels'] = {
                    levels: me.available_arm_levels,
                    ordered: me.arm_levels_ordered
                };
            }
            if (me.trait.brightness) {
                attributes['commandOnlyBrightness'] = me.command_only_brightness;
            }
            if (me.trait.channel) {
                attributes['availableChannels'] = me.available_channels;
            }
            if (me.trait.colorsetting) {
                attributes["commandOnlyColorSetting"] = me.command_only_colorsetting;
                if (me.color_model === "rgb" || me.color_model === "rgb_temp") {
                    attributes['colorModel'] = "rgb";
                }
                else if (me.color_model === "hsv" || me.color_model === "hsv_temp") {
                    attributes['colorModel'] = "hsv";
                }
                if (me.color_model !== "rgb" && me.color_model !== "hsv") {
                    attributes['colorTemperatureRange'] = {
                        "temperatureMinK": me.temperature_min_k,
                        "temperatureMaxK": me.temperature_max_k
                    };
                }
            }
            if (me.trait.camerastream) {
                attributes['cameraStreamSupportedProtocols'] = me.camera_stream_supported_protocols;
                attributes['cameraStreamNeedAuthToken'] = me.auth_token.length > 0;
            }
            if (me.trait.cook) {
                attributes['supportedCookingModes'] = me.supported_cooking_modes;
                attributes['foodPresets'] = me.food_presets;
            }
            if (me.trait.dispense) {
                attributes['supportedDispenseItems'] = me.supported_dispense_items;
                attributes['supportedDispensePresets'] = me.supported_dispense_presets;
            }
            if (me.trait.energystorage) {
                attributes['queryOnlyEnergyStorage'] = me.query_only_energy_storage;
                if (me.energy_storage_distance_unit_for_ux) {
                    attributes['energyStorageDistanceUnitForUX'] = me.energy_storage_distance_unit_for_ux;
                }
                attributes['isRechargeable'] = me.is_rechargeable;
            }
            if (me.trait.fanspeed) {
                attributes['reversible'] = me.reversible;
                attributes['commandOnlyFanSpeed'] = me.command_only_fanspeed;
                attributes['supportsFanSpeedPercent'] = me.supports_fan_speed_percent;
                attributes['availableFanSpeeds'] = {
                    speeds: me.available_fan_speeds,
                    ordered: me.fan_speeds_ordered
                };
            }
            if (me.trait.fill) {
                attributes['availableFillLevels'] = {
                    levels: me.available_fill_levels,
                    ordered: me.ordered_fill_levels,
                    supportsFillPercent: me.supports_fill_percent
                };
            }
            if (me.trait.humiditysetting) {
                attributes['humiditySetpointRange'] = {
                    minPercent: me.min_percent,
                    maxPercent: me.max_percent
                };
                attributes['commandOnlyHumiditySetting'] = me.command_only_humiditysetting;
                attributes['queryOnlyHumiditySetting'] = me.query_only_humiditysetting;
            }
            if (me.trait.inputselector) {
                attributes['availableInputs'] = me.available_inputs;
                attributes['commandOnlyInputSelector'] = me.command_only_input_selector;
                attributes['orderedInputs'] = me.ordered_inputs;
            }
            if (me.trait.lighteffects) {
                attributes['defaultSleepDuration'] = me.default_sleep_duration;
                attributes['defaultWakeDuration'] = me.default_wake_duration;
                attributes['supportedEffects'] = me.supported_effects;
            }
            if (me.trait.mediastate) {
                attributes['supportActivityState'] = me.support_activity_state;
                attributes['supportPlaybackState'] = me.support_playback_state;
            }
            if (me.trait.modes) {
                attributes['availableModes'] = me.available_modes;
                attributes['commandOnlyModes'] = me.command_only_modes;
                attributes['queryOnlyModes'] = me.query_only_modes;
            }
            if (me.trait.networkcontrol) {
                attributes['supportsEnablingGuestNetwork'] = me.supports_enabling_guest_network;
                attributes['supportsDisablingGuestNetwork'] = me.supports_disabling_guest_network;
                attributes['supportsGettingGuestNetworkPassword'] = me.supports_getting_guest_network_password;
                attributes['networkProfiles'] = me.network_profiles;
                attributes['supportsEnablingNetworkProfile'] = me.supports_enabling_network_profile;
                attributes['supportsDisablingNetworkProfile'] = me.supports_disabling_network_profile;
                attributes['supportsNetworkDownloadSpeedTest'] = me.supports_network_download_speedtest;
                attributes['supportsNetworkUploadSpeedTest'] = me.supports_network_upload_speedtest;
            }
            if (me.trait.onoff) {
                attributes['commandOnlyOnOff'] = me.command_only_onoff;
                attributes['queryOnlyOnOff'] = me.query_only_onoff;
            }
            if (me.trait.openclose) {
                attributes['discreteOnlyOpenClose'] = me.discrete_only_openclose;
                attributes['openDirection'] = me.open_direction;
                attributes['commandOnlyOpenClose'] = me.command_only_openclose;
                attributes['queryOnlyOpenClose'] = me.query_only_openclose;
            }
            if (me.trait.rotation) {
                attributes['supportsDegrees'] = me.supports_degrees;
                attributes['supportsPercent'] = me.supports_percent;
                attributes['rotationDegreesRange'] = [{
                    rotationDegreesMin: me.rotation_degrees_min,
                    rotationDegreesMax: me.rotation_degrees_max
                }];
                attributes['supportsContinuousRotation'] = me.supports_continuous_rotation;
                attributes['commandOnlyRotation'] = me.command_only_rotation;
            }
            if (me.trait.scene) {
                attributes['sceneReversible'] = me.scene_reversible;
            }
            if (me.trait.sensorstate) {
                let sensor_states_supported = [];
                me.sensor_states_supported.forEach(function (sensor_state_name) {
                    let sensor_state_supported = { name: sensor_state_name };
                    let available_states = undefined;
                    let raw_value_uUnit = undefined;
                    switch (sensor_state_name) {
                        case "AirQuality":
                            available_states = [
                                "healthy",
                                "moderate",
                                "unhealthy",
                                "unhealthy for sensitive groups",
                                "very unhealthy",
                                "hazardous",
                                "good",
                                "fair",
                                "poor",
                                "very poor",
                                "severe",
                                "unknown"
                            ];
                            raw_value_uUnit = 'AQI';
                            break;
                        case "CarbonMonoxideLevel":
                            available_states = [
                                "carbon monoxide detected",
                                "high",
                                "no carbon monoxide detected",
                                "unknown"
                            ];
                            raw_value_uUnit = 'PARTS_PER_MILLION';
                            break;
                        case "SmokeLevel":
                            available_states = [
                                "smoke detected",
                                "high",
                                "no smoke detected",
                                "unknown"
                            ];
                            raw_value_uUnit = 'PARTS_PER_MILLION';
                            break;
                        case "FilterCleanliness":
                            available_states = [
                                "clean",
                                "dirty",
                                "needs replacement",
                                "unknown"
                            ];
                            break;
                        case "WaterLeak":
                            available_states = [
                                "leak",
                                "no leak",
                                "unknown"
                            ];
                            break;
                        case "RainDetection":
                            available_states = [
                                "rain detected",
                                "no rain detected",
                                "unknown"
                            ];
                            break;
                        case "FilterLifeTime":
                            available_states = [
                                "new",
                                "good",
                                "replace soon",
                                "replace now",
                                "unknown"
                            ];
                            raw_value_uUnit = 'PERCENTAGE';
                            break;
                        case "PreFilterLifeTime":
                        case "HEPAFilterLifeTime":
                        case "Max2FilterLifeTime":
                            raw_value_uUnit = 'PERCENTAGE';
                            break;
                        case "CarbonDioxideLevel":
                            raw_value_uUnit = 'PARTS_PER_MILLION';
                            break;
                        case "PM2.5":
                        case "PM10":
                            raw_value_uUnit = 'MICROGRAMS_PER_CUBIC_METER';
                            break;
                        case "VolatileOrganicCompounds":
                            raw_value_uUnit = 'PARTS_PER_MILLION';
                            break;
                    }
                    if (available_states !== undefined) {
                        sensor_state_supported['descriptiveCapabilities'] = {
                            availableStates: available_states
                        };
                    }
                    if (raw_value_uUnit !== undefined) {
                        sensor_state_supported['numericCapabilities'] = {
                            rawValueUnit: raw_value_uUnit
                        };
                    }
                    sensor_states_supported.push(sensor_state_supported);
                });
                attributes['sensorStatesSupported'] = sensor_states_supported;
            }
            if (me.trait.startstop) {
                attributes['pausable'] = me.pausable;
                attributes['availableZones'] = me.available_zones;
            }
            if (me.trait.temperaturecontrol) {
                attributes['temperatureRange'] = {
                    minThresholdCelsius: me.tc_min_threshold_celsius,
                    maxThresholdCelsius: me.tc_max_threshold_celsius
                };
                attributes['temperatureStepCelsius'] = me.tc_temperature_step_celsius;
                attributes['temperatureUnitForUX'] = me.tc_temperature_unit_for_ux;
                attributes['commandOnlyTemperatureControl'] = me.command_only_temperaturecontrol;
                attributes['queryOnlyTemperatureControl'] = me.query_only_temperaturecontrol;
            }
            if (me.trait.temperaturesetting) {
                attributes['availableThermostatModes'] = me.available_thermostat_modes;
                attributes['thermostatTemperatureRange'] = {
                    minThresholdCelsius: me.min_threshold_celsius,
                    maxThresholdCelsius: me.max_threshold_celsius
                };
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
            if (me.trait.transportcontrol) {
                attributes['transportControlSupportedCommands'] = me.supported_commands;
            }
            if (me.trait.volume) {
                attributes['volumeMaxLevel'] = me.volume_max_level;
                attributes['volumeCanMuteAndUnmute'] = me.volume_can_mute_and_unmute;
                attributes['volumeDefaultPercentage'] = me.volume_default_percentage;
                attributes['levelStepSize'] = me.level_step_size;
                attributes['commandOnlyVolume'] = me.command_only_volume;
            }
        }

        getDispenseNewState() {
            let me = this;
            let dispense = [];
            me.supported_dispense_items.forEach(function (item) {
                dispense.push({
                    itemName: item.item_name,
                    amountRemaining: {
                        amount: 0,
                        unit: "NO_UNITS"
                    },
                    amountLastDispensed: {
                        amount: 0,
                        unit: "NO_UNITS"
                    },
                    isCurrentlyDispensing: false
                })
            });
            me.supported_dispense_presets.forEach(function (item) {
                dispense.push({
                    "itemName": item.preset_name,
                    "amountRemaining": {
                        "amount": 0,
                        "unit": "NO_UNITS"
                    },
                    "amountLastDispensed": {
                        "amount": 0,
                        "unit": "NO_UNITS"
                    },
                    "isCurrentlyDispensing": false
                })
            });
            return dispense;
        }

        updateStatesForTraits(device) {
            let me = this;
            let states = device.states;

            if (me.trait.appselector) {
                states['currentApplication'] = '';
            }
            if (me.trait.armdisarm) {
                states['isArmed'] = false;
                states['currentArmLevel'] = '';
                // states['exitAllowance'] = 60;
            }
            if (me.trait.brightness) {
                // states['brightness'] = 50;
            }
            if (me.trait.colorsetting) {
                if (!me.command_only_colorsetting) {
                    if (me.color_model === "rgb") {
                        states['color'] = { spectrumRgb: 16777215 };
                    } else if (me.color_model === "hsv") {
                        states['color'] = {
                            spectrumHsv: {
                                hue: 0.0,           // float, representing hue as positive degrees in the range of [0.0, 360.0)
                                saturation: 0.0,    // float, representing saturation as a percentage in the range [0.0, 1.0]
                                value: 1            // float, representing value as a percentage in the range [0.0, 1.0]
                            }
                        };
                    } else {
                        states['color'] = { temperatureK: me.temperature_max_k || 6000 };
                    }
                }
            }
            if (me.trait.cook) {
                states['currentCookingMode'] = "NONE";
                // states['currentFoodPreset'] = "NONE";
                // states['currentFoodQuantity'] = 0;
                // states['currentFoodUnit'] = "UNKNOWN_UNITS";
            }
            if (me.trait.dispense) {
                states['dispenseItems'] = this.getDispenseNewState();
            }
            if (me.trait.dock) {
                // states['isDocked'] = false;
            }
            if (me.trait.energystorage) {
                states['descriptiveCapacityRemaining'] = "FULL";
                // states['capacityRemaining'] = [];
                if (me.is_rechargeable) {
                    // states['capacityUntilFull'] = [];
                    states['isCharging'] = false;
                }
                // states['isPluggedIn'] = false;
            }
            if (me.trait.fanspeed) {
                // states['currentFanSpeedSetting'] = "";
                if (!me.command_only_fanspeed && me.supports_fan_speed_percent) {
                    states['currentFanSpeedPercent'] = 0;
                }
            }
            if (me.trait.fill) {
                states['isFilled'] = false;
                if (me.available_fill_levels.length > 0) {
                    states['currentFillLevel'] = "";
                }
                if (me.supports_fill_percent) {
                    states['currentFillPercent'] = 0;
                }
            }
            if (me.trait.humiditysetting) {
                // states['humiditySetpointPercent'] = 52;
                // states['humidityAmbientPercent'] = 52;
            }
            if (me.trait.inputselector) {
                if (!me.command_only_input_selector) {
                    if (me.availableInputs && me.availableInputs.length > 0) {
                        states['currentInput'] = me.availableInputs[0].key;
                    } else {
                        states['currentInput'] = '';
                    }
                }
            }
            if (me.trait.lighteffects) {
                states['activeLightEffect'] = "";
                // states['lightEffectEndUnixTimestampSec'] = 60;
            }
            //if (me.trait.lockunlock) {
            // states['isLocked'] = false;
            // states['isJammed'] = false;
            //}
            //if (me.trait.mediastate) {
            // INACTIVE STANDBY ACTIVE
            // states['activityState'] = 'INACTIVE';
            // PAUSED PLAYING FAST_FORWARDING REWINDING BUFFERING STOPPED
            // states['playbackState'] = 'STOPPED';
            //}
            if (me.trait.modes) {
                if (!me.command_only_modes) {
                    states['currentModeSettings'] = {};
                    this.updateModesState(me, device);
                }
            }
            //if (me.trait.networkcontrol) {
            // states['networkEnabled'] = true;
            // states['networkSettings'] = { ssid: '' };
            // states['guestNetworkEnabled'] = false;
            // states['guestNetworkSettings'] = { ssid: '' };
            // states['numConnectedDevices'] = 1;
            // states['networkUsageMB'] = 0;
            // states['networkUsageLimitMB'] = 0;
            // states['networkUsageUnlimited'] = true;
            /* states['lastNetworkDownloadSpeedTest'] = {
                downloadSpeedMbps: 0,
                unixTimestampSec: 0,
                status: "FAILURE"
            }; */
            /* states['lastNetworkUploadSpeedTest'] = {
                uploadSpeedMbps: 0,
                unixTimestampSec: 0,
                status: "FAILURE"
            };*/
            // states['networkSpeedTestInProgress'] = false;
            //}
            //if (me.trait.onoff) {
            // states['on'] = false;
            //}
            if (me.trait.openclose) {
                if (!me.command_only_openclose) {
                    if (me.open_direction.length < 2) {
                        states['openPercent'] = 0;
                    } else {
                        let openState = [];
                        states['openState'] = openState;
                        me.open_direction.forEach(direction => {
                            openState.push({
                                openPercent: 0,
                                openDirection: direction
                            });
                        });
                    }
                }
            }
            /*if (me.trait.rotation) {
                if (me.supports_degrees) {
                    // states['rotationDegrees'] = 0;
                }
                if (me.supports_percent) {
                    // states['rotationPercent'] = 0;
                }
            }*/
            if (me.trait.runcycle) {
                states['currentRunCycle'] = [{
                    currentCycle: "unknown",
                    lang: me.lang
                }];
                states['currentTotalRemainingTime'] = 0;
                states['currentCycleRemainingTime'] = 0;
            }
            if (me.trait.sensorstate) {
                let current_sensor_state_data = [];
                me.sensor_states_supported.forEach(function (sensor_state_name) {
                    let current_sensor = { name: sensor_state_name };
                    let current_sensor_state = undefined;
                    let raw_value = undefined;
                    switch (sensor_state_name) {
                        case "AirQuality":
                            current_sensor_state = "unknown";
                            raw_value = 0;
                            break;
                        case "CarbonMonoxideLevel":
                            current_sensor_state = "unknown";
                            raw_value = 0;
                            break;
                        case "SmokeLevel":
                            current_sensor_state = "unknown";
                            raw_value = 0;
                            break;
                        case "FilterCleanliness":
                            current_sensor_state = "unknown";
                            break;
                        case "WaterLeak":
                            current_sensor_state = "unknown";
                            break;
                        case "RainDetection":
                            current_sensor_state = "unknown";
                            break;
                        case "FilterLifeTime":
                            current_sensor_state = "unknown";
                            raw_value = 0;
                            break;
                        case "PreFilterLifeTime":
                        case "HEPAFilterLifeTime":
                        case "Max2FilterLifeTime":
                            raw_value = 0;
                            break;
                        case "CarbonDioxideLevel":
                            raw_value = 0;
                            break;
                        case "PM2.5":
                        case "PM10":
                            raw_value = 0;
                            break;
                        case "VolatileOrganicCompounds":
                            raw_value = 0;
                            break;
                    }
                    if (current_sensor_state !== undefined) {
                        current_sensor['currentSensorState'] = current_sensor_state;
                    }
                    if (raw_value !== undefined) {
                        current_sensor['rawValue'] = raw_value;
                    }
                    current_sensor_state_data.push(current_sensor);
                });
                if (current_sensor_state_data.length > 0) {
                    states['currentSensorStateData'] = current_sensor_state_data;
                } else {
                    delete me.state_types['currentSensorStateData'];
                }
            }
            if (me.trait.softwareupdate) {
                states['lastSoftwareUpdateUnixTimestampSec'] = 0;
            }
            if (me.trait.startstop) {
                states['isRunning'] = false;
                // states['isPaused'] = false;
                // states['activeZones'] = [];
            }
            /*if (me.trait.statusreport) {
                states['currentStatusReport'] = [];
            }*/
            if (me.trait.temperaturecontrol) {
                if (!me.query_only_temperaturecontrol) { // Required if queryOnlyTemperatureControl set to false
                    states['temperatureSetpointCelsius'] = me.tc_min_threshold_celsius;
                }
                // states['temperatureAmbientCelsius'] = me.tc_min_threshold_celsius;
            }
            if (me.trait.temperaturesetting) {
                if (!me.command_only_temperaturesetting) {
                    // states['activeThermostatMode'] = "none";
                    // states['targetTempReachedEstimateUnixTimestampSec'] = me.target_temp_reached_estimate_unix_timestamp_sec;
                    // states['thermostatHumidityAmbient'] = me.thermostat_humidity_ambient;
                    states['thermostatMode'] = "none";
                    states['thermostatTemperatureAmbient'] = me.thermostat_temperature_setpoint;
                    // 0
                    states['thermostatTemperatureSetpoint'] = me.thermostat_temperature_setpoint;
                    // 1
                    // states['thermostatTemperatureSetpointHigh'] = me.thermostat_temperature_setpoint_hight;
                    // states['thermostatTemperatureSetpointLow'] = me.thermostat_temperature_setpoint_low;
                }
            }
            if (me.trait.timer) {
                if (!me.command_only_timer) {
                    states['timerRemainingSec'] = -1;
                    // states['timerPaused'] = false;
                }
            }
            if (me.trait.toggles) {
                if (!me.command_only_toggles) {
                    states['currentToggleSettings'] = {};
                    this.updateTogglesState(me, device);
                }
            }
            if (me.trait.volume) {
                if (!me.command_only_volume) {
                    states['currentVolume'] = me.volume_default_percentage;
                    if (me.volume_can_mute_and_unmute) {
                        states['isMuted'] = false;
                    }
                }
            }
        }

        updateStatusIcon() {
            const me = this;
            let text = '';
            let fill = 'red';
            let shape = 'dot';
            if (me.states.online) {
                if (me.trait.onoff) {
                    if (me.states.on !== undefined) {
                        if (me.states.on) {
                            text = 'ON';
                            fill = 'green';
                        } else {
                            text = 'OFF';
                        }
                    } else {
                        fill = 'blue';
                    }
                } else {
                    fill = 'blue';
                }
                if (me.trait.brightness && me.states.brightness !== undefined) {
                    text += " bri: " + me.states.brightness;
                }
                if (me.trait.colorsetting && me.states.color.temperatureK !== undefined) {
                    text += ' temp: ' + me.states.color.temperatureK;
                }
                if (me.trait.colorsetting && me.states.color.spectrumRgb !== undefined) {
                    text += ' RGB: ' + me.states.color.spectrumRgb.toString(16).toUpperCase().padStart(6, '0');
                }
                if (me.trait.colorsetting && me.states.color.spectrumHsv !== undefined) {
                    text += ' H: ' + me.states.color.spectrumHsv.hue +
                        ' S: ' + me.states.color.spectrumHsv.saturation +
                        ' V: ' + me.states.color.spectrumHsv.value;
                }
                if (me.trait.openclose) {
                    if (me.states.openPercent !== undefined) {
                        if (me.states.openPercent === 0) {
                            text += 'CLOSED';
                            fill = 'green';
                        } else {
                            text += me.discrete_only_openclose ? 'OPEN' : util.format("OPEN %d%%", me.states.openPercent);
                        }
                    }
                }
                if (me.trait.humiditysetting) {
                    if (me.states.humidityAmbientPercent !== undefined) {
                        text += ' H: ' + me.states.humidityAmbientPercent + "% ";
                    }
                    if (me.states.humiditySetpointPercent !== undefined) {
                        text += ' TH: ' + me.states.humiditySetpointPercent + "% ";
                    }
                }
                if (me.trait.temperaturecontrol) {
                    if (me.states.temperatureAmbientCelsius !== undefined) {
                        text += ' TC: ' + me.states.temperatureAmbientCelsius + "\xB0C";
                    }
                    if (me.states.temperatureSetpointCelsius !== undefined) {
                        text += ' SC: ' + me.states.temperatureSetpointCelsius + "\xB0C";
                    }
                }
                if (me.trait.temperaturesetting) {
                    const thermostat_mode = me.states.thermostatMode;
                    const st = " T: " + me.states.thermostatTemperatureAmbient + " °C | S: " + me.thermostat_temperature_setpoint + "\xB0C";
                    if (thermostat_mode === "off") {
                        text = "OFF " + st;
                    } else if (thermostat_mode === "heat" || thermostat_mode === "cool") {
                        fill = "green";
                        text = thermostat_mode.substr(0, 1).toUpperCase() + st;
                    } else if (thermostat_mode === "heatcool") {
                        fill = "green";
                        text = "H/C T: " + me.states.thermostatTemperatureAmbient + " °C | S: [" + me.thermostat_temperature_setpoint + " - " + me.states.thermostatTemperatureSetpointHigh + "] \xB0C";
                    } else {
                        fill = "green";
                        text = thermostat_mode.substr(0, 1).toUpperCase() + st;
                    }
                    if (me.states.thermostatHumidityAmbient !== undefined) {
                        text += ' ' + me.states.thermostatHumidityAmbient + "% ";
                    }
                }
                if (me.trait.energystorage) {
                    text += ' ' + me.states.descriptiveCapacityRemaining;
                }
            } else {
                shape = 'ring';
                text = "offline";
            }
            if (!text) {
                text = 'Unknown';
            }
            me.status({ fill: fill, shape: shape, text: text });
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        updated(device, params, original_params) {
            let me = this;
            let states = device.states;
            let command = device.command.startsWith('action.devices.commands.') ? device.command.substr(24) : device.command;
            this._debug(".updated: device.command = " + JSON.stringify(command));
            this._debug(".updated: device.states = " + JSON.stringify(states));
            this._debug(".updated: params = " + JSON.stringify(params));
            this._debug(".updated: original_params = " + JSON.stringify(original_params));

            const modified = me.updateState(params || states);
            if (modified) {
                this.cloneObject(states, me.states, me.state_types, me.exclusive_states);
            }

            this.updateStatusIcon();

            let msg = {
                topic: this.topicOut,
                device_name: device.properties.name.name,
                command: command,
                params: original_params,
                payload: {
                    online: states.online
                },
            };

            // Copy the device state to the payload
            Object.keys(me.states).forEach(function (key) {
                msg.payload[key] = me.states[key];
            });

            // Copy the command state to the payload
            Object.keys(states).forEach(function (key) {
                if (!msg.payload.hasOwnProperty(key)) {
                    msg.payload[key] = states[key];
                }
            });

            // Copy the command params to the payload
            if (params) {
                Object.keys(params).forEach(function (key) {
                    if (!msg.payload.hasOwnProperty(key) && params[key] !== original_params[key]) {
                        msg.payload[key] = params[key];
                    }
                });
            }

            // Copy the command original params to the payload
            /*Object.keys(original_params).forEach(function (key) {
                if (!msg.payload.hasOwnProperty(key)) {
                   msg.payload[key] = original_params[key];
                }
            });*/

            // this._debug(".updated: msg = " + JSON.stringify(msg));

            this.send(msg);
        };

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        onInput(msg) {
            const me = this;
            me._debug(".input: topic = " + msg.topic);

            let upper_topic = '';
            if (msg.topic) {
                let topicArr = String(msg.topic).split(this.topicDelim);
                let topic = topicArr[topicArr.length - 1].trim();   // get last part of topic
                upper_topic = topic.toUpperCase();
            }

            try {
                if (upper_topic === 'GETSTATE') {
                    this.send({
                        topic: msg.topic,
                        payload: me.states,
                        device_id: this.device.id
                    });
                } else if (upper_topic === 'ERRORCODE') {
                    if (typeof msg.payload === 'string' && msg.payload.trim()) {
                        me.errorCode = msg.payload.trim();
                    } else {
                        me.errorCode = undefined;
                    }
                } else if (upper_topic === 'AVAILABLEAPPLICATIONS') {
                    if (this.trait.appselector) {
                        if (typeof msg.payload === 'undefined') {
                            this.available_applications = this.to_available_applications(this.loadJson('Applications', this.appselector_file.replace(/<id>/g, this.id), []));
                        } else {
                            this.available_applications = this.to_available_applications(msg.payload);
                            if (!this.writeJson('Applications', this.appselector_file.replace(/<id>/g, this.id), this.available_applications)) {
                                RED.log.error("Error saving Applications to file " + this.appselector_file.replace(/<id>/g, this.id));
                            }
                        }
                    } else {
                        this.available_applications = [];
                        RED.log.error("Applications disabled");
                    }
                    this.device.properties.attributes.availableApplications = this.available_applications;
                    this.clientConn.app.ScheduleRequestSync();
                } else if (upper_topic === 'AVAILABLEARMLEVELS') {
                    if (this.trait.armdisarm) {
                        if (typeof msg.payload === 'undefined') {
                            this.available_arm_levels = this.to_available_arm_levels(this.loadJson('Arm levels', this.available_arm_levels_file.replace(/<id>/g, this.id), []));
                        } else {
                            this.available_arm_levels = this.to_available_arm_levels(msg.payload);
                            if (!this.writeJson('Arm levels', this.available_arm_levels_file.replace(/<id>/g, this.id), this.available_arm_levels)) {
                                RED.log.error("Error saving Arm levels to file " + this.available_arm_levels_file.replace(/<id>/g, this.id));
                            }
                        }
                    } else {
                        this.available_arm_levels = [];
                        RED.log.error("Arm levels disabled");
                    }
                    this.device.properties.attributes.availableArmLevels.levels = this.available_arm_levels;
                    this.clientConn.app.ScheduleRequestSync();
                } else if (upper_topic === 'AVAILABLECHANNELS') {
                    if (this.trait.channel) {
                        if (typeof msg.payload === 'undefined') {
                            this.available_channels = this.to_available_channels(this.loadJson('Channels', this.channel_file.replace(/<id>/g, this.id), []));
                        } else {
                            this.available_channels = this.to_available_channels(msg.payload);
                            if (!this.writeJson('Channels', this.channel_file.replace(/<id>/g, this.id), this.available_channels)) {
                                RED.log.error("Error saving Channels to file " + this.channel_file.replace(/<id>/g, this.id));
                            }
                        }
                    } else {
                        this.available_channels = [];
                        RED.log.error("Channels disabled");
                    }
                    this.device.properties.attributes.availableChannels = this.available_channels;
                    this.clientConn.app.ScheduleRequestSync();
                } else if (upper_topic === 'SUPPORTEDDISPENSEITEMS') {
                    if (this.trait.dispense) {
                        if (typeof msg.payload === 'undefined') {
                            this.supported_dispense_items = this.to_supported_dispense_items(this.loadJson('Dispense items', this.supported_dispense_items_file.replace(/<id>/g, this.id), []));
                        } else {
                            this.supported_dispense_items = this.to_supported_dispense_items(msg.payload);
                            if (!this.writeJson('Dispense items', this.supported_dispense_items_file.replace(/<id>/g, this.id), this.supported_dispense_items)) {
                                RED.log.error("Error saving Dispense items to file " + this.supported_dispense_items_file.replace(/<id>/g, this.id));
                            }
                        }
                    } else {
                        this.supported_dispense_items = [];
                        RED.log.error("Dispense items disabled");
                    }
                    this.device.properties.attributes.supportedDispenseItems = this.supported_dispense_items;
                    this.states['dispenseItems'] = this.getDispenseNewState();
                    this.clientConn.app.ScheduleRequestSync();
                } else if (upper_topic === 'SUPPORTEDDISPENSEPRESETS') {
                    if (this.trait.dispense) {
                        if (typeof msg.payload === 'undefined') {
                            this.supported_dispense_presets = this.to_supported_dispense_presets(this.loadJson('Dispense presets', this.supported_dispense_presets_file.replace(/<id>/g, this.id), []));
                        } else {
                            this.supported_dispense_presets = this.to_supported_dispense_presets(msg.payload);
                            if (!this.writeJson('Dispense presets', this.supported_dispense_presets_file.replace(/<id>/g, this.id), this.supported_dispense_presets)) {
                                RED.log.error("Error saving Dispense presets to file " + this.supported_dispense_presets_file.replace(/<id>/g, this.id));
                            }
                        }
                    } else {
                        this.supported_dispense_presets = [];
                        RED.log.error("Dispense presets disabled");
                    }
                    this.device.properties.attributes.supportedDispensePresets = this.supported_dispense_presets;
                    this.states['dispenseItems'] = this.getDispenseNewState();
                    this.clientConn.app.ScheduleRequestSync();
                } else if (upper_topic === 'AVAILABLEFANSPEEDS') {
                    if (this.trait.fanspeed) {
                        if (typeof msg.payload === 'undefined') {
                            this.available_fan_speeds = this.to_available_fan_speeds(this.loadJson('Fan speeds', this.available_fan_speeds_file.replace(/<id>/g, this.id), []));
                        } else {
                            this.available_fan_speeds = this.to_available_fan_speeds(msg.payload);
                            if (!this.writeJson('Fan speeds', this.available_fan_speeds_file.replace(/<id>/g, this.id), this.available_fan_speeds)) {
                                RED.log.error("Error saving Fan speeds to file " + this.available_fan_speeds_file.replace(/<id>/g, this.id));
                            }
                        }
                    } else {
                        this.available_fan_speeds = [];
                        RED.log.error("Fan speeds disabled");
                    }
                    this.device.properties.attributes.availableFanSpeeds.speeds = this.available_fan_speeds;
                    this.clientConn.app.ScheduleRequestSync();
                } else if (upper_topic === 'AVAILABLEFILLLEVELS') {
                    if (this.trait.dispense) {
                        if (typeof msg.payload === 'undefined') {
                            this.available_fill_levels = this.to_available_fill_levels(this.loadJson(' Fill levels', this.available_fill_levels_file.replace(/<id>/g, this.id), []));
                        } else {
                            this.available_fill_levels = this.to_available_fill_levels(msg.payload);
                            if (!this.writeJson(' Fill levels', this.available_fill_levels_file.replace(/<id>/g, this.id), this.available_fill_levels)) {
                                RED.log.error("Error saving Fill levels to file " + this.available_fill_levels_file.replace(/<id>/g, this.id));
                            }
                        }
                    } else {
                        this.available_fill_levels = [];
                        RED.log.error("Fill levels disabled");
                    }
                    this.device.properties.attributes.availableFillLevels.levels = this.available_fill_levels;
                    this.clientConn.app.ScheduleRequestSync();
                } else if (upper_topic === 'AVAILABLEFOODPRESETS') {
                    if (this.trait.cook) {
                        if (typeof msg.payload === 'undefined') {
                            this.food_presets = this.to_food_presets(this.loadJson('Food presets', this.food_presets_file.replace(/<id>/g, this.id), []));
                        } else {
                            this.food_presets = this.to_food_presets(msg.payload);
                            if (!this.writeJson('Food presets', this.food_presets_file.replace(/<id>/g, this.id), this.food_presets)) {
                                RED.log.error("Error saving Food presets to file " + this.food_presets_file.replace(/<id>/g, this.id));
                            }
                        }
                    } else {
                        this.food_presets = [];
                        RED.log.error("Food presets disabled");
                    }
                    this.device.properties.attributes.foodPresets = this.food_presets;
                    this.clientConn.app.ScheduleRequestSync();
                } else if (upper_topic === 'AVAILABLEINPUTS') {
                    if (this.trait.inputselector) {
                        if (typeof msg.payload === 'undefined') {
                            this.available_inputs = this.to_available_inputs(this.loadJson('Inputs', this.inputselector_file.replace(/<id>/g, this.id), []));
                        } else {
                            this.available_inputs = this.to_available_inputs(msg.payload);
                            if (!this.writeJson('Inputs', this.inputselector_file.replace(/<id>/g, this.id), this.available_inputs)) {
                                RED.log.error("Error saving Inputs to file " + this.inputselector_file.replace(/<id>/g, this.id));
                            }
                        }
                    } else {
                        this.available_inputs = [];
                        RED.log.error("Inputs disabled");
                    }
                    this.device.properties.attributes.availableInputs = this.available_inputs;
                    this.clientConn.app.ScheduleRequestSync();
                } else if (upper_topic === 'AVAILABLEMODES') {
                    if (this.trait.modes) {
                        if (typeof msg.payload === 'undefined') {
                            this.available_modes = this.to_available_modes(this.loadJson('Modes', this.modes_file.replace(/<id>/g, this.id), []));
                            this.updateModesState(me, me);
                        } else {
                            this.available_modes = this.to_available_modes(msg.payload);
                            if (!this.writeJson('Modes', this.modes_file.replace(/<id>/g, this.id), this.available_modes)) {
                                RED.log.error("Error saving Modes to file " + this.modes_file.replace(/<id>/g, this.id));
                            }
                        }
                    } else {
                        this.available_modes = [];
                        RED.log.error("Modes disabled");
                    }
                    this.device.properties.attributes.availableModes = this.available_modes;
                    this.updateModesState(me, me);
                    this.clientConn.app.ScheduleRequestSync();
                } else if (upper_topic === 'AVAILABLETOGGLES') {
                    if (this.trait.toggles) {
                        if (typeof msg.payload === 'undefined') {
                            this.available_toggles = this.to_available_toggles(this.loadJson('Toggles', this.toggles_file.replace(/<id>/g, this.id), []));
                            this.updateTogglesState(me, me);
                        } else {
                            this.available_toggles = this.to_available_toggles(msg.payload);
                            if (!this.writeJson('Toggles', this.toggles_file.replace(/<id>/g, this.id), this.available_toggles)) {
                                RED.log.error("Error saving Toggles to file " + this.toggles_file.replace(/<id>/g, this.id));
                            }
                        }
                    } else {
                        this.available_toggles = [];
                        RED.log.error("Toggles disabled");
                    }
                    this.device.properties.attributes.availableToggles = this.available_toggles;
                    this.updateTogglesState(me, me);
                    this.clientConn.app.ScheduleRequestSync();
                } else if (upper_topic === 'CAMERASTREAMAUTHTOKEN') {
                    const auth_token = formats.FormatValue(formats.Formats.STRING, 'cameraStreamAuthToken', msg.payload) || "";
                    if (auth_token != me.auth_token) {
                        me.auth_token = auth_token;
                        if (this.device.properties.attributes.hasOwnProperty("cameraStreamNeedAuthToken")) {
                            let cameraStreamNeedAuthToken = this.device.properties.attributes.cameraStreamNeedAuthToken;
                            if (cameraStreamNeedAuthToken != (auth_token.length > 0)) {
                                this.device.properties.attributes['cameraStreamNeedAuthToken'] = auth_token.length > 0;
                                this.clientConn.app.ScheduleRequestSync();
                            }
                        }
                    }
                } else if (upper_topic === 'GUESTNETWORKPASSWORD') {
                    me.guest_network_password = formats.FormatValue(formats.Formats.STRING, 'guestNetworkPassword', msg.payload);
                } else if (me.trait.objectdetection && upper_topic === 'OBJECTDETECTION') {
                    let payload = {};
                    if (typeof msg.payload.familiar === 'number') {
                        payload.familiar = msg.payload.familiar;
                    }
                    if (typeof msg.payload.unfamiliar === 'number') {
                        payload.unfamiliar = msg.payload.unfamiliar;
                    }
                    if (typeof msg.payload.unclassified === 'number') {
                        payload.unclassified = msg.payload.unclassified;
                    }
                    if (typeof msg.payload.named === 'string') {
                        payload.named = [msg.payload.named];
                    } else if (Array.isArray(msg.payload.named)) {
                        payload.named = msg.payload.named;
                    }
                    this.clientConn.sendNotifications(this, {
                        ObjectDetection: {
                            objects: payload,
                            priority: 0,
                            detectionTimestamp: Date.now()
                        }
                    });  // tell Google ...
                } else if (me.trait.runcycle && upper_topic === 'RUNCYCLE') {
                    let payload = { priority: 0 };
                    if (typeof msg.payload.status === 'string') {
                        payload.status = msg.payload.status;
                    }
                    if (typeof msg.payload.currentCycleRemainingTime === 'number') {
                        payload.currentCycleRemainingTime = msg.payload.currentCycleRemainingTime;
                    }
                    if (typeof msg.payload.errorCode === 'string') {
                        payload.errorCode = msg.payload.errorCode;
                    }
                    this.clientConn.sendNotifications(this, {
                        RunCycle: payload
                    });  // tell Google ...
                } else if (me.trait.sensorstate && upper_topic === 'SENSORSTATE') {
                    if (typeof msg.payload.name === 'string' && msg.payload.name.trim() && me.sensor_states_supported.includes(msg.payload.name.trim())) {
                        let payload = { priority: 0 };
                        payload.name = msg.payload.name.trim();
                        if (typeof msg.payload.currentSensorState === 'string' && msg.payload.currentSensorState.trim()) {
                            payload.currentSensorState = msg.payload.currentSensorState.trim();
                            this.clientConn.sendNotifications(this, {
                                SensorState: payload
                            });  // tell Google ...
                        }
                    }
                } else if (me.trait.lockunlock && upper_topic === 'LOCKUNLOCK') {
                    let payload = {};
                    if (typeof msg.payload.followUpToken === 'string') {
                        payload.followUpToken = msg.payload.followUpToken;
                    }
                    if (typeof msg.payload.status === 'string') {
                        payload.status = msg.payload.status;
                    }
                    if (typeof msg.payload.isLocked === 'boolean') {
                        payload.isLocked = msg.payload.isLocked;
                    }
                    if (typeof msg.payload.errorCode === 'string') {
                        payload.errorCode = msg.payload.errorCode;
                    }
                    this.clientConn.sendNotifications(this, {
                        LockUnlock: {
                            priority: 0,
                            followUpResponse: payload
                        }
                    });  // tell Google ...
                } else if (me.trait.networkcontrol && upper_topic === 'NETWORKCONTROL') {
                    this.clientConn.sendNotifications(this, {
                        NetworkControl: {
                            priority: 0,
                            followUpResponse: msg.payload
                        }
                    });  // tell Google ...
                } else if (me.trait.openclose && upper_topic === 'OPENCLOSE') {
                    let payload = {};
                    if (typeof msg.payload.followUpToken === 'string') {
                        payload.followUpToken = msg.payload.followUpToken;
                    }
                    if (typeof msg.payload.status === 'string') {
                        payload.status = msg.payload.status;
                    }
                    if (typeof msg.payload.openPercent === 'number') {
                        payload.openPercent = msg.payload.openPercent;
                    }
                    if (typeof msg.payload.errorCode === 'string') {
                        payload.errorCode = msg.payload.errorCode;
                    }
                    this.clientConn.sendNotifications(this, {
                        OpenClose: {
                            priority: 0,
                            followUpResponse: payload
                        }
                    });  // tell Google ...
                } else if (me.trait.statusreport && upper_topic === 'STATUSREPORT') {
                    // Update or Add reports based on deviceTarget and statusCode
                    let payload = Array.isArray(msg.payload) ? msg.payload : [msg.payload];
                    let new_payload = [];
                    if (typeof me.states.currentStatusReport !== 'undefined') {
                        me.states.currentStatusReport.forEach(report => {
                            let new_report = { priority: 0 };
                            this.cloneObject(new_report, report, me.state_types['currentStatusReport'][0]);
                            new_payload.push(new_report);
                        });
                    }
                    let differs = false;
                    payload.forEach(sr => {
                        let nodeId;
                        if (sr.deviceTarget) {
                            let properties = this.clientConn.getProperties([sr.deviceTarget]);
                            if (Object.keys(properties).length > 0) {
                                nodeId = sr.deviceTarget;
                            } else {
                                nodeId = this.clientConn.getIdFromName(sr.deviceTarget);
                            }
                        } else {
                            nodeId = this.device.id;
                        }
                        if (nodeId) {
                            let new_report = {};
                            this.cloneObject(new_report, sr, me.state_types['currentStatusReport'][0]);
                            if (new_report.statusCode) {
                                new_report.deviceTarget = nodeId;
                                let cur_reports = new_payload.filter(report => report.deviceTarget === nodeId && report.statusCode === new_report.statusCode);
                                if (cur_reports.length > 0) {
                                    if (this.cloneObject(cur_reports[0], new_report, me.state_types['currentStatusReport'][0])) {
                                        differs = true;
                                    }
                                } else {
                                    new_payload.push(new_report);
                                    differs = true;
                                }
                            }
                        }
                    });
                    if (me.updateState({ currentStatusReport: new_payload }) || differs) {
                        this.clientConn.setState(this, me.states, true);  // tell Google ...

                        this.clientConn.app.ScheduleGetState();
                        if (this.passthru) {
                            msg.payload = new_payload;
                            this.send(msg);
                        }
                    }
                } else {
                    let state_key = '';
                    Object.keys(me.state_types).forEach(function (key) {
                        if (upper_topic == key.toUpperCase()) {
                            state_key = key;
                            me._debug(".input: found state " + state_key);
                        }
                    });

                    if (state_key !== '') {
                        let payload = {};
                        payload[state_key] = msg.payload;
                        const differs = me.updateState(payload);
                        if (differs) {
                            me._debug(".input: " + state_key + ' ' + JSON.stringify(msg.payload));
                            this.clientConn.setState(this, me.states, true);  // tell Google ...
                            this.clientConn.app.ScheduleGetState();

                            if (this.passthru) {
                                msg.payload = me.states[state_key];
                                this.send(msg);
                            }
                        }
                        this.updateStatusIcon();
                    } else {
                        me._debug(".input: some other topic");
                        const differs = me.updateState(msg.payload);

                        if (differs) {
                            this.clientConn.setState(this, me.states, true);  // tell Google ...
                            this.clientConn.app.ScheduleGetState();

                            if (this.passthru) {
                                msg.payload = me.states;
                                this.send(msg);
                            }
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
                this.clientConn.remove(this, 'device');
            } else {
                // this node is being restarted
                this.clientConn.deregister(this, 'device');
            }

            done();
        }

        updateTogglesState(me, device) {
            // Key/value pair with the toggle name of the device as the key, and the current state as the value.
            me._debug(".updateTogglesState");
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
            me._debug(".updateModesState");
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
            return RED._('device.device_type.' + device_type);
        }

        getTraits(me) {
            const trait = me.trait;
            let traits = [];

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
            if (trait.lighteffects) {
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
                traits.push("action.devices.traits.Timer");
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

        updateState(new_states) {
            const me = this;
            let modified = false;
            Object.keys(me.state_types).forEach(function (key) {
                if (new_states.hasOwnProperty(key)) {
                    if (me.setState(key, new_states[key], me.states, me.state_types[key], me.exclusive_states[key] || {})) {
                        me._debug('.updateState: set "' + key + '" to ' + JSON.stringify(new_states[key]));
                        modified = true;
                    }
                }
            });
            me._debug('.updateState: new State ' + modified + ' ' + JSON.stringify(me.states));
            return modified;
        }

        cloneObject(cur_obj, new_obj, state_values, exclusive_states) {
            const me = this;
            let differs = false;
            if (exclusive_states === undefined) {
                exclusive_states = {};
            }
            Object.keys(state_values).forEach(function (key) {
                if (typeof new_obj[key] !== 'undefined' && new_obj[key] != null) {
                    if (me.setState(key, new_obj[key], cur_obj, state_values[key] || {}, exclusive_states[key] || {})) {
                        differs = true;
                    }
                } else if (typeof state_values[key] === 'number' && !(state_values[key] & formats.MANDATORY)) {
                    delete cur_obj[key];
                }
            });
            return differs;
        }

        formatValue(key, value, type) {
            let new_state;
            if (type & Formats.FLOAT) {
                new_state = formats.FormatValue(formats.Formats.FLOAT, key, value);
            } else if (type & Formats.INT) {
                new_state = formats.FormatValue(formats.Formats.INT, key, value);
            } else if (type & Formats.STRING) {
                new_state = formats.FormatValue(formats.Formats.STRING, key, value);
            } else if (type & Formats.BOOL) {
                new_state = formats.FormatValue(formats.Formats.BOOL, key, value);
            }
            return new_state;
        }

        setState(key, value, states, state_values, exclusive_states) {
            const me = this;
            let differs = false;
            let old_state = typeof states === 'object' ? states[key] : {};
            let new_state = undefined;
            let exclusive_states_arr = [];
            if (Array.isArray(exclusive_states)) {
                exclusive_states_arr = exclusive_states;
                exclusive_states = {};
            }
            if (typeof state_values === 'object') {
                if (typeof value === "object") {
                    if (Array.isArray(state_values)) {
                        if (Array.isArray(value)) {
                            /*
                            if (JSON.stringify(states[key]) != JSON.stringify(value)) {
                                differs = true;
                            }
                            states[key] = value;
                            */
                            // checks array
                            const ar_state_values = state_values[0];
                            if (typeof ar_state_values === 'number') {
                                let new_arr = [];
                                let old_arr = Array.isArray(old_state) ? old_state : [];
                                value.forEach((elm, idx) => {
                                    let new_val = me.formatValue(key + '[' + idx + ']', elm, ar_state_values);
                                    if (new_val !== undefined && new_val != null) {
                                        new_arr.push(new_val);
                                        if (old_arr.length > idx) {
                                            if (old_arr[idx] != new_val) {
                                                differs = true;
                                            }
                                        } else {
                                            differs = true;
                                        }
                                    } else {
                                        differs = true;
                                    }
                                });
                                states[key] = new_arr;
                            } else {
                                // structure check
                                let new_arr = [];
                                let old_arr = Array.isArray(old_state) ? old_state : [];
                                let key_id = state_values.length > 1 ? state_values[1] : undefined;
                                let add_if_missing = false;
                                let remove_if_no_data = false;
                                let is_valid_key = key => true;
                                let replace_all = false;
                                if (typeof key_id === 'object') {
                                    add_if_missing = key_id.addIfMissing || false;
                                    remove_if_no_data = key_id.removeIfNoData || false;
                                    if (typeof key_id.isValidKey === 'function') {
                                        is_valid_key = key_id.isValidKey;
                                    }
                                    if (typeof key_id.replaceAll === 'boolean') {
                                        replace_all = key_id.replaceAll;
                                    } else {
                                        replace_all = true;
                                    }
                                    key_id = key_id.keyId;
                                }
                                value.forEach((new_obj, idx) => {
                                    let cur_obj;
                                    if (key_id) {
                                        let f_arr;
                                        if (typeof key_id === 'string') {
                                            f_arr = old_arr.filter(obj => { return obj[key_id] === new_obj[key_id] });
                                        } else {
                                            f_arr = old_arr.filter(obj => {
                                                let obj_equal = true;
                                                key_id.forEach(key_idi => {
                                                    if (obj[key_idi] !== new_obj[key_idi]) {
                                                        obj_equal = false;
                                                    }
                                                });
                                                return obj_equal;
                                            });
                                        }
                                        if (f_arr.length > 1) {
                                            RED.log.error('More than one "' + key + '" for "' + key_id + '" "' + new_obj[key_id] + '"');
                                        } else if (f_arr.length > 0) {
                                            cur_obj = f_arr[0];
                                        } else if (add_if_missing) {
                                            let key_id0 = typeof key_id === 'string' ? key_id : key_id[0];
                                            let key1 = is_valid_key(new_obj[key_id0]);
                                            if (key1) {
                                                cur_obj = {};
                                                if (typeof key1 === 'string') {
                                                    new_obj[key_id0] = key1;
                                                }
                                                old_arr.push(cur_obj);
                                            }
                                        }
                                    } else {
                                        cur_obj = old_arr[idx];
                                        if (cur_obj === undefined && add_if_missing) {
                                            cur_obj = {};
                                        }
                                    }
                                    if (cur_obj !== undefined) {
                                        if (me.cloneObject(cur_obj, new_obj, ar_state_values, exclusive_states)) {
                                            differs = true;
                                        }
                                        if (Object.keys(cur_obj).length > 0) {
                                            new_arr.push(cur_obj);
                                        } else {
                                            differs = true; // ??
                                        }
                                    }
                                });
                                if (replace_all && new_arr.length != old_arr.length) {
                                    differs = true;
                                }
                                states[key] = replace_all ? new_arr : old_arr;
                                if (remove_if_no_data && states[key].length === 0) {
                                    delete states[key];
                                }
                            }
                        } else {
                            RED.log.error('key "' + key + '" must be an array.');
                        }
                    } else {
                        if (Array.isArray(value)) {
                            RED.log.error('key "' + key + '" must be an object.');
                        } else {
                            if (states[key] === undefined) {
                                states[key] = {};
                                old_state = states[key];
                            }
                            let mandatory_to_delete = [];
                            Object.keys(state_values).forEach(function (ikey) {
                                if (typeof value[ikey] !== 'undefined' && value[ikey] != null) {
                                    if (typeof old_state[ikey] == 'undefined') {
                                        old_state[ikey] = {};
                                    }
                                    if (me.setState(ikey, value[ikey], old_state, state_values[ikey], exclusive_states[ikey] || {})) {
                                        differs = true;
                                    }
                                } else if (typeof state_values[ikey] === 'number' && !(state_values[ikey] & formats.MANDATORY)) {
                                    if (typeof states[ikey] != 'undefined') {
                                        differs = true;
                                    }
                                    delete states[ikey];
                                } else {
                                    mandatory_to_delete.push(ikey);
                                }
                            });
                            mandatory_to_delete.forEach(ikey => {
                                const e_states = exclusive_states[ikey] || [];
                                let exclusive_state_found = false;
                                e_states.forEach(e_state => {
                                    if (typeof states[e_state] !== 'undefined') {
                                        exclusive_state_found = false;
                                    }
                                });
                                if (!exclusive_state_found) {
                                    if (typeof states[ikey] != 'undefined') {
                                        differs = true;
                                    }
                                    delete states[ikey];
                                } else {
                                    RED.log.error('key "' + key + '.' + ikey + '" is mandatory.');
                                }
                            });
                        }
                    }
                } else {
                    if (Array.isArray(old_state)) {
                        RED.log.error('key "' + key + '" must be an array.');
                    } else {
                        RED.log.error('key "' + key + '" must be an object.');
                    }
                }
            } else if (state_values & Formats.COPY_OBJECT) {
                if (typeof value !== 'object' || Array.isArray(value)) {
                    RED.log.error('key "' + key + '" must be an object.');
                } else {
                    Object.keys(old_state).forEach(function (key) {
                        if (typeof value[key] !== 'undefined') {
                            if (me.setState(key, value[key], old_state, state_values - Formats.COPY_OBJECT, {})) {
                                differs = true;
                            }
                        }
                    });
                }
            } else if (value == null) {
                if (state_values & Formats.MANDATORY) {
                    RED.log.error("key " + key + " is mandatory.");
                } else if (states.hasOwnProperty(key)) {
                    delete states[key];
                    differs = true;
                }
            } else if (state_values & Formats.FLOAT) {
                new_state = formats.FormatValue(formats.Formats.FLOAT, key, value);
            } else if (state_values & Formats.INT) {
                new_state = formats.FormatValue(formats.Formats.INT, key, value);
            } else if (state_values & Formats.STRING) {
                new_state = formats.FormatValue(formats.Formats.STRING, key, value);
            } else if (state_values & Formats.BOOL) {
                new_state = formats.FormatValue(formats.Formats.BOOL, key, value);
            }
            if (typeof state_values !== 'object') {
                if (new_state !== undefined) {
                    differs = old_state !== new_state;
                    states[key] = new_state;
                }
            }
            if (differs) {
                exclusive_states_arr.forEach(rkey => delete states[rkey]);
            }
            return differs;
        }

        to_available_applications(json_data) {
            return this.key_name_synonym(json_data, 'key', 'names', 'name_synonym');
        }

        to_available_arm_levels(json_data) {
            return this.key_name_synonym(json_data, 'level_name', 'level_values', 'level_synonym');
        }

        to_available_channels(json_data) {
            let f = function (data_in, data_out) {
                if (typeof data_in.number === 'string') {
                    data_out.number = data_in.number;
                }
                return true;
            };
            return this.key_name_synonym(json_data, 'key', 'names', undefined, f);
        }

        to_food_presets(json_data) {
            let f = function (data_in, data_out) {
                if (Array.isArray(data_in.supported_units)) {
                    data_out.supported_units = [];
                    data_in.supported_units.forEach(unit => {
                        if (typeof unit === 'string' && !data_out.supported_units.includes(unit.trim().toUpperCase()) && COOK_SUPPORTED_UNIT.includes(unit.trim().toUpperCase())) {
                            data_out.supported_units.push(unit.trim().toUpperCase());
                        }
                    });
                    return data_out.supported_units.length > 0;
                }
                return false;
            };
            return this.key_name_synonym(json_data, 'food_preset_name', 'food_synonyms', 'synonym', f);
        }

        to_supported_dispense_items(json_data) {
            let f = function (data_in, data_out) {
                if (Array.isArray(data_in.supported_units)) {
                    data_out.supported_units = [];
                    data_in.supported_units.forEach(unit => {
                        if (typeof unit === 'string' && !data_out.supported_units.includes(unit.trim().toUpperCase()) && DISPENSE_SUPPORTED_UNIT.includes(unit.trim().toUpperCase())) {
                            data_out.supported_units.push(unit.trim().toUpperCase());
                        }
                    });
                    if (typeof data_in.default_portion.amount === 'number' && typeof data_in.default_portion.unit === 'string' && data_out.supported_units.includes(data_in.default_portion.unit.trim().toUpperCase())) {
                        data_out.default_portion = {
                            amount: data_in.default_portion.amount,
                            unit: data_in.default_portion.unit.trim().toUpperCase()
                        };
                        return data_out.supported_units.length > 0;
                    }
                }
                return false;
            };
            return this.key_name_synonym(json_data, 'item_name', 'item_name_synonyms', 'synonyms', f);
        }

        to_supported_dispense_presets(json_data) {
            return this.key_name_synonym(json_data, 'preset_name', 'preset_name_synonyms', 'synonyms');
        }

        to_available_fan_speeds(json_data) {
            return this.key_name_synonym(json_data, 'speed_name', 'speed_values', 'speed_synonym');
        }

        to_available_fill_levels(json_data) {
            return this.key_name_synonym(json_data, 'level_name', 'level_values', 'level_synonym');
        }

        to_available_inputs(json_data) {
            return this.key_name_synonym(json_data, 'key', 'names', 'name_synonym');
        }

        to_available_modes(json_data) {
            let key_name_synonym = this.key_name_synonym;
            let f = function (data_in, data_out) {
                if (Array.isArray(data_in.settings)) {
                    data_out.settings = key_name_synonym(data_in.settings, 'setting_name', 'setting_values', 'setting_synonym');
                    if (typeof data_in.ordered === 'boolean') {
                        data_out.ordered = data_in.ordered;
                    }
                    return data_out.settings.length > 0;
                }
                return false;
            };
            return this.key_name_synonym(json_data, 'name', 'name_values', 'name_synonym', f);
        }

        to_available_toggles(json_data) {
            return this.key_name_synonym(json_data, 'name', 'name_values', 'name_synonym');
        }

        key_name_synonym(json_data, key1, key2, key3, manage_other_fields) {
            const me = this;
            let new_data = [];
            if (Array.isArray(json_data)) {
                if (typeof manage_other_fields !== 'function') {
                    manage_other_fields = function (data_in, data_out) { return true; }
                }
                json_data.forEach(rec => {
                    if (typeof rec[key1] === 'string' && rec[key1].trim()) {
                        let new_rec = {};
                        new_rec[key1] = rec[key1].trim();
                        let found = new_data.filter(element => element[key1] === new_rec[key1]);
                        if (found.length === 0 && Array.isArray(rec[key2])) {
                            new_rec[key2] = [];
                            rec[key2].forEach(names => {
                                if (key3) {
                                    let lang = typeof names.lang === 'string' ? names.lang.trim() : '';
                                    if (lang.length === 0) {
                                        lang = me.lang;
                                    }
                                    if (Array.isArray(names[key3])) {
                                        let name_synonym = [];
                                        names[key3].forEach(name => {
                                            if (typeof name === 'string' && name.trim().length > 0 && !name_synonym.includes(name.trim())) {
                                                name_synonym.push(name.trim());
                                            }
                                        });
                                        if (name_synonym.length > 0) {
                                            let new_key2 = {};
                                            new_key2['lang'] = lang;
                                            new_key2[key3] = name_synonym;
                                            if (manage_other_fields(rec, new_rec)) {
                                                new_rec[key2].push(new_key2);
                                            }
                                        }
                                    }
                                } else {
                                    if (typeof names === 'string' && names.trim() && !new_rec[key2].includes(names.trim())) {
                                        new_rec[key2].push(names.trim());
                                    }
                                }
                            });
                            if (new_rec[key2].length > 0) {
                                let ok = true;
                                if (!key3) {
                                    ok = manage_other_fields(rec, new_rec);
                                }
                                if (ok) {
                                    new_data.push(new_rec);
                                }
                            }
                        }
                    }
                });
            }
            return new_data;
        }

        key_name_synonym1(json_data) {
            const me = this;
            let new_data = [];
            if (Array.isArray(json_data)) {
                json_data.forEach(rec => {
                    if (typeof rec.key === 'string' && rec.key.trim()) {
                        let new_rec = {};
                        new_rec.key = rec.key.trim();
                        let found = new_data.filter(element => element.key === new_rec.key);
                        if (found.length === 0 && Array.isArray(rec.names)) {
                            new_rec.names = [];
                            rec.names.forEach(names => {
                                let lang = typeof names.lang === 'string' ? names.lang.trim() : '';
                                if (lang.length === 0) {
                                    lang = me.lang;
                                }
                                if (Array.isArray(names.name_synonym)) {
                                    let name_synonym = [];
                                    names.name_synonym.forEach(name => {
                                        if (typeof name === 'string' && name.trim().length > 0 && !name_synonym.includes(name.trim())) {
                                            name_synonym.push(name.trim());
                                        }
                                    });
                                    if (name_synonym.length > 0) {
                                        new_rec.names.push({
                                            lang: lang,
                                            name_synonym: name_synonym
                                        });
                                    }
                                }
                            });
                            if (new_rec.names.length > 0) {
                                new_data.push(new_rec);
                            }
                        }
                    }
                });
            }
            return new_data;
        }

        loadJson(text, filename, defaultValue) {
            if (filename) {
                this._debug('.loadJson: ' + text);
                let full_filename;
                if (!filename.startsWith(path.sep)) {
                    const userDir = RED.settings.userDir;
                    full_filename = path.join(userDir, filename);
                } else {
                    full_filename = filename;
                }
                this._debug('.loadJson: filename ' + full_filename);

                try {
                    let jsonFile = fs.readFileSync(
                        full_filename,
                        {
                            'encoding': 'utf8',
                            'flag': fs.constants.R_OK | fs.constants.W_OK | fs.constants.O_CREAT
                        });

                    if (jsonFile === '') {
                        this._debug('.loadJson: file ' + filename + ' is empty');
                        return defaultValue;
                    } else {
                        this._debug('.loadJson: data loaded');
                        const json = JSON.parse(jsonFile);
                        this._debug('.loadJson: json = ' + JSON.stringify(json));
                        return json;
                    }
                }
                catch (err) {
                    RED.log.error('Error on loading ' + text + ' filename ' + filename + ': ' + err.toString());
                    return defaultValue;
                }
            }
        }

        writeJson(text, filename, value) {
            if (filename) {
                this._debug('.writeJson: ' + text);
                if (!filename.startsWith(path.sep)) {
                    const userDir = RED.settings.userDir;
                    filename = path.join(userDir, filename);
                }
                this._debug('.writeJson: filename ' + filename);
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

                    this._debug('.writeJson: ' + text + ' saved');
                    return true;
                }
                catch (err) {
                    RED.log.error('Error on saving ' + text + ' filename + ' + filename + ': ' + err.toString());
                    return false;
                }
            }
        }

        // Called by Device.execCommand
        //
        //
        execCommand(device, command, orig_device) {
            let me = this;
            let params = {};
            let executionStates = ['online'];
            const ok_result = {
                'params': params,
                'executionStates': executionStates
            };

            me._debug(".execCommand: command " + JSON.stringify(command));

            if (me.errorCode) {
                me._debug(".execCommand: errorCode " + JSON.stringify(me.errorCode));
                return {
                    status: 'ERROR',
                    errorCode: me.errorCode
                };
            }

            me._debug(".execCommand: states " + JSON.stringify(me.states));
            // me._debug(".execCommand: device " +  JSON.stringify(device));
            // me._debug(".execCommand: me.device " +  JSON.stringify(me.device));

            // Applications
            if ((command.command == 'action.devices.commands.appInstall') ||
                (command.command == 'action.devices.commands.appSearch') ||
                (command.command == 'action.devices.commands.appSelect')) {
                if (command.params.hasOwnProperty('newApplication')) {
                    const newApplication = command.params['newApplication'];
                    let application_index = -1;
                    this.available_applications.forEach(function (application, index) {
                        if (application.key === newApplication) {
                            application_index = index;
                        }
                    });
                    if (command.command == 'action.devices.commands.appInstall') {
                        if (application_index >= 0) {
                            return {
                                status: 'ERROR',
                                errorCode: 'alreadyInstalledApp'
                            };
                        }
                    } else {
                        if (application_index < 0) {
                            return {
                                status: 'ERROR',
                                errorCode: 'noAvailableApp'
                            };
                        }
                        executionStates.push('online', 'currentApplication');
                        params['currentApplication'] = newApplication;
                    }
                }
                if (command.params.hasOwnProperty('newApplicationName')) {
                    const newApplicationName = command.params['newApplicationName'];
                    let application_key = '';
                    me.available_applications.forEach(function (application, index) {
                        application.names.forEach(function (name) {
                            if (name.name_synonym.includes(newApplicationName)) {
                                application_key = application.key;
                            }
                        });
                    });
                    if (command.command == 'action.devices.commands.appInstall') {
                        if (application_key !== '') {
                            return {
                                status: 'ERROR',
                                errorCode: 'alreadyInstalledApp'
                            };
                        }
                    } else {
                        if (application_key === '') {
                            return {
                                status: 'ERROR',
                                errorCode: 'noAvailableApp'
                            };
                        }
                        params['currentApplication'] = application_key;
                        executionStates.push('currentApplication');
                    }
                }
            }
            // ColorLoop
            else if (command.command == 'action.devices.commands.ColorLoop') {
                params['activeLightEffect'] = 'colorLoop';
                executionStates.push('activeLightEffect');
            }
            else if (command.command == 'action.devices.commands.Sleep') {
                params['activeLightEffect'] = 'sleep';
                executionStates.push('activeLightEffect');
            }
            else if (command.command == 'action.devices.commands.StopEffect') {
                params['activeLightEffect'] = '';
                executionStates.push('activeLightEffect');
            }
            else if (command.command == 'action.devices.commands.Wake') {
                params['activeLightEffect'] = 'wake';
                executionStates.push('activeLightEffect');
            }
            // Cook
            else if (command.command == 'action.devices.commands.Cook') {
                //const start = command.params['start'];
                if (command.params.hasOwnProperty('cookingMode')) {
                    const cooking_mode = command.params['cookingMode'];
                    if (me.supported_cooking_modes.includes(cooking_mode)) {
                        params['currentCookingMode'] = cooking_mode;
                        executionStates.push('currentCookingMode');
                    } else {
                        this.error(".execCommand unknown cooking mode " + cooking_mode);
                        return {
                            status: 'ERROR',
                            errorCode: 'transientError'
                        };
                    }
                }
                let selected_preset = undefined;
                if (command.params.hasOwnProperty('foodPreset')) {
                    const food_preset_name = command.params['foodPreset'];
                    me.food_presets.forEach(function (food_preset) {
                        if (food_preset.food_preset_name === food_preset_name) {
                            selected_preset = food_preset;
                        }
                    });
                    if (selected_preset !== undefined) {
                        params['currentFoodPreset'] = food_preset_name;
                        executionStates.push('currentFoodPreset');
                    } else {
                        this.error(".execCommand unknown food preset " + food_preset_name);
                        return {
                            status: 'ERROR',
                            errorCode: 'unknownFoodPreset'
                        };
                    }
                }
                if (command.params.hasOwnProperty('quantity')) {
                    const quantity = command.params['quantity'];
                    params['currentFoodQuantity'] = quantity;
                    executionStates.push('currentFoodQuantity');
                }
                if (command.params.hasOwnProperty('unit')) {
                    const unit = command.params['unit'];
                    if (selected_preset !== undefined) {
                        if (!selected_preset.supported_units.includes(unit)) {
                            this.error(".execCommand unknown unit " + unit);
                            return {
                                status: 'ERROR',
                                errorCode: 'transientError'
                            };
                        }
                    }
                    params['currentFoodUnit'] = unit;
                    executionStates.push('currentFoodUnit');
                }
            }
            // Dispense
            else if (command.command == 'action.devices.commands.Dispense') {
                const item_name = command.params['item'] || '';
                //const amount = command.params['amount'] || '';
                const unit = command.params['unit'] || '';
                const preset_name = command.params['presetName'] || '';
                if (preset_name) {
                    let found = false;
                    me.supported_dispense_presets.forEach(function (preset) {
                        if (preset.preset_name == preset_name) {
                            found = true;
                        }
                    });
                    if (!found) {
                        return {
                            status: 'ERROR',
                            errorCode: 'transientError'
                        };
                    }
                }
                else if (item_name) {
                    let item_found = undefined;
                    me.supported_dispense_items.forEach(function (item) {
                        if (item.item_name == item_name) {
                            item_found = item;
                        }
                    });
                    if (item_found === undefined) {
                        return {
                            status: 'ERROR',
                            errorCode: 'transientError'
                        };
                    }
                    if (unit && !item_found.supported_units.includes(unit)) {
                        return {
                            status: 'ERROR',
                            errorCode: 'transientError'
                        };
                    }
                    item_found = undefined;
                    this.states.dispenseItems.forEach(function (item) {
                        if (item.itemName == item_name) {
                            if (item_found === undefined || item_found.amountRemaining.unit !== unit) {
                                item_found = item;
                            }
                        }
                    });
                    if (item_found === undefined) {
                        return {
                            status: 'ERROR',
                            errorCode: 'transientError'
                        };
                    }
                    /*
                    if (unit) {
                        if (item_found.amountRemaining.unit !== unit) {
                            return {
                                status: 'ERROR',
                                errorCode: 'dispenseUnitNotSupported'
                            };    
                        }
                        // Check quantity
                        if (item_found.amountRemaining.amount < amount) {
                            return {
                                status: 'ERROR',
                                errorCode: 'dispenseAmountRemainingExceeded'
                            };    
                        }
                        item_found.amountRemaining.amount -= amount;
                        params['dispenseItems'] = this.states.dispenseItems;
                        executionStates.push('dispenseItems');
                    }
                    */
                }
            }
            // Dock
            else if (command.command == 'action.devices.commands.Dock') {
                params['isDocked'] = true;
                executionStates.push('isDocked');
            }

            // ArmLevel
            else if (command.command == 'action.devices.commands.ArmDisarm') {
                if (command.params.hasOwnProperty('arm')) {
                    let new_armLevel = "";
                    if (command.params.hasOwnProperty('armLevel')) {
                        const armLevel = command.params['armLevel'];
                        this.available_arm_levels.forEach(function (al) {
                            if (al.level_name === armLevel) {
                                new_armLevel = al.level_name;
                            }
                        });
                    } else {
                        if (this.available_arm_levels.length > 0) {
                            new_armLevel = this.available_arm_levels[0].level_name;
                        }
                    }

                    if (new_armLevel === '') {
                        return {
                            status: 'ERROR',
                            errorCode: 'transientError'
                        };
                    }
                    params['currentArmLevel'] = new_armLevel;
                    params['isArmed'] = command.params['arm'];
                    executionStates.push('isArmed', 'currentArmLevel');
                }
            }

            // FanSpeed 
            else if (command.command == 'action.devices.commands.SetFanSpeed') {
                if (!me.command_only_fanspeed) {
                    if (command.params.hasOwnProperty('fanSpeed')) {
                        const fanSpeed = command.params['fanSpeed'];
                        let new_fanspeed = '';
                        this.available_fan_speeds.forEach(function (fanspeed) {
                            if (fanspeed.speed_name === fanSpeed) {
                                new_fanspeed = fanspeed.speed_name;
                            }
                        });
                        if (new_fanspeed === '') {
                            return {
                                status: 'ERROR',
                                errorCode: 'transientError'
                            };
                        }
                        params['currentFanSpeedSetting'] = fanSpeed;
                        executionStates.push('currentFanSpeedSetting');
                    }
                    if (command.params.hasOwnProperty('fanSpeedPercent')) {
                        const fanSpeedPercent = command.params['fanSpeedPercent'];
                        params['currentFanSpeedPercent'] = fanSpeedPercent;
                        executionStates.push('currentFanSpeedPercent');
                    }
                }
            }
            else if (command.command == 'action.devices.commands.SetFanSpeedRelative') {
                /*if (command.params.hasOwnProperty('fanSpeedRelativeWeight')) {
                    const fanSpeedRelativeWeight = command.params['fanSpeedRelativeWeight'];
                    params['currentFanSpeedPercent'] = me.states['currentFanSpeedPercent'] + fanSpeedRelativeWeight;
                    executionStates.push('currentFanSpeedPercent');
                }
                if (command.params.hasOwnProperty('fanSpeedRelativePercent')) {
                    const fanSpeedRelativePercent = command.params['fanSpeedRelativePercent'];
                    params['currentFanSpeedPercent'] = Math.round(me.states['currentFanSpeedPercent'] * (1 + fanSpeedRelativePercent / 100));
                    executionStates.push('currentFanSpeedPercent');
                }*/
            }
            // LockUnlock
            else if (command.command == 'action.devices.commands.LockUnlock') {
                const lock = command.params['lock'];
                params['isLocked'] = lock;
                executionStates.push('isLocked');
            }
            // HumiditySetting
            else if (command.command == 'action.devices.commands.SetHumidity') {
                if (!me.command_only_humiditysetting) {
                    const humidity = command.params['humidity'];
                    params['humiditySetpointPercent'] = humidity;
                    executionStates.push('humiditySetpointPercent');
                }
            }
            else if (command.command == 'action.devices.commands.HumidityRelative') {
                /*if (command.params.hasOwnProperty('humidityRelativePercent')) {
                    const humidityRelativePercent = command.params['humidityRelativePercent'];
                    params['humiditySetpointPercent'] = Math.round(me.states['humiditySetpointPercent'] * (1 + humidityRelativePercent / 100));
                    executionStates.push('humiditySetpointPercent');
                }
                if (command.params.hasOwnProperty('humidityRelativeWeight')) {
                    const humidityRelativeWeight = command.params['humidityRelativeWeight'];
                    params['humiditySetpointPercent'] = me.states['humiditySetpointPercent'] + humidityRelativeWeight;
                    executionStates.push('humiditySetpointPercent');
                }*/
            }
            // NetworkControl 
            else if (command.command == 'action.devices.commands.EnableDisableNetworkProfile') {
                const profile = command.params['profile'].toLowerCase();
                //const enable = command.params['enable'] || false;
                let found = false;
                this.network_profiles.forEach(function (p) {
                    if (profile === p.toLowerCase()) {
                        found = true;
                    }
                });
                if (!found) {
                    return {
                        status: 'ERROR',
                        errorCode: 'networkProfileNotRecognized'
                    };
                }
            }
            else if (command.command == 'action.devices.commands.EnableDisableGuestNetwork') {
                const enable = command.params['enable'] || false;
                params['guestNetworkEnabled'] = enable;
                executionStates.push('guestNetworkEnabled');
            }
            else if (command.command == 'action.devices.commands.GetGuestNetworkPassword') {
                params['guestNetworkPassword'] = me.guest_network_password;
                executionStates.push('guestNetworkPassword');
                return {
                    status: 'SUCCESS',
                    states: {
                        online: true,
                        guestNetworkPassword: me.guest_network_password
                    },
                    executionStates: executionStates,
                };
            }
            // Inputs
            else if (command.command == 'action.devices.commands.SetInput') {
                if (!me.command_only_input_selector) {
                    if (command.params.hasOwnProperty('newInput')) {
                        const newInput = command.params['newInput'];
                        let current_input_index = -1;
                        this.available_inputs.forEach(function (input_element, index) {
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
                        executionStates.push('currentInput');
                    }
                }
            }
            else if (command.command == 'action.devices.commands.NextInput') {
                if (!me.command_only_input_selector) {
                    this.current_input_index++;
                    if (this.current_input_index >= this.available_inputs.length) {
                        this.current_input_index = 0;
                    }
                    executionStates.push('currentInput');
                    params['currentInput'] = this.available_inputs[this.current_input_index].key;
                }
            }
            else if (command.command == 'action.devices.commands.PreviousInput') {
                if (!me.command_only_input_selector) {
                    if (this.current_input_index <= 0) {
                        this.current_input_index = this.available_inputs.length;
                    }
                    this.current_input_index--;
                    executionStates.push('currentInput');
                    params['currentInput'] = this.available_inputs[this.current_input_index].key;
                }
            }
            // On/Off
            else if (command.command == 'action.devices.commands.OnOff') {
                if (!me.command_only_onoff) {
                    if (command.params.hasOwnProperty('on')) {
                        const on_param = command.params['on'];
                        executionStates.push('on');
                        params['on'] = on_param;
                    }
                }
            }
            // OpenClose
            else if (command.command == 'action.devices.commands.OpenClose') {
                if (!me.command_only_openclose) {
                    const open_percent = command.params['openPercent'] || 0;
                    if (me.states.hasOwnProperty('openPercent')) {
                        executionStates.push('openPercent');
                        params['openPercent'] = open_percent;
                    } else if (command.params.hasOwnProperty('openDirection')) {
                        const open_direction = command.params['openDirection'];
                        let new_open_directions = [];
                        me.states.openState.forEach(element => {
                            new_open_directions.push({
                                "openPercent": element.openDirection == open_direction ? open_percent : element.openPercent,
                                "openDirection": element.openDirection
                            });
                        });
                        executionStates.push('openState');
                        params['openState'] = new_open_directions;
                    }
                }
            }
            else if (command.command == 'action.devices.commands.OpenCloseRelative') {
                /*const open_percent = command.params['openRelativePercent'] || 0;
                if (me.states.hasOwnProperty('openPercent')) {
                    executionStates.push('openPercent');
                    params['openPercent'] = open_percent;
                } else if (command.params.hasOwnProperty('openDirection')) {
                    const open_direction = command.params['openDirection'];
                    let new_open_directions = [];
                    me.states.openState.forEach(element => {
                        new_open_directions.push({
                            "openPercent": element.openDirection == open_direction ? element.openPercent + open_percent : element.openPercent,
                            "openDirection": element.openDirection
                        });
                    });
                    executionStates.push('openState');
                    params['openState'] = new_open_directions;
                }*/
            }
            // StartStop
            else if (command.command == 'action.devices.commands.StartStop') {
                const start = command.params['start'] || false;
                let zones = undefined;
                if (command.params.hasOwnProperty('zone')) {
                    zones = [command.params['zone']];
                } else if (command.params.hasOwnProperty('multipleZones')) {
                    zones = command.params['multipleZones'];
                }
                params['isRunning'] = start;
                executionStates.push('isRunning');
                if (start) {
                    params['isPaused'] = false;
                    executionStates.push('isPaused');
                    if (zones !== undefined) {
                        let active_zones = [];
                        zones.forEach(function (zone) {
                            if (me.available_zones.includes(zone)) {
                                active_zones.push(zone);
                            }
                        });
                        params['activeZones'] = active_zones;
                        executionStates.push('activeZones');
                    }
                }
            }
            else if (command.command == 'action.devices.commands.PauseUnpause') {
                const pause = command.params['pause'] || false;
                params['isPaused'] = pause;
                executionStates.push('isPaused');
            }
            // TransportControl
            else if (command.command == 'action.devices.commands.mediaStop') {
                params['playbackState'] = 'STOPPED';
                executionStates.push('playbackState');
            }
            else if (command.command == 'action.devices.commands.mediaNext') {
                params['playbackState'] = 'FAST_FORWARDING';
                executionStates.push('playbackState');
            }
            else if (command.command == 'action.devices.commands.mediaPrevious') {
                params['playbackState'] = 'REWINDING';
                executionStates.push('playbackState');
            }
            else if (command.command == 'action.devices.commands.mediaPause') {
                params['playbackState'] = 'PAUSED';
                executionStates.push('playbackState');
            }
            else if (command.command == 'action.devices.commands.mediaResume') {
                params['playbackState'] = 'PLAYING';
                executionStates.push('playbackState');
            }
            else if (command.command == 'action.devices.commands.mediaSeekRelative') {
                if (command.params.hasOwnProperty('relativePositionMs')) {
                    //const relative_position_ms = command.params['relativePositionMs'];
                    params['playbackState'] = 'PLAYING';
                    executionStates.push('playbackState');
                }
            }
            else if (command.command == 'action.devices.commands.mediaSeekToPosition') {
                if (command.params.hasOwnProperty('absPositionMs')) {
                    //const abs_position_ms = command.params['absPositionMs'];
                    params['playbackState'] = 'PLAYING';
                    executionStates.push('playbackState');
                }
            }
            else if (command.command == 'action.devices.commands.mediaRepeatMode') {
                if (command.params.hasOwnProperty('isOn')) {
                    //const is_on = command.params['isOn'];
                }
                if (command.params.hasOwnProperty('isSingle')) {
                    //const is_single = command.params['isSingle'];
                }
            }
            else if (command.command == 'action.devices.commands.mediaShuffle') {
            }
            else if (command.command == 'action.devices.commands.mediaClosedCaptioningOn') {
                if (command.params.hasOwnProperty('closedCaptioningLanguage')) {
                    //const closedCaptioningLanguage = command.params['closedCaptioningLanguage'];
                    params['playbackState'] = me.states['playbackState'];
                }
                if (command.params.hasOwnProperty('userQueryLanguage')) {
                    //const userQueryLanguage = command.params['userQueryLanguage'];
                    params['playbackState'] = me.states['playbackState'];
                }
                executionStates.push('playbackState');
            }
            else if (command.command == 'action.devices.commands.mediaClosedCaptioningOff') {
                executionStates.push('playbackState');
            }
            // TemperatureControl
            else if (command.command == 'action.devices.commands.SetTemperature') {
                if (!me.command_only_temperaturecontrol) {
                    const temperature = command.params['temperature'];
                    params['temperatureSetpointCelsius'] = temperature;
                    executionStates.push('temperatureSetpointCelsius');
                }
            }
            // TemperatureSetting 
            else if (command.command == 'action.devices.commands.ThermostatTemperatureSetpoint') {
                if (!me.command_only_temperaturesetting) {
                    const thermostatTemperatureSetpoint = command.params['thermostatTemperatureSetpoint'];
                    params['thermostatTemperatureSetpoint'] = thermostatTemperatureSetpoint;
                    me.thermostat_temperature_setpoint = thermostatTemperatureSetpoint;
                    executionStates.push('thermostatTemperatureSetpoint');
                }
            }
            else if (command.command == 'action.devices.commands.ThermostatTemperatureSetRange') {
                if (!me.command_only_temperaturesetting) {
                    const thermostatTemperatureSetpointHigh = command.params['thermostatTemperatureSetpointHigh'];
                    const thermostatTemperatureSetpointLow = command.params['thermostatTemperatureSetpointLow'];
                    params['thermostatTemperatureSetpointHigh'] = thermostatTemperatureSetpointHigh;
                    params['thermostatTemperatureSetpointLow'] = thermostatTemperatureSetpointLow;
                    me.thermostat_temperature_setpoint_hight = thermostatTemperatureSetpointHigh;
                    me.thermostat_temperature_setpoint_low = thermostatTemperatureSetpointLow;
                    executionStates.push('thermostatTemperatureSetpointHigh', 'thermostatTemperatureSetpointLow');
                }
            }
            else if (command.command == 'action.devices.commands.ThermostatSetMode') {
                if (!me.command_only_temperaturesetting) {
                    const thermostatMode = command.params.thermostatMode;
                    params['thermostatMode'] = thermostatMode;
                    executionStates.push('thermostatMode');
                    if (thermostatMode === "heatcool") {
                        params['thermostatTemperatureSetpointHigh'] = me.thermostat_temperature_setpoint_hight;
                        params['thermostatTemperatureSetpointLow'] = me.thermostat_temperature_setpoint_low;
                        executionStates.push('thermostatTemperatureSetpointHigh', 'thermostatTemperatureSetpointLow');
                    } else if (thermostatMode === "heat" || thermostatMode === "cool") {
                        params['thermostatTemperatureSetpoint'] = me.thermostat_temperature_setpoint;
                        executionStates.push('thermostatTemperatureSetpoint');
                    }
                }
            }
            else if (command.command == 'action.devices.commands.TemperatureRelative') {
                /*if (command.params.hasOwnProperty('thermostatTemperatureRelativeDegree')) {
                    const thermostatTemperatureRelativeDegree = command.params['thermostatTemperatureRelativeDegree'];
                    params['thermostatTemperatureSetpoint'] = me.states['thermostatTemperatureSetpoint'] + thermostatTemperatureRelativeDegree;
                    executionStates.push('thermostatTemperatureSetpoint');
                }
                if (command.params.hasOwnProperty('thermostatTemperatureRelativeWeight')) {
                    const thermostatTemperatureRelativeWeight = command.params['thermostatTemperatureRelativeWeight'];
                    me._debug("C CHI thermostatTemperatureRelativeWeight " + thermostatTemperatureRelativeWeight);
                    me._debug("C CHI thermostatTemperatureSetpoint " + me.states['thermostatTemperatureSetpoint']);
                    params['thermostatTemperatureSetpoint'] = me.states['thermostatTemperatureSetpoint'] + thermostatTemperatureRelativeWeight;
                    executionStates.push('thermostatTemperatureSetpoint');
                }*/
            }
            // Timer
            else if (command.command == 'action.devices.commands.TimerStart') {
                if (!me.command_only_timer) {
                    const timer_time_sec = command.params['timerTimeSec'];
                    const now = Math.floor(Date.now() / 1000);
                    params['timerRemainingSec'] = timer_time_sec;
                    params['timerPaused'] = null;
                    executionStates.push('timerPaused', 'timerRemainingSec');
                    me.timer_end_timestamp = now + timer_time_sec;
                }
            }
            else if (command.command == 'action.devices.commands.TimerResume') {
                if (!me.command_only_timer) {
                    const now = Math.floor(Date.now() / 1000);
                    const timer_remaining_sec = me.states['timerRemainingSec'];
                    if (timer_remaining_sec > 0 && me.states['timerPaused']) {
                        params['timerPaused'] = false;
                        me.timer_end_timestamp = now + timer_remaining_sec;
                        executionStates.push('timerPaused', 'timerRemainingSec');
                    } else {
                        return {
                            status: 'ERROR',
                            errorCode: 'noTimerExists'
                        };
                    }
                }
            }
            else if (command.command == 'action.devices.commands.TimerPause') {
                if (!me.command_only_timer) {
                    const now = Math.floor(Date.now() / 1000);
                    if (me.states['timerPaused']) {
                        executionStates.push('timerPaused');
                    }
                    else if (now < me.timer_end_timestamp) {
                        params['timerPaused'] = true;
                        params['timerRemainingSec'] = me.timer_end_timestamp - now;
                        executionStates.push('timerPaused', 'timerRemainingSec');
                    } else {
                        return {
                            status: 'ERROR',
                            errorCode: 'noTimerExists'
                        };
                    }
                }
            }
            else if (command.command == 'action.devices.commands.TimerCancel') {
                if (!me.command_only_timer) {
                    const now = Math.floor(Date.now() / 1000);
                    if (now < me.timer_end_timestamp) {
                        me.states['timerRemainingSec'] = 0;
                        params['timerPaused'] = false;
                        me.timer_end_timestamp = -1;
                        executionStates.push('timerPaused', 'timerRemainingSec');
                    } else {
                        return {
                            status: 'ERROR',
                            errorCode: 'noTimerExists'
                        };
                    }
                }
            }
            else if (command.command == 'action.devices.commands.TimerAdjust') {
                if (!me.command_only_timer) {
                    const now = Math.floor(Date.now() / 1000);
                    const timer_time_sec = command.params['timerTimeSec'];
                    if (me.states['timerPaused']) {
                        me.states['timerRemainingSec'] = me.states['timerRemainingSec'] + timer_time_sec;
                        executionStates.push('timerRemainingSec');
                    }
                    else if (now < me.timer_end_timestamp) {
                        me.timer_end_timestamp = me.timer_end_timestamp + timer_time_sec;
                        me.states['timerRemainingSec'] = me.timer_end_timestamp - now;
                        executionStates.push('timerRemainingSec');
                    } else {
                        return {
                            status: 'ERROR',
                            errorCode: 'noTimerExists'
                        };
                    }
                }
            }
            // Volume
            else if (command.command == 'action.devices.commands.mute') {
                if (!me.command_only_volume) {
                    if (command.params.hasOwnProperty('mute')) {
                        const mute = command.params['mute'];
                        params['isMuted'] = mute;
                        executionStates.push('isMuted', 'currentVolume');
                    }
                }
            }
            else if (command.command == 'action.devices.commands.setVolume') {
                if (!me.command_only_volume) {
                    if (command.params.hasOwnProperty('volumeLevel')) {
                        let volumeLevel = command.params['volumeLevel'];
                        if (volumeLevel > this.volumeMaxLevel) {
                            volumeLevel = this.volumeMaxLevel;
                        }
                        params['currentVolume'] = volumeLevel;
                        params['isMuted'] = false;
                        executionStates.push('isMuted', 'currentVolume');
                    }
                }
            }
            else if (command.command == 'action.devices.commands.volumeRelative') {
                if (!me.command_only_volume) {
                    if (command.params.hasOwnProperty('relativeSteps')) {
                        const relativeSteps = command.params['relativeSteps'];
                        let current_volume = me.states['currentVolume'];
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
                        executionStates.push('currentVolume');
                    }
                }
            }
            // Channels
            else if (command.command == 'action.devices.commands.selectChannel') {
                if (command.params.hasOwnProperty('channelCode')) {
                    const channelCode = command.params['channelCode'];
                    let new_channel_index = -1;
                    let new_channel_key = '';
                    let new_channel_number = '';
                    this.available_channels.forEach(function (channel, index) {
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
                    // executionStates.push('currentChannel');
                }
                /*if (command.params.hasOwnProperty('channelName')) {
                    const channelName = command.params['channelName'];
                }*/
                if (command.params.hasOwnProperty('channelNumber')) {
                    const channelNumber = command.params['channelNumber'];
                    let new_channel_index = -1;
                    let new_channel_key = '';
                    let new_channel_number = '';
                    this.available_channels.forEach(function (channel, index) {
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
                    // executionStates.push('currentChannel');
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
                    // executionStates.push('currentChannel');
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
                // executionStates.push('currentChannel');
            }
            // Modes
            else if (command.command == 'action.devices.commands.SetModes') {
                if (!me.command_only_modes) {
                    if (command.params.hasOwnProperty('updateModeSettings')) {
                        const updateModeSettings = command.params['updateModeSettings'];
                        let current_modes = me.states['currentModeSettings'];
                        let new_modes = {};
                        this.available_modes.forEach(function (mode) {
                            if (typeof updateModeSettings[mode.name] === 'string') {
                                let mode_value = updateModeSettings[mode.name];
                                mode.settings.forEach(function (setting) {
                                    if (setting.setting_name === mode_value) {
                                        new_modes[mode.name] = mode_value;
                                    }
                                });
                            }
                            if (typeof new_modes[mode.name] === 'undefined') {
                                new_modes[mode.name] = current_modes[mode.name];
                            }
                        });
                        params['currentModeSettings'] = new_modes;
                        executionStates.push('currentModeSettings');
                    }
                }
            }
            // Rotation
            else if (command.command == 'action.devices.commands.RotateAbsolute') {
                if (!me.command_only_rotation) {
                    if (command.params.hasOwnProperty('rotationDegrees')) {
                        const rotationDegrees = command.params['rotationDegrees'];
                        params['rotationDegrees'] = rotationDegrees;
                        executionStates.push('rotationDegrees');
                    }
                    if (command.params.hasOwnProperty('rotationPercent')) {
                        const rotationPercent = command.params['rotationPercent'];
                        params['rotationPercent'] = rotationPercent;
                        executionStates.push('rotationPercent');
                    }
                }
            }
            // Traits
            else if (command.command == 'action.devices.commands.SetToggles') {
                if (!me.command_only_toggles) {
                    if (command.params.hasOwnProperty('updateToggleSettings')) {
                        const updateToggleSettings = command.params['updateToggleSettings'];
                        let current_toggle = me.states['currentToggleSettings'];
                        let toggles = {};
                        this.available_toggles.forEach(function (toggle) {
                            if (typeof updateToggleSettings[toggle.name] === 'boolean') {
                                toggles[toggle.name] = updateToggleSettings[toggle.name];
                            } else {
                                toggles[toggle.name] = current_toggle[toggle.name] || false;
                            }
                        });
                        params['currentToggleSettings'] = toggles;
                        executionStates.push('currentToggleSettings');
                    }
                }
            }
            // Brightness
            else if (command.command == 'action.devices.commands.BrightnessAbsolute') {
                if (!me.command_only_brightness) {
                    const brightness = command.params['brightness'];
                    params['brightness'] = brightness;
                    executionStates.push('brightness');
                }
            }
            else if (command.command == 'action.devices.commands.BrightnessRelative') {
                /*
                let brightness = me.states['brightness'];
                if (command.params.hasOwnProperty('brightnessRelativePercent')) {
                    const brightnessRelativePercent = command.params['brightnessRelativePercent'];
                    brightness = Math.round(brightness * (1 + parseInt(brightnessRelativePercent) / 100));
                }
                if (command.params.hasOwnProperty('brightnessRelativeWeight')) {
                    //const brightnessRelativeWeight = command.params['brightnessRelativeWeight'];
                    brightness = brightness + parseInt(brightnessRelativePercent);
                }
                params['brightness'] = brightness;
                executionStates.push('brightness');
                */
            }
            // ColorSetting
            else if (command.command == 'action.devices.commands.ColorAbsolute') {
                if (!me.command_only_colorsetting) {
                    if (command.params.hasOwnProperty('color')) {
                        if (command.params.color.hasOwnProperty('temperature') || command.params.color.hasOwnProperty('temperatureK')) {
                            const temperature = command.params.color.hasOwnProperty('temperature') ? command.params.color.temperature : command.params.color.temperatureK;
                            params['color'] = { temperatureK: temperature };
                        } else if (command.params.color.hasOwnProperty('spectrumRGB') || command.params.color.hasOwnProperty('spectrumRgb')) {
                            const spectrum_RGB = command.params.color.hasOwnProperty('spectrumRGB') ? command.params.color.spectrumRGB : command.params.color.spectrumRgb;
                            params['color'] = { spectrumRgb: spectrum_RGB };
                        } else if (command.params.color.hasOwnProperty('spectrumHSV') || command.params.color.hasOwnProperty('spectrumHsv')) {
                            const spectrum_HSV = command.params.color.hasOwnProperty('spectrumHSV') ? command.params.color.spectrumHSV : command.params.color.spectrumHsv;
                            params['color'] = {
                                spectrumHsv: {
                                    hue: spectrum_HSV.hue,
                                    saturation: spectrum_HSV.saturation,
                                    value: spectrum_HSV.value
                                }
                            };
                        }
                        executionStates.push('color');
                    }
                }
            }
            // Camera
            else if (command.command == 'action.devices.commands.GetCameraStream') {
                if (command.params.hasOwnProperty('SupportedStreamProtocols')) {
                    const supported_protocols = command.params['SupportedStreamProtocols'];
                    let protocol = '';
                    let stream_url = '';
                    supported_protocols.forEach(function (supported_protocol) {
                        let url = me.getStreamUrl(supported_protocol);
                        if (url) {
                            protocol = supported_protocol;
                            stream_url = url;
                        }
                    });
                    if (protocol.length > 0) {
                        executionStates.push('cameraStreamAccessUrl', 'cameraStreamProtocol');
                        if (me.auth_token.length > 0) {
                            executionStates.push('cameraStreamAuthToken');
                        }
                        const app_id = this.getAppId(protocol);
                        if (app_id.length > 0) {
                            executionStates.push('cameraStreamReceiverAppId');
                        }
                        return {
                            reportState: false,
                            states: {
                                online: true,
                                cameraStreamAccessUrl: stream_url,
                                cameraStreamReceiverAppId: app_id,
                                cameraStreamAuthToken: me.auth_token,
                                cameraStreamProtocol: protocol
                            },
                            executionStates: executionStates,
                        };
                    }
                }
            }

            return ok_result;
        }

        getStreamUrl(protocol_type) {
            switch (protocol_type) {
                case 'hls':
                    return this.hls;
                case 'dash':
                    return this.dash;
                case 'smooth_stream':
                    return this.smooth_stream;
                case 'progressive_mp4':
                    return this.progressive_mp4;
                case 'webrtc':
                    return this.webrtc;
            }
            return '';
        }

        getAppId(protocol_type) {
            switch (protocol_type) {
                case 'hls':
                    return this.hls_app_id;
                case 'dash':
                    return this.dash_app_id;
                case 'smooth_stream':
                    return this.smooth_stream_app_id;
                case 'progressive_mp4':
                    return this.progressive_mp4_app_id;
                case 'webrtc':
                    return this.webrtc_app_id;
            }
            return '';
        }
    }

    RED.nodes.registerType("google-device", DeviceNode);
}
