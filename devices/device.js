/**
 * node-red-contrib-google-smarthome
 * Copyright (C) 2024 Claudio Chimera and others.
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
 */

module.exports = function (RED) {
    "use strict";

    const fs = require('fs');
    const path = require('path');
    const util = require('util');
    const Formats = require('../lib/Formats.js');
    const COOK_SUPPORTED_UNITS = ["UNKNOWN_UNITS", "NO_UNITS", "CENTIMETERS", "CUPS", "DECILITERS", "FEET", "FLUID_OUNCES", "GALLONS", "GRAMS", "INCHES", "KILOGRAMS", "LITERS", "METERS", "MILLIGRAMS", "MILLILITERS", "MILLIMETERS", "OUNCES", "PINCH", "PINTS", "PORTION", "POUNDS", "QUARTS", "TABLESPOONS", "TEASPOONS"];
    const DISPENSE_SUPPORTED_UNITS = ["CENTIMETERS", "CUPS", "DECILITERS", "FLUID_OUNCES", "GALLONS", "GRAMS", "KILOGRAMS", "LITERS", "MILLIGRAMS", "MILLILITERS", "MILLIMETERS", "NO_UNITS", "OUNCES", "PINCH", "PINTS", "PORTION", "POUNDS", "QUARTS", "TABLESPOONS", "TEASPOONS"];
    const ENERGY_STORAGE_UNITS = ['SECONDS', 'MILES', 'KILOMETERS', 'PERCENTAGE', 'KILOWATT_HOURS'];
    const LANGUAGES = ["da", "nl", "en", "fr", "de", "hi", "id", "it", "ja", "ko", "no", "pt-BR", "es", "sv", "th", "zh-TW"];



    /******************************************************************************************************************
     *
     *
     */
    class DeviceNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.device = {};
            this.client = config.client;
            this.name = config.name || config.id;
            this.device_type = config.device_type;
            this.nicknames = config.nicknames;
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

            if (this.device_type !== 'SCENE') {
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

            this.topicOut = config.topic;
            this.passthru = config.passthru;
            this.topic_filter = config.topic_filter || false;
            this.persistent_state = config.persistent_state || false;
            this.room_hint = config.room_hint;

            // AppSelector
            this.appselector_file = config.appselector_file;
            this.appselector_type = config.appselector_type || 'str';
            this.available_applications = [];
            // ArmDisarm
            this.available_arm_levels_file = config.available_arm_levels_file;
            this.available_arm_levels_type = config.available_arm_levels_type || 'str';
            this.arm_levels_ordered = config.arm_levels_ordered || false;
            this.available_arm_levels = [];
            // Brightness
            this.command_only_brightness = config.command_only_brightness;
            // CameraStream
            this.auth_token = (config.auth_token || '').trim();
            this.hls = (config.hls || '').trim();
            this.hls_app_id = (config.hls_app_id || '').trim();
            this.dash = (config.dash || '').trim();
            this.dash_app_id = (config.dash_app_id || '').trim();
            this.smooth_stream = (config.smooth_stream || '').trim();
            this.smooth_stream_app_id = (config.smooth_stream_app_id || '').trim();
            this.progressive_mp4 = (config.progressive_mp4 || '').trim();
            this.progressive_mp4_app_id = (config.progressive_mp4_app_id || '').trim();
            this.webrtc = (config.webrtc || '').trim();
            this.webrtc_offer = (config.webrtc_offer || '').trim();
            this.webrtc_ice_servers = (config.webrtc_ice_servers || '').trim();
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
            this.channel_type = config.channel_type || 'str';
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
            this.food_presets_type = config.food_presets_type || 'str';
            this.food_presets = [];
            // Dispense
            this.supported_dispense_items_file = config.supported_dispense_items_file;
            this.supported_dispense_items_type = config.supported_dispense_items_type || 'str';
            this.supported_dispense_items = [];
            this.supported_dispense_presets_file = config.supported_dispense_presets_file;
            this.supported_dispense_presets_type = config.supported_dispense_presets_type || 'str';
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
            this.available_fan_speeds_type = config.available_fan_speeds_type || 'str';
            this.fan_speeds_ordered = config.fan_speeds_ordered || false;
            this.available_fan_speeds = [];
            // Fill
            this.available_fill_levels_file = config.available_fill_levels_file;
            this.available_fill_levels_type = config.available_fill_levels_type || 'str';
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
            this.inputselector_type = config.inputselector_type || 'str';
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
            this.modes_type = config.modes_type || 'str';
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
            this.toggles_type = config.toggles_type || 'str';
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
            // Secondary User Verification
            this.ct_appselector = config.ct_appselector || '';
            this.pin_appselector = config.pin_appselector || '';
            this.ct_armdisarm = config.ct_armdisarm || '';
            this.pin_armdisarm = config.pin_armdisarm || '';
            this.ct_brightness = config.ct_brightness || '';
            this.pin_brightness = config.pin_brightness || '';
            this.ct_camerastream = config.ct_camerastream || '';
            this.pin_camerastream = config.pin_camerastream || '';
            this.ct_channel = config.ct_channel || '';
            this.pin_channel = config.pin_channel || '';
            this.ct_colorsetting = config.ct_colorsetting || '';
            this.pin_colorsetting = config.pin_colorsetting || '';
            this.ct_cook = config.ct_cook || '';
            this.pin_cook = config.pin_cook || '';
            this.ct_dispense = config.ct_dispense || '';
            this.pin_dispense = config.pin_dispense || '';
            this.ct_dock = config.ct_dock || '';
            this.pin_dock = config.pin_dock || '';
            this.ct_energystorage = config.ct_energystorage || '';
            this.pin_energystorage = config.pin_energystorage || '';
            this.ct_fanspeed = config.ct_fanspeed || '';
            this.pin_fanspeed = config.pin_fanspeed || '';
            this.ct_fill = config.ct_fill || '';
            this.pin_fill = config.pin_fill || '';
            this.ct_humiditysetting = config.ct_humiditysetting || '';
            this.pin_humiditysetting = config.pin_humiditysetting || '';
            this.ct_inputselector = config.ct_inputselector || '';
            this.pin_inputselector = config.pin_inputselector || '';
            this.ct_lighteffects = config.ct_lighteffects || '';
            this.pin_lighteffects = config.pin_lighteffects || '';
            this.ct_locator = config.ct_locator || '';
            this.pin_locator = config.pin_locator || '';
            this.ct_lockunlock = config.ct_lockunlock || '';
            this.pin_lockunlock = config.pin_lockunlock || '';
            this.ct_mediastate = config.ct_mediastate || '';
            this.pin_mediastate = config.pin_mediastate || '';
            this.ct_modes = config.ct_modes || '';
            this.pin_modes = config.pin_modes || '';
            this.ct_networkcontrol = config.ct_networkcontrol || '';
            this.pin_networkcontrol = config.pin_networkcontrol || '';
            this.ct_objectdetection = config.ct_objectdetection || '';
            this.pin_objectdetection = config.pin_objectdetection || '';
            this.ct_onoff = config.ct_onoff || '';
            this.pin_onoff = config.pin_onoff || '';
            this.ct_openclose = config.ct_openclose || '';
            this.pin_openclose = config.pin_openclose || '';
            this.ct_reboot = config.ct_reboot || '';
            this.pin_reboot = config.pin_reboot || '';
            this.ct_rotation = config.ct_rotation || '';
            this.pin_rotation = config.pin_rotation || '';
            this.ct_runcycle = config.ct_runcycle || '';
            this.pin_runcycle = config.pin_runcycle || '';
            this.ct_scene = config.ct_scene || '';
            this.pin_scene = config.pin_scene || '';
            this.ct_sensorstate = config.ct_sensorstate || '';
            this.pin_sensorstate = config.pin_sensorstate || '';
            this.ct_softwareupdate = config.ct_softwareupdate || '';
            this.pin_softwareupdate = config.pin_softwareupdate || '';
            this.ct_startstop = config.ct_startstop || '';
            this.pin_startstop = config.pin_startstop || '';
            this.ct_statusreport = config.ct_statusreport || '';
            this.pin_statusreport = config.pin_statusreport || '';
            this.ct_temperaturecontrol = config.ct_temperaturecontrol || '';
            this.pin_temperaturecontrol = config.pin_temperaturecontrol || '';
            this.ct_temperaturesetting = config.ct_temperaturesetting || '';
            this.pin_temperaturesetting = config.pin_temperaturesetting || '';
            this.ct_timer = config.ct_timer || '';
            this.pin_timer = config.pin_timer || '';
            this.ct_toggles = config.ct_toggles || '';
            this.pin_toggles = config.pin_toggles || '';
            this.ct_transportcontrol = config.ct_transportcontrol || '';
            this.pin_transportcontrol = config.pin_transportcontrol || '';
            this.ct_volume = config.ct_volume || '';
            this.pin_volume = config.pin_volume || '';

            if (this.trait.appselector) {
                if (this.appselector_type !== 'json') {
                    this.available_applications = this.to_available_applications(this.loadJson('Applications', this.appselector_file.replace(/<id>/g, this.id), []));
                } else {
                    this.available_applications = this.to_available_applications(this.parseJson('Applications', this.appselector_file, []));
                }
            }

            if (this.trait.armdisarm) {
                if (this.available_arm_levels_type !== 'json') {
                    this.available_arm_levels = this.to_available_arm_levels(this.loadJson('Available arm levels', this.available_arm_levels_file.replace(/<id>/g, this.id), []));
                } else {
                    this.available_arm_levels = this.to_available_arm_levels(this.parseJson('Available arm levels', this.available_arm_levels_file, []));
                }
            }

            if (this.trait.channel) {
                if (this.channel_type !== 'json') {
                    this.available_channels = this.to_available_channels(this.loadJson('Channels', this.channel_file.replace(/<id>/g, this.id), []));
                } else {
                    this.available_channels = this.to_available_channels(this.parseJson('Channels', this.channel_file, []));
                }
            }

            if (this.trait.cook) {
                if (this.food_presets_type !== 'json') {
                    this.food_presets = this.to_food_presets(this.loadJson('Food presets', this.food_presets_file.replace(/<id>/g, this.id), []));
                } else {
                    this.food_presets = this.to_food_presets(this.parseJson('Food presets', this.food_presets_file, []));
                }
            }

            if (this.trait.dispense) {
                if (this.supported_dispense_items_type !== 'json') {
                    this.supported_dispense_items = this.to_supported_dispense_items(this.loadJson('Supported dispense', this.supported_dispense_items_file.replace(/<id>/g, this.id), []));
                } else {
                    this.supported_dispense_items = this.to_supported_dispense_items(this.parseJson('Supported dispense', this.supported_dispense_items_file, []));
                }
                if (this.supported_dispense_presets_type !== 'json') {
                    this.supported_dispense_presets = this.to_supported_dispense_presets(this.loadJson('Supported dispense presets', this.supported_dispense_presets_file.replace(/<id>/g, this.id), []));
                } else {
                    this.supported_dispense_presets = this.to_supported_dispense_presets(this.parseJson('Supported dispense presets', this.supported_dispense_presets_file, []));
                }
            }

            if (this.trait.fanspeed) {
                if (this.available_fan_speeds_type !== 'json') {
                    this.available_fan_speeds = this.to_available_fan_speeds(this.loadJson('Fan speeds', this.available_fan_speeds_file.replace(/<id>/g, this.id), []));
                } else {
                    this.available_fan_speeds = this.to_available_fan_speeds(this.parseJson('Fan speeds', this.available_fan_speeds_file, []));
                }
            }

            if (this.trait.fill) {
                if (this.available_fill_levels_type !== 'json') {
                    this.available_fill_levels = this.to_available_fill_levels(this.loadJson('Available fill levels', this.available_fill_levels_file.replace(/<id>/g, this.id), []));
                } else {
                    this.available_fill_levels = this.to_available_fill_levels(this.parseJson('Available fill levels', this.available_fill_levels_file, []));
                }
            }

            if (this.trait.inputselector) {
                if (this.inputselector_type !== 'json') {
                    this.available_inputs = this.to_available_inputs(this.loadJson('Available inputs', this.inputselector_file.replace(/<id>/g, this.id), []));
                } else {
                    this.available_inputs = this.to_available_inputs(this.parseJson('Available inputs', this.inputselector_file, []));
                }
            }

            if (this.trait.modes) {
                if (this.modes_type !== 'json') {
                    this.available_modes = this.to_available_modes(this.loadJson('Modes', this.modes_file.replace(/<id>/g, this.id), []));
                } else {
                    this.available_modes = this.to_available_modes(this.parseJson('Modes', this.modes_file, []));
                }
            }

            if (this.trait.toggles) {
                if (this.toggles_type !== 'json') {
                    this.available_toggles = this.to_available_toggles(this.loadJson('Toggles', this.toggles_file.replace(/<id>/g, this.id), []));
                } else {
                    this.available_toggles = this.to_available_toggles(this.parseJson('Toggles', this.toggles_file, []));
                }
            }

            this.updateStateTypesForTraits();

            const default_name = RED._('device.device_type.' + this.device_type);
            const default_name_type = default_name.replace(/[_ ()/]+/g, '-').toLowerCase();
            // Google uses first nickname as the "real" name of the device. Therefore, report device name as the first nickname
            const nicknames = this.nicknames ? [this.name].concat(this.nicknames.split(',')) : [];

            this.states = {
                online: config.online != false
            };
            this.device = {
                id: this.id,
                states: this.states,
                properties: {
                    type: 'action.devices.types.' + this.device_type,
                    traits: this.getTraits(),
                    name: {
                        defaultNames: ["Node-RED " + default_name],
                        name: this.name,
                        nicknames: nicknames,
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
                    },
                    otherDeviceIds: [{ deviceId: this.id }],
                    customData: this.clientConn.app.getCustomData()
                }
            };

            this.updateAttributesForTraits(this.device);
            this.initializeStates(this.device);

            this._debug(".constructor: device = " + JSON.stringify(this.device));

            // GoogleSmartHomeNode -> (client.registerDevice -> DeviceNode.registerDevice), app.registerDevice
            this.clientConn.register(this, 'device');

            this.updateStatusIcon(false);

            this.on('input', this.onInput);
            this.on('close', this.onClose);
            this.clientConn.app.ScheduleRequestSync();
        }

        _debug(msg) {
            msg = 'google-smarthome:DeviceNode[' + this.name + '] ' + msg;
            if (this.clientConn && typeof this.clientConn._debug === 'function') {
                this.clientConn._debug(msg);
            } else {
                this.debug(msg);
            }
        }

        updateStateTypesForTraits() {
            let me = this;
            let state_types = me.state_types;
            state_types['online'] = Formats.BOOL + Formats.MANDATORY;

            if (me.trait.appselector) {
                let values = me.available_applications.map(application => application.key);
                if (values.length > 0) {
                    state_types['currentApplication'] = {
                        type: Formats.STRING + Formats.MANDATORY,
                        values: values,
                        defaultValue: values[0],
                    };
                }
            }
            if (me.trait.armdisarm) {
                let values = me.available_arm_levels.map(al => al.level_name);
                if (values.length > 0) {
                    state_types['isArmed'] = Formats.BOOL + Formats.MANDATORY;
                    state_types['currentArmLevel'] = {
                        type: Formats.STRING + Formats.MANDATORY,
                        values: values,
                        defaultValue: values[0],
                    };
                    state_types['exitAllowance'] = Formats.INT;
                }
            }
            if (me.trait.brightness && !me.command_only_brightness) {
                state_types['brightness'] = {
                    type: Formats.INT,
                    min: 0,
                    max: 100,
                };
            }
            if (me.trait.colorsetting) {
                if (!me.command_only_colorsetting) {
                    if ((me.color_model === "rgb") || (me.color_model === 'rgb_temp')) {
                        state_types['color'] = {
                            type: Formats.OBJECT + Formats.DELETE_MISSING,
                            attributes: {
                                spectrumRgb: {
                                    type: Formats.INT + Formats.MANDATORY,
                                    exclusiveStates: ['temperatureK', 'spectrumHsv']
                                },
                            }
                        };
                    } else if ((me.color_model === "hsv") || (me.color_model === "hsv_temp")) {
                        state_types['color'] = {
                            type: Formats.OBJECT,
                            attributes: {
                                spectrumHsv: {
                                    type: Formats.OBJECT,
                                    attributes: {
                                        hue: {
                                            type: Formats.FLOAT + Formats.MANDATORY,    // float, representing hue as positive degrees in the range of [0.0, 360.0)
                                            min: 0.0,
                                            max: 360.0,
                                        },
                                        saturation: {
                                            type: Formats.FLOAT + Formats.MANDATORY,    // float, representing saturation as a percentage in the range [0.0, 1.0]
                                            min: 0.0,
                                            max: 1.0,
                                        },
                                        value: {
                                            type: Formats.FLOAT + Formats.MANDATORY,    // float, representing value as a percentage in the range [0.0, 1.0]
                                            min: 0.0,
                                            max: 1.0,
                                        },
                                    },
                                    exclusiveStates: ['temperatureK', 'spectrumRgb']
                                },
                            }
                        };
                    } else {
                        state_types['color'] = {
                            type: Formats.OBJECT,
                            attributes: {}
                        };
                    }
                    if (me.color_model !== "rgb" && me.color_model !== "hsv") {
                        state_types.color.attributes.temperatureK = {
                            type: Formats.INT + Formats.MANDATORY,
                            min: me.temperature_min_k,
                            max: me.temperature_max_k,
                            exclusiveStates: ['spectrumRgb', 'spectrumHsv']
                        };
                    }
                }
            }
            if (me.trait.cook) {
                let cooking_mode_values = ['NONE'];
                cooking_mode_values.push(...me.supported_cooking_modes);
                state_types['currentCookingMode'] = {
                    type: Formats.STRING + Formats.MANDATORY,
                    values: cooking_mode_values,
                };
                let food_preset_values = ['NONE'];
                food_preset_values.push(...me.food_presets.map(food_preset => food_preset.food_preset_name));
                state_types['currentFoodPreset'] = {
                    type: Formats.STRING + Formats.MANDATORY,
                    values: food_preset_values,
                };
                state_types['currentFoodQuantity'] = Formats.FLOAT;
                state_types['currentFoodUnit'] = {
                    type: Formats.STRING,
                    values: COOK_SUPPORTED_UNITS,
                };
            }
            if (me.trait.dispense) {
                let dispense_items_values = me.supported_dispense_items.map(item => item.item_name);
                state_types['dispenseItems'] = {
                    type: Formats.OBJECT + Formats.ARRAY,
                    attributes: {
                        itemName: {
                            type: Formats.STRING,
                            value: dispense_items_values,
                        },
                        amountRemaining: {
                            type: Formats.OBJECT,
                            attributes: {
                                amount: Formats.FLOAT,
                                unit: {
                                    type: Formats.STRING,
                                    values: DISPENSE_SUPPORTED_UNITS,
                                },
                            }
                        },
                        amountLastDispensed: {
                            type: Formats.OBJECT,
                            attributes: {
                                amount: Formats.FLOAT,
                                unit: {
                                    type: Formats.STRING,
                                    values: DISPENSE_SUPPORTED_UNITS,
                                },
                            }
                        },
                        isCurrentlyDispensing: Formats.BOOL,
                    },
                    keyId: 'itemName',
                    removeIfNoData: true,
                };
            }
            if (me.trait.dock) {
                state_types['isDocked'] = Formats.BOOL;
            }
            if (me.trait.energystorage) {
                state_types['descriptiveCapacityRemaining'] = Formats.STRING + Formats.MANDATORY;
                state_types['capacityRemaining'] = {
                    type: Formats.OBJECT + Formats.ARRAY,
                    attributes: {
                        rawValue: Formats.INT + Formats.MANDATORY,
                        unit: {
                            type: Formats.STRING + Formats.MANDATORY,
                            values: ENERGY_STORAGE_UNITS,
                            toUpperCase: true,
                            replaceAll: true,
                        },
                    },
                    keyId: "unit",
                    addIfMissing: true,
                    removeIfNoData: true,
                    replaceAll: true,
                    isValidKey: unit => ENERGY_STORAGE_UNITS.includes(unit)
                };
                if (me.is_rechargeable) {
                    state_types['capacityUntilFull'] = {
                        type: Formats.OBJECT + Formats.ARRAY,
                        attributes: {
                            rawValue: Formats.INT + Formats.MANDATORY,
                            unit: {
                                type: Formats.STRING + Formats.MANDATORY,
                                values: ENERGY_STORAGE_UNITS,
                                toUpperCase: true,
                                replaceAll: true,
                            }
                        },
                        keyId: "unit",
                        addIfMissing: true,
                        removeIfNoData: true,
                        replaceAll: true,
                        isValidKey: unit => ENERGY_STORAGE_UNITS.includes(unit)
                    };
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
                        let values = me.available_fan_speeds.map(fanspeed => fanspeed.speed_name);
                        state_types['currentFanSpeedSetting'] = {
                            type: Formats.STRING,
                            values: values,
                            defaultValue: values[0],
                        };
                    }
                }
            }
            if (me.trait.fill) {
                state_types['isFilled'] = Formats.BOOL + Formats.MANDATORY;
                if (me.available_fill_levels.length > 0) {
                    let values = me.available_fill_levels.map(fl => fl.level_name);
                    state_types['currentFillLevel'] = {
                        type: Formats.STRING + Formats.MANDATORY,
                        values: values,
                        defaultValue: values[0],
                    };
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
                    let values = me.available_inputs.map(input => input.key);
                    if (values.length > 0) {
                        state_types['currentInput'] = {
                            type: Formats.STRING + Formats.MANDATORY,
                            values: values,
                        };
                    }
                }
            }
            if (me.trait.lighteffects) {
                let light_effect_value = [''];
                light_effect_value.push(...me.supported_effects);
                if (light_effect_value.length > 0) {
                    state_types['activeLightEffect'] = {
                        type: Formats.STRING + Formats.MANDATORY,
                        values: light_effect_value,
                    };
                    state_types['lightEffectEndUnixTimestampSec'] = Formats.INT;
                }
            }
            // Locator
            if (me.trait.lockunlock) {
                state_types['isLocked'] = Formats.BOOL;
                state_types['isJammed'] = Formats.BOOL;
            }
            if (me.trait.mediastate) {
                state_types['activityState'] = {
                    type: Formats.STRING,
                    values: ["INACTIVE", "STANDBY", "ACTIVE"],
                    upperCase: true,
                };
                state_types['playbackState'] = {
                    type: Formats.STRING,
                    values: ["PAUSED", "PLAYING", "FAST_FORWARDING", "REWINDING", "BUFFERING", "STOPPED"],
                    upperCase: true,
                };
            }
            if (me.trait.modes) {
                if (!me.command_only_modes) {
                    let attributes = {};
                    let ok = false;
                    me.available_modes.forEach(function (mode) {
                        let values = mode.settings.map(setting => setting.setting_name);
                        if (values.length > 0) {
                            ok = true;
                            attributes[mode.name] = {
                                type: Formats.STRING + Formats.MANDATORY,
                                values: values,
                                defaultValue: values[0],
                            };
                        }
                    });
                    if (ok) {
                        state_types['currentModeSettings'] = {
                            type: Formats.OBJECT,
                            attributes: attributes,
                        };
                    }
                }
            }
            if (me.trait.networkcontrol) {
                state_types['networkEnabled'] = Formats.BOOL;
                state_types['networkSettings'] = {
                    type: Formats.OBJECT,
                    attributes: {
                        ssid: Formats.STRING + Formats.MANDATORY
                    }
                };
                state_types['guestNetworkEnabled'] = Formats.BOOL;
                state_types['guestNetworkSettings'] = {
                    type: Formats.OBJECT,
                    attributes: {
                        ssid: Formats.STRING + Formats.MANDATORY
                    }
                };
                state_types['numConnectedDevices'] = Formats.INT;
                state_types['networkUsageMB'] = Formats.FLOAT;
                state_types['networkUsageLimitMB'] = Formats.FLOAT;
                state_types['networkUsageUnlimited'] = Formats.BOOL;
                state_types['lastNetworkDownloadSpeedTest'] = {
                    type: Formats.OBJECT,
                    attributes: {
                        downloadSpeedMbps: Formats.FLOAT,
                        unixTimestampSec: Formats.INT,
                        status: {
                            type: Formats.STRING,
                            values: ['SUCCESS', 'FAILURE'],
                        },
                    }
                };
                state_types['lastNetworkUploadSpeedTest'] = {
                    type: Formats.OBJECT,
                    attributes: {
                        uploadSpeedMbps: Formats.FLOAT,
                        unixTimestampSec: Formats.INT,
                        status: {
                            type: Formats.STRING,
                            values: ['SUCCESS', 'FAILURE'],
                        },
                    }
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
                        state_types['openState'] = {
                            type: Formats.OBJECT + Formats.ARRAY,
                            attributes: {
                                openPercent: Formats.FLOAT + Formats.MANDATORY,
                                openDirection: {
                                    type: Formats.STRING + Formats.MANDATORY,
                                    values: me.open_direction,
                                    upperCase: true,
                                },
                            },
                            keyId: 'openDirection',
                            removeIfNoData: true,
                            replaceAll: false,
                            isValidKey: direction => me.open_direction.includes(direction.trim()) ? direction.trim() : undefined
                        };
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
                state_types['currentRunCycle'] = {
                    type: Formats.OBJECT + Formats.ARRAY,
                    attributes: {
                        currentCycle: Formats.STRING + Formats.MANDATORY,
                        nextCycle: Formats.STRING,
                        lang: {
                            type: Formats.STRING + Formats.MANDATORY,
                            defaultValue: me.lang,
                            values: LANGUAGES,
                        }
                    },
                    keyId: 'lang',
                    addIfMissing: true,
                    removeIfNoData: true,
                    replaceAll: true,
                };
                state_types['currentTotalRemainingTime'] = Formats.INT + Formats.MANDATORY;
                state_types['currentCycleRemainingTime'] = Formats.INT + Formats.MANDATORY;
            }
            // Scene
            if (me.trait.sensorstate) {
                state_types['currentSensorStateData'] = {
                    type: Formats.OBJECT + Formats.ARRAY,
                    attributes: {
                        name: {
                            type: Formats.STRING + Formats.MANDATORY,
                            values: me.sensor_states_supported,
                        },
                        currentSensorState: Formats.STRING,
                        rawValue: Formats.FLOAT
                    },
                    keyId: 'name',
                    addIfMissing: true,
                    removeIfNoData: true,
                    replaceAll: false,
                    isValidKey: name => me.sensor_states_supported.includes(name.trim()) ? name.trim() : undefined
                };
            }
            if (me.trait.softwareupdate) {
                state_types['lastSoftwareUpdateUnixTimestampSec'] = Formats.INT + Formats.MANDATORY;
            }
            if (me.trait.startstop) {
                state_types['isRunning'] = Formats.BOOL + Formats.MANDATORY;
                state_types['isPaused'] = Formats.BOOL;
                state_types['activeZones'] = {
                    type: Formats.STRING + Formats.ARRAY,
                    values: me.available_zones,
                    addIfMissing: true,
                    removeIfNoData: true,
                    replaceAll: true,
                    isValidKey: zone => me.available_zones.includes(zone.trim()) ? zone.trim() : undefined
                };
            }
            if (me.trait.statusreport) {
                state_types['currentStatusReport'] = {
                    type: Formats.OBJECT + Formats.ARRAY,
                    attributes: {
                        blocking: Formats.BOOL,
                        deviceTarget: Formats.STRING,
                        priority: Formats.INT,
                        statusCode: Formats.STRING
                    },
                    keyId: ['deviceTarget', 'statusCode'],
                    addIfMissing: true,
                    removeIfNoData: true,
                    replaceAll: true,
                    isValidKey: nodeId => Object.keys(me.clientConn.getProperties([nodeId])).length > 0 ? nodeId : me.clientConn.getIdFromName(nodeId)
                };
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
                    state_types['thermostatMode'] = {
                        type: Formats.STRING + Formats.MANDATORY,
                        values: me.available_thermostat_modes,
                    };
                    state_types['thermostatTemperatureAmbient'] = Formats.FLOAT + Formats.MANDATORY;
                    state_types['thermostatTemperatureSetpoint'] = {       // 0 One of
                        type: Formats.FLOAT + Formats.MANDATORY,
                        exclusiveStates: ['thermostatTemperatureSetpointLow', 'thermostatTemperatureSetpointHigh'],
                    };
                    state_types['thermostatTemperatureSetpointHigh'] = {   // 1 One of
                        type: Formats.FLOAT + Formats.MANDATORY,
                        exclusiveStates: ['thermostatTemperatureSetpoint'],
                    };
                    state_types['thermostatTemperatureSetpointLow'] = {   // 1 One of
                        type: Formats.FLOAT + Formats.MANDATORY,
                        exclusiveStates: ['thermostatTemperatureSetpoint'],
                    };
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
                    let attributes = {};
                    me.available_toggles.forEach(function (toggle) {
                        attributes[toggle.name] = Formats.BOOL + Formats.MANDATORY;
                    });
                    state_types['currentToggleSettings'] = {
                        type: Formats.OBJECT,
                        attributes: attributes,
                    };
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
                    itemName: item.preset_name,
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
            return dispense;
        }

        /**
         * Initializes states to their default values.
         *
         * @returns {Object}
         */
        initializeStates(device) {
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
                states['currentFoodPreset'] = "NONE";
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
                    this.updateModesState(device);
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
                    states['thermostatMode'] = me.available_thermostat_modes.length > 0 ? me.available_thermostat_modes[0] : "";
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
                    this.updateTogglesState(device);
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

        updateStatusIcon(is_local) {
            const me = this;
            let text = '';
            let fill = 'red';
            let shape = 'dot';
            if (me.states.online) {
                if (me.trait.scene) {
                    text = 'OK';
                    fill = 'green';
                }
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
                    const st = " T: " + (me.states.thermostatTemperatureAmbient || '?') + "°C | S: " + (me.states.thermostatTemperatureSetpoint || '?') + "\xB0C";
                    if (thermostat_mode === "off") {
                        text = "OFF " + st;
                    } else if (thermostat_mode === "heat" || thermostat_mode === "cool") {
                        fill = "green";
                        text = thermostat_mode.substring(0, 1).toUpperCase() + st;
                    } else if (thermostat_mode === "heatcool") {
                        fill = "green";
                        text = "H/C T: " + (me.states.thermostatTemperatureAmbient || '?') + "°C | S: [" + (me.states.thermostatTemperatureSetpointLow || '') + " - " + (me.states.thermostatTemperatureSetpointHigh || '') + "]\xB0C";
                    } else {
                        fill = "green";
                        text = thermostat_mode.substring(0, 1).toUpperCase() + st;
                    }
                    if (me.states.thermostatHumidityAmbient !== undefined) {
                        text += ' ' + me.states.thermostatHumidityAmbient + "%";
                    }
                }
                if (me.trait.energystorage) {
                    text += ' ' + me.states.descriptiveCapacityRemaining;
                }
                if (me.trait.armdisarm) {
                    if (me.states.isArmed) {
                        if (me.states.currentArmLevel) {
                            text += ' ' + me.states.currentArmLevel;
                        }
                    } else {
                        text += ' DISARMED';
                    }
                }
                if (me.trait.fanspeed) {
                    if (typeof me.states.currentFanSpeedPercent === 'number') {
                        text += ' ' + me.states.currentFanSpeedPercent + '%';
                    }
                    if (typeof me.states.currentFanSpeedSetting === 'string') {
                        text += ' ' + me.states.currentFanSpeedSetting;
                    }
                }
                if (me.trait.sensorstate) {
                    if (Array.isArray(me.states.currentSensorStateData)) {
                        me.states.currentSensorStateData.forEach(sensor => {
                            const currentSensorStateSet = sensor.currentSensorState !== undefined && sensor.currentSensorState !== 'unknown';
                            if (currentSensorStateSet || sensor.rawValue !== undefined) {
                                text += ' ' + sensor.name;
                                if (currentSensorStateSet) {
                                    text += ' ' + sensor.currentSensorState;
                                }
                                if (sensor.rawValue !== undefined) {
                                    text += ' ' + sensor.rawValue;
                                }
                            }
                        });
                    }
                }
                if (me.trait.lockunlock) {
                    if (me.states.isJammed) {
                        text += ' JAMMED';
                    } else if (typeof me.states.isLocked === 'boolean') {
                        text += me.states.isLocked ? ' LOCKED' : ' UNLOCKED';
                    }
                }
            } else {
                shape = 'ring';
                text = "offline";
            }
            if (!text) {
                text = 'Unknown';
            }
            if (is_local) {
                shape = 'ring';
            }
            me.status({ fill: fill, shape: shape, text: text });
        }

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        updated(g_command, exe_result, is_local) {
            const me = this;
            let command = g_command.command.startsWith('action.devices.commands.') ? g_command.command.substr(24) : g_command.command;
            let params = exe_result.params || {};
            me._debug(".updated: g_command = " + JSON.stringify(g_command));
            me._debug(".updated: exe_result = " + JSON.stringify(exe_result));

            const modified = me.updateState(params);
            if (modified) {
                if (me.persistent_state) {
                    me.clientConn.app.ScheduleGetState();
                }
            }

            me.updateStatusIcon(is_local);

            let msg = {
                device_name: me.device.properties.name.name,
                command: command,
                params: g_command.params,
                payload: {},
            };

            if (me.topicOut)
                msg.topic = me.topicOut;

            // Copy the device state to the payload
            me.cloneObject(msg.payload, me.states, me.state_types);

            // Copy the exe_result params to the payload
            if (exe_result.params) {
                Object.keys(exe_result.params).forEach(function (key) {
                    if (!Object.prototype.hasOwnProperty.call(msg.payload, key) && !exe_result.executionStates.includes(key)) {
                        msg.payload[key] = exe_result.params[key];
                    }
                });
            }

            // Copy the command original params to the payload
            /*Object.keys(original_params).forEach(function (key) {
                if (!Object.prototype.hasOwnProperty.call(msg.payload, key)) {
                   msg.payload[key] = original_params[key];
                }
            });*/

            me.send(msg);
        }

        /**
         * respond to inputs from NodeRED
         *
         * @param {object} msgi - The incoming message
         * @param {Function} send - Function to send outgoing messages
         * @param {Function} done - Function to inform the runtime that this node has finished its operation
         */
        onInput(msgi, send, done) {
            const me = this;
            if(!send) send = function() { me.send.apply(me, arguments) };
            let msg = msgi;
            if (me.topic_filter && !(msg.topic || '').toString().startsWith(me.topicOut)) {
                if(done) done();
                return;
            }
            me._debug(".input: topic = " + msg.topic);

            let upper_topic = '';
            if (msg.topic) {
                let topicArr = String(msg.topic).split(me.topicDelim);
                let topic = topicArr[topicArr.length - 1].trim();   // get last part of topic
                upper_topic = topic.toUpperCase();
            }

            try {
                if (upper_topic === 'GETSTATE') {
                    let states = {};
                    me.cloneObject(states, me.states, me.state_types);
                    send({
                        topic: msg.topic,
                        payload: states,
                        device_id: me.device.id
                    });
                } else if (upper_topic === 'ERRORCODE') {
                    if (typeof msg.payload === 'string' && msg.payload.trim()) {
                        me.errorCode = msg.payload.trim();
                    } else {
                        me.errorCode = undefined;
                    }
                } else if (upper_topic === 'AVAILABLEAPPLICATIONS') {
                    if (me.trait.appselector) {
                        if (me.appselector_type === 'str') {
                            const filename = me.appselector_file.replace(/<id>/g, me.id);
                            if (typeof msg.payload !== 'undefined') {
                                me.available_applications = me.to_available_applications(msg.payload);
                                me.writeJson('Applications', filename, me.available_applications);
                            } else {
                                me.available_applications = me.to_available_applications(me.loadJson('Applications', filename, []));
                            }
                        } else {
                            if (typeof msg.payload !== 'undefined') {
                                me.available_applications = me.to_available_applications(msg.payload);
                            }
                        }
                        me.device.properties.attributes.availableApplications = me.available_applications;
                        me.updateStateTypesForTraits();
                        me.clientConn.app.ScheduleRequestSync();
                    } else {
                        me.error("Got AVAILABLEAPPLICATIONS message, but AppSelector trait is disabled");
                    }
                } else if (upper_topic === 'AVAILABLEARMLEVELS') {
                    if (me.trait.armdisarm) {
                        if (me.available_arm_levels_type === 'str') {
                            const filename = me.available_arm_levels_file.replace(/<id>/g, me.id)
                            if (typeof msg.payload !== 'undefined') {
                                me.available_arm_levels = me.to_available_arm_levels(msg.payload);
                                me.writeJson('Arm levels', filename, me.available_arm_levels);
                            } else {
                                me.available_arm_levels = me.to_available_arm_levels(me.loadJson('Arm levels', filename, []));
                            }
                        } else {
                            if (typeof msg.payload !== 'undefined') {
                                me.available_arm_levels = me.to_available_arm_levels(msg.payload);
                            }
                        }
                        me.device.properties.attributes.availableArmLevels.levels = me.available_arm_levels;
                        me.updateStateTypesForTraits();
                        me.clientConn.app.ScheduleRequestSync();
                    } else {
                        me.error("Got AVAILABLEARMLEVELS message, but ArmDisarm trait is disabled");
                    }
                } else if (upper_topic === 'AVAILABLECHANNELS') {
                    if (me.trait.channel) {
                        if (me.channel_type === 'str') {
                            const filename = me.channel_file.replace(/<id>/g, me.id);
                            if (typeof msg.payload !== 'undefined') {
                                me.available_channels = me.to_available_channels(msg.payload);
                                me.writeJson('Channels', filename, me.available_channels);
                            } else {
                                me.available_channels = me.to_available_channels(me.loadJson('Channels', filename, []));
                            }
                        } else {
                            if (typeof msg.payload !== 'undefined') {
                                me.available_channels = [];
                            }
                        }
                        me.device.properties.attributes.availableChannels = me.available_channels;
                        me.updateStateTypesForTraits();
                        me.clientConn.app.ScheduleRequestSync();
                    } else {
                        me.error("Got AVAILABLECHANNELS message, but Channel trait is disabled");
                    }
                } else if (upper_topic === 'SUPPORTEDDISPENSEITEMS') {
                    if (me.trait.dispense) {
                        if (me.supported_dispense_items_type === 'str') {
                            const filename = me.supported_dispense_items_file.replace(/<id>/g, me.id);
                            if (typeof msg.payload !== 'undefined') {
                                me.supported_dispense_items = me.to_supported_dispense_items(msg.payload);
                                me.writeJson('Dispense items', filename, me.supported_dispense_items);
                            } else {
                                me.supported_dispense_items = me.to_supported_dispense_items(me.loadJson('Dispense items', filename, []));
                            }
                        } else {
                            if (typeof msg.payload !== 'undefined') {
                                me.supported_dispense_items = me.to_supported_dispense_items(msg.payload);
                            }
                        }
                        me.device.properties.attributes.supportedDispenseItems = me.supported_dispense_items;
                        me.states['dispenseItems'] = me.getDispenseNewState();
                        me.updateStateTypesForTraits();
                        me.clientConn.app.ScheduleRequestSync();
                    } else {
                        me.error("Got SUPPORTEDDISPENSEITEMS message, but Dispense trait is disabled");
                    }
                } else if (upper_topic === 'SUPPORTEDDISPENSEPRESETS') {
                    if (me.trait.dispense) {
                        if (me.supported_dispense_presets_type === 'str') {
                            const filename = me.supported_dispense_presets_file.replace(/<id>/g, me.id);
                            if (typeof msg.payload !== 'undefined') {
                                me.supported_dispense_presets = me.to_supported_dispense_presets(msg.payload);
                                me.writeJson('Dispense presets', filename, me.supported_dispense_presets);
                            } else {
                                me.supported_dispense_presets = me.to_supported_dispense_presets(me.loadJson('Dispense presets', filename, []));
                            }
                        } else {
                            if (typeof msg.payload !== 'undefined') {
                                me.supported_dispense_presets = me.to_supported_dispense_presets(msg.payload);
                            }
                        }
                        me.device.properties.attributes.supportedDispensePresets = me.supported_dispense_presets;
                        me.states['dispenseItems'] = me.getDispenseNewState();
                        me.updateStateTypesForTraits();
                        me.clientConn.app.ScheduleRequestSync();
                    } else {
                        me.error("Got SUPPORTEDDISPENSEPRESETS message, but Dispense trait is disabled");
                    }
                } else if (upper_topic === 'AVAILABLEFANSPEEDS') {
                    if (me.trait.fanspeed) {
                        if (me.available_fan_speeds_type === 'str') {
                            const filename = me.available_fan_speeds_file.replace(/<id>/g, me.id);
                            if (typeof msg.payload !== 'undefined') {
                                me.available_fan_speeds = me.to_available_fan_speeds(msg.payload);
                                me.writeJson('Fan speeds', filename, me.available_fan_speeds);
                            } else {
                                me.available_fan_speeds = me.to_available_fan_speeds(me.loadJson('Fan speeds', filename, []));
                            }
                        } else {
                            if (typeof msg.payload !== 'undefined') {
                                me.available_fan_speeds = me.to_available_fan_speeds(msg.payload);
                            }
                        }
                        me.device.properties.attributes.availableFanSpeeds.speeds = me.available_fan_speeds;
                        me.updateStateTypesForTraits();
                        me.clientConn.app.ScheduleRequestSync();
                    } else {
                        me.error("Got AVAILABLEFANSPEEDS message, but FanSpeed trait is disabled");
                    }
                } else if (upper_topic === 'AVAILABLEFILLLEVELS') {
                    if (me.trait.dispense) {
                        if (me.available_fill_levels_type === 'str') {
                            const filename = me.available_fill_levels_file.replace(/<id>/g, me.id);
                            if (typeof msg.payload !== 'undefined') {
                                me.available_fill_levels = me.to_available_fill_levels(msg.payload);
                                me.writeJson(' Fill levels', filename, me.available_fill_levels);
                            } else {
                                me.available_fill_levels = me.to_available_fill_levels(me.loadJson(' Fill levels', filename, []));
                            }
                        } else {
                            if (typeof msg.payload !== 'undefined') {
                                me.available_fill_levels = me.to_available_fill_levels(msg.payload);
                            }
                        }
                        me.device.properties.attributes.availableFillLevels.levels = me.available_fill_levels;
                        me.updateStateTypesForTraits();
                        me.clientConn.app.ScheduleRequestSync();
                    } else {
                        me.error("Got AVAILABLEFILLLEVELS message, but Fill trait is disabled");
                    }
                } else if (upper_topic === 'AVAILABLEFOODPRESETS') {
                    if (me.trait.cook) {
                        if (me.food_presets_type === 'str') {
                            const filename = me.food_presets_file.replace(/<id>/g, me.id);
                            if (typeof msg.payload !== 'undefined') {
                                me.food_presets = me.to_food_presets(msg.payload);
                                me.writeJson('Food presets', filename, me.food_presets);
                            } else {
                                me.food_presets = me.to_food_presets(me.loadJson('Food presets', filename, []));
                            }
                        } else {
                            if (typeof msg.payload !== 'undefined') {
                                me.food_presets = me.to_food_presets(msg.payload);
                            }
                        }
                        me.device.properties.attributes.foodPresets = me.food_presets;
                        me.updateStateTypesForTraits();
                        me.clientConn.app.ScheduleRequestSync();
                    } else {
                        me.error("Got AVAILABLEFOODPRESETS message, but Cook trait is disabled");
                    }
                } else if (upper_topic === 'AVAILABLEINPUTS') {
                    if (me.trait.inputselector) {
                        if (me.inputselector_type === 'json') {
                            const filename = me.inputselector_file.replace(/<id>/g, me.id)
                            if (typeof msg.payload !== 'undefined') {
                                me.available_inputs = me.to_available_inputs(msg.payload);
                                me.writeJson('Inputs', filename, me.available_inputs);
                            } else {
                                me.available_inputs = me.to_available_inputs(me.loadJson('Inputs', filename, []));
                            }
                        } else {
                            if (typeof msg.payload !== 'undefined') {
                                me.available_inputs = me.to_available_inputs(msg.payload);
                            }
                        }
                        me.device.properties.attributes.availableInputs = me.available_inputs;
                        me.updateStateTypesForTraits();
                        me.clientConn.app.ScheduleRequestSync();
                    } else {
                        me.error("Got AVAILABLEINPUTS message, but InputSelector trait is disabled");
                    }
                } else if (upper_topic === 'AVAILABLEMODES') {
                    if (me.trait.modes) {
                        if (me.modes_type !== 'json') {
                            const filename = me.modes_file.replace(/<id>/g, me.id);
                            if (typeof msg.payload !== 'undefined') {
                                me.available_modes = me.to_available_modes(msg.payload);
                                me.writeJson('Modes', filename, me.available_modes);
                            } else {
                                me.available_modes = me.to_available_modes(me.loadJson('Modes', filename, []));
                            }
                        } else {
                            if (typeof msg.payload !== 'undefined') {
                                me.available_modes = me.to_available_modes(msg.payload);
                            }
                        }
                        me.device.properties.attributes.availableModes = me.available_modes;
                        me.updateStateTypesForTraits();
                        me.updateModesState(me);
                        me.clientConn.app.ScheduleRequestSync();
                    } else {
                        me.error("Got AVAILABLEMODES message, but Modes trait is disabled");
                    }
                } else if (upper_topic === 'AVAILABLETOGGLES') {
                    if (me.trait.toggles) {
                        if (me.toggles_type === 'str') {
                            const filename = me.toggles_file.replace(/<id>/g, me.id);
                            if (typeof msg.payload !== 'undefined') {
                                me.available_toggles = me.to_available_toggles(msg.payload);
                                me.writeJson('Toggles', filename, me.available_toggles);
                            } else {
                                me.available_toggles = me.to_available_toggles(me.loadJson('Toggles', filename, []));
                            }
                        } else {
                            if (typeof msg.payload !== 'undefined') {
                                me.available_toggles = me.to_available_toggles(msg.payload);
                            }
                        }
                        me.device.properties.attributes.availableToggles = me.available_toggles;
                        me.updateStateTypesForTraits();
                        me.updateTogglesState(me);
                        me.clientConn.app.ScheduleRequestSync();
                    } else {
                        me.error("Got AVAILABLETOGGLES message, but Toggles trait is disabled");
                    }
                } else if (upper_topic === 'CAMERASTREAMAUTHTOKEN') {
                    const auth_token = Formats.formatValue('cameraStreamAuthToken', msg.payload, Formats.STRING, '');
                    if (auth_token != me.auth_token) {
                        me.auth_token = auth_token;
                        if (Object.prototype.hasOwnProperty.call(me.device.properties.attributes, "cameraStreamNeedAuthToken")) {
                            let cameraStreamNeedAuthToken = me.device.properties.attributes.cameraStreamNeedAuthToken;
                            if (cameraStreamNeedAuthToken != (auth_token.length > 0)) {
                                me.device.properties.attributes['cameraStreamNeedAuthToken'] = auth_token.length > 0;
                                me.clientConn.app.ScheduleRequestSync();
                            }
                        }
                    }
                } else if (upper_topic === 'GUESTNETWORKPASSWORD') {
                    me.guest_network_password = Formats.formatValue('guestNetworkPassword', msg.payload, Formats.STRING);
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
                    me.clientConn.sendNotifications(me, {
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
                    me.clientConn.sendNotifications(me, {
                        RunCycle: payload
                    });  // tell Google ...
                } else if (me.trait.sensorstate && upper_topic === 'SENSORSTATE') {
                    if (typeof msg.payload.name === 'string' && msg.payload.name.trim() && me.sensor_states_supported.includes(msg.payload.name.trim())) {
                        let payload = { priority: 0 };
                        payload.name = msg.payload.name.trim();
                        if (typeof msg.payload.currentSensorState === 'string' && msg.payload.currentSensorState.trim()) {
                            payload.currentSensorState = msg.payload.currentSensorState.trim();
                            me.clientConn.sendNotifications(me, {
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
                    me.clientConn.sendNotifications(me, {
                        LockUnlock: {
                            priority: 0,
                            followUpResponse: payload
                        }
                    });  // tell Google ...
                } else if (me.trait.networkcontrol && upper_topic === 'NETWORKCONTROL') {
                    me.clientConn.sendNotifications(me, {
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
                    me.clientConn.sendNotifications(me, {
                        OpenClose: {
                            priority: 0,
                            followUpResponse: payload
                        }
                    });  // tell Google ...
                } else if (me.trait.statusreport && upper_topic === 'STATUSREPORT') {
                    // Update or Add reports based on deviceTarget and statusCode
                    let payload = Array.isArray(msg.payload) ? msg.payload : [msg.payload];
                    let new_payload = [];
                    const status_report_type = me.state_types['currentStatusReport'].attributes;
                    if (typeof me.states.currentStatusReport !== 'undefined') {
                        me.states.currentStatusReport.forEach(report => {
                            let new_report = { priority: 0 };
                            me.cloneObject(new_report, report, status_report_type);
                            new_payload.push(new_report);
                        });
                    }
                    let differs = false;
                    payload.forEach(sr => {
                        let nodeId;
                        if (sr.deviceTarget) {
                            let properties = me.clientConn.getProperties([sr.deviceTarget]);
                            if (Object.keys(properties).length > 0) {
                                nodeId = sr.deviceTarget;
                            } else {
                                nodeId = me.clientConn.getIdFromName(sr.deviceTarget);
                            }
                        } else {
                            nodeId = me.device.id;
                        }
                        if (nodeId) {
                            let new_report = {};
                            me.cloneObject(new_report, sr, status_report_type);
                            if (new_report.statusCode) {
                                new_report.deviceTarget = nodeId;
                                let cur_reports = new_payload.filter(report => report.deviceTarget === nodeId && report.statusCode === new_report.statusCode);
                                if (cur_reports.length > 0) {
                                    if (me.cloneObject(cur_reports[0], new_report, status_report_type)) {
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
                        me.clientConn.reportState(me.id);  // tell Google ...
                        if (me.persistent_state) {
                            me.clientConn.app.ScheduleGetState();
                        }
                        // if (me.passthru) {
                        //     msg.payload = new_payload;
                        //     me.send(msg);
                        // }
                    }
                } else if (upper_topic === 'SETCHALLENGEPIN') {
                    const pin = String(msg.payload.pin || '');
                    switch (msg.payload.command) {
                        case 'action.devices.commands.appInstall':
                        case 'action.devices.commands.appSearch':
                        case 'action.devices.commands.appSelect':
                            me.pin_appselector = pin;
                            break;
                        case 'action.devices.commands.ArmDisarm':
                            me.pin_armdisarm = pin;
                            break;
                        case 'action.devices.commands.BrightnessAbsolute':
                        case 'action.devices.commands.BrightnessRelative':
                            me.pin_brightness = pin;
                            break;
                        case 'action.devices.commands.GetCameraStream':
                            me.pin_camerastream = pin;
                            break;
                        case 'action.devices.commands.selectChannel':
                        case 'action.devices.commands.relativeChannel':
                        case 'action.devices.commands.returnChannel':
                            me.pin_channel = pin;
                            break;
                        case 'action.devices.commands.ColorAbsolute':
                            me.pin_colorsetting = pin;
                            break;
                        case 'action.devices.commands.Cook':
                            me.pin_cook = pin;
                            break;
                        case 'action.devices.commands.Dispense':
                            me.pin_dispense = pin;
                            break;
                        case 'action.devices.commands.Dock':
                            me.pin_dock = pin;
                            break;
                        case 'action.devices.commands.Charge':
                            me.pin_energystorage = pin;
                            break;
                        case 'action.devices.commands.SetFanSpeed':
                        case 'action.devices.commands.SetFanSpeedRelative':
                        case 'action.devices.commands.Reverse':
                            me.pin_fanspeed = pin;
                            break;
                        case 'action.devices.commands.Fill':
                            me.pin_fill = pin;
                            break;
                        case 'action.devices.commands.SetHumidity':
                        case 'action.devices.commands.HumidityRelative':
                            me.pin_humiditysetting = pin;
                            break;
                        case 'action.devices.commands.SetInput':
                        case 'action.devices.commands.NextInput':
                        case 'action.devices.commands.PreviousInput':
                            me.pin_inputselector = pin;
                            break;
                        case 'action.devices.commands.ColorLoop':
                        case 'action.devices.commands.Sleep':
                        case 'action.devices.commands.StopEffect':
                        case 'action.devices.commands.Wake':
                            me.pin_colorsetting = pin;
                            break;
                        case 'action.devices.commands.Locate':
                            me.pin_locator = pin;
                            break;
                        case 'action.devices.commands.LockUnlock':
                            me.pin_lockunlock = pin;
                            break;
                        case 'action.devices.commands.SetModes':
                            me.pin_modes = pin;
                            break;
                        case 'action.devices.commands.EnableDisableGuestNetwork':
                        case 'action.devices.commands.EnableDisableNetworkProfile':
                        case 'action.devices.commands.GetGuestNetworkPassword':
                        case 'action.devices.commands.TestNetworkSpeed':
                            me.pin_networkcontrol = pin;
                            break;
                        case 'action.devices.commands.OnOff':
                            me.pin_onoff = pin;
                            break;
                        case 'action.devices.commands.OpenClose':
                        case 'action.devices.commands.OpenCloseRelative':
                            me.pin_openclose = pin;
                            break;
                        case 'action.devices.commands.Reboot':
                            me.pin_reboot = pin;
                            break;
                        case 'action.devices.commands.RotateAbsolute':
                            me.pin_rotation = pin;
                            break;
                        case 'action.devices.commands.ActivateScene':
                            me.pin_scene = pin;
                            break;
                        case 'action.devices.commands.SoftwareUpdate':
                            me.pin_softwareupdate = pin;
                            break;
                        case 'action.devices.commands.StartStop':
                        case 'action.devices.commands.PauseUnpause':
                            me.pin_startstop = pin;
                            break;
                        case 'action.devices.commands.SetTemperature':
                            me.pin_temperaturecontrol = pin;
                            break;
                        case 'action.devices.commands.ThermostatTemperatureSetpoint':
                        case 'action.devices.commands.ThermostatTemperatureSetRange':
                        case 'action.devices.commands.ThermostatSetMode':
                        case 'action.devices.commands.TemperatureRelative':
                            me.pin_temperaturesetting = pin;
                            break;
                        case 'action.devices.commands.TimerStart':
                        case 'action.devices.commands.TimerAdjust':
                        case 'action.devices.commands.TimerPause':
                        case 'action.devices.commands.TimerResume':
                        case 'action.devices.commands.TimerCancel':
                            me.pin_timer = pin;
                            break;
                        case 'action.devices.commands.SetToggles':
                            me.pin_toggles = pin;
                            break;
                        case 'action.devices.commands.mediaStop':
                        case 'action.devices.commands.mediaNext':
                        case 'action.devices.commands.mediaPrevious':
                        case 'action.devices.commands.mediaPause':
                        case 'action.devices.commands.mediaResume':
                        case 'action.devices.commands.mediaSeekRelative':
                        case 'action.devices.commands.mediaSeekToPosition':
                        case 'action.devices.commands.mediaRepeatMode':
                        case 'action.devices.commands.mediaShuffle':
                        case 'action.devices.commands.mediaClosedCaptioningOn':
                        case 'action.devices.commands.mediaClosedCaptioningOff':
                            me.pin_transportcontrol = pin;
                            break;
                        case 'action.devices.commands.mute':
                        case 'action.devices.commands.setVolume':
                        case 'action.devices.commands.volumeRelative':
                            me.pin_volume = pin;
                            break;
                    }
                } else {
                    let state_key = '';
                    Object.keys(me.state_types).forEach(function (key) {
                        if (upper_topic === key.toUpperCase()) {
                            state_key = key;
                            me._debug(".input: found state " + state_key);
                        }
                    });

                    if (state_key !== '') {
                        let payload = {};
                        payload[state_key] = msg.payload;
                        msg = {
                            payload: payload
                        };
                    } else {
                        me._debug(".input: some other topic");
                    }
                    const differs = me.updateState(msg.payload || {});

                    if (differs) {
                        if (msgi.stateOutput) {
                            let states = {};
                            me.cloneObject(states, me.states, me.state_types);
                            send({ topic: me.topicOut, payload: states });
                        }
                        me.clientConn.reportState(me.id);  // tell Google ...
                        if (me.persistent_state) {
                            me.clientConn.app.ScheduleGetState();
                        }
                        me.updateStatusIcon(false);
                    }
                    if (me.passthru) {
                        send(msgi);
                    }

                    if(done) done();
                }
            } catch (err) {
                if(done)
                    done(err);
                else
                    me.error(err);
            }
        }

        /**
         * Called by the runtime when this node is being removed or restarted
         *
         * @param {boolean} removed - true if the is being removed, false on restart
         * @param {Function} done - Function to inform the runtime that this node has finished its operation
         */
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

        updateTogglesState(device) {
            // Key/value pair with the toggle name of the device as the key, and the current state as the value.
            const me = this;
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

        updateModesState(device) {
            // Key/value pair with the mode name of the device as the key, and the current setting_name as the value.
            const me = this;
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

        getTraits() {
            const me = this;
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

        //
        //
        //
        //
        updateState(from_states) {
            const me = this;
            let modified = [];
            // me._debug("CCHI updateState state_types " + JSON.stringify(me.state_types));
            me._debug('updateState current state ' + JSON.stringify(me.states));
            Object.keys(me.state_types).forEach(key => {
                if (Object.prototype.hasOwnProperty.call(from_states, key)) {
                    // console.log("CCHI found key " + key);
                    let o_modified = me.setState(key, from_states[key], me.states, me.state_types[key]);
                    if (o_modified) {
                        me._debug('.updateState set "' + key + '" to ' + JSON.stringify(from_states[key]));
                        modified.push(o_modified);
                    }
                    // console.log("CCHI set " + key + " val " + JSON.stringify(current_state[key]));
                }
                // else console.log("CCHI NOT found key " + key);
            });
            let thermostat_modified = false;
            if (modified.includes("thermostatTemperatureSetpoint")) {
                me.thermostat_temperature_setpoint = me.states.thermostatTemperatureSetpoint;
                thermostat_modified = true;
            }
            if (modified.includes("thermostatTemperatureSetpointLow")) {
                me.thermostat_temperature_setpoint_low = me.states.thermostatTemperatureSetpointLow;
                thermostat_modified = true;
            }
            if (modified.includes("thermostatTemperatureSetpointHigh")) {
                me.thermostat_temperature_setpoint_hight = me.states.thermostatTemperatureSetpointHigh;
                thermostat_modified = true;
            }
            if (thermostat_modified | modified.includes("thermostatMode")) {
                let keys_to_update = [];
                if (me.states.thermostatMode === 'heatcool') {
                    keys_to_update = ['thermostatTemperatureSetpointLow', 'thermostatTemperatureSetpointHigh'];
                    from_states = {
                        thermostatTemperatureSetpointLow: me.thermostat_temperature_setpoint_low,
                        thermostatTemperatureSetpointHigh: me.thermostat_temperature_setpoint_hight
                    };
                } else {
                    keys_to_update = ['thermostatTemperatureSetpoint'];
                    from_states = {
                        thermostatTemperatureSetpoint: me.thermostat_temperature_setpoint
                    };
                }
                keys_to_update.forEach(key => {
                    if (me.setState(key, from_states[key], me.states, me.state_types[key])) {
                        me._debug('.updateState: set "' + key + '" to ' + JSON.stringify(me.states[key]));
                        modified.push(key);
                    }
                });
            }
            me._debug('.updateState: new State ' + JSON.stringify(modified) + ' = ' + JSON.stringify(me.states));
            return modified;
        }

        //
        //
        //
        //
        cloneObject(to_obj, from_obj, state_values) {
            const me = this;
            let differs = false;
            Object.keys(state_values).forEach(function (key) {
                const value_type = typeof state_values[key] === 'number' ? state_values[key] : state_values[key].type;
                const default_value_defined = typeof state_values[key].defaultValue !== 'undefined';
                const new_value = typeof from_obj[key] !== 'undefined' ? from_obj[key] : state_values[key].defaultValue;
                if ((typeof from_obj[key] !== 'undefined' && from_obj[key] != null) || default_value_defined) {
                    if (me.setState(key, new_value, to_obj, state_values[key] || {})) {
                        differs = true;
                    }
                } else if (!(value_type & Formats.MANDATORY)) {
                    delete to_obj[key];
                }
            });
            return differs;
        }

        //
        //
        //
        //
        setState(key, value, state, state_type) {
            const me = this;
            let differs = false;
            let old_state = typeof state === 'object' ? state[key] : {};
            let new_state = undefined;
            if (typeof state_type === 'number') {
                state_type = {
                    type: state_type
                };
            }
            const exclusive_states = state_type.exclusiveStates || [];
            // console.log("CCHI ---> setState key " + JSON.stringify(key) + " v " + JSON.stringify(value) + " ov " + JSON.stringify(old_state) + " st " + JSON.stringify(state_type) + " ex " + JSON.stringify(exclusive_states));

            if (value == null) {
                if (state_type.type & Formats.MANDATORY) {
                    me.error("key " + key + " is mandatory.");
                } else if (Object.prototype.hasOwnProperty.call(state, key)) {
                    delete state[key];
                    differs = key;
                }
            } else if (state_type.type & Formats.ARRAY) {
                if (!Array.isArray(value)) {
                    value = [value];
                }
                // checks array
                if (!(state_type.type & Formats.OBJECT)) {
                    let new_arr = [];
                    let old_arr = Array.isArray(old_state) ? old_state : [];
                    const allowed_values = state_type.values;
                    value.forEach((elm, idx) => {
                        let new_val = Formats.formatValue(key + '[' + idx + ']', elm, state_type.type & Formats.PRIMITIVE);
                        if (state_type.upperCase && new_val) {
                            new_val = new_val.toUpperCase();
                        }
                        if (new_val !== undefined && new_val !== null && (allowed_values === undefined || allowed_values.includes(new_val))) {
                            new_arr.push(new_val);
                            if (old_arr.length > idx) {
                                if (old_arr[idx] != new_val) {
                                    differs = key;
                                }
                            } else {
                                differs = key;
                            }
                        } else {
                            differs = key;
                        }
                    });
                    state[key] = new_arr;
                } else {
                    // structure check
                    let new_arr = [];
                    let old_arr = Array.isArray(old_state) ? old_state : [];
                    let key_id = state_type.keyId || undefined;
                    let add_if_missing = typeof state_type.addIfMissing === 'boolean' ? state_type.addIfMissing : true;
                    let remove_if_no_data;
                    if (typeof state_type.removeIfNoData === 'boolean') {
                        remove_if_no_data = state_type.removeIfNoData;
                    } else {
                        remove_if_no_data = !(state_type.type & Formats.MANDATORY);
                    }
                    let is_valid_key;
                    let replace_all = state_type.replaceAll || key_id === undefined;
                    if (typeof state_type.isValidKey === 'function') {
                        is_valid_key = state_type.isValidKey;
                    } else {
                        is_valid_key = key => true;
                    }
                    value.forEach((new_obj, idx) => {
                        let cur_obj;
                        if (key_id) {
                            let f_arr;
                            let cloned_net_obj = {};
                            me.cloneObject(cloned_net_obj, new_obj, state_type.attributes);
                            if (typeof key_id === 'string') {
                                f_arr = old_arr.filter(obj => { return obj[key_id] === cloned_net_obj[key_id] });
                            } else {
                                f_arr = old_arr.filter(obj => {
                                    let obj_equal = true;
                                    key_id.forEach(key_idi => {
                                        if (obj[key_idi] !== cloned_net_obj[key_idi]) {
                                            obj_equal = false;
                                        }
                                    });
                                    return obj_equal;
                                });
                            }
                            if (f_arr.length > 1) {
                                me.error('More than one "' + key + '" for "' + key_id + '" "' + cloned_net_obj[key_id] + '"');
                            } else if (f_arr.length > 0) {
                                cur_obj = f_arr[0];
                            } else if (add_if_missing) {
                                let key_id0 = typeof key_id === 'string' ? key_id : key_id[0];
                                let key1 = is_valid_key(cloned_net_obj[key_id0]);
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
                            if (me.cloneObject(cur_obj, new_obj, state_type.attributes)) {
                                differs = key;
                            }
                            if (Object.keys(cur_obj).length > 0) {
                                new_arr.push(cur_obj);
                            } else {
                                differs = key; // ??
                            }
                        }
                    });
                    if (replace_all && new_arr.length != old_arr.length) {
                        differs = key;
                    }
                    state[key] = replace_all ? new_arr : old_arr;
                    if (remove_if_no_data && state[key].length === 0) {
                        delete state[key];
                    }
                }
            } else if (state_type.type & Formats.OBJECT) {
                if (Array.isArray(value)) {
                    me.error('key "' + key + '" must be an object.');
                } else {
                    if (state[key] === undefined) {
                        state[key] = {};
                        old_state = state[key];
                    }
                    let mandatory_to_delete = [];
                    let o_differs = [];
                    Object.keys(state_type.attributes).forEach(function (ikey) {
                        // console.log("---> Attributes key " + ikey + " " + JSON.stringify(value[ikey]));
                        if (typeof value[ikey] !== 'undefined' && value[ikey] != null) {
                            if (typeof old_state[ikey] == 'undefined') {
                                old_state[ikey] = {};
                            }
                            if (me.setState(ikey, value[ikey], old_state, state_type.attributes[ikey])) {
                                o_differs.push(ikey);
                                differs = o_differs;
                            }
                        } else if (state_type.type & Formats.DELETE_MISSING) {
                            const a_state_type = typeof state_type.attributes[ikey] === 'number' ? state_type.attributes[ikey] : state_type.attributes[ikey].type;
                            // console.log("a_state " + JSON.stringify(a_state_type));
                            if (a_state_type & Formats.MANDATORY) {
                                mandatory_to_delete.push(ikey);
                            } else {
                                if (typeof state[ikey] != 'undefined') {
                                    o_differs.push(ikey);
                                    differs = o_differs;
                                }
                                delete state[key][ikey];
                                // console.log("Deleted " + ikey + " " + JSON.stringify(state[key]));
                            }
                        }
                    });
                    mandatory_to_delete.forEach(ikey => {
                        // console.log("CCHI try removing " + ikey);
                        let exclusive_state_found = false;
                        exclusive_states.forEach(e_state => {
                            if (typeof state[e_state] !== 'undefined') {
                                exclusive_state_found = false;
                            }
                        });
                        if (!exclusive_state_found) {
                            if (typeof state[ikey] != 'undefined') {
                                o_differs.push(ikey);
                                differs = o_differs;
                            }
                            delete state[key][ikey];
                        } else {
                            me.error('key "' + key + '.' + ikey + '" is mandatory.');
                        }
                    });
                    if (Object.keys(differs).length > 0) {
                        new_state = state[key];
                    }
                }
            } else if (state_type.type & Formats.COPY_OBJECT) {
                if (typeof value !== 'object' || Array.isArray(value)) {
                    me.error('key "' + key + '" must be an object.');
                } else {
                    Object.keys(old_state).forEach(function (ikey) {
                        if (typeof value[ikey] !== 'undefined') {
                            if (me.setState(ikey, value[ikey], old_state, state_type.type - Formats.COPY_OBJECT)) {
                                differs = key;
                            }
                        }
                    });
                }
            } else {
                new_state = Formats.formatValue(key, value, state_type.type & Formats.PRIMITIVE, state_type.defaultValue);
                // console.log("CCHI checking new_state " + key + " " + new_state + " type " + JSON.stringify(state_type));
                if (state_type.min !== undefined && new_state < state_type.min) {
                    me.error('key "' + key + '" must be greather or equal than ' + state_type.min);
                    new_state = undefined;
                }
                if (new_state !== undefined && state_type.max !== undefined && new_state > state_type.max) {
                    me.error('key "' + key + '" must be lower or equal than ' + state_type.max);
                    new_state = undefined;
                }
                if (new_state !== undefined && Array.isArray(state_type.values) && !state_type.values.includes(new_state)) {
                    me.error('key "' + key + '" must be one of ' + JSON.stringify(state_type.values));
                    if (state_type.values.includes(state[key])) {
                        new_state = undefined;
                    } else {
                        new_state = state_type.defaultValue;
                    }
                }
            }
            if (new_state !== undefined && !(state_type.type & (Formats.OBJECT | Formats.ARRAY))) {
                // console.log("CCHI Update state for " + key + " to " + new_state);
                if (old_state !== new_state) {
                    differs = key;
                }
                state[key] = new_state;
            }
            if (new_state !== undefined && exclusive_states.length > 0) {
                exclusive_states.forEach(rkey => delete state[rkey]);
            }
            // console.log("CCHI END ----> " + key + " = " + JSON.stringify(state[key]));
            if (Array.isArray(differs)) {
                let o_differs = {};
                o_differs[key] = differs;
                return o_differs;
            }
            return differs;
        }

        /**
         * Converts an array of applications to the format expected by Google.
         *
         * @see key_name_synonym
         * @param {string[]} json_data - The items to convert
         * @returns {object[]} - Object with items as expected by Google
         */
        to_available_applications(json_data) {
            return this.key_name_synonym("Applications", json_data, 'key', 'names', 'name_synonym');
        }

        /**
         * Converts an array of arm levels to the format expected by Google.
         *
         * @see key_name_synonym
         * @param {string[]} json_data - The items to convert
         * @returns {object[]} - Object with items as expected by Google
         */
        to_available_arm_levels(json_data) {
            return this.key_name_synonym("Arm levels", json_data, 'level_name', 'level_values', 'level_synonym');
        }

        /**
         * Converts an array of channels to the format expected by Google.
         *
         * @see key_name_synonym
         * @param {string[]} json_data - The items to convert
         * @returns {object[]} - Object with items as expected by Google
         */
        to_available_channels(json_data) {
            let f = function (data_in, data_out) {
                if (typeof data_in.number === 'string') {
                    data_out.number = data_in.number;
                }
                return true;
            };
            return this.key_name_synonym("Channels", json_data, 'key', 'names', undefined, f);
        }

        /**
         * Converts an array of food presets to the format expected by Google.
         *
         * @see key_name_synonym
         * @param {string[]} json_data - The items to convert
         * @returns {object[]} - Object with items as expected by Google
         */
        to_food_presets(json_data) {
            let f = function (data_in, data_out) {
                if (Array.isArray(data_in.supported_units)) {
                    data_out.supported_units = [];
                    data_in.supported_units.forEach(unit => {
                        if (typeof unit === 'string' && !data_out.supported_units.includes(unit.trim().toUpperCase()) && COOK_SUPPORTED_UNITS.includes(unit.trim().toUpperCase())) {
                            data_out.supported_units.push(unit.trim().toUpperCase());
                        }
                    });
                    return data_out.supported_units.length > 0;
                }
                return false;
            };
            return this.key_name_synonym("Food presets", json_data, 'food_preset_name', 'food_synonyms', 'synonym', f);
        }

        /**
         * Converts an array of dispense items to the format expected by Google.
         *
         * @see key_name_synonym
         * @param {string[]} json_data - The items to convert
         * @returns {object[]} - Object with items as expected by Google
         */
        to_supported_dispense_items(json_data) {
            let f = function (data_in, data_out) {
                if (Array.isArray(data_in.supported_units)) {
                    data_out.supported_units = [];
                    data_in.supported_units.forEach(unit => {
                        if (typeof unit === 'string' && !data_out.supported_units.includes(unit.trim().toUpperCase()) && DISPENSE_SUPPORTED_UNITS.includes(unit.trim().toUpperCase())) {
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
            return this.key_name_synonym("Dispense items", json_data, 'item_name', 'item_name_synonyms', 'synonyms', f);
        }

        /**
         * Converts an array of dispense presets to the format expected by Google.
         *
         * @see key_name_synonym
         * @param {string[]} json_data - The items to convert
         * @returns {object[]} - Object with items as expected by Google
         */
        to_supported_dispense_presets(json_data) {
            return this.key_name_synonym("Dispense presets", json_data, 'preset_name', 'preset_name_synonyms', 'synonyms');
        }

        /**
         * Converts an array of fan speeds to the format expected by Google.
         *
         * @see key_name_synonym
         * @param {string[]} json_data - The items to convert
         * @returns {object[]} - Object with items as expected by Google
         */
        to_available_fan_speeds(json_data) {
            return this.key_name_synonym("Fan speeds", json_data, 'speed_name', 'speed_values', 'speed_synonym');
        }

        /**
         * Converts an array of fill levels to the format expected by Google.
         *
         * @see key_name_synonym
         * @param {string[]} json_data - The items to convert
         * @returns {object[]} - Object with items as expected by Google
         */

        to_available_fill_levels(json_data) {
            return this.key_name_synonym("Fill levels", json_data, 'level_name', 'level_values', 'level_synonym');
        }

        /**
         * Converts an array of inputs to the format expected by Google.
         *
         * @see key_name_synonym
         * @param {string[]} json_data - The items to convert
         * @returns {object[]} - Object with items as expected by Google
         */
        to_available_inputs(json_data) {
            return this.key_name_synonym("Inputs", json_data, 'key', 'names', 'name_synonym');
        }

        /**
         * Converts an array of toggles to the format expected by Google.
         *
         * @see key_name_synonym
         * @param {string[]} json_data - The items to convert
         * @returns {object[]} - Object with items as expected by Google
         */
        to_available_modes(json_data) {
            let me = this;
            let f = function (data_in, data_out) {
                if (Array.isArray(data_in.settings)) {
                    data_out.settings = me.key_name_synonym("Modes settings", data_in.settings, 'setting_name', 'setting_values', 'setting_synonym');
                    if (typeof data_in.ordered === 'boolean') {
                        data_out.ordered = data_in.ordered;
                    }
                    return data_out.settings.length > 0;
                }
                return false;
            };
            return this.key_name_synonym("Modes", json_data, 'name', 'name_values', 'name_synonym', f);
        }

        /**
         * Converts an array of toggles to the format expected by Google.
         *
         * @see key_name_synonym
         * @param {string[]} json_data - The items to convert
         * @returns {object[]} - Object with items as expected by Google
         */
        to_available_toggles(json_data) {
            return this.key_name_synonym("Toggles", json_data, 'name', 'name_values', 'name_synonym');
        }

        /**
         * Converts an array to a list of synonyms in the format expected by Google. Used to specify the list of items
         * in AppSelector, Modes or similar traits.
         *
         * Example output:
         * [
         *     {"name":"Heating", "name_values":[{"lang":"en", "name_synonym":["Heating"]}]},
         *     {"name":"Cooling", "name_values":[{"lang":"en", "name_synonym":["Cooling"]}]}
         * ]
         *
         * The keys "name", "name_values" and "name_synonym" can be renamed via the parameters key1, key2 and key3.
         *
         * @param {string} type - Type name to use in debug messages
         * @param {string[] | string} json_data - Array of items to convert
         * @param {string} key1 - Key for item name ("name" in example)
         * @param {string} key2 - Key for synonyms object ("name_values" in example)
         * @param {string} key3 - Key for synonyms array ("name_synonyms" in example)
         * @param {Function} manage_other_fields - Optional callback function to handle other fields
         * @returns {object[]} - Object with items as expected by Google
         */
        key_name_synonym(type, json_data, key1, key2, key3, manage_other_fields = undefined) {
            const me = this;
            me._debug(".key_name_synonym: Parsing " + type);
            let new_data = [];
            if (Array.isArray(json_data)) {
                if (typeof manage_other_fields !== 'function') {
                    manage_other_fields = function () { return true; }
                }
                json_data.forEach((rec, pos) => {
                    if (typeof rec === 'string') {
                        let val = rec;
                        rec = {};
                        rec[key1] = val;
                    } else if (Array.isArray(rec)) {
                        if (rec.length > 0) {
                            let arr = rec.filter(element => typeof element === 'string' && element.trim().length > 0);
                            if (arr.length > 0) {
                                rec = {};
                                rec[key1] = arr[0];
                                if (key3) {
                                    rec[key2] = [{}];
                                    rec[key2][0][key3] = arr;
                                } else {
                                    rec[key2] = arr;
                                }
                            }
                        }
                    } else if (typeof rec[key2] !== 'undefined') {
                        let val2 = rec[key2];
                        if (typeof val2 === 'string') {
                            val2 = [val2];
                        }
                        if (Array.isArray(val2)) {
                            let arr = val2.filter(element => typeof element === 'string' && element.trim().length > 0);
                            if (arr.length > 0) {
                                if (key3) {
                                    rec[key2] = [{}];
                                    rec[key2][0][key3] = arr;
                                } else {
                                    rec[key2] = arr;
                                }
                                if (typeof rec[key1] === 'undefined') {
                                    rec[key1] = arr[0];
                                }
                            }
                        }
                    }
                    if (typeof rec[key1] === 'undefined' && typeof rec[key2] !== 'undefined' && Array.isArray(rec[key2])) {
                        let val2 = rec[key2];
                        if (typeof val2 === 'string') {
                            val2 = [val2];
                        }
                        let arr = val2.filter(element => typeof element === 'string' && element.trim().length > 0);
                        if (arr.length > 0 && arr[0]) {
                            rec[rec1] = arr[0];
                        }
                    }
                    if (typeof rec[key1] === 'string' && rec[key1].trim()) {
                        let new_rec = {};
                        new_rec[key1] = rec[key1].trim();
                        let found = new_data.filter(element => element[key1] === new_rec[key1]);
                        if (found.length === 0) {
                            let val3;
                            if (typeof rec[key2] === 'string') {
                                val3 = rec[key2];
                                if (key3) {
                                    rec[key2] = [{}];
                                    rec[key2][0][key3] = [val3];

                                } else {
                                    rec[key2] = [val3];
                                }
                            } else if (!Array.isArray(rec[key2])) {
                                val3 = new_rec[key1];
                                if (key3) {
                                    rec[key2] = [{}];
                                    rec[key2][0][key3] = [val3];

                                } else {
                                    rec[key2] = [val3];
                                }
                            }
                            new_rec[key2] = [];
                            rec[key2].forEach(names => {
                                if (key3) {
                                    if (typeof names === 'string') {
                                        let val2 = names;
                                        names = {};
                                        names[key3] = [val2];
                                    }
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
                                    } else {
                                        me.error("key_name_synonym error " + type + ": missing array key " + key3 + " for " + rec[key1]);
                                    }
                                } else {
                                    if (typeof names === 'string' && names.trim() && !new_rec[key2].includes(names.trim())) {
                                        new_rec[key2].push(names.trim());
                                    } else {
                                        me.error("key_name_synonym error " + type + ": missing array key " + key2 + " for " + rec[key1]);
                                    }
                                }
                            });
                            if (new_rec[key2].length > 0) {
                                let ok = true;
                                if (!key3) {
                                    ok = manage_other_fields(rec, new_rec);
                                    if (!ok) {
                                        me.error("key_name_synonym error " + type + ": manage_other_fields error for " + rec[key1]);
                                    }
                                }
                                if (ok) {
                                    new_data.push(new_rec);
                                }
                            } else {
                                me.error("key_name_synonym error " + type + ": " + key2 + " empty for " + rec[key1]);
                            }
                        } else {
                            me.error("key_name_synonym error " + type + ": " + new_rec[key1] + " already exists");
                        }
                    } else {
                        me.error("key_name_synonym error " + type + ": missing key " + key1 + " at position " + pos);
                    }
                });
            }
            me._debug(".key_name_synonym parser " + type + " : " + JSON.stringify(new_data));
            return new_data;
        }

        parseJson(text, json_text, defaultValue) {
            this._debug('.parseJson: ' + text);
            if (json_text.trim().length > 0) {
                try {
                    return JSON.parse(json_text);
                } catch (err) {
                    this._debug(".parseJson error " + text + ': ' + JSON.stringify(err));
                    this.error('Error on parsing ' + text + ': ' + err.toString());
                }
            }
            return defaultValue;
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
                    this._debug(".loadJson error " + text + ': ' + JSON.stringify(err));
                    this.error('Error on loading ' + text + ' filename ' + filename + ': ' + err.toString());
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
                    this._debug(".writeJson error " + text + ': ' + JSON.stringify(err));
                    this.error('Error on saving ' + text + ' filename + ' + filename + ': ' + err.toString());
                    return false;
                }
            }
        }

        // Called by HttpActions.execCommand
        //
        //
        execCommand(command) {
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

            if (me.states.online !== true) {
                return {
                    status: 'ERROR',
                    errorCode: 'deviceOffline'
                };
            }

            let challenge_type = '';
            let challenge_pin = '';
            switch (command.command) {
                case 'action.devices.commands.appInstall':
                case 'action.devices.commands.appSearch':
                case 'action.devices.commands.appSelect':
                    challenge_type = me.ct_appselector;
                    challenge_pin = me.pin_appselector;
                    break;
                case 'action.devices.commands.ArmDisarm':
                    challenge_type = me.ct_armdisarm;
                    challenge_pin = me.pin_armdisarm;
                    break;
                case 'action.devices.commands.BrightnessAbsolute':
                case 'action.devices.commands.BrightnessRelative':
                    challenge_type = me.ct_brightness;
                    challenge_pin = me.pin_brightness;
                    break;
                case 'action.devices.commands.GetCameraStream':
                    challenge_type = me.ct_camerastream;
                    challenge_pin = me.pin_camerastream;
                    break;
                case 'action.devices.commands.selectChannel':
                case 'action.devices.commands.relativeChannel':
                case 'action.devices.commands.returnChannel':
                    challenge_type = me.ct_channel;
                    challenge_pin = me.pin_channel;
                    break;
                case 'action.devices.commands.ColorAbsolute':
                    challenge_type = me.ct_colorsetting;
                    challenge_pin = me.pin_colorsetting;
                    break;
                case 'action.devices.commands.Cook':
                    challenge_type = me.ct_cook;
                    challenge_pin = me.pin_cook;
                    break;
                case 'action.devices.commands.Dispense':
                    challenge_type = me.ct_dispense;
                    challenge_pin = me.pin_dispense;
                    break;
                case 'action.devices.commands.Dock':
                    challenge_type = me.ct_dock;
                    challenge_pin = me.pin_dock;
                    break;
                case 'action.devices.commands.Charge':
                    challenge_type = me.ct_energystorage;
                    challenge_pin = me.pin_energystorage;
                    break;
                case 'action.devices.commands.SetFanSpeed':
                case 'action.devices.commands.SetFanSpeedRelative':
                case 'action.devices.commands.Reverse':
                    challenge_type = me.ct_fanspeed;
                    challenge_pin = me.pin_fanspeed;
                    break;
                case 'action.devices.commands.Fill':
                    challenge_type = me.ct_fill;
                    challenge_pin = me.pin_fill;
                    break;
                case 'action.devices.commands.SetHumidity':
                case 'action.devices.commands.HumidityRelative':
                    challenge_type = me.ct_humiditysetting;
                    challenge_pin = me.pin_humiditysetting;
                    break;
                case 'action.devices.commands.SetInput':
                case 'action.devices.commands.NextInput':
                case 'action.devices.commands.PreviousInput':
                    challenge_type = me.ct_inputselector;
                    challenge_pin = me.pin_inputselector;
                    break;
                case 'action.devices.commands.ColorLoop':
                case 'action.devices.commands.Sleep':
                case 'action.devices.commands.StopEffect':
                case 'action.devices.commands.Wake':
                    challenge_type = me.ct_colorsetting;
                    challenge_pin = me.pin_colorsetting;
                    break;
                case 'action.devices.commands.Locate':
                    challenge_type = me.ct_locator;
                    challenge_pin = me.pin_locator;
                    break;
                case 'action.devices.commands.LockUnlock':
                    challenge_type = me.ct_lockunlock;
                    challenge_pin = me.pin_lockunlock;
                    break;
                case 'action.devices.commands.SetModes':
                    challenge_type = me.ct_modes;
                    challenge_pin = me.pin_modes;
                    break;
                case 'action.devices.commands.EnableDisableGuestNetwork':
                case 'action.devices.commands.EnableDisableNetworkProfile':
                case 'action.devices.commands.GetGuestNetworkPassword':
                case 'action.devices.commands.TestNetworkSpeed':
                    challenge_type = me.ct_networkcontrol;
                    challenge_pin = me.pin_networkcontrol;
                    break;
                case 'action.devices.commands.OnOff':
                    challenge_type = me.ct_onoff;
                    challenge_pin = me.pin_onoff;
                    break;
                case 'action.devices.commands.OpenClose':
                case 'action.devices.commands.OpenCloseRelative':
                    challenge_type = me.ct_openclose;
                    challenge_pin = me.pin_openclose;
                    break;
                case 'action.devices.commands.Reboot':
                    challenge_type = me.ct_reboot;
                    challenge_pin = me.pin_reboot;
                    break;
                case 'action.devices.commands.RotateAbsolute':
                    challenge_type = me.ct_rotation;
                    challenge_pin = me.pin_rotation;
                    break;
                case 'action.devices.commands.ActivateScene':
                    challenge_type = me.ct_scene;
                    challenge_pin = me.pin_scene;
                    break;
                case 'action.devices.commands.SoftwareUpdate':
                    challenge_type = me.ct_softwareupdate;
                    challenge_pin = me.pin_softwareupdate;
                    break;
                case 'action.devices.commands.StartStop':
                case 'action.devices.commands.PauseUnpause':
                    challenge_type = me.ct_startstop;
                    challenge_pin = me.pin_startstop;
                    break;
                case 'action.devices.commands.SetTemperature':
                    challenge_type = me.ct_temperaturecontrol;
                    challenge_pin = me.pin_temperaturecontrol;
                    break;
                case 'action.devices.commands.ThermostatTemperatureSetpoint':
                case 'action.devices.commands.ThermostatTemperatureSetRange':
                case 'action.devices.commands.ThermostatSetMode':
                case 'action.devices.commands.TemperatureRelative':
                    challenge_type = me.ct_temperaturesetting;
                    challenge_pin = me.pin_temperaturesetting;
                    break;
                case 'action.devices.commands.TimerStart':
                case 'action.devices.commands.TimerAdjust':
                case 'action.devices.commands.TimerPause':
                case 'action.devices.commands.TimerResume':
                case 'action.devices.commands.TimerCancel':
                    challenge_type = me.ct_timer;
                    challenge_pin = me.pin_timer;
                    break;
                case 'action.devices.commands.SetToggles':
                    challenge_type = me.ct_toggles;
                    challenge_pin = me.pin_toggles;
                    break;
                case 'action.devices.commands.mediaStop':
                case 'action.devices.commands.mediaNext':
                case 'action.devices.commands.mediaPrevious':
                case 'action.devices.commands.mediaPause':
                case 'action.devices.commands.mediaResume':
                case 'action.devices.commands.mediaSeekRelative':
                case 'action.devices.commands.mediaSeekToPosition':
                case 'action.devices.commands.mediaRepeatMode':
                case 'action.devices.commands.mediaShuffle':
                case 'action.devices.commands.mediaClosedCaptioningOn':
                case 'action.devices.commands.mediaClosedCaptioningOff':
                    challenge_type = me.ct_transportcontrol;
                    challenge_pin = me.pin_transportcontrol;
                    break;
                case 'action.devices.commands.mute':
                case 'action.devices.commands.setVolume':
                case 'action.devices.commands.volumeRelative':
                    challenge_type = me.ct_volume;
                    challenge_pin = me.pin_volume;
                    break;
            }
            const challenge = command.challenge || {};
            challenge_pin = challenge_pin.trim();
            if (challenge_type === 'ackNeeded') {
                if (challenge.ack !== true) {
                    // ackNeeded with trait states
                    return {
                        status: 'ERROR',
                        errorCode: "challengeNeeded",
                        challengeNeeded: {
                            type: "ackNeeded"
                        }
                    };
                }
            } else if (challenge_type === 'pinNeeded') {
                if (challenge_pin.length === 0) {
                    // challengeFailedNotSetup with trait states
                    return {
                        status: 'ERROR',
                        errorCode: "challengeFailedNotSetup"
                    };
                }
                if (challenge.pin === undefined) {
                    me.send({
                        topic: 'ChallengePin',
                        payload: {
                            name: this.name,
                            pin: challenge_pin,
                            command: command.command,
                            topic: me.topicOut,
                        }
                    });
                    // ackNeeded with trait states
                    return {
                        status: 'ERROR',
                        errorCode: "challengeNeeded",
                        challengeNeeded: {
                            type: "pinNeeded"
                        }
                    };
                }
                if (challenge.pin !== challenge_pin) {
                    return {
                        status: 'ERROR',
                        errorCode: "challengeNeeded",
                        challengeNeeded: {
                            type: "challengeFailedPinNeeded"
                        }
                    };
                }
            }

            // Applications
            if (
                (command.command === 'action.devices.commands.appInstall') ||
                (command.command === 'action.devices.commands.appSearch') ||
                (command.command === 'action.devices.commands.appSelect')
            ) {
                let foundApplication = null;

                for (const application of this.available_applications) {
                    // Try to identify app by key
                    if(Object.prototype.hasOwnProperty.call(command.params, 'newApplication') &&
                        command.params['newApplication'].localeCompare(application.key, undefined, { 'sensitivity': 'base' }) === 0) {
                        foundApplication = application;
                        break;
                    }

                    // Try to identify app by name
                    if(Object.prototype.hasOwnProperty.call(command.params, 'newApplicationName')) {
                        for(const name of application.names) {
                            if (name.name_synonym.some((nameSynonym) => nameSynonym.localeCompare(command.params['newApplicationName'], undefined, { 'sensitivity': 'base' }) === 0)) {
                                foundApplication = application;
                                break;
                            }
                        }
                    }
                }

                if(command.command === 'action.devices.commands.appInstall' && foundApplication !== null) {
                    return {
                        status: 'ERROR',
                        errorCode: 'alreadyInstalledApp'
                    };
                }

                if(foundApplication === null) {
                    return {
                        status: 'ERROR',
                        errorCode: 'noAvailableApp'
                    };
                }

                params['currentApplication'] = foundApplication.key;
                executionStates.push('online', 'currentApplication');
            }

            // ColorLoop
            else if (command.command === 'action.devices.commands.ColorLoop') {
                params['activeLightEffect'] = 'colorLoop';
                executionStates.push('activeLightEffect');
            }
            else if (command.command === 'action.devices.commands.Sleep') {
                params['activeLightEffect'] = 'sleep';
                executionStates.push('activeLightEffect');
            }
            else if (command.command === 'action.devices.commands.StopEffect') {
                params['activeLightEffect'] = '';
                executionStates.push('activeLightEffect');
            }
            else if (command.command === 'action.devices.commands.Wake') {
                params['activeLightEffect'] = 'wake';
                executionStates.push('activeLightEffect');
            }

            // Cook
            else if (command.command === 'action.devices.commands.Cook') {
                //const start = command.params['start'];
                if (Object.prototype.hasOwnProperty.call(command.params, 'cookingMode')) {
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
                if (Object.prototype.hasOwnProperty.call(command.params, 'foodPreset')) {
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
                if (Object.prototype.hasOwnProperty.call(command.params, 'quantity')) {
                    const quantity = command.params['quantity'];
                    params['currentFoodQuantity'] = quantity;
                    executionStates.push('currentFoodQuantity');
                }
                if (Object.prototype.hasOwnProperty.call(command.params, 'unit')) {
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
            else if (command.command === 'action.devices.commands.Dispense') {
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
            else if (command.command === 'action.devices.commands.Dock') {
                params['isDocked'] = true;
                executionStates.push('isDocked');
            }

            // ArmLevel
            else if (command.command === 'action.devices.commands.ArmDisarm') {
                if (Object.prototype.hasOwnProperty.call(command.params, 'arm')) {
                    let new_armLevel = "";
                    if (Object.prototype.hasOwnProperty.call(command.params, 'armLevel')) {
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
            else if (command.command === 'action.devices.commands.SetFanSpeed') {
                if (!me.command_only_fanspeed) {
                    if (Object.prototype.hasOwnProperty.call(command.params, 'fanSpeed')) {
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
                    if (Object.prototype.hasOwnProperty.call(command.params, 'fanSpeedPercent')) {
                        const fanSpeedPercent = command.params['fanSpeedPercent'];
                        params['currentFanSpeedPercent'] = fanSpeedPercent;
                        executionStates.push('currentFanSpeedPercent');
                    }
                }
            }
            else if (command.command === 'action.devices.commands.SetFanSpeedRelative') {
                /*if (Object.prototype.hasOwnProperty.call(command.params, 'fanSpeedRelativeWeight')) {
                    const fanSpeedRelativeWeight = command.params['fanSpeedRelativeWeight'];
                    params['currentFanSpeedPercent'] = me.states['currentFanSpeedPercent'] + fanSpeedRelativeWeight;
                    executionStates.push('currentFanSpeedPercent');
                }
                if (Object.prototype.hasOwnProperty.call(command.params, 'fanSpeedRelativePercent')) {
                    const fanSpeedRelativePercent = command.params['fanSpeedRelativePercent'];
                    params['currentFanSpeedPercent'] = Math.round(me.states['currentFanSpeedPercent'] * (1 + fanSpeedRelativePercent / 100));
                    executionStates.push('currentFanSpeedPercent');
                }*/
            }

            // LockUnlock
            else if (command.command === 'action.devices.commands.LockUnlock') {
                const lock = command.params['lock'];
                params['isLocked'] = lock;
                executionStates.push('isLocked');
            }

            // HumiditySetting
            else if (command.command === 'action.devices.commands.SetHumidity') {
                if (!me.command_only_humiditysetting) {
                    const humidity = command.params['humidity'];
                    params['humiditySetpointPercent'] = humidity;
                    executionStates.push('humiditySetpointPercent');
                }
            }
            else if (command.command === 'action.devices.commands.HumidityRelative') {
                /*if (Object.prototype.hasOwnProperty.call(command.params, 'humidityRelativePercent')) {
                    const humidityRelativePercent = command.params['humidityRelativePercent'];
                    params['humiditySetpointPercent'] = Math.round(me.states['humiditySetpointPercent'] * (1 + humidityRelativePercent / 100));
                    executionStates.push('humiditySetpointPercent');
                }
                if (Object.prototype.hasOwnProperty.call(command.params, 'humidityRelativeWeight')) {
                    const humidityRelativeWeight = command.params['humidityRelativeWeight'];
                    params['humiditySetpointPercent'] = me.states['humiditySetpointPercent'] + humidityRelativeWeight;
                    executionStates.push('humiditySetpointPercent');
                }*/
            }

            // NetworkControl
            else if (command.command === 'action.devices.commands.EnableDisableNetworkProfile') {
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
            else if (command.command === 'action.devices.commands.EnableDisableGuestNetwork') {
                const enable = command.params['enable'] || false;
                params['guestNetworkEnabled'] = enable;
                executionStates.push('guestNetworkEnabled');
            }
            else if (command.command === 'action.devices.commands.GetGuestNetworkPassword') {
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
            else if (command.command === 'action.devices.commands.SetInput') {
                if (!me.command_only_input_selector) {
                    if (Object.prototype.hasOwnProperty.call(command.params, 'newInput')) {
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
            else if (command.command === 'action.devices.commands.NextInput') {
                if (!me.command_only_input_selector) {
                    this.current_input_index++;
                    if (this.current_input_index >= this.available_inputs.length) {
                        this.current_input_index = 0;
                    }
                    executionStates.push('currentInput');
                    params['currentInput'] = this.available_inputs[this.current_input_index].key;
                }
            }
            else if (command.command === 'action.devices.commands.PreviousInput') {
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
            else if (command.command === 'action.devices.commands.OnOff') {
                if (!me.command_only_onoff) {
                    if (Object.prototype.hasOwnProperty.call(command.params, 'on')) {
                        const on_param = command.params['on'];
                        executionStates.push('on');
                        params['on'] = on_param;
                    }
                }
            }

            // OpenClose
            else if (command.command === 'action.devices.commands.OpenClose') {
                if (!me.command_only_openclose) {
                    const open_percent = command.params['openPercent'] || 0;
                    if (Object.prototype.hasOwnProperty.call(me.states, 'openPercent')) {
                        executionStates.push('openPercent');
                        params['openPercent'] = open_percent;
                    } else if (Object.prototype.hasOwnProperty.call(command.params, 'openDirection')) {
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
            else if (command.command === 'action.devices.commands.OpenCloseRelative') {
                /*const open_percent = command.params['openRelativePercent'] || 0;
                if (Object.prototype.hasOwnProperty.call(me.states, 'openPercent')) {
                    executionStates.push('openPercent');
                    params['openPercent'] = open_percent;
                } else if (Object.prototype.hasOwnProperty.call(command.params, 'openDirection')) {
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
            else if (command.command === 'action.devices.commands.StartStop') {
                const start = command.params['start'] || false;
                let zones = undefined;
                if (Object.prototype.hasOwnProperty.call(command.params, 'zone')) {
                    zones = [command.params['zone']];
                } else if (Object.prototype.hasOwnProperty.call(command.params, 'multipleZones')) {
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
            else if (command.command === 'action.devices.commands.PauseUnpause') {
                const pause = command.params['pause'] || false;
                params['isPaused'] = pause;
                executionStates.push('isPaused');
            }

            // TransportControl
            else if (command.command === 'action.devices.commands.mediaStop') {
                params['playbackState'] = 'STOPPED';
                executionStates.push('playbackState');
            }
            else if (command.command === 'action.devices.commands.mediaNext') {
                params['playbackState'] = 'FAST_FORWARDING';
                executionStates.push('playbackState');
            }
            else if (command.command === 'action.devices.commands.mediaPrevious') {
                params['playbackState'] = 'REWINDING';
                executionStates.push('playbackState');
            }
            else if (command.command === 'action.devices.commands.mediaPause') {
                params['playbackState'] = 'PAUSED';
                executionStates.push('playbackState');
            }
            else if (command.command === 'action.devices.commands.mediaResume') {
                params['playbackState'] = 'PLAYING';
                executionStates.push('playbackState');
            }
            else if (command.command === 'action.devices.commands.mediaSeekRelative') {
                if (Object.prototype.hasOwnProperty.call(command.params, 'relativePositionMs')) {
                    //const relative_position_ms = command.params['relativePositionMs'];
                    params['playbackState'] = 'PLAYING';
                    executionStates.push('playbackState');
                }
            }
            else if (command.command === 'action.devices.commands.mediaSeekToPosition') {
                if (Object.prototype.hasOwnProperty.call(command.params, 'absPositionMs')) {
                    //const abs_position_ms = command.params['absPositionMs'];
                    params['playbackState'] = 'PLAYING';
                    executionStates.push('playbackState');
                }
            }
            else if (command.command === 'action.devices.commands.mediaRepeatMode') {
                if (Object.prototype.hasOwnProperty.call(command.params, 'isOn')) {
                    //const is_on = command.params['isOn'];
                }
                if (Object.prototype.hasOwnProperty.call(command.params, 'isSingle')) {
                    //const is_single = command.params['isSingle'];
                }
            }
            else if (command.command === 'action.devices.commands.mediaShuffle') {
            }
            else if (command.command === 'action.devices.commands.mediaClosedCaptioningOn') {
                if (Object.prototype.hasOwnProperty.call(command.params, 'closedCaptioningLanguage')) {
                    //const closedCaptioningLanguage = command.params['closedCaptioningLanguage'];
                    params['playbackState'] = me.states['playbackState'];
                }
                if (Object.prototype.hasOwnProperty.call(command.params, 'userQueryLanguage')) {
                    //const userQueryLanguage = command.params['userQueryLanguage'];
                    params['playbackState'] = me.states['playbackState'];
                }
                executionStates.push('playbackState');
            }
            else if (command.command === 'action.devices.commands.mediaClosedCaptioningOff') {
                executionStates.push('playbackState');
            }

            // TemperatureControl
            else if (command.command === 'action.devices.commands.SetTemperature') {
                if (!me.command_only_temperaturecontrol) {
                    const temperature = command.params['temperature'];
                    params['temperatureSetpointCelsius'] = temperature;
                    executionStates.push('temperatureSetpointCelsius');
                }
            }

            // TemperatureSetting
            else if (command.command === 'action.devices.commands.ThermostatTemperatureSetpoint') {
                if (!me.command_only_temperaturesetting) {
                    const thermostatTemperatureSetpoint = command.params['thermostatTemperatureSetpoint'];
                    params['thermostatTemperatureSetpoint'] = thermostatTemperatureSetpoint;
                    me.thermostat_temperature_setpoint = thermostatTemperatureSetpoint;
                    executionStates.push('thermostatTemperatureSetpoint');
                }
            }
            else if (command.command === 'action.devices.commands.ThermostatTemperatureSetRange') {
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
            else if (command.command === 'action.devices.commands.ThermostatSetMode') {
                if (!me.command_only_temperaturesetting) {
                    const thermostatMode = command.params.thermostatMode;
                    params['thermostatMode'] = thermostatMode;
                    executionStates.push('thermostatMode');
                    if (thermostatMode === "heatcool") {
                        params['thermostatTemperatureSetpointHigh'] = me.thermostat_temperature_setpoint_hight;
                        params['thermostatTemperatureSetpointLow'] = me.thermostat_temperature_setpoint_low;
                        executionStates.push('thermostatTemperatureSetpointHigh', 'thermostatTemperatureSetpointLow');
                    } else {
                        params['thermostatTemperatureSetpoint'] = me.thermostat_temperature_setpoint;
                        executionStates.push('thermostatTemperatureSetpoint');
                    }
                }
            }
            else if (command.command === 'action.devices.commands.TemperatureRelative') {
                /*if (Object.prototype.hasOwnProperty.call(command.params, 'thermostatTemperatureRelativeDegree')) {
                    const thermostatTemperatureRelativeDegree = command.params['thermostatTemperatureRelativeDegree'];
                    params['thermostatTemperatureSetpoint'] = me.states['thermostatTemperatureSetpoint'] + thermostatTemperatureRelativeDegree;
                    executionStates.push('thermostatTemperatureSetpoint');
                }
                if (Object.prototype.hasOwnProperty.call(command.params, 'thermostatTemperatureRelativeWeight')) {
                    const thermostatTemperatureRelativeWeight = command.params['thermostatTemperatureRelativeWeight'];
                    me._debug("C CHI thermostatTemperatureRelativeWeight " + thermostatTemperatureRelativeWeight);
                    me._debug("C CHI thermostatTemperatureSetpoint " + me.states['thermostatTemperatureSetpoint']);
                    params['thermostatTemperatureSetpoint'] = me.states['thermostatTemperatureSetpoint'] + thermostatTemperatureRelativeWeight;
                    executionStates.push('thermostatTemperatureSetpoint');
                }*/
            }

            // Timer
            else if (command.command === 'action.devices.commands.TimerStart') {
                if (!me.command_only_timer) {
                    const timer_time_sec = command.params['timerTimeSec'];
                    const now = Math.floor(Date.now() / 1000);
                    params['timerRemainingSec'] = timer_time_sec;
                    params['timerPaused'] = null;
                    executionStates.push('timerPaused', 'timerRemainingSec');
                    me.timer_end_timestamp = now + timer_time_sec;
                }
            }
            else if (command.command === 'action.devices.commands.TimerResume') {
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
            else if (command.command === 'action.devices.commands.TimerPause') {
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
            else if (command.command === 'action.devices.commands.TimerCancel') {
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
            else if (command.command === 'action.devices.commands.TimerAdjust') {
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
            else if (command.command === 'action.devices.commands.mute') {
                if (!me.command_only_volume) {
                    if (Object.prototype.hasOwnProperty.call(command.params, 'mute')) {
                        const mute = command.params['mute'];
                        params['isMuted'] = mute;
                        executionStates.push('isMuted', 'currentVolume');
                    }
                }
            }
            else if (command.command === 'action.devices.commands.setVolume') {
                if (!me.command_only_volume) {
                    if (Object.prototype.hasOwnProperty.call(command.params, 'volumeLevel')) {
                        let volumeLevel = command.params['volumeLevel'];
                        if (volumeLevel > me.volume_max_level) {
                            volumeLevel = me.volume_max_level;
                        }
                        params['currentVolume'] = volumeLevel;
                        params['isMuted'] = false;
                        executionStates.push('isMuted', 'currentVolume');
                    }
                }
            }
            else if (command.command === 'action.devices.commands.volumeRelative') {
                if (!me.command_only_volume) {
                    if (Object.prototype.hasOwnProperty.call(command.params, 'relativeSteps')) {
                        const relativeSteps = command.params['relativeSteps'];
                        let current_volume = me.states['currentVolume'];
                        if (current_volume >= me.volume_max_level && relativeSteps > 0) {
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
                        if (current_volume > me.volume_max_level) {
                            current_volume = me.volume_max_level;
                        } else if (current_volume < 0) {
                            current_volume = 0;
                        }
                        params['currentVolume'] = current_volume;
                        executionStates.push('currentVolume');
                    }
                }
            }

            // Channels
            else if (command.command === 'action.devices.commands.selectChannel') {
                if (Object.prototype.hasOwnProperty.call(command.params, 'channelCode')) {
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
                /*if (Object.prototype.hasOwnProperty.call(command.params, 'channelName')) {
                    const channelName = command.params['channelName'];
                }*/
                if (Object.prototype.hasOwnProperty.call(command.params, 'channelNumber')) {
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
            else if (command.command === 'action.devices.commands.relativeChannel') {
                if (Object.prototype.hasOwnProperty.call(command.params, 'relativeChannelChange')) {
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
            else if (command.command === 'action.devices.commands.returnChannel') {
                if (this.last_channel_index >= 0) {
                    const current_channel_index = this.current_channel_index;
                    this.current_channel_index = this.last_channel_index;
                    this.last_channel_index = current_channel_index;
                }
                if (this.current_channel_index < 0) {
                    this.current_channel_index = 0;
                }
                params['currentChannel'] = this.available_channels[this.current_channel_index].key;
                params['currentChannelNumber'] = this.available_channels[this.current_channel_index].number || '';
                // executionStates.push('currentChannel');
            }

            // Modes
            else if (command.command === 'action.devices.commands.SetModes') {
                if (!me.command_only_modes) {
                    if (Object.prototype.hasOwnProperty.call(command.params, 'updateModeSettings')) {
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
            else if (command.command === 'action.devices.commands.RotateAbsolute') {
                if (!me.command_only_rotation) {
                    if (Object.prototype.hasOwnProperty.call(command.params, 'rotationDegrees')) {
                        const rotationDegrees = command.params['rotationDegrees'];
                        params['rotationDegrees'] = rotationDegrees;
                        executionStates.push('rotationDegrees');
                    }
                    if (Object.prototype.hasOwnProperty.call(command.params, 'rotationPercent')) {
                        const rotationPercent = command.params['rotationPercent'];
                        params['rotationPercent'] = rotationPercent;
                        executionStates.push('rotationPercent');
                    }
                }
            }

            // Traits
            else if (command.command === 'action.devices.commands.SetToggles') {
                if (!me.command_only_toggles) {
                    if (Object.prototype.hasOwnProperty.call(command.params, 'updateToggleSettings')) {
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
            else if (command.command === 'action.devices.commands.BrightnessAbsolute') {
                if (!me.command_only_brightness) {
                    const brightness = command.params['brightness'];
                    params['brightness'] = brightness;
                    executionStates.push('brightness');
                }
            }
            else if (command.command === 'action.devices.commands.BrightnessRelative') {
                /*
                let brightness = me.states['brightness'];
                if (Object.prototype.hasOwnProperty.call(command.params, 'brightnessRelativePercent')) {
                    const brightnessRelativePercent = command.params['brightnessRelativePercent'];
                    brightness = Math.round(brightness * (1 + parseInt(brightnessRelativePercent) / 100));
                }
                if (Object.prototype.hasOwnProperty.call(command.params, 'brightnessRelativeWeight')) {
                    //const brightnessRelativeWeight = command.params['brightnessRelativeWeight'];
                    brightness = brightness + parseInt(brightnessRelativePercent);
                }
                params['brightness'] = brightness;
                executionStates.push('brightness');
                */
            }

            // ColorSetting
            else if (command.command === 'action.devices.commands.ColorAbsolute') {
                if (!me.command_only_colorsetting) {
                    if (Object.prototype.hasOwnProperty.call(command.params, 'color')) {
                        if (Object.prototype.hasOwnProperty.call(command.params.color, 'temperature') || Object.prototype.hasOwnProperty.call(command.params.color, 'temperatureK')) {
                            const temperature = Object.prototype.hasOwnProperty.call(command.params.color, 'temperature') ? command.params.color.temperature : command.params.color.temperatureK;
                            params['color'] = { temperatureK: temperature };
                        } else if (Object.prototype.hasOwnProperty.call(command.params.color, 'spectrumRGB') || Object.prototype.hasOwnProperty.call(command.params.color, 'spectrumRgb')) {
                            const spectrum_RGB = Object.prototype.hasOwnProperty.call(command.params.color, 'spectrumRGB') ? command.params.color.spectrumRGB : command.params.color.spectrumRgb;
                            params['color'] = { spectrumRgb: spectrum_RGB };
                        } else if (Object.prototype.hasOwnProperty.call(command.params.color, 'spectrumHSV') || Object.prototype.hasOwnProperty.call(command.params.color, 'spectrumHsv')) {
                            const spectrum_HSV = Object.prototype.hasOwnProperty.call(command.params.color, 'spectrumHSV') ? command.params.color.spectrumHSV : command.params.color.spectrumHsv;
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
            else if (command.command === 'action.devices.commands.GetCameraStream') {
                if (Object.prototype.hasOwnProperty.call(command.params, 'SupportedStreamProtocols')) {
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
                        executionStates.push('cameraStreamProtocol');
                        if (me.auth_token.length > 0) {
                            executionStates.push('cameraStreamAuthToken');
                        }
                        if (protocol === 'webrtc') {
                            executionStates.push('cameraStreamIceServers', 'cameraStreamSignalingUrl', 'cameraStreamOffer');
                            return {
                                reportState: false,
                                states: {
                                    online: true,
                                    cameraStreamAuthToken: me.auth_token,
                                    cameraStreamIceServers: me.webrtc_ice_servers,
                                    cameraStreamSignalingUrl: stream_url,
                                    cameraStreamOffer: me.webrtc_offer,
                                    cameraStreamProtocol: protocol
                                },
                                executionStates: executionStates,
                            };
                        } else {
                            executionStates.push('cameraStreamAccessUrl');
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
            }
            return '';
        }
    }

    RED.nodes.registerType("google-device", DeviceNode);
}
