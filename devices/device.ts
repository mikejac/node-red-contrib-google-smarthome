/**
 * node-red-contrib-google-smarthome
 * Copyright (C) 2025 Claudio Chimera and others.
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

import fs from 'fs';
import path from 'path';
import util from 'util';
import { Node, NodeAPI, NodeDef } from 'node-red';
import { Formats } from '../lib/Formats';
import { setRED, RED } from '../lib/SmartHome';
import { GoogleSmartHomeNode } from '../google-smarthome';


interface DeviceNodeConfig extends NodeDef {
    id: string;
    client: string;
    name: string;
    nicknames: string;
    topic: string;
    online: boolean;
    room_hint: string;
    device_type: string;
    show_trait: string;
    advanced_settings: boolean;
    topic_filter: boolean;
    passthru: boolean;
    persistent_state: boolean;
    auth_token: string;
    need_auth_token: boolean;
    trait_appselector: boolean;
    trait_armdisarm: boolean;
    trait_brightness: boolean;
    trait_camerastream: boolean;
    trait_channel: boolean;
    trait_colorsetting: boolean;
    trait_cook: boolean;
    trait_dispense: boolean;
    trait_dock: boolean;
    trait_energystorage: boolean;
    trait_fanspeed: boolean;
    trait_fill: boolean;
    trait_humiditysetting: boolean;
    trait_inputselector: boolean;
    trait_lighteffects: boolean;
    trait_locator: boolean;
    trait_lockunlock: boolean;
    trait_mediastate: boolean;
    trait_modes: boolean;
    trait_networkcontrol: boolean;
    trait_objectdetection: boolean;
    trait_occupancysensing: boolean;
    trait_onoff: boolean;
    trait_openclose: boolean;
    trait_reboot: boolean;
    trait_rotation: boolean;
    trait_runcycle: boolean;
    trait_scene: boolean;
    trait_sensorstate: boolean;
    trait_softwareupdate: boolean;
    trait_startstop: boolean;
    trait_statusreport: boolean;
    trait_temperaturecontrol: boolean;
    trait_temperaturesetting: boolean;
    trait_timer: boolean;
    trait_toggles: boolean;
    trait_transportcontrol: boolean;
    trait_volume: boolean;
    appselector_file: string;
    appselector_type: string;
    channel_file: string;
    channel_type: string;
    inputselector_file: string;
    inputselector_type: string;
    command_only_input_selector: boolean;
    ordered_inputs: boolean;
    support_activity_state: boolean;
    support_playback_state: boolean;
    command_query_onoff: string;
    supported_commands: string[];
    volume_max_level: number | string;
    volume_can_mute_and_unmute: boolean;
    volume_default_percentage: number | string;
    level_step_size: number | string;
    command_only_volume: boolean;
    command_only_brightness: boolean;
    command_only_colorsetting: boolean;
    color_model: string;
    temperature_min_k: number | string;
    temperature_max_k: number | string;
    modes_file: string;
    modes_type: string;
    command_query_modes: string;
    toggles_file: string;
    toggles_type: string;
    command_query_toggles: string;
    hls: string;
    hls_app_id: string;
    dash: string;
    dash_app_id: string;
    smooth_stream: string;
    smooth_stream_app_id: string;
    progressive_mp4: string;
    progressive_mp4_app_id: string;
    webrtc: string;
    webrtc_offer: string;
    webrtc_ice_servers: string;
    webrtc_ice_servers_type: string;
    scene_reversible: boolean;
    max_timer_limit_sec: number | string;
    command_only_timer: boolean;
    available_thermostat_modes: string[];
    min_threshold_celsius: number | string;
    max_threshold_celsius: number | string;
    thermostat_temperature_unit: string;
    buffer_range_celsius: number | string;
    command_query_temperaturesetting: string;
    tc_min_threshold_celsius: number | string;
    tc_max_threshold_celsius: number | string;
    tc_temperature_step_celsius: number | string;
    tc_temperature_unit_for_ux: string;
    tc_command_query_temperaturecontrol: string;
    min_percent: number | string;
    max_percent: number | string;
    command_query_humiditysetting: string;
    discrete_only_openclose: boolean;
    open_direction: string[];
    command_query_openclose: string;
    pausable: boolean;
    available_zones: string[];
    supports_degrees: boolean;
    supports_percent: boolean;
    rotation_degrees_min: number | string;
    rotation_degrees_max: number | string;
    supports_continuous_rotation: boolean;
    command_only_rotation: boolean;
    default_sleep_duration: number | string;
    default_wake_duration: number | string;
    supported_effects: string[];
    supported_cooking_modes: string[];
    food_presets_file: string;
    food_presets_type: string;
    reversible: boolean;
    supports_fan_speed_percent: boolean;
    fan_speeds_ordered: boolean;
    command_only_fanspeed: boolean;
    available_fan_speeds_file: string;
    available_fan_speeds_type: string;
    sensor_states_supported: string[];
    arm_levels_ordered: boolean;
    available_arm_levels_file: string;
    available_arm_levels_type: string;
    available_fill_levels_file: string;
    available_fill_levels_type: string;
    supports_fill_percent: boolean;
    ordered_fill_levels: boolean;
    is_rechargeable: boolean;
    query_only_energy_storage: boolean;
    energy_storage_distance_unit_for_ux: string;
    supported_dispense_items_file: string;
    supported_dispense_items_type: string;
    supported_dispense_presets_file: string;
    supported_dispense_presets_type: string;
    supports_enabling_guest_network: boolean;
    supports_disabling_guest_network: boolean;
    supports_getting_guest_network_password: boolean;
    network_profiles: string[];
    supports_enabling_network_profile: boolean;
    supports_disabling_network_profile: boolean;
    supports_network_download_speedtest: boolean;
    supports_network_upload_speedtest: boolean;
    occupancy_sensing_pir: boolean;
    occupancy_sensing_ultrasonic: boolean;
    occupancy_sensing_physical_contact: boolean;
    occupied_to_unoccupied_delay_sec_pir: number | string;
    unoccupied_to_occupied_delay_sec_pir: number | string;
    unoccupied_to_occupied_event_threshold_pir: number | string;
    occupied_to_unoccupied_delay_sec_ultrasonic: number | string;
    unoccupied_to_occupied_delay_sec_ultrasonic: number | string;
    unoccupied_to_occupied_event_threshold_ultrasonic: number | string;
    occupied_to_unoccupied_delay_sec_physical_contact: number | string;
    unoccupied_to_occupied_delay_sec_physical_contact: number | string;
    unoccupied_to_occupied_event_threshold_physical_contact: number | string;
    ct_appselector: string;
    ct_armdisarm: string;
    ct_brightness: string;
    ct_camerastream: string;
    ct_channel: string;
    ct_colorsetting: string;
    ct_cook: string;
    ct_dispense: string;
    ct_dock: string;
    ct_energystorage: string;
    ct_fanspeed: string;
    ct_fill: string;
    ct_humiditysetting: string;
    ct_inputselector: string;
    ct_lighteffects: string;
    ct_locator: string;
    ct_lockunlock: string;
    ct_mediastate: string;
    ct_modes: string;
    ct_networkcontrol: string;
    ct_objectdetection: string;
    ct_onoff: string;
    ct_openclose: string;
    ct_reboot: string;
    ct_rotation: string;
    ct_runcycle: string;
    ct_scene: string;
    ct_sensorstate: string;
    ct_softwareupdate: string;
    ct_startstop: string;
    ct_statusreport: string;
    ct_temperaturecontrol: string;
    ct_temperaturesetting: string;
    ct_timer: string;
    ct_toggles: string;
    ct_transportcontrol: string;
    ct_volume: string;
    pin_appselector: string;
    pin_armdisarm: string;
    pin_brightness: string;
    pin_camerastream: string;
    pin_channel: string;
    pin_colorsetting: string;
    pin_cook: string;
    pin_dispense: string;
    pin_dock: string;
    pin_energystorage: string;
    pin_fanspeed: string;
    pin_fill: string;
    pin_humiditysetting: string;
    pin_inputselector: string;
    pin_lighteffects: string;
    pin_locator: string;
    pin_lockunlock: string;
    pin_mediastate: string;
    pin_modes: string;
    pin_networkcontrol: string;
    pin_objectdetection: string;
    pin_onoff: string;
    pin_openclose: string;
    pin_reboot: string;
    pin_rotation: string;
    pin_runcycle: string;
    pin_scene: string;
    pin_sensorstate: string;
    pin_softwareupdate: string;
    pin_startstop: string;
    pin_statusreport: string;
    pin_temperaturecontrol: string;
    pin_temperaturesetting: string;
    pin_timer: string;
    pin_toggles: string;
    pin_transportcontrol: string;
    pin_volume: string;
}

const COOK_SUPPORTED_UNITS = ["UNKNOWN_UNITS", "NO_UNITS", "CENTIMETERS", "CUPS", "DECILITERS", "FEET", "FLUID_OUNCES", "GALLONS", "GRAMS", "INCHES", "KILOGRAMS", "LITERS", "METERS", "MILLIGRAMS", "MILLILITERS", "MILLIMETERS", "OUNCES", "PINCH", "PINTS", "PORTION", "POUNDS", "QUARTS", "TABLESPOONS", "TEASPOONS"];
const DISPENSE_SUPPORTED_UNITS = ["CENTIMETERS", "CUPS", "DECILITERS", "FLUID_OUNCES", "GALLONS", "GRAMS", "KILOGRAMS", "LITERS", "MILLIGRAMS", "MILLILITERS", "MILLIMETERS", "NO_UNITS", "OUNCES", "PINCH", "PINTS", "PORTION", "POUNDS", "QUARTS", "TABLESPOONS", "TEASPOONS"];
const ENERGY_STORAGE_UNITS = ['SECONDS', 'MILES', 'KILOMETERS', 'PERCENTAGE', 'KILOWATT_HOURS'];
const LANGUAGES = ["da", "nl", "en", "fr", "de", "hi", "id", "it", "ja", "ko", "no", "pt-BR", "es", "sv", "th", "zh-TW"];

export interface DeviceNode extends Node {}

/******************************************************************************************************************
 *
 *
 */
export class DeviceNode {
    private clientConn: GoogleSmartHomeNode;
    private client: string;
    private device_type: string;
    private lang: string;
    private nicknames: string;
    private room_hint: string;

