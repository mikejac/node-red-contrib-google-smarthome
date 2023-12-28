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

/* eslint-env mocha */

const should = require('should');
const helper = require('node-red-node-test-helper');
const device = require('../devices/device.js');
const google_smarthome = require('../google-smarthome.js');

helper.init(require.resolve('node-red'));

describe('Device Node', function () {
    beforeEach(function (done) {
        // Ensure Node-RED userDir is set
        if(typeof helper.settings().userDir == 'undefined')
            helper.settings({ userDir: '/tmp' });
    
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('Smart Home should be loaded with correct default params', function (done) {
        this.timeout(10000);
        const flow = [
            { id: "c1", type: "googlesmarthome-client", name: "", enabledebug: true, usegooglelogin: false, loginclientid: "", emails: "", username: "userrname", password: "password", usehttpnoderoot: true, port: "", httppath: "smarthome", ssloffload: true, publickey: "6", privatekey: "7", jwtkey: "google-home.json", accesstokenduration: "60", reportinterval: "60", clientid: "client_id", clientsecret: "client_secred" },
            { id: "mngm", type: "google-mgmt", client: "c1", name: "", wires: [["h1"]] },
            { id: "d1", type: "google-device", client: "c1", "name": "Cucina", "topic": "", "device_type": "TV", "trait_appselector": true, "trait_channel": true, "trait_inputselector": true, "trait_mediastate": true, "trait_onoff": true, "trait_transportcontrol": true, "trait_modes": true, "trait_volume": true, "trait_toggles": true, "trait_brightness": true, "trait_colorsetting": true, "appselector_file": "applications.json", "channel_file": "channels.json", "inputselector_file": "inputs.json", "command_only_input_selector": false, "ordered_inputs": false, "support_activity_state": false, "support_playback_state": false, "command_only_onoff": false, "query_only_onoff": false, "supported_commands": ["CAPTION_CONTROL", "NEXT", "PAUSE", "PREVIOUS", "RESUME", "SEEK_RELATIVE", "SEEK_TO_POSITION", "SET_REPEAT", "SHUFFLE", "STOP"], "volume_max_level": 100, "can_mute_and_unmute": true, "volume_default_percentage": 40, "level_step_size": 1, "command_only_volume": false, "command_only_brightness": false, "command_only_colorsetting": false, "color_model": "temp", "temperature_min_k": 2000, "temperature_max_k": 9000, "modes_file": "modes.json", "command_only_modes": false, "query_only_modes": false, "toggles_file": "toggles.json", "command_only_toggles": false, "query_only_toggles": false, "trait_camerastream": true, "hls": "http://HLS", "hls_app_id": "HLS_APPID", "dash": "http://DASH", "dash_app_id": "DASH_APPID", "smooth_stream": "http://SMOOTH_STREAM", "smooth_stream_app_id": "SMOOTH_STREAM_APPID", "progressive_mp4": "http://PROGRESSIVE_MP4", "progressive_mp4_app_id": "PROGRESSIVE_MP4_APPID", "auth_token": "Auth Token", "passthru": true, "trait_scene": true, "scene_reversible": true, "trait_timer": true, "trait_temperaturesetting": true, "max_timer_limit_sec": 86400, "command_only_timer": false, "available_thermostat_modes": ["off", "heat", "cool", "on", "heatcool", "auto", "fan-only", "purifier", "eco", "dry"], "min_threshold_celsius": "1", "max_threshold_celsius": "50", "thermostat_temperature_unit": "C", "buffer_range_celsius": 2, "command_only_temperaturesetting": false, "query_only_temperaturesetting": false, "trait_temperaturecontrol": true, "tc_min_threshold_celsius": 0, "tc_max_threshold_celsius": 40, "tc_temperature_step_celsius": 1, "tc_temperature_unit_for_ux": "C", "tc_command_only_temperaturecontrol": false, "tc_query_only_temperaturecontrol": false, "trait_humiditysetting": true, "min_percent": 0, "max_percent": 100, "command_only_humiditysetting": false, "query_only_humiditysetting": false, "trait_dock": true, "trait_locator": true, "trait_lockunlock": true, "trait_reboot": true, "trait_openclose": true, "discrete_only_openclose": false, "open_direction": ["UP", "DOWN", "LEFT", "RIGHT", "IN", "OUT"], "command_only_openclose": false, "query_only_openclose": false, "trait_startstop": true, "pausable": false, "available_zones": ["Cucina", "Salotto", "Camera di Eliana"], "lang": "en", "trait_runcycle": true, "trait_softwareupdate": true, "trait_rotation": true, "supports_degrees": true, "supports_percent": true, "rotation_degrees_min": 0, "rotation_degrees_max": 360, "supports_continuous_rotation": false, "command_only_rotation": false, "trait_lighteffects": true, "default_sleep_duration": 1800, "default_wake_duration": 1800, "supported_effects": ["colorLoop", "sleep", "wake"], "trait_statusreport": true, "trait_cook": true, "supported_cooking_modes": ["UNKNOWN_COOKING_MODE", "BAKE", "BEAT", "BLEND", "BOIL", "BREW", "BROIL", "CONVECTION_BAKE", "COOK", "DEFROST", "DEHYDRATE", "FERMENT", "FRY", "GRILL", "KNEAD", "MICROWAVE", "MIX", "PRESSURE_COOK", "PUREE", "ROAST", "SAUTE", "SLOW_COOK", "SOUS_VIDE", "STEAM", "STEW", "STIR", "WARM", "WHIP"], "food_presets_file": "foodPresets.json", "trait_fanspeed": true, "reversible": false, "command_only_fanspeed": false, "available_fan_speeds_file": "availableFanSpeeds.json", "trait_sensorstate": true, "sensor_states_supported": ["AirQuality", "CarbonMonoxideLevel", "SmokeLevel", "FilterCleanliness", "WaterLeak", "RainDetection", "FilterLifeTime", "PreFilterLifeTime", "HEPAFilterLifeTime", "Max2FilterLifeTime", "CarbonDioxideLevel", "PM2.5", "PM10", "VolatileOrganicCompounds"], "trait_fill": true, "available_fill_levels_file": "availableFillLevels.json", "supports_fill_percent": false, "trait_armdisarm": true, "available_arm_levels_file": "availableArmLevels.json", "trait_energystorage": true, "is_rechargeable": false, "query_only_energy_storage": false, "energy_storage_distance_unit_for_ux": "KILOMETERS", "trait_dispense": true, "supported_dispense_items_file": "supportedDispenseItems.json", "supported_dispense_presets_file": "supportedDispensePresets.json", "trait_networkcontrol": true, "supports_enabling_guest_network": false, "supports_disabling_guest_network": false, "supports_getting_guest_network_password": false, "network_profiles": ["Kids"], "supports_enabling_network_profile": false, "supports_disabling_network_profile": false, "supports_network_download_speedtest": false, "supports_network_upload_speedtest": false, "trait_objectdetection": true, "show_trait": "all", "advanced_settings": true, "wires": [["300d4f92.2643e", "bd29dfa2.bceb4"]] },
            { id: "h1", type: "helper", name: "", wires: [] },
            { id: "h2", type: "helper", name: "", wires: [] },
        ];
        helper.load([google_smarthome, device], flow, function () {
            try {
                const d1 = helper.getNode("d1");
                d1.should.have.property('type', 'google-device');
                d1.should.have.property('client');
                d1.should.have.property('clientConn');
                const clnt = helper.getNode(d1.client);
                clnt.should.have.property('type', 'googlesmarthome-client');
                const mgmt = helper.getNode("mngm");
                mgmt.should.have.property('type', 'google-mgmt');
                /*
                n1.should.have.property('device_type', 'onoff');
                n1.should.have.property('is_dimmable', false);
                n1.should.have.property('has_temp', false);
                n1.should.have.property('is_rgb', false);
                n1.should.have.property('is_hsv', false);*/
                done();
            } catch (err) {
                done(err);
            }
        });
    });
});