    constructor(config: DeviceNodeConfig) {
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
            occupancysensing: config.trait_occupancysensing || false,
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
                this.trait.openclose = true;
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
            case "DOORBELL": // Doorbell
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
            case "GAME_CONSOLE": // Game console
                this.trait.appselector = true;
                this.trait.mediastate = true;
                this.trait.onoff = true;
                this.trait.transportcontrol = true;
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
            case "PUMP": // Pump
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
                this.trait.sensorstate = true;
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
        this.need_auth_token = true == config.need_auth_token;
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
        // OccupancySensing
        this.occupancy_sensing_pir = config.occupancy_sensing_pir || false;
        this.occupied_to_unoccupied_delay_sec_pir = parseInt(config.occupied_to_unoccupied_delay_sec_pir) || 0;
        this.unoccupied_to_occupied_delay_sec_pir = parseInt(config.unoccupied_to_occupied_delay_sec_pir) || 2;
        this.unoccupied_to_occupied_event_threshold_pir = parseInt(config.unoccupied_to_occupied_event_threshold_pir) || 2;
        this.occupancy_sensing_ultrasonic = config.occupancy_sensing_ultrasonic || false;
        this.occupied_to_unoccupied_delay_sec_ultrasonic = parseInt(config.occupied_to_unoccupied_delay_sec_ultrasonic) || 0;
        this.unoccupied_to_occupied_delay_sec_ultrasonic = parseInt(config.unoccupied_to_occupied_delay_sec_ultrasonic) || 2;
        this.unoccupied_to_occupied_event_threshold_ultrasonic = parseInt(config.unoccupied_to_occupied_event_threshold_ultrasonic) || 2;
        this.occupancy_sensing_physical_contact = config.occupancy_sensing_physical_contact || false;
        this.occupied_to_unoccupied_delay_sec_physical_contact = parseInt(config.occupied_to_unoccupied_delay_sec_physical_contact) || 0;
        this.unoccupied_to_occupied_delay_sec_physical_contact = parseInt(config.unoccupied_to_occupied_delay_sec_physical_contact) || 2;
        this.unoccupied_to_occupied_event_threshold_physical_contact = parseInt(config.unoccupied_to_occupied_event_threshold_physical_contact) || 2;
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
        let state_types = this.state_types;
        state_types['online'] = Formats.BOOL + Formats.MANDATORY;

        if (this.trait.appselector) {
            let values = this.available_applications.map(application => application.key);
            if (values.length > 0) {
                state_types['currentApplication'] = {
                    type: Formats.STRING + Formats.MANDATORY,
                    values: values,
                    defaultValue: values[0],
                };
            }
        }
        if (this.trait.armdisarm) {
            let values = this.available_arm_levels.map(al => al.level_name);
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
        if (this.trait.brightness && !this.command_only_brightness) {
            state_types['brightness'] = {
                type: Formats.INT,
                min: 0,
                max: 100,
            };
        }
        if (this.trait.colorsetting) {
            if (!this.command_only_colorsetting) {
                if ((this.color_model === "rgb") || (this.color_model === 'rgb_temp')) {
                    state_types['color'] = {
                        type: Formats.OBJECT + Formats.DELETE_MISSING,
                        attributes: {
                            spectrumRgb: {
                                type: Formats.INT + Formats.MANDATORY,
                                exclusiveStates: ['temperatureK', 'spectrumHsv']
                            },
                        }
                    };
                } else if ((this.color_model === "hsv") || (this.color_model === "hsv_temp")) {
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
                if (this.color_model !== "rgb" && this.color_model !== "hsv") {
                    state_types.color.attributes.temperatureK = {
                        type: Formats.INT + Formats.MANDATORY,
                        min: this.temperature_min_k,
                        max: this.temperature_max_k,
                        exclusiveStates: ['spectrumRgb', 'spectrumHsv']
                    };
                }
            }
        }
        if (this.trait.cook) {
            let cooking_mode_values = ['NONE'];
            cooking_mode_values.push(...this.supported_cooking_modes);
            state_types['currentCookingMode'] = {
                type: Formats.STRING + Formats.MANDATORY,
                values: cooking_mode_values,
            };
            let food_preset_values = ['NONE'];
            food_preset_values.push(...this.food_presets.map(food_preset => food_preset.food_preset_name));
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
        if (this.trait.dispense) {
            let dispense_items_values = this.supported_dispense_items.map(item => item.item_name);
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
        if (this.trait.dock) {
            state_types['isDocked'] = Formats.BOOL;
        }
        if (this.trait.energystorage) {
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
            if (this.is_rechargeable) {
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
        if (this.trait.fanspeed) {
            if (!this.command_only_fanspeed) {
                if (this.supports_fan_speed_percent) {
                    state_types['currentFanSpeedPercent'] = Formats.INT + Formats.MANDATORY;
                } else {
                    state_types['currentFanSpeedPercent'] = Formats.INT;
                }
                if (this.available_fan_speeds.length > 0) {
                    let values = this.available_fan_speeds.map(fanspeed => fanspeed.speed_name);
                    state_types['currentFanSpeedSetting'] = {
                        type: Formats.STRING,
                        values: values,
                        defaultValue: values[0],
                    };
                }
            }
        }
        if (this.trait.fill) {
            state_types['isFilled'] = Formats.BOOL + Formats.MANDATORY;
            if (this.available_fill_levels.length > 0) {
                let values = this.available_fill_levels.map(fl => fl.level_name);
                state_types['currentFillLevel'] = {
                    type: Formats.STRING + Formats.MANDATORY,
                    values: values,
                    defaultValue: values[0],
                };
            }
            if (this.supports_fill_percent) {
                state_types['currentFillPercent'] = Formats.FLOAT + Formats.MANDATORY;
            } else {
                state_types['currentFillPercent'] = Formats.FLOAT;
            }
        }
        if (this.trait.humiditysetting) {
            if (!this.command_only_humiditysetting) {
                state_types['humiditySetpointPercent'] = Formats.INT;
                state_types['humidityAmbientPercent'] = Formats.INT;
            }
        }
        if (this.trait.inputselector) {
            if (!this.command_only_input_selector) {
                let values = this.available_inputs.map(input => input.key);
                if (values.length > 0) {
                    state_types['currentInput'] = {
                        type: Formats.STRING + Formats.MANDATORY,
                        values: values,
                    };
                }
            }
        }
        if (this.trait.lighteffects) {
            let light_effect_value = [''];
            light_effect_value.push(...this.supported_effects);
            if (light_effect_value.length > 0) {
                state_types['activeLightEffect'] = {
                    type: Formats.STRING + Formats.MANDATORY,
                    values: light_effect_value,
                };
                state_types['lightEffectEndUnixTimestampSec'] = Formats.INT;
            }
        }
        // Locator
        if (this.trait.lockunlock) {
            state_types['isLocked'] = Formats.BOOL;
            state_types['isJammed'] = Formats.BOOL;
        }
        if (this.trait.mediastate) {
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
        if (this.trait.modes) {
            if (!this.command_only_modes) {
                let attributes = {};
                let ok = false;
                this.available_modes.forEach(function (mode) {
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
        if (this.trait.networkcontrol) {
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
        // OccupancySensing
        if (this.trait.occupancysensing) {
            if (this.occupancy_sensing_pir || this.occupancy_sensing_ultrasonic || this.occupancy_sensing_physical_contact) {
                state_types['occupancy'] = {
                    type: Formats.STRING + Formats.MANDATORY,
                    values: ['OCCUPIED', 'UNOCCUPIED', 'UNKNOWN_OCCUPANCY_STATE'],
                    defaultValue: 'UNKNOWN_OCCUPANCY_STATE',
                    upperCase: true,
                }
            } else {
                this.trait.occupancysensing = false;
            }
        }
        if (this.trait.onoff) {
            if (!this.command_only_onoff) {
                state_types['on'] = Formats.BOOL;
            }
        }
        if (this.trait.openclose) {
            if (!this.command_only_openclose) {
                if (this.open_direction.length < 2) {
                    state_types['openPercent'] = Formats.FLOAT + Formats.MANDATORY;
                } else {
                    state_types['openState'] = {
                        type: Formats.OBJECT + Formats.ARRAY,
                        attributes: {
                            openPercent: Formats.FLOAT + Formats.MANDATORY,
                            openDirection: {
                                type: Formats.STRING + Formats.MANDATORY,
                                values: this.open_direction,
                                upperCase: true,
                            },
                        },
                        keyId: 'openDirection',
                        removeIfNoData: true,
                        replaceAll: false,
                        isValidKey: direction => this.open_direction.includes(direction.trim()) ? direction.trim() : undefined
                    };
                }
            }
        }
        // Reboot, no state
        if (this.trait.rotation) {
            if (!this.command_only_rotation) {
                if (this.supports_degrees) {
                    state_types['rotationDegrees'] = Formats.FLOAT;
                }
                if (this.supports_percent) {
                    state_types['rotationPercent'] = Formats.FLOAT;
                }
            }
        }
        if (this.trait.runcycle) {
            state_types['currentRunCycle'] = {
                type: Formats.OBJECT + Formats.ARRAY,
                attributes: {
                    currentCycle: Formats.STRING + Formats.MANDATORY,
                    nextCycle: Formats.STRING,
                    lang: {
                        type: Formats.STRING + Formats.MANDATORY,
                        defaultValue: this.lang,
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
        if (this.trait.sensorstate) {
            state_types['currentSensorStateData'] = {
                type: Formats.OBJECT + Formats.ARRAY,
                attributes: {
                    name: {
                        type: Formats.STRING + Formats.MANDATORY,
                        values: this.sensor_states_supported,
                    },
                    currentSensorState: Formats.STRING,
                    rawValue: Formats.FLOAT
                },
                keyId: 'name',
                addIfMissing: true,
                removeIfNoData: true,
                replaceAll: false,
                isValidKey: name => this.sensor_states_supported.includes(name.trim()) ? name.trim() : undefined
            };
        }
        if (this.trait.softwareupdate) {
            state_types['lastSoftwareUpdateUnixTimestampSec'] = Formats.INT + Formats.MANDATORY;
        }
        if (this.trait.startstop) {
            state_types['isRunning'] = Formats.BOOL + Formats.MANDATORY;
            state_types['isPaused'] = Formats.BOOL;
            state_types['activeZones'] = {
                type: Formats.STRING + Formats.ARRAY,
                values: this.available_zones,
                addIfMissing: true,
                removeIfNoData: true,
                replaceAll: true,
                isValidKey: zone => this.available_zones.includes(zone.trim()) ? zone.trim() : undefined
            };
        }
        if (this.trait.statusreport) {
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
                isValidKey: nodeId => Object.keys(this.clientConn.getProperties([nodeId])).length > 0 ? nodeId : this.clientConn.getIdFromName(nodeId)
            };
        }
        if (this.trait.temperaturecontrol) {
            if (!this.command_only_temperaturecontrol) {
                if (this.query_only_temperaturecontrol) { // Required if queryOnlyTemperatureControl set to false
                    state_types['temperatureSetpointCelsius'] = Formats.FLOAT;
                } else {
                    state_types['temperatureSetpointCelsius'] = Formats.FLOAT + Formats.MANDATORY;
                }
                state_types['temperatureAmbientCelsius'] = Formats.FLOAT;
            }
        }
        if (this.trait.temperaturesetting) {
            if (!this.command_only_temperaturesetting) {
                state_types['activeThermostatMode'] = Formats.STRING;
                state_types['targetTempReachedEstimateUnixTimestampSec'] = Formats.INT;
                state_types['thermostatHumidityAmbient'] = Formats.FLOAT;
                state_types['thermostatMode'] = {
                    type: Formats.STRING + Formats.MANDATORY,
                    values: this.available_thermostat_modes,
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
        if (this.trait.timer) {
            if (!this.command_only_timer) {
                state_types['timerRemainingSec'] = Formats.INT + Formats.MANDATORY;
                state_types['timerPaused'] = Formats.BOOL;
            }
        }
        if (this.trait.toggles) {
            if (!this.command_only_toggles) {
                let attributes = {};
                this.available_toggles.forEach(function (toggle) {
                    attributes[toggle.name] = Formats.BOOL + Formats.MANDATORY;
                });
                state_types['currentToggleSettings'] = {
                    type: Formats.OBJECT,
                    attributes: attributes,
                };
            }
        }
        // TransportControl
        if (this.trait.volume) {
            if (!this.command_only_volume) {
                state_types['currentVolume'] = Formats.INT + Formats.MANDATORY;
                if (this.volume_can_mute_and_unmute) {
                    state_types['isMuted'] = Formats.BOOL + Formats.MANDATORY;
                } else {
                    state_types['isMuted'] = Formats.BOOL;
                }
            }
        }
    }

    updateAttributesForTraits(device) {
        let attributes = device.properties.attributes;

        if (this.trait.appselector) {
            attributes['availableApplications'] = this.available_applications;
        }
        if (this.trait.armdisarm) {
            attributes['availableArmLevels'] = {
                levels: this.available_arm_levels,
                ordered: this.arm_levels_ordered
            };
        }
        if (this.trait.brightness) {
            attributes['commandOnlyBrightness'] = this.command_only_brightness;
        }
        if (this.trait.channel) {
            attributes['availableChannels'] = this.available_channels;
        }
        if (this.trait.colorsetting) {
            attributes["commandOnlyColorSetting"] = this.command_only_colorsetting;
            if (this.color_model === "rgb" || this.color_model === "rgb_temp") {
                attributes['colorModel'] = "rgb";
            }
            else if (this.color_model === "hsv" || this.color_model === "hsv_temp") {
                attributes['colorModel'] = "hsv";
            }
            if (this.color_model !== "rgb" && this.color_model !== "hsv") {
                attributes['colorTemperatureRange'] = {
                    "temperatureMinK": this.temperature_min_k,
                    "temperatureMaxK": this.temperature_max_k
                };
            }
        }
        if (this.trait.camerastream) {
            attributes['cameraStreamSupportedProtocols'] = this.camera_stream_supported_protocols;
            attributes['cameraStreamNeedAuthToken'] = this.need_auth_token;
        }
        if (this.trait.cook) {
            attributes['supportedCookingModes'] = this.supported_cooking_modes;
            attributes['foodPresets'] = this.food_presets;
        }
        if (this.trait.dispense) {
            attributes['supportedDispenseItems'] = this.supported_dispense_items;
            attributes['supportedDispensePresets'] = this.supported_dispense_presets;
        }
        if (this.trait.energystorage) {
            attributes['queryOnlyEnergyStorage'] = this.query_only_energy_storage;
            if (this.energy_storage_distance_unit_for_ux) {
                attributes['energyStorageDistanceUnitForUX'] = this.energy_storage_distance_unit_for_ux;
            }
            attributes['isRechargeable'] = this.is_rechargeable;
        }
        if (this.trait.fanspeed) {
            attributes['reversible'] = this.reversible;
            attributes['commandOnlyFanSpeed'] = this.command_only_fanspeed;
            attributes['supportsFanSpeedPercent'] = this.supports_fan_speed_percent;
            attributes['availableFanSpeeds'] = {
                speeds: this.available_fan_speeds,
                ordered: this.fan_speeds_ordered
            };
        }
        if (this.trait.fill) {
            attributes['availableFillLevels'] = {
                levels: this.available_fill_levels,
                ordered: this.ordered_fill_levels,
                supportsFillPercent: this.supports_fill_percent
            };
        }
        if (this.trait.humiditysetting) {
            attributes['humiditySetpointRange'] = {
                minPercent: this.min_percent,
                maxPercent: this.max_percent
            };
            attributes['commandOnlyHumiditySetting'] = this.command_only_humiditysetting;
            attributes['queryOnlyHumiditySetting'] = this.query_only_humiditysetting;
        }
        if (this.trait.inputselector) {
            attributes['availableInputs'] = this.available_inputs;
            attributes['commandOnlyInputSelector'] = this.command_only_input_selector;
            attributes['orderedInputs'] = this.ordered_inputs;
        }
        if (this.trait.lighteffects) {
            attributes['defaultSleepDuration'] = this.default_sleep_duration;
            attributes['defaultWakeDuration'] = this.default_wake_duration;
            attributes['supportedEffects'] = this.supported_effects;
        }
        if (this.trait.mediastate) {
            attributes['supportActivityState'] = this.support_activity_state;
            attributes['supportPlaybackState'] = this.support_playback_state;
        }
        if (this.trait.modes) {
            attributes['availableModes'] = this.available_modes;
            attributes['commandOnlyModes'] = this.command_only_modes;
            attributes['queryOnlyModes'] = this.query_only_modes;
        }
        if (this.trait.networkcontrol) {
            attributes['supportsEnablingGuestNetwork'] = this.supports_enabling_guest_network;
            attributes['supportsDisablingGuestNetwork'] = this.supports_disabling_guest_network;
            attributes['supportsGettingGuestNetworkPassword'] = this.supports_getting_guest_network_password;
            attributes['networkProfiles'] = this.network_profiles;
            attributes['supportsEnablingNetworkProfile'] = this.supports_enabling_network_profile;
            attributes['supportsDisablingNetworkProfile'] = this.supports_disabling_network_profile;
            attributes['supportsNetworkDownloadSpeedTest'] = this.supports_network_download_speedtest;
            attributes['supportsNetworkUploadSpeedTest'] = this.supports_network_upload_speedtest;
        }
        if (this.trait.occupancysensing) {
            let occupancysensingattributes = [];
            if (this.occupancy_sensing_pir) {
                if (this.occupied_to_unoccupied_delay_sec_pir) {
                    occupancysensingattributes.push({
                        occupancySensorType: "PIR",
                        occupiedToUnoccupiedDelaySec: this.occupied_to_unoccupied_delay_sec_pir,
                        unoccupiedToOccupiedDelaySec: this.unoccupied_to_occupied_delay_sec_pir,
                        unoccupiedToOccupiedEventThreshold: this.unoccupied_to_occupied_event_threshold_pir
                    });
                } else {
                    occupancysensingattributes.push({
                        occupancySensorType: "PIR"
                    });
                }
            }
            if (this.occupancy_sensing_ultrasonic) {
                if (this.occupied_to_unoccupied_delay_sec_ultrasonic) {
                    occupancysensingattributes.push({
                        occupancySensorType: "ULTRASONIC",
                        occupiedToUnoccupiedDelaySec: this.occupied_to_unoccupied_delay_sec_ultrasonic,
                        unoccupiedToOccupiedDelaySec: this.unoccupied_to_occupied_delay_sec_ultrasonic,
                        unoccupiedToOccupiedEventThreshold: this.unoccupied_to_occupied_event_threshold_ultrasonic
                    });
                } else {
                    occupancysensingattributes.push({
                        occupancySensorType: "ULTRASONIC"
                    });
                }
            }
            if (this.occupancy_sensing_physical_contact) {
                if (this.occupied_to_unoccupied_delay_sec_physical_contact) {
                    occupancysensingattributes.push({
                        occupancySensorType: "PHYSICAL_CONTACT",
                        occupiedToUnoccupiedDelaySec: this.occupied_to_unoccupied_delay_sec_physical_contact,
                        unoccupiedToOccupiedDelaySec: this.unoccupied_to_occupied_delay_sec_physical_contact,
                        unoccupiedToOccupiedEventThreshold: this.unoccupied_to_occupied_event_threshold_physical_contact
                    });
                } else {
                    occupancysensingattributes.push({
                        occupancySensorType: "PHYSICAL_CONTACT"
                    });
                }
            }
            attributes['occupancySensorConfiguration'] = occupancysensingattributes;
        }
        if (this.trait.onoff) {
            attributes['commandOnlyOnOff'] = this.command_only_onoff;
            attributes['queryOnlyOnOff'] = this.query_only_onoff;
        }
        if (this.trait.openclose) {
            attributes['discreteOnlyOpenClose'] = this.discrete_only_openclose;
            attributes['openDirection'] = this.open_direction;
            attributes['commandOnlyOpenClose'] = this.command_only_openclose;
            attributes['queryOnlyOpenClose'] = this.query_only_openclose;
        }
        if (this.trait.rotation) {
            attributes['supportsDegrees'] = this.supports_degrees;
            attributes['supportsPercent'] = this.supports_percent;
            attributes['rotationDegreesRange'] = [{
                rotationDegreesMin: this.rotation_degrees_min,
                rotationDegreesMax: this.rotation_degrees_max
            }];
            attributes['supportsContinuousRotation'] = this.supports_continuous_rotation;
            attributes['commandOnlyRotation'] = this.command_only_rotation;
        }
        if (this.trait.scene) {
            attributes['sceneReversible'] = this.scene_reversible;
        }
        if (this.trait.sensorstate) {
            let sensor_states_supported = [];
            this.sensor_states_supported.forEach(function (sensor_state_name) {
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
        if (this.trait.startstop) {
            attributes['pausable'] = this.pausable;
            attributes['availableZones'] = this.available_zones;
        }
        if (this.trait.temperaturecontrol) {
            attributes['temperatureRange'] = {
                minThresholdCelsius: this.tc_min_threshold_celsius,
                maxThresholdCelsius: this.tc_max_threshold_celsius
            };
            attributes['temperatureStepCelsius'] = this.tc_temperature_step_celsius;
            attributes['temperatureUnitForUX'] = this.tc_temperature_unit_for_ux;
            attributes['commandOnlyTemperatureControl'] = this.command_only_temperaturecontrol;
            attributes['queryOnlyTemperatureControl'] = this.query_only_temperaturecontrol;
        }
        if (this.trait.temperaturesetting) {
            attributes['availableThermostatModes'] = this.available_thermostat_modes;
            attributes['thermostatTemperatureRange'] = {
                minThresholdCelsius: this.min_threshold_celsius,
                maxThresholdCelsius: this.max_threshold_celsius
            };
            attributes['thermostatTemperatureUnit'] = this.thermostat_temperature_unit;
            attributes['bufferRangeCelsius'] = this.buffer_range_celsius;
            attributes['commandOnlyTemperatureSetting'] = this.command_only_temperaturesetting;
            attributes['queryOnlyTemperatureSetting'] = this.query_only_temperaturesetting;
        }
        if (this.trait.timer) {
            attributes['maxTimerLimitSec'] = this.max_timer_limit_sec;
            attributes['commandOnlyTimer'] = this.command_only_timer;
        }
        if (this.trait.toggles) {
            attributes['availableToggles'] = this.available_toggles;
            attributes['commandOnlyToggles'] = this.command_only_toggles;
            attributes['queryOnlyToggles'] = this.query_only_toggles;
        }
        if (this.trait.transportcontrol) {
            attributes['transportControlSupportedCommands'] = this.supported_commands;
        }
        if (this.trait.volume) {
            attributes['volumeMaxLevel'] = this.volume_max_level;
            attributes['volumeCanMuteAndUnmute'] = this.volume_can_mute_and_unmute;
            attributes['volumeDefaultPercentage'] = this.volume_default_percentage;
            attributes['levelStepSize'] = this.level_step_size;
            attributes['commandOnlyVolume'] = this.command_only_volume;
        }
    }

    getDispenseNewState() {
        let dispense = [];
        this.supported_dispense_items.forEach(function (item) {
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
        this.supported_dispense_presets.forEach(function (item) {
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
     * @returns {object}
     */
    initializeStates(device) {
        let states = device.states;

        if (this.trait.appselector) {
            states['currentApplication'] = '';
        }
        if (this.trait.armdisarm) {
            states['isArmed'] = false;
            states['currentArmLevel'] = '';
            // states['exitAllowance'] = 60;
        }
        if (this.trait.brightness) {
            // states['brightness'] = 50;
        }
        if (this.trait.colorsetting) {
            if (!this.command_only_colorsetting) {
                if (this.color_model === "rgb") {
                    states['color'] = { spectrumRgb: 16777215 };
                } else if (this.color_model === "hsv") {
                    states['color'] = {
                        spectrumHsv: {
                            hue: 0.0,           // float, representing hue as positive degrees in the range of [0.0, 360.0)
                            saturation: 0.0,    // float, representing saturation as a percentage in the range [0.0, 1.0]
                            value: 1            // float, representing value as a percentage in the range [0.0, 1.0]
                        }
                    };
                } else {
                    states['color'] = { temperatureK: this.temperature_max_k || 6000 };
                }
            }
        }
        if (this.trait.cook) {
            states['currentCookingMode'] = "NONE";
            states['currentFoodPreset'] = "NONE";
            // states['currentFoodQuantity'] = 0;
            // states['currentFoodUnit'] = "UNKNOWN_UNITS";
        }
        if (this.trait.dispense) {
            states['dispenseItems'] = this.getDispenseNewState();
        }
        if (this.trait.dock) {
            // states['isDocked'] = false;
        }
        if (this.trait.energystorage) {
            states['descriptiveCapacityRemaining'] = "FULL";
            // states['capacityRemaining'] = [];
            if (this.is_rechargeable) {
                // states['capacityUntilFull'] = [];
                states['isCharging'] = false;
            }
            // states['isPluggedIn'] = false;
        }
        if (this.trait.fanspeed) {
            // states['currentFanSpeedSetting'] = "";
            if (!this.command_only_fanspeed && this.supports_fan_speed_percent) {
                states['currentFanSpeedPercent'] = 0;
            }
        }
        if (this.trait.fill) {
            states['isFilled'] = false;
            if (this.available_fill_levels.length > 0) {
                states['currentFillLevel'] = "";
            }
            if (this.supports_fill_percent) {
                states['currentFillPercent'] = 0;
            }
        }
        if (this.trait.humiditysetting) {
            // states['humiditySetpointPercent'] = 52;
            // states['humidityAmbientPercent'] = 52;
        }
        if (this.trait.inputselector) {
            if (!this.command_only_input_selector) {
                if (this.availableInputs && this.availableInputs.length > 0) {
                    states['currentInput'] = this.availableInputs[0].key;
                } else {
                    states['currentInput'] = '';
                }
            }
        }
        if (this.trait.lighteffects) {
            states['activeLightEffect'] = "";
            // states['lightEffectEndUnixTimestampSec'] = 60;
        }
        //if (this.trait.lockunlock) {
        // states['isLocked'] = false;
        // states['isJammed'] = false;
        //}
        //if (this.trait.mediastate) {
        // INACTIVE STANDBY ACTIVE
        // states['activityState'] = 'INACTIVE';
        // PAUSED PLAYING FAST_FORWARDING REWINDING BUFFERING STOPPED
        // states['playbackState'] = 'STOPPED';
        //}
        if (this.trait.modes) {
            if (!this.command_only_modes) {
                states['currentModeSettings'] = {};
                this.updateModesState(device);
            }
        }
        //if (this.trait.networkcontrol) {
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
        //if (this.trait.onoff) {
        // states['on'] = false;
        //}
        if (this.trait.openclose) {
            if (!this.command_only_openclose) {
                if (this.open_direction.length < 2) {
                    states['openPercent'] = 0;
                } else {
                    let openState = [];
                    states['openState'] = openState;
                    this.open_direction.forEach(direction => {
                        openState.push({
                            openPercent: 0,
                            openDirection: direction
                        });
                    });
                }
            }
        }
        /*if (this.trait.rotation) {
            if (this.supports_degrees) {
                // states['rotationDegrees'] = 0;
            }
            if (this.supports_percent) {
                // states['rotationPercent'] = 0;
            }
        }*/
        if (this.trait.runcycle) {
            states['currentRunCycle'] = [{
                currentCycle: "unknown",
                lang: this.lang
            }];
            states['currentTotalRemainingTime'] = 0;
            states['currentCycleRemainingTime'] = 0;
        }
        if (this.trait.sensorstate) {
            let current_sensor_state_data = [];
            this.sensor_states_supported.forEach(function (sensor_state_name) {
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
                delete this.state_types['currentSensorStateData'];
            }
        }
        if (this.trait.softwareupdate) {
            states['lastSoftwareUpdateUnixTimestampSec'] = 0;
        }
        if (this.trait.startstop) {
            states['isRunning'] = false;
            // states['isPaused'] = false;
            // states['activeZones'] = [];
        }
        /*if (this.trait.statusreport) {
            states['currentStatusReport'] = [];
        }*/
        if (this.trait.temperaturecontrol) {
            if (!this.query_only_temperaturecontrol) { // Required if queryOnlyTemperatureControl set to false
                states['temperatureSetpointCelsius'] = this.tc_min_threshold_celsius;
            }
            // states['temperatureAmbientCelsius'] = this.tc_min_threshold_celsius;
        }
        if (this.trait.temperaturesetting) {
            if (!this.command_only_temperaturesetting) {
                // states['activeThermostatMode'] = "none";
                // states['targetTempReachedEstimateUnixTimestampSec'] = this.target_temp_reached_estimate_unix_timestamp_sec;
                // states['thermostatHumidityAmbient'] = this.thermostat_humidity_ambient;
                states['thermostatMode'] = this.available_thermostat_modes.length > 0 ? this.available_thermostat_modes[0] : "";
                states['thermostatTemperatureAmbient'] = this.thermostat_temperature_setpoint;
                // 0
                states['thermostatTemperatureSetpoint'] = this.thermostat_temperature_setpoint;
                // 1
                // states['thermostatTemperatureSetpointHigh'] = this.thermostat_temperature_setpoint_hight;
                // states['thermostatTemperatureSetpointLow'] = this.thermostat_temperature_setpoint_low;
            }
        }
        if (this.trait.timer) {
            if (!this.command_only_timer) {
                states['timerRemainingSec'] = -1;
                // states['timerPaused'] = false;
            }
        }
        if (this.trait.toggles) {
            if (!this.command_only_toggles) {
                states['currentToggleSettings'] = {};
                this.updateTogglesState(device);
            }
        }
        if (this.trait.volume) {
            if (!this.command_only_volume) {
                states['currentVolume'] = this.volume_default_percentage;
                if (this.volume_can_mute_and_unmute) {
                    states['isMuted'] = false;
                }
            }
        }
    }

    /**
     * Updates the status icon of this device node.
     *
     * @param {boolean} is_local - Indicates whether the current command was issued using local fulfillment.
     */
    updateStatusIcon(is_local: boolean) {
        let text = [];
        let fill = 'red';
        let shape = 'dot';
        if (this.states.online) {
            if (this.trait.scene) {
                text.push('OK');
                fill = 'green';
            }
            if (this.trait.onoff) {
                if (this.states.on !== undefined) {
                    if (this.states.on) {
                        text.push('ON');
                        fill = 'green';
                    } else {
                        text.push('OFF');
                    }
                } else {
                    fill = 'blue';
                }
            } else {
                fill = 'blue';
            }
            if (this.trait.brightness && this.states.brightness !== undefined) {
                text.push(`${this.states.brightness} %`);
            }
            if (this.trait.colorsetting && this.states.color.temperatureK !== undefined) {
                text.push(`${this.states.color.temperatureK} K`);
            }
            if (this.trait.colorsetting && this.states.color.spectrumRgb !== undefined) {
                text.push('#' + this.states.color.spectrumRgb.toString(16).toUpperCase().padStart(6, '0'));
            }
            if (this.trait.colorsetting && this.states.color.spectrumHsv !== undefined) {
                text.push('H: ' + this.states.color.spectrumHsv.hue +
                    ' S: ' + this.states.color.spectrumHsv.saturation +
                    ' V: ' + this.states.color.spectrumHsv.value);
            }
            if (this.trait.openclose) {
                if (this.states.openPercent !== undefined) {
                    if (this.states.openPercent === 0) {
                        text.push('CLOSED');
                        fill = 'green';
                    } else {
                        text.push(this.discrete_only_openclose ? 'OPEN' : util.format("OPEN %d%%", this.states.openPercent));
                    }
                }
            }
            if (this.trait.startstop) {
                if (this.pausable && this.states.isPaused) {
                    text.push('Paused');
                    fill = 'yellow';
                } else {
                    text.push(this.states.isRunning ? 'Started' : 'Stopped');
                    fill = this.states.isRunning ? 'green' : 'red';
                }
            }
            if (this.trait.humiditysetting) {
                if (this.states.humidityAmbientPercent !== undefined) {
                    text.push('H: ' + this.states.humidityAmbientPercent + "% ");
                }
                if (this.states.humiditySetpointPercent !== undefined) {
                    text.push('TH: ' + this.states.humiditySetpointPercent + "% ");
                }
            }
            if (this.trait.temperaturecontrol) {
                if (this.states.temperatureAmbientCelsius !== undefined) {
                    text.push('TC: ' + this.states.temperatureAmbientCelsius);
                }
                if (this.states.temperatureSetpointCelsius !== undefined) {
                    text.push(' SC: ' + this.states.temperatureSetpointCelsius);
                }
            }
            if (this.trait.temperaturesetting) {
                const thermostat_mode = this.states.thermostatMode;
                const st = " T: " + (this.states.thermostatTemperatureAmbient || '?') + "°C | S: " + (this.states.thermostatTemperatureSetpoint || '?');
                if (thermostat_mode === "off") {
                    text.push('OFF ' + st);
                } else if (thermostat_mode === "heat" || thermostat_mode === "cool") {
                    fill = "green";
                    text.push(thermostat_mode.substring(0, 1).toUpperCase() + st);
                } else if (thermostat_mode === "heatcool") {
                    fill = "green";
                    text.push('H/C T: ' + (this.states.thermostatTemperatureAmbient || '?') + "°C | S: [" + (this.states.thermostatTemperatureSetpointLow || '') + " - " + (this.states.thermostatTemperatureSetpointHigh || ''));
                } else {
                    fill = "green";
                    text.push(thermostat_mode.substring(0, 1).toUpperCase() + st);
                }
                if (this.states.thermostatHumidityAmbient !== undefined) {
                    text.push(this.states.thermostatHumidityAmbient + "%");
                }
            }
            if (this.trait.energystorage) {
                text.push(this.states.descriptiveCapacityRemaining);
            }
            if (this.trait.armdisarm) {
                if (this.states.isArmed) {
                    if (this.states.currentArmLevel) {
                        text.push(this.states.currentArmLevel);
                    }
                } else {
                    text.push('DISARMED');
                }
            }
            if (this.trait.fanspeed) {
                if (typeof this.states.currentFanSpeedPercent === 'number') {
                    text.push(this.states.currentFanSpeedPercent + '%');
                }
                if (typeof this.states.currentFanSpeedSetting === 'string') {
                    text.push(this.states.currentFanSpeedSetting);
                }
            }
            if (this.trait.sensorstate) {
                if (Array.isArray(this.states.currentSensorStateData)) {
                    this.states.currentSensorStateData.forEach(sensor => {
                        const currentSensorStateSet = sensor.currentSensorState !== undefined && sensor.currentSensorState !== 'unknown';
                        if (currentSensorStateSet || sensor.rawValue !== undefined) {
                            text.push(sensor.name);
                            if (currentSensorStateSet) {
                                text.push(sensor.currentSensorState);
                            }
                            if (sensor.rawValue !== undefined) {
                                text.push(sensor.rawValue);
                            }
                        }
                    });
                }
            }
            if (this.trait.lockunlock) {
                if (this.states.isJammed) {
                    text.push('JAMMED');
                } else if (typeof this.states.isLocked === 'boolean') {
                    text.push(this.states.isLocked ? ' LOCKED' : ' UNLOCKED');
                }
            }
            if (this.trait.runcycle) {
                if(
                    typeof this.states.currentRunCycle !== 'undefined' &&
                    typeof this.states.currentRunCycle[0] !== 'undefined' &&
                    typeof this.states.currentRunCycle[0].currentCycle !== 'undefined' &&
                    this.states.currentRunCycle[0].currentCycle !== 'unknown'
                ) {
                    text.push(this.states.currentRunCycle[0].currentCycle);
                }
            }
            if (this.trait.occupancysensing) {
                if(typeof this.states.occupancy !== 'undefined')
                    text.push(this.states.occupancy);
            }
        } else {
            shape = 'ring';
            text.push("offline");
        }
        if(text.length === 0) {
            shape = fill = '';
        }
        if (is_local) {
            shape = 'ring';
        }
        text = text.join(' | ');
        this.status({ fill: fill, shape: shape, text: text });
    }

    /******************************************************************************************************************
     * called when state is updated from Google Assistant
     *
     * @param {boolean} is_local - Indicates whether the current command was issued using local fulfillment.
     */
    updated(g_command, exe_result, is_local: boolean) {
        let command = g_command.command.startsWith('action.devices.commands.') ? g_command.command.substr(24) : g_command.command;
        let params = exe_result.params || {};
        this._debug(".updated: g_command = " + JSON.stringify(g_command));
        this._debug(".updated: exe_result = " + JSON.stringify(exe_result));

        const modified = this.updateState(params);
        if (modified) {
            if (this.persistent_state) {
                this.clientConn.app.ScheduleGetState();
            }
        }

        this.updateStatusIcon(is_local);

        let msg = {
            device_name: this.device.properties.name.name,
            command: command,
            params: g_command.params,
            payload: {},
        };

        if (this.topicOut)
            msg.topic = this.topicOut;

        // Copy the device state to the payload
        this.cloneObject(msg.payload, this.states, this.state_types);

        // Copy the exe_result params to the payload
        if (exe_result.params) {
            Object.keys(exe_result.params).forEach(function (key) {
                if (!Object.prototype.hasOwnProperty.call(msg.payload, key) && !exe_result.executionStates.includes(key)) {
                    msg.payload[key] = exe_result.params[key];
                }
            });
        }

        this.send(msg);
    }

    /**
     * respond to inputs from NodeRED
     *
     * @param {object} msgi - The incoming message
     * @param {Function} send - Function to send outgoing messages
     * @param {Function} done - Function to inform the runtime that this node has finished its operation
     */
    onInput(msgi, send, done) {
        if(!send) send = () => { this.send.apply(this, arguments) };
        let msg = msgi;
        if (this.topic_filter && !(msg.topic || '').toString().startsWith(this.topicOut)) {
            if(done) done();
            return;
        }
        if (this.topic_filter && msg.payload.topic && (msg.topic || '').toString().startsWith(this.topicOut)) {
            msg.topic = msg.payload.topic;
        }
        this._debug(".input: topic = " + msg.topic);

        let upper_topic = '';
        if (msg.topic) {
            let topicArr = String(msg.topic).split(this.topicDelim);
            let topic = topicArr[topicArr.length - 1].trim();   // get last part of topic
            upper_topic = topic.toUpperCase();
        }

        try {
            if (upper_topic === 'GETSTATE') {
                let states = {};
                this.cloneObject(states, this.states, this.state_types);
                send({
                    topic: msg.topic,
                    payload: states,
                    device_id: this.device.id
                });
            } else if (upper_topic === 'ERRORCODE') {
                if (typeof msg.payload === 'string' && msg.payload.trim()) {
                    this.errorCode = msg.payload.trim();
                } else {
                    this.errorCode = undefined;
                }
            } else if (upper_topic === 'AVAILABLEAPPLICATIONS') {
                if (this.trait.appselector) {
                    if (this.appselector_type === 'str') {
                        const filename = this.appselector_file.replace(/<id>/g, this.id);
                        if (typeof msg.payload !== 'undefined') {
                            this.available_applications = this.to_available_applications(msg.payload);
                            this.writeJson('Applications', filename, this.available_applications);
                        } else {
                            this.available_applications = this.to_available_applications(this.loadJson('Applications', filename, []));
                        }
                    } else {
                        if (typeof msg.payload !== 'undefined') {
                            this.available_applications = this.to_available_applications(msg.payload);
                        }
                    }
                    this.device.properties.attributes.availableApplications = this.available_applications;
                    this.updateStateTypesForTraits();
                    this.clientConn.app.ScheduleRequestSync();
                } else {
                    this.error("Got AVAILABLEAPPLICATIONS message, but AppSelector trait is disabled");
                }
            } else if (upper_topic === 'AVAILABLEARMLEVELS') {
                if (this.trait.armdisarm) {
                    if (this.available_arm_levels_type === 'str') {
                        const filename = this.available_arm_levels_file.replace(/<id>/g, this.id)
                        if (typeof msg.payload !== 'undefined') {
                            this.available_arm_levels = this.to_available_arm_levels(msg.payload);
                            this.writeJson('Arm levels', filename, this.available_arm_levels);
                        } else {
                            this.available_arm_levels = this.to_available_arm_levels(this.loadJson('Arm levels', filename, []));
                        }
                    } else {
                        if (typeof msg.payload !== 'undefined') {
                            this.available_arm_levels = this.to_available_arm_levels(msg.payload);
                        }
                    }
                    this.device.properties.attributes.availableArmLevels.levels = this.available_arm_levels;
                    this.updateStateTypesForTraits();
                    this.clientConn.app.ScheduleRequestSync();
                } else {
                    this.error("Got AVAILABLEARMLEVELS message, but ArmDisarm trait is disabled");
                }
            } else if (upper_topic === 'AVAILABLECHANNELS') {
                if (this.trait.channel) {
                    if (this.channel_type === 'str') {
                        const filename = this.channel_file.replace(/<id>/g, this.id);
                        if (typeof msg.payload !== 'undefined') {
                            this.available_channels = this.to_available_channels(msg.payload);
                            this.writeJson('Channels', filename, this.available_channels);
                        } else {
                            this.available_channels = this.to_available_channels(this.loadJson('Channels', filename, []));
                        }
                    } else {
                        if (typeof msg.payload !== 'undefined') {
                            this.available_channels = [];
                        }
                    }
                    this.device.properties.attributes.availableChannels = this.available_channels;
                    this.updateStateTypesForTraits();
                    this.clientConn.app.ScheduleRequestSync();
                } else {
                    this.error("Got AVAILABLECHANNELS message, but Channel trait is disabled");
                }
            } else if (upper_topic === 'SUPPORTEDDISPENSEITEMS') {
                if (this.trait.dispense) {
                    if (this.supported_dispense_items_type === 'str') {
                        const filename = this.supported_dispense_items_file.replace(/<id>/g, this.id);
                        if (typeof msg.payload !== 'undefined') {
                            this.supported_dispense_items = this.to_supported_dispense_items(msg.payload);
                            this.writeJson('Dispense items', filename, this.supported_dispense_items);
                        } else {
                            this.supported_dispense_items = this.to_supported_dispense_items(this.loadJson('Dispense items', filename, []));
                        }
                    } else {
                        if (typeof msg.payload !== 'undefined') {
                            this.supported_dispense_items = this.to_supported_dispense_items(msg.payload);
                        }
                    }
                    this.device.properties.attributes.supportedDispenseItems = this.supported_dispense_items;
                    this.states['dispenseItems'] = this.getDispenseNewState();
                    this.updateStateTypesForTraits();
                    this.clientConn.app.ScheduleRequestSync();
                } else {
                    this.error("Got SUPPORTEDDISPENSEITEMS message, but Dispense trait is disabled");
                }
            } else if (upper_topic === 'SUPPORTEDDISPENSEPRESETS') {
                if (this.trait.dispense) {
                    if (this.supported_dispense_presets_type === 'str') {
                        const filename = this.supported_dispense_presets_file.replace(/<id>/g, this.id);
                        if (typeof msg.payload !== 'undefined') {
                            this.supported_dispense_presets = this.to_supported_dispense_presets(msg.payload);
                            this.writeJson('Dispense presets', filename, this.supported_dispense_presets);
                        } else {
                            this.supported_dispense_presets = this.to_supported_dispense_presets(this.loadJson('Dispense presets', filename, []));
                        }
                    } else {
                        if (typeof msg.payload !== 'undefined') {
                            this.supported_dispense_presets = this.to_supported_dispense_presets(msg.payload);
                        }
                    }
                    this.device.properties.attributes.supportedDispensePresets = this.supported_dispense_presets;
                    this.states['dispenseItems'] = this.getDispenseNewState();
                    this.updateStateTypesForTraits();
                    this.clientConn.app.ScheduleRequestSync();
                } else {
                    this.error("Got SUPPORTEDDISPENSEPRESETS message, but Dispense trait is disabled");
                }
            } else if (upper_topic === 'AVAILABLEFANSPEEDS') {
                if (this.trait.fanspeed) {
                    if (this.available_fan_speeds_type === 'str') {
                        const filename = this.available_fan_speeds_file.replace(/<id>/g, this.id);
                        if (typeof msg.payload !== 'undefined') {
                            this.available_fan_speeds = this.to_available_fan_speeds(msg.payload);
                            this.writeJson('Fan speeds', filename, this.available_fan_speeds);
                        } else {
                            this.available_fan_speeds = this.to_available_fan_speeds(this.loadJson('Fan speeds', filename, []));
                        }
                    } else {
                        if (typeof msg.payload !== 'undefined') {
                            this.available_fan_speeds = this.to_available_fan_speeds(msg.payload);
                        }
                    }
                    this.device.properties.attributes.availableFanSpeeds.speeds = this.available_fan_speeds;
                    this.updateStateTypesForTraits();
                    this.clientConn.app.ScheduleRequestSync();
                } else {
                    this.error("Got AVAILABLEFANSPEEDS message, but FanSpeed trait is disabled");
                }
            } else if (upper_topic === 'AVAILABLEFILLLEVELS') {
                if (this.trait.dispense) {
                    if (this.available_fill_levels_type === 'str') {
                        const filename = this.available_fill_levels_file.replace(/<id>/g, this.id);
                        if (typeof msg.payload !== 'undefined') {
                            this.available_fill_levels = this.to_available_fill_levels(msg.payload);
                            this.writeJson(' Fill levels', filename, this.available_fill_levels);
                        } else {
                            this.available_fill_levels = this.to_available_fill_levels(this.loadJson(' Fill levels', filename, []));
                        }
                    } else {
                        if (typeof msg.payload !== 'undefined') {
                            this.available_fill_levels = this.to_available_fill_levels(msg.payload);
                        }
                    }
                    this.device.properties.attributes.availableFillLevels.levels = this.available_fill_levels;
                    this.updateStateTypesForTraits();
                    this.clientConn.app.ScheduleRequestSync();
                } else {
                    this.error("Got AVAILABLEFILLLEVELS message, but Fill trait is disabled");
                }
            } else if (upper_topic === 'AVAILABLEFOODPRESETS') {
                if (this.trait.cook) {
                    if (this.food_presets_type === 'str') {
                        const filename = this.food_presets_file.replace(/<id>/g, this.id);
                        if (typeof msg.payload !== 'undefined') {
                            this.food_presets = this.to_food_presets(msg.payload);
                            this.writeJson('Food presets', filename, this.food_presets);
                        } else {
                            this.food_presets = this.to_food_presets(this.loadJson('Food presets', filename, []));
                        }
                    } else {
                        if (typeof msg.payload !== 'undefined') {
                            this.food_presets = this.to_food_presets(msg.payload);
                        }
                    }
                    this.device.properties.attributes.foodPresets = this.food_presets;
                    this.updateStateTypesForTraits();
                    this.clientConn.app.ScheduleRequestSync();
                } else {
                    this.error("Got AVAILABLEFOODPRESETS message, but Cook trait is disabled");
                }
            } else if (upper_topic === 'AVAILABLEINPUTS') {
                if (this.trait.inputselector) {
                    if (this.inputselector_type === 'json') {
                        const filename = this.inputselector_file.replace(/<id>/g, this.id)
                        if (typeof msg.payload !== 'undefined') {
                            this.available_inputs = this.to_available_inputs(msg.payload);
                            this.writeJson('Inputs', filename, this.available_inputs);
                        } else {
                            this.available_inputs = this.to_available_inputs(this.loadJson('Inputs', filename, []));
                        }
                    } else {
                        if (typeof msg.payload !== 'undefined') {
                            this.available_inputs = this.to_available_inputs(msg.payload);
                        }
                    }
                    this.device.properties.attributes.availableInputs = this.available_inputs;
                    this.updateStateTypesForTraits();
                    this.clientConn.app.ScheduleRequestSync();
                } else {
                    this.error("Got AVAILABLEINPUTS message, but InputSelector trait is disabled");
                }
            } else if (upper_topic === 'AVAILABLEMODES') {
                if (this.trait.modes) {
                    if (this.modes_type !== 'json') {
                        const filename = this.modes_file.replace(/<id>/g, this.id);
                        if (typeof msg.payload !== 'undefined') {
                            this.available_modes = this.to_available_modes(msg.payload);
                            this.writeJson('Modes', filename, this.available_modes);
                        } else {
                            this.available_modes = this.to_available_modes(this.loadJson('Modes', filename, []));
                        }
                    } else {
                        if (typeof msg.payload !== 'undefined') {
                            this.available_modes = this.to_available_modes(msg.payload);
                        }
                    }
                    this.device.properties.attributes.availableModes = this.available_modes;
                    this.updateStateTypesForTraits();
                    this.updateModesState(this);
                    this.clientConn.app.ScheduleRequestSync();
                } else {
                    this.error("Got AVAILABLEMODES message, but Modes trait is disabled");
                }
            } else if (upper_topic === 'AVAILABLETOGGLES') {
                if (this.trait.toggles) {
                    if (this.toggles_type === 'str') {
                        const filename = this.toggles_file.replace(/<id>/g, this.id);
                        if (typeof msg.payload !== 'undefined') {
                            this.available_toggles = this.to_available_toggles(msg.payload);
                            this.writeJson('Toggles', filename, this.available_toggles);
                        } else {
                            this.available_toggles = this.to_available_toggles(this.loadJson('Toggles', filename, []));
                        }
                    } else {
                        if (typeof msg.payload !== 'undefined') {
                            this.available_toggles = this.to_available_toggles(msg.payload);
                        }
                    }
                    this.device.properties.attributes.availableToggles = this.available_toggles;
                    this.updateStateTypesForTraits();
                    this.updateTogglesState(this);
                    this.clientConn.app.ScheduleRequestSync();
                } else {
                    this.error("Got AVAILABLETOGGLES message, but Toggles trait is disabled");
                }
            } else if (upper_topic === 'CAMERASTREAMAUTHTOKEN') {
                const auth_token = Formats.formatValue('cameraStreamAuthToken', msg.payload, Formats.STRING, '');
                //if (auth_token != this.auth_token) {
                this.auth_token = auth_token;
                /*if (Object.prototype.hasOwnProperty.call(this.device.properties.attributes, "cameraStreamNeedAuthToken")) {
                    let cameraStreamNeedAuthToken = this.device.properties.attributes.cameraStreamNeedAuthToken;
                    if (cameraStreamNeedAuthToken != (auth_token.length > 0)) {
                        this.device.properties.attributes['cameraStreamNeedAuthToken'] = auth_token.length > 0;
                        this.clientConn.app.ScheduleRequestSync();
                    }
                }*/
                //}
            } else if (upper_topic === 'GUESTNETWORKPASSWORD') {
                this.guest_network_password = Formats.formatValue('guestNetworkPassword', msg.payload, Formats.STRING);
            } else if (this.trait.objectdetection && upper_topic === 'OBJECTDETECTION') {
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
            } else if (this.trait.runcycle && upper_topic === 'RUNCYCLE') {
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
            } else if (this.trait.sensorstate && upper_topic === 'SENSORSTATE') {
                if (typeof msg.payload.name === 'string' && msg.payload.name.trim() && this.sensor_states_supported.includes(msg.payload.name.trim())) {
                    let payload = { priority: 0 };
                    payload.name = msg.payload.name.trim();
                    if (typeof msg.payload.currentSensorState === 'string' && msg.payload.currentSensorState.trim()) {
                        payload.currentSensorState = msg.payload.currentSensorState.trim();
                        this.clientConn.sendNotifications(this, {
                            SensorState: payload
                        });  // tell Google ...
                    }
                }
            } else if (this.trait.lockunlock && upper_topic === 'LOCKUNLOCK') {
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
            } else if (this.trait.networkcontrol && upper_topic === 'NETWORKCONTROL') {
                this.clientConn.sendNotifications(this, {
                    NetworkControl: {
                        priority: 0,
                        followUpResponse: msg.payload
                    }
                });  // tell Google ...
            } else if (this.trait.openclose && upper_topic === 'OPENCLOSE') {
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
            } else if (this.trait.statusreport && upper_topic === 'STATUSREPORT') {
                // Update or Add reports based on deviceTarget and statusCode
                let payload = Array.isArray(msg.payload) ? msg.payload : [msg.payload];
                let new_payload = [];
                const status_report_type = this.state_types['currentStatusReport'].attributes;
                if (typeof this.states.currentStatusReport !== 'undefined') {
                    this.states.currentStatusReport.forEach(report => {
                        let new_report = { priority: 0 };
                        this.cloneObject(new_report, report, status_report_type);
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
                        this.cloneObject(new_report, sr, status_report_type);
                        if (new_report.statusCode) {
                            new_report.deviceTarget = nodeId;
                            let cur_reports = new_payload.filter(report => report.deviceTarget === nodeId && report.statusCode === new_report.statusCode);
                            if (cur_reports.length > 0) {
                                if (this.cloneObject(cur_reports[0], new_report, status_report_type)) {
                                    differs = true;
                                }
                            } else {
                                new_payload.push(new_report);
                                differs = true;
                            }
                        }
                    }
                });
                if (this.updateState({ currentStatusReport: new_payload }) || differs) {
                    this.clientConn.reportState(this.id);  // tell Google ...
                    if (this.persistent_state) {
                        this.clientConn.app.ScheduleGetState();
                    }
                    // if (this.passthru) {
                    //     msg.payload = new_payload;
                    //     this.send(msg);
                    // }
                }
            } else if (upper_topic === 'SETCHALLENGEPIN') {
                const pin = String(msg.payload.pin || '');
                switch (msg.payload.command) {
                    case 'action.devices.commands.appInstall':
                    case 'action.devices.commands.appSearch':
                    case 'action.devices.commands.appSelect':
                        this.pin_appselector = pin;
                        break;
                    case 'action.devices.commands.ArmDisarm':
                        this.pin_armdisarm = pin;
                        break;
                    case 'action.devices.commands.BrightnessAbsolute':
                    case 'action.devices.commands.BrightnessRelative':
                        this.pin_brightness = pin;
                        break;
                    case 'action.devices.commands.GetCameraStream':
                        this.pin_camerastream = pin;
                        break;
                    case 'action.devices.commands.selectChannel':
                    case 'action.devices.commands.relativeChannel':
                    case 'action.devices.commands.returnChannel':
                        this.pin_channel = pin;
                        break;
                    case 'action.devices.commands.ColorAbsolute':
                        this.pin_colorsetting = pin;
                        break;
                    case 'action.devices.commands.Cook':
                        this.pin_cook = pin;
                        break;
                    case 'action.devices.commands.Dispense':
                        this.pin_dispense = pin;
                        break;
                    case 'action.devices.commands.Dock':
                        this.pin_dock = pin;
                        break;
                    case 'action.devices.commands.Charge':
                        this.pin_energystorage = pin;
                        break;
                    case 'action.devices.commands.SetFanSpeed':
                    case 'action.devices.commands.SetFanSpeedRelative':
                    case 'action.devices.commands.Reverse':
                        this.pin_fanspeed = pin;
                        break;
                    case 'action.devices.commands.Fill':
                        this.pin_fill = pin;
                        break;
                    case 'action.devices.commands.SetHumidity':
                    case 'action.devices.commands.HumidityRelative':
                        this.pin_humiditysetting = pin;
                        break;
                    case 'action.devices.commands.SetInput':
                    case 'action.devices.commands.NextInput':
                    case 'action.devices.commands.PreviousInput':
                        this.pin_inputselector = pin;
                        break;
                    case 'action.devices.commands.ColorLoop':
                    case 'action.devices.commands.Sleep':
                    case 'action.devices.commands.StopEffect':
                    case 'action.devices.commands.Wake':
                        this.pin_colorsetting = pin;
                        break;
                    case 'action.devices.commands.Locate':
                        this.pin_locator = pin;
                        break;
                    case 'action.devices.commands.LockUnlock':
                        this.pin_lockunlock = pin;
                        break;
                    case 'action.devices.commands.SetModes':
                        this.pin_modes = pin;
                        break;
                    case 'action.devices.commands.EnableDisableGuestNetwork':
                    case 'action.devices.commands.EnableDisableNetworkProfile':
                    case 'action.devices.commands.GetGuestNetworkPassword':
                    case 'action.devices.commands.TestNetworkSpeed':
                        this.pin_networkcontrol = pin;
                        break;
                    case 'action.devices.commands.OnOff':
                        this.pin_onoff = pin;
                        break;
                    case 'action.devices.commands.OpenClose':
                    case 'action.devices.commands.OpenCloseRelative':
                        this.pin_openclose = pin;
                        break;
                    case 'action.devices.commands.Reboot':
                        this.pin_reboot = pin;
                        break;
                    case 'action.devices.commands.RotateAbsolute':
                        this.pin_rotation = pin;
                        break;
                    case 'action.devices.commands.ActivateScene':
                        this.pin_scene = pin;
                        break;
                    case 'action.devices.commands.SoftwareUpdate':
                        this.pin_softwareupdate = pin;
                        break;
                    case 'action.devices.commands.StartStop':
                    case 'action.devices.commands.PauseUnpause':
                        this.pin_startstop = pin;
                        break;
                    case 'action.devices.commands.SetTemperature':
                        this.pin_temperaturecontrol = pin;
                        break;
                    case 'action.devices.commands.ThermostatTemperatureSetpoint':
                    case 'action.devices.commands.ThermostatTemperatureSetRange':
                    case 'action.devices.commands.ThermostatSetMode':
                    case 'action.devices.commands.TemperatureRelative':
                        this.pin_temperaturesetting = pin;
                        break;
                    case 'action.devices.commands.TimerStart':
                    case 'action.devices.commands.TimerAdjust':
                    case 'action.devices.commands.TimerPause':
                    case 'action.devices.commands.TimerResume':
                    case 'action.devices.commands.TimerCancel':
                        this.pin_timer = pin;
                        break;
                    case 'action.devices.commands.SetToggles':
                        this.pin_toggles = pin;
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
                        this.pin_transportcontrol = pin;
                        break;
                    case 'action.devices.commands.mute':
                    case 'action.devices.commands.setVolume':
                    case 'action.devices.commands.volumeRelative':
                        this.pin_volume = pin;
                        break;
                }
            } else {
                let state_key = '';
                Object.keys(this.state_types).forEach((key) => {
                    if (upper_topic === key.toUpperCase()) {
                        state_key = key;
                        this._debug(".input: found state " + state_key);
                    }
                });

                if (state_key !== '') {
                    let payload = {};
                    payload[state_key] = msg.payload;
                    msg = {
                        payload: payload
                    };
                } else {
                    this._debug(".input: some other topic");
                }
                const differs = this.updateState(msg.payload || {});

                if (differs) {
                    if (msgi.stateOutput) {
                        let states = {};
                        this.cloneObject(states, this.states, this.state_types);
                        send({ topic: this.topicOut, payload: states });
                    }
                    this.clientConn.reportState(this.id);  // tell Google ...
                    if (this.persistent_state) {
                        this.clientConn.app.ScheduleGetState();
                    }
                    this.updateStatusIcon(false);
                }
                if (this.passthru) {
                    send(msgi);
                }

                if(done) done();
            }
        } catch (err) {
            if(done)
                done(err);
            else
                this.error(err);
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
        this._debug(".updateTogglesState");
        let states = device.states || {};
        const currentToggleSettings = states['currentToggleSettings']
        let new_toggles = {};
        this.available_toggles.forEach(function (toggle) {
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
        this._debug(".updateModesState");
        let states = device.states || {};
        const currentModeSettings = states['currentModeSettings']
        let new_modes = {};
        this.available_modes.forEach(function (mode) {
            let value = '';
            if (typeof currentModeSettings[mode.name] === 'string') {
                value = currentModeSettings[mode.name];
            }
            new_modes[mode.name] = value;
        });
        states['currentModeSettings'] = new_modes;
    }

    getTraits() {
        const trait = this.trait;
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

    /**
     * Updates the states of this device with new values.
     *
     * @param {Object} from_states - The new states values.
     * @returns {string[]} - Array of the state keys that were modified.
     */
    updateState(from_states) {
        let modified = [];
        this._debug('updateState current state ' + JSON.stringify(this.states));
        Object.keys(this.state_types).forEach(key => {
            if (Object.prototype.hasOwnProperty.call(from_states, key)) {
                let o_modified = this.setState(key, from_states[key], this.states, this.state_types[key]);
                if (o_modified) {
                    this._debug('.updateState set "' + key + '" to ' + JSON.stringify(from_states[key]));
                    modified.push(o_modified);
                }
            }
        });
        let thermostat_modified = false;
        if (modified.includes("thermostatTemperatureSetpoint")) {
            this.thermostat_temperature_setpoint = this.states.thermostatTemperatureSetpoint;
            thermostat_modified = true;
        }
        if (modified.includes("thermostatTemperatureSetpointLow")) {
            this.thermostat_temperature_setpoint_low = this.states.thermostatTemperatureSetpointLow;
            thermostat_modified = true;
        }
        if (modified.includes("thermostatTemperatureSetpointHigh")) {
            this.thermostat_temperature_setpoint_hight = this.states.thermostatTemperatureSetpointHigh;
            thermostat_modified = true;
        }
        if (thermostat_modified | modified.includes("thermostatMode")) {
            let keys_to_update = [];
            if (this.states.thermostatMode === 'heatcool') {
                keys_to_update = ['thermostatTemperatureSetpointLow', 'thermostatTemperatureSetpointHigh'];
                from_states = {
                    thermostatTemperatureSetpointLow: this.thermostat_temperature_setpoint_low,
                    thermostatTemperatureSetpointHigh: this.thermostat_temperature_setpoint_hight
                };
            } else {
                keys_to_update = ['thermostatTemperatureSetpoint'];
                from_states = {
                    thermostatTemperatureSetpoint: this.thermostat_temperature_setpoint
                };
            }
            keys_to_update.forEach(key => {
                if (this.setState(key, from_states[key], this.states, this.state_types[key])) {
                    this._debug('.updateState: set "' + key + '" to ' + JSON.stringify(this.states[key]));
                    modified.push(key);
                }
            });
        }
        this._debug('.updateState: new State ' + JSON.stringify(modified) + ' = ' + JSON.stringify(this.states));
        return modified;
    }

    //
    //
    //
    //
    cloneObject(to_obj, from_obj, state_values) {
        let differs = false;
        Object.keys(state_values).forEach((key) => {
            const value_type = typeof state_values[key] === 'number' ? state_values[key] : state_values[key].type;
            const default_value_defined = typeof state_values[key].defaultValue !== 'undefined';
            const new_value = typeof from_obj[key] !== 'undefined' ? from_obj[key] : state_values[key].defaultValue;
            if ((typeof from_obj[key] !== 'undefined' && from_obj[key] != null) || default_value_defined) {
                if (this.setState(key, new_value, to_obj, state_values[key] || {})) {
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
        let differs = false;
        let old_state = typeof state === 'object' ? state[key] : {};
        let new_state = undefined;
        if (typeof state_type === 'number') {
            state_type = {
                type: state_type
            };
        }
        const exclusive_states = state_type.exclusiveStates || [];
        if (value == null) {
            if (state_type.type & Formats.MANDATORY) {
                this.error("key " + key + " is mandatory.");
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
                    is_valid_key = true;
                }
                value.forEach((new_obj, idx) => {
                    let cur_obj;
                    if (key_id) {
                        let f_arr;
                        let cloned_net_obj = {};
                        this.cloneObject(cloned_net_obj, new_obj, state_type.attributes);
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
                            this.error('More than one "' + key + '" for "' + key_id + '" "' + cloned_net_obj[key_id] + '"');
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
                        if (this.cloneObject(cur_obj, new_obj, state_type.attributes)) {
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
                this.error('key "' + key + '" must be an object.');
            } else {
                if (state[key] === undefined) {
                    state[key] = {};
                    old_state = state[key];
                }
                let mandatory_to_delete = [];
                let o_differs = [];
                Object.keys(state_type.attributes).forEach((ikey) => {
                    // console.log("---> Attributes key " + ikey + " " + JSON.stringify(value[ikey]));
                    if (typeof value[ikey] !== 'undefined' && value[ikey] != null) {
                        if (typeof old_state[ikey] == 'undefined') {
                            old_state[ikey] = {};
                        }
                        if (this.setState(ikey, value[ikey], old_state, state_type.attributes[ikey])) {
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
                        this.error('key "' + key + '.' + ikey + '" is mandatory.');
                    }
                });
                if (Object.keys(differs).length > 0) {
                    new_state = state[key];
                }
            }
        } else if (state_type.type & Formats.COPY_OBJECT) {
            if (typeof value !== 'object' || Array.isArray(value)) {
                this.error('key "' + key + '" must be an object.');
            } else {
                Object.keys(old_state).forEach((ikey) => {
                    if (typeof value[ikey] !== 'undefined') {
                        if (this.setState(ikey, value[ikey], old_state, state_type.type - Formats.COPY_OBJECT)) {
                            differs = key;
                        }
                    }
                });
            }
        } else {
            new_state = Formats.formatValue(key, value, state_type.type & Formats.PRIMITIVE, state_type.defaultValue);
            if (state_type.min !== undefined && new_state < state_type.min) {
                this.error('key "' + key + '" must be greather or equal than ' + state_type.min);
                new_state = undefined;
            }
            if (new_state !== undefined && state_type.max !== undefined && new_state > state_type.max) {
                this.error('key "' + key + '" must be lower or equal than ' + state_type.max);
                new_state = undefined;
            }
            if (new_state !== undefined && Array.isArray(state_type.values) && !state_type.values.includes(new_state)) {
                this.error('key "' + key + '" must be one of ' + JSON.stringify(state_type.values));
                if (state_type.values.includes(state[key])) {
                    new_state = undefined;
                } else {
                    new_state = state_type.defaultValue;
                }
            }
        }
        if (new_state !== undefined && !(state_type.type & (Formats.OBJECT | Formats.ARRAY))) {
            if (old_state !== new_state) {
                differs = key;
            }
            state[key] = new_state;
        }
        if (new_state !== undefined && exclusive_states.length > 0) {
            exclusive_states.forEach(rkey => delete state[rkey]);
        }
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
        let f = (data_in, data_out) => {
            if (Array.isArray(data_in.settings)) {
                data_out.settings = this.key_name_synonym("Modes settings", data_in.settings, 'setting_name', 'setting_values', 'setting_synonym');
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
        this._debug(".key_name_synonym: Parsing " + type);
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
                                    lang = this.lang;
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
                                    this.error("key_name_synonym error " + type + ": missing array key " + key3 + " for " + rec[key1]);
                                }
                            } else {
                                if (typeof names === 'string' && names.trim() && !new_rec[key2].includes(names.trim())) {
                                    new_rec[key2].push(names.trim());
                                } else {
                                    this.error("key_name_synonym error " + type + ": missing array key " + key2 + " for " + rec[key1]);
                                }
                            }
                        });
                        if (new_rec[key2].length > 0) {
                            let ok = true;
                            if (!key3) {
                                ok = manage_other_fields(rec, new_rec);
                                if (!ok) {
                                    this.error("key_name_synonym error " + type + ": manage_other_fields error for " + rec[key1]);
                                }
                            }
                            if (ok) {
                                new_data.push(new_rec);
                            }
                        } else {
                            this.error("key_name_synonym error " + type + ": " + key2 + " empty for " + rec[key1]);
                        }
                    } else {
                        this.error("key_name_synonym error " + type + ": " + new_rec[key1] + " already exists");
                    }
                } else {
                    this.error("key_name_synonym error " + type + ": missing key " + key1 + " at position " + pos);
                }
            });
        }
        this._debug(".key_name_synonym parser " + type + " : " + JSON.stringify(new_data));
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
        let params = {};
        let executionStates = ['online'];
        const ok_result = {
            'params': params,
            'executionStates': executionStates
        };

        this._debug(".execCommand: command " + JSON.stringify(command));

        if (this.errorCode) {
            this._debug(".execCommand: errorCode " + JSON.stringify(this.errorCode));
            return {
                status: 'ERROR',
                errorCode: this.errorCode
            };
        }

        this._debug(".execCommand: states " + JSON.stringify(this.states));
        // this._debug(".execCommand: device " +  JSON.stringify(device));
        // this._debug(".execCommand: this.device " +  JSON.stringify(this.device));

        if (this.states.online !== true) {
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
                challenge_type = this.ct_appselector;
                challenge_pin = this.pin_appselector;
                break;
            case 'action.devices.commands.ArmDisarm':
                challenge_type = this.ct_armdisarm;
                challenge_pin = this.pin_armdisarm;
                break;
            case 'action.devices.commands.BrightnessAbsolute':
            case 'action.devices.commands.BrightnessRelative':
                challenge_type = this.ct_brightness;
                challenge_pin = this.pin_brightness;
                break;
            case 'action.devices.commands.GetCameraStream':
                challenge_type = this.ct_camerastream;
                challenge_pin = this.pin_camerastream;
                break;
            case 'action.devices.commands.selectChannel':
            case 'action.devices.commands.relativeChannel':
            case 'action.devices.commands.returnChannel':
                challenge_type = this.ct_channel;
                challenge_pin = this.pin_channel;
                break;
            case 'action.devices.commands.ColorAbsolute':
                challenge_type = this.ct_colorsetting;
                challenge_pin = this.pin_colorsetting;
                break;
            case 'action.devices.commands.Cook':
                challenge_type = this.ct_cook;
                challenge_pin = this.pin_cook;
                break;
            case 'action.devices.commands.Dispense':
                challenge_type = this.ct_dispense;
                challenge_pin = this.pin_dispense;
                break;
            case 'action.devices.commands.Dock':
                challenge_type = this.ct_dock;
                challenge_pin = this.pin_dock;
                break;
            case 'action.devices.commands.Charge':
                challenge_type = this.ct_energystorage;
                challenge_pin = this.pin_energystorage;
                break;
            case 'action.devices.commands.SetFanSpeed':
            case 'action.devices.commands.SetFanSpeedRelative':
            case 'action.devices.commands.Reverse':
                challenge_type = this.ct_fanspeed;
                challenge_pin = this.pin_fanspeed;
                break;
            case 'action.devices.commands.Fill':
                challenge_type = this.ct_fill;
                challenge_pin = this.pin_fill;
                break;
            case 'action.devices.commands.SetHumidity':
            case 'action.devices.commands.HumidityRelative':
                challenge_type = this.ct_humiditysetting;
                challenge_pin = this.pin_humiditysetting;
                break;
            case 'action.devices.commands.SetInput':
            case 'action.devices.commands.NextInput':
            case 'action.devices.commands.PreviousInput':
                challenge_type = this.ct_inputselector;
                challenge_pin = this.pin_inputselector;
                break;
            case 'action.devices.commands.ColorLoop':
            case 'action.devices.commands.Sleep':
            case 'action.devices.commands.StopEffect':
            case 'action.devices.commands.Wake':
                challenge_type = this.ct_colorsetting;
                challenge_pin = this.pin_colorsetting;
                break;
            case 'action.devices.commands.Locate':
                challenge_type = this.ct_locator;
                challenge_pin = this.pin_locator;
                break;
            case 'action.devices.commands.LockUnlock':
                challenge_type = this.ct_lockunlock;
                challenge_pin = this.pin_lockunlock;
                break;
            case 'action.devices.commands.SetModes':
                challenge_type = this.ct_modes;
                challenge_pin = this.pin_modes;
                break;
            case 'action.devices.commands.EnableDisableGuestNetwork':
            case 'action.devices.commands.EnableDisableNetworkProfile':
            case 'action.devices.commands.GetGuestNetworkPassword':
            case 'action.devices.commands.TestNetworkSpeed':
                challenge_type = this.ct_networkcontrol;
                challenge_pin = this.pin_networkcontrol;
                break;
            case 'action.devices.commands.OnOff':
                challenge_type = this.ct_onoff;
                challenge_pin = this.pin_onoff;
                break;
            case 'action.devices.commands.OpenClose':
            case 'action.devices.commands.OpenCloseRelative':
                challenge_type = this.ct_openclose;
                challenge_pin = this.pin_openclose;
                break;
            case 'action.devices.commands.Reboot':
                challenge_type = this.ct_reboot;
                challenge_pin = this.pin_reboot;
                break;
            case 'action.devices.commands.RotateAbsolute':
                challenge_type = this.ct_rotation;
                challenge_pin = this.pin_rotation;
                break;
            case 'action.devices.commands.ActivateScene':
                challenge_type = this.ct_scene;
                challenge_pin = this.pin_scene;
                break;
            case 'action.devices.commands.SoftwareUpdate':
                challenge_type = this.ct_softwareupdate;
                challenge_pin = this.pin_softwareupdate;
                break;
            case 'action.devices.commands.StartStop':
            case 'action.devices.commands.PauseUnpause':
                challenge_type = this.ct_startstop;
                challenge_pin = this.pin_startstop;
                break;
            case 'action.devices.commands.SetTemperature':
                challenge_type = this.ct_temperaturecontrol;
                challenge_pin = this.pin_temperaturecontrol;
                break;
            case 'action.devices.commands.ThermostatTemperatureSetpoint':
            case 'action.devices.commands.ThermostatTemperatureSetRange':
            case 'action.devices.commands.ThermostatSetMode':
            case 'action.devices.commands.TemperatureRelative':
                challenge_type = this.ct_temperaturesetting;
                challenge_pin = this.pin_temperaturesetting;
                break;
            case 'action.devices.commands.TimerStart':
            case 'action.devices.commands.TimerAdjust':
            case 'action.devices.commands.TimerPause':
            case 'action.devices.commands.TimerResume':
            case 'action.devices.commands.TimerCancel':
                challenge_type = this.ct_timer;
                challenge_pin = this.pin_timer;
                break;
            case 'action.devices.commands.SetToggles':
                challenge_type = this.ct_toggles;
                challenge_pin = this.pin_toggles;
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
                challenge_type = this.ct_transportcontrol;
                challenge_pin = this.pin_transportcontrol;
                break;
            case 'action.devices.commands.mute':
            case 'action.devices.commands.setVolume':
            case 'action.devices.commands.volumeRelative':
                challenge_type = this.ct_volume;
                challenge_pin = this.pin_volume;
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
                this.send({
                    topic: 'ChallengePin',
                    payload: {
                        name: this.name,
                        pin: challenge_pin,
                        command: command.command,
                        topic: this.topicOut,
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
                if (this.supported_cooking_modes.includes(cooking_mode)) {
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
                this.food_presets.forEach(function (food_preset) {
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
                this.supported_dispense_presets.forEach(function (preset) {
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
                this.supported_dispense_items.forEach(function (item) {
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
            if (!this.command_only_fanspeed) {
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
                params['currentFanSpeedPercent'] = this.states['currentFanSpeedPercent'] + fanSpeedRelativeWeight;
                executionStates.push('currentFanSpeedPercent');
            }
            if (Object.prototype.hasOwnProperty.call(command.params, 'fanSpeedRelativePercent')) {
                const fanSpeedRelativePercent = command.params['fanSpeedRelativePercent'];
                params['currentFanSpeedPercent'] = Math.round(this.states['currentFanSpeedPercent'] * (1 + fanSpeedRelativePercent / 100));
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
            if (!this.command_only_humiditysetting) {
                const humidity = command.params['humidity'];
                params['humiditySetpointPercent'] = humidity;
                executionStates.push('humiditySetpointPercent');
            }
        }
        else if (command.command === 'action.devices.commands.HumidityRelative') {
            /*if (Object.prototype.hasOwnProperty.call(command.params, 'humidityRelativePercent')) {
                const humidityRelativePercent = command.params['humidityRelativePercent'];
                params['humiditySetpointPercent'] = Math.round(this.states['humiditySetpointPercent'] * (1 + humidityRelativePercent / 100));
                executionStates.push('humiditySetpointPercent');
            }
            if (Object.prototype.hasOwnProperty.call(command.params, 'humidityRelativeWeight')) {
                const humidityRelativeWeight = command.params['humidityRelativeWeight'];
                params['humiditySetpointPercent'] = this.states['humiditySetpointPercent'] + humidityRelativeWeight;
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
            params['guestNetworkPassword'] = this.guest_network_password;
            executionStates.push('guestNetworkPassword');
            return {
                status: 'SUCCESS',
                states: {
                    online: true,
                    guestNetworkPassword: this.guest_network_password
                },
                executionStates: executionStates,
            };
        }

        // Inputs
        else if (command.command === 'action.devices.commands.SetInput') {
            if (!this.command_only_input_selector) {
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
            if (!this.command_only_input_selector) {
                this.current_input_index++;
                if (this.current_input_index >= this.available_inputs.length) {
                    this.current_input_index = 0;
                }
                executionStates.push('currentInput');
                params['currentInput'] = this.available_inputs[this.current_input_index].key;
            }
        }
        else if (command.command === 'action.devices.commands.PreviousInput') {
            if (!this.command_only_input_selector) {
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
            if (!this.command_only_onoff) {
                if (Object.prototype.hasOwnProperty.call(command.params, 'on')) {
                    const on_param = command.params['on'];
                    executionStates.push('on');
                    params['on'] = on_param;
                }
            }
        }

        // OpenClose
        else if (command.command === 'action.devices.commands.OpenClose') {
            if (!this.command_only_openclose) {
                const open_percent = command.params['openPercent'] || 0;
                if (Object.prototype.hasOwnProperty.call(this.states, 'openPercent')) {
                    executionStates.push('openPercent');
                    params['openPercent'] = open_percent;
                } else if (Object.prototype.hasOwnProperty.call(command.params, 'openDirection')) {
                    const open_direction = command.params['openDirection'];
                    let new_open_directions = [];
                    this.states.openState.forEach(element => {
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
            if (Object.prototype.hasOwnProperty.call(this.states, 'openPercent')) {
                executionStates.push('openPercent');
                params['openPercent'] = open_percent;
            } else if (Object.prototype.hasOwnProperty.call(command.params, 'openDirection')) {
                const open_direction = command.params['openDirection'];
                let new_open_directions = [];
                this.states.openState.forEach(element => {
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
                    zones.forEach((zone) => {
                        if (this.available_zones.includes(zone)) {
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
                params['playbackState'] = this.states['playbackState'];
            }
            if (Object.prototype.hasOwnProperty.call(command.params, 'userQueryLanguage')) {
                //const userQueryLanguage = command.params['userQueryLanguage'];
                params['playbackState'] = this.states['playbackState'];
            }
            executionStates.push('playbackState');
        }
        else if (command.command === 'action.devices.commands.mediaClosedCaptioningOff') {
            executionStates.push('playbackState');
        }

        // TemperatureControl
        else if (command.command === 'action.devices.commands.SetTemperature') {
            if (!this.command_only_temperaturecontrol) {
                const temperature = command.params['temperature'];
                params['temperatureSetpointCelsius'] = temperature;
                executionStates.push('temperatureSetpointCelsius');
            }
        }

        // TemperatureSetting
        else if (command.command === 'action.devices.commands.ThermostatTemperatureSetpoint') {
            if (!this.command_only_temperaturesetting) {
                const thermostatTemperatureSetpoint = command.params['thermostatTemperatureSetpoint'];
                params['thermostatTemperatureSetpoint'] = thermostatTemperatureSetpoint;
                this.thermostat_temperature_setpoint = thermostatTemperatureSetpoint;
                executionStates.push('thermostatTemperatureSetpoint');
            }
        }
        else if (command.command === 'action.devices.commands.ThermostatTemperatureSetRange') {
            if (!this.command_only_temperaturesetting) {
                const thermostatTemperatureSetpointHigh = command.params['thermostatTemperatureSetpointHigh'];
                const thermostatTemperatureSetpointLow = command.params['thermostatTemperatureSetpointLow'];
                params['thermostatTemperatureSetpointHigh'] = thermostatTemperatureSetpointHigh;
                params['thermostatTemperatureSetpointLow'] = thermostatTemperatureSetpointLow;
                this.thermostat_temperature_setpoint_hight = thermostatTemperatureSetpointHigh;
                this.thermostat_temperature_setpoint_low = thermostatTemperatureSetpointLow;
                executionStates.push('thermostatTemperatureSetpointHigh', 'thermostatTemperatureSetpointLow');
            }
        }
        else if (command.command === 'action.devices.commands.ThermostatSetMode') {
            if (!this.command_only_temperaturesetting) {
                const thermostatMode = command.params.thermostatMode;
                params['thermostatMode'] = thermostatMode;
                executionStates.push('thermostatMode');
                if (thermostatMode === "heatcool") {
                    params['thermostatTemperatureSetpointHigh'] = this.thermostat_temperature_setpoint_hight;
                    params['thermostatTemperatureSetpointLow'] = this.thermostat_temperature_setpoint_low;
                    executionStates.push('thermostatTemperatureSetpointHigh', 'thermostatTemperatureSetpointLow');
                } else {
                    params['thermostatTemperatureSetpoint'] = this.thermostat_temperature_setpoint;
                    executionStates.push('thermostatTemperatureSetpoint');
                }
            }
        }
        else if (command.command === 'action.devices.commands.TemperatureRelative') {
            /*if (Object.prototype.hasOwnProperty.call(command.params, 'thermostatTemperatureRelativeDegree')) {
                const thermostatTemperatureRelativeDegree = command.params['thermostatTemperatureRelativeDegree'];
                params['thermostatTemperatureSetpoint'] = this.states['thermostatTemperatureSetpoint'] + thermostatTemperatureRelativeDegree;
                executionStates.push('thermostatTemperatureSetpoint');
            }
            if (Object.prototype.hasOwnProperty.call(command.params, 'thermostatTemperatureRelativeWeight')) {
                const thermostatTemperatureRelativeWeight = command.params['thermostatTemperatureRelativeWeight'];
                this._debug("C CHI thermostatTemperatureRelativeWeight " + thermostatTemperatureRelativeWeight);
                this._debug("C CHI thermostatTemperatureSetpoint " + this.states['thermostatTemperatureSetpoint']);
                params['thermostatTemperatureSetpoint'] = this.states['thermostatTemperatureSetpoint'] + thermostatTemperatureRelativeWeight;
                executionStates.push('thermostatTemperatureSetpoint');
            }*/
        }

        // Timer
        else if (command.command === 'action.devices.commands.TimerStart') {
            if (!this.command_only_timer) {
                const timer_time_sec = command.params['timerTimeSec'];
                const now = Math.floor(Date.now() / 1000);
                params['timerRemainingSec'] = timer_time_sec;
                params['timerPaused'] = null;
                executionStates.push('timerPaused', 'timerRemainingSec');
                this.timer_end_timestamp = now + timer_time_sec;
            }
        }
        else if (command.command === 'action.devices.commands.TimerResume') {
            if (!this.command_only_timer) {
                const now = Math.floor(Date.now() / 1000);
                const timer_remaining_sec = this.states['timerRemainingSec'];
                if (timer_remaining_sec > 0 && this.states['timerPaused']) {
                    params['timerPaused'] = false;
                    this.timer_end_timestamp = now + timer_remaining_sec;
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
            if (!this.command_only_timer) {
                const now = Math.floor(Date.now() / 1000);
                if (this.states['timerPaused']) {
                    executionStates.push('timerPaused');
                }
                else if (now < this.timer_end_timestamp) {
                    params['timerPaused'] = true;
                    params['timerRemainingSec'] = this.timer_end_timestamp - now;
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
            if (!this.command_only_timer) {
                const now = Math.floor(Date.now() / 1000);
                if (now < this.timer_end_timestamp) {
                    this.states['timerRemainingSec'] = 0;
                    params['timerPaused'] = false;
                    this.timer_end_timestamp = -1;
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
            if (!this.command_only_timer) {
                const now = Math.floor(Date.now() / 1000);
                const timer_time_sec = command.params['timerTimeSec'];
                if (this.states['timerPaused']) {
                    this.states['timerRemainingSec'] = this.states['timerRemainingSec'] + timer_time_sec;
                    executionStates.push('timerRemainingSec');
                }
                else if (now < this.timer_end_timestamp) {
                    this.timer_end_timestamp = this.timer_end_timestamp + timer_time_sec;
                    this.states['timerRemainingSec'] = this.timer_end_timestamp - now;
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
            if (!this.command_only_volume) {
                if (Object.prototype.hasOwnProperty.call(command.params, 'mute')) {
                    const mute = command.params['mute'];
                    params['isMuted'] = mute;
                    executionStates.push('isMuted', 'currentVolume');
                }
            }
        }
        else if (command.command === 'action.devices.commands.setVolume') {
            if (!this.command_only_volume) {
                if (Object.prototype.hasOwnProperty.call(command.params, 'volumeLevel')) {
                    let volumeLevel = command.params['volumeLevel'];
                    if (volumeLevel > this.volume_max_level) {
                        volumeLevel = this.volume_max_level;
                    }
                    params['currentVolume'] = volumeLevel;
                    params['isMuted'] = false;
                    executionStates.push('isMuted', 'currentVolume');
                }
            }
        }
        else if (command.command === 'action.devices.commands.volumeRelative') {
            if (!this.command_only_volume) {
                if (Object.prototype.hasOwnProperty.call(command.params, 'relativeSteps')) {
                    const relativeSteps = command.params['relativeSteps'];
                    let current_volume = this.states['currentVolume'];
                    if (current_volume >= this.volume_max_level && relativeSteps > 0) {
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
                    if (current_volume > this.volume_max_level) {
                        current_volume = this.volume_max_level;
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
                this.current_channel_index = new_channel_index;
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
            if (!this.command_only_modes) {
                if (Object.prototype.hasOwnProperty.call(command.params, 'updateModeSettings')) {
                    const updateModeSettings = command.params['updateModeSettings'];
                    let current_modes = this.states['currentModeSettings'];
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
            if (!this.command_only_rotation) {
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
            if (!this.command_only_toggles) {
                if (Object.prototype.hasOwnProperty.call(command.params, 'updateToggleSettings')) {
                    const updateToggleSettings = command.params['updateToggleSettings'];
                    let current_toggle = this.states['currentToggleSettings'];
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
            if (!this.command_only_brightness) {
                const brightness = command.params['brightness'];
                params['brightness'] = brightness;
                executionStates.push('brightness');
            }
        }
        else if (command.command === 'action.devices.commands.BrightnessRelative') {
            /*
            let brightness = this.states['brightness'];
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
            if (!this.command_only_colorsetting) {
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
                supported_protocols.forEach((supported_protocol) => {
                    let url = this.getStreamUrl(supported_protocol);
                    if (url) {
                        protocol = supported_protocol;
                        stream_url = url;
                    }
                });
                if (protocol.length > 0) {
                    executionStates.push('cameraStreamProtocol');
                    if (this.auth_token.length > 0) {
                        executionStates.push('cameraStreamAuthToken');
                    }
                    if (protocol === 'webrtc') {
                        executionStates.push('cameraStreamIceServers', 'cameraStreamSignalingUrl', 'cameraStreamOffer');
                        return {
                            reportState: false,
                            states: {
                                online: true,
                                cameraStreamAuthToken: this.auth_token,
                                cameraStreamIceServers: this.webrtc_ice_servers,
                                cameraStreamSignalingUrl: stream_url,
                                cameraStreamOffer: this.webrtc_offer,
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
                                cameraStreamAuthToken: this.auth_token,
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

    getStreamUrl(protocol_type: string) {
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

    getAppId(protocol_type: string) {
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


export default module.exports = function(RED:NodeAPI) {
    setRED(RED);

    RED.nodes.registerType('google-device', DeviceNode);
};
