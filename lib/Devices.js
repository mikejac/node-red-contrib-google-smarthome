/**
 * NodeRED Google SmartHome
 * Copyright (C) 2018 Michael Jacobsen.
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

'use strict';

const syncRequestDelay = 5000;

/******************************************************************************************************************
 * Devices
 *
 */
class Devices {
    constructor() {
        this._devices = {};
        this._nodes = {};
        this._version = 0;
        this._devicesSyncTimer = null;
    }
    //
    //
    //
    NewLightOnOff(client, name) {
        this.debug('Devices:NewLightOnOff(): BEGIN');

        let states = {
            online: true,
            on: false
        };

        let device = {
            id: client.id,
            properties: {
                type: 'action.devices.types.LIGHT',
                traits: ['action.devices.traits.OnOff'],
                name: {
                    defaultNames: ["Node-RED On/Off Light"],
                    name: name
                },
                willReportState: true,
                attributes: {
                },
                deviceInfo: {
                    manufacturer: 'Node-RED',
                    model: 'nr-light-onoff-v1',
                    swVersion: '1.0',
                    hwVersion: '1.0'
                },
                customData: {
                    "nodeid": client.id,
                    "type": 'light-onoff'
                }
            }
        };

        device.states = states;

        if (this.registerDevice(client, device)) {
            this.debug('Devices:NewLightOnOff(): END ok');
            return JSON.parse(JSON.stringify(states));
        } else {
            this.debug('Devices:NewLightOnOff(): END fail');
            return {};
        }
    }
    //
    //
    //
    NewLightDimmable(client, name) {
        this.debug('Devices:NewLightDimmable()');

        let states = {
            online: true,
            on: false,
            brightness: 100     // integer, absolute brightness, from 0 to 100
        };

        let device = {
            id: client.id,
            properties: {
                type: 'action.devices.types.LIGHT',
                traits: [
                    'action.devices.traits.OnOff',
                    'action.devices.traits.Brightness'
                ],
                name: {
                    defaultNames: ["Node-RED Dimmable Light"],
                    name: name
                },
                willReportState: true,
                attributes: {
                },
                deviceInfo: {
                    manufacturer: 'Node-RED',
                    model: 'nr-light-dimmable-v1',
                    swVersion: '1.0',
                    hwVersion: '1.0'
                },
                customData: {
                    "nodeid": client.id,
                    "type": 'light-dimmable'
                }
            }
        };

        device.states = states;

        if (this.registerDevice(client, device)) {
            return JSON.parse(JSON.stringify(states));
        } else {
            return {};
        }
    }
    //
    //
    //
    NewLightColorTemp(client, name) {
        this.debug('Devices:NewLightColorTemp()');

        let states = {
            online: true,
            on: false,
            brightness: 100,     // integer, absolute brightness, from 0 to 100
            color: {
                name: "",
                temperatureK: 4000,
            }
        };

        let device = {
            id: client.id,
            properties: {
                type: 'action.devices.types.LIGHT',
                traits: [
                    'action.devices.traits.OnOff',
                    'action.devices.traits.Brightness',
                    'action.devices.traits.ColorSetting'
                ],
                name: {
                    defaultNames: ["Node-RED ColorTemp Light"],
                    name: name
                },
                willReportState: true,
                attributes: {
                    // this is the default range used by Googles color presets in the Home App
                    colorTemperatureRange: {
                        temperatureMinK: 2000,
                        temperatureMaxK: 6000
                    },
                    commandOnlyColorSetting: false,
                },
                deviceInfo: {
                    manufacturer: 'Node-RED',
                    model: 'nr-light-temperature-v1',
                    swVersion: '1.0',
                    hwVersion: '1.0'
                },
                customData: {
                    "nodeid": client.id,
                    "type": 'light-temperature'
                }
            }
        };

        device.states = states;

        if (this.registerDevice(client, device)) {
            return JSON.parse(JSON.stringify(states));
        } else {
            return {};
        }
    }
    //
    //
    //
    NewLightHSV(client, name) {
        this.debug('Devices:NewLightHSV()');

        let states = {
            online: true,
            on: false,
            brightness: 100,            // integer, absolute brightness, from 0 to 100
            color: {
                name: "",
                spectrumHsv: {
                    hue: 0.0,           // float, representing hue as positive degrees in the range of [0.0, 360.0)
                    saturation: 0.0,    // float, representing saturation as a percentage in the range [0.0, 1.0]
                    value: 1            // float, representing value as a percentage in the range [0.0, 1.0]
                }
            }
        };

        let device = {
            id: client.id,
            properties: {
                type: 'action.devices.types.LIGHT',
                traits: [
                    'action.devices.traits.OnOff',
                    'action.devices.traits.Brightness',
                    'action.devices.traits.ColorSetting'
                ],
                name: {
                    defaultNames: ["Node-RED HSV Light"],
                    name: name
                },
                willReportState: true,
                attributes: {
                    colorModel: "hsv",
                    commandOnlyColorSetting: false,
                    /*colorTemperatureRange: {
                        temperatureMinK: 2000,
                        temperatureMaxK: 9000
                      },*/
                    //"temperatureMinK": 2000,
                    //"temperatureMaxK": 6500
                },
                deviceInfo: {
                    manufacturer: 'Node-RED',
                    model: 'nr-light-hsv-v1',
                    swVersion: '1.0',
                    hwVersion: '1.0'
                },
                customData: {
                    "nodeid": client.id,
                    "type": 'light-hsv'
                }
            }
        };

        device.states = states;

        if (this.registerDevice(client, device)) {
            return JSON.parse(JSON.stringify(states));
        } else {
            return {};
        }
    }
    //
    //
    //
    NewLightRGB(client, name) {
        this.debug('Devices:NewLightRGB()');

        // according to Googles own doc.'s, 'color.spectrumRGB' should actually be 'color.spectrumRgb'
        let states = {
            online: true,
            on: false,
            brightness: 100,            // integer, absolute brightness, from 0 to 100
            color: {
                name: "",
                spectrumRGB: 16777215   // red = 16711680, green = 65280, blue = 255
            }
        };

        let device = {
            id: client.id,
            properties: {
                type: 'action.devices.types.LIGHT',
                traits: [
                    'action.devices.traits.OnOff',
                    'action.devices.traits.Brightness',
                    'action.devices.traits.ColorSetting'
                ],
                name: {
                    defaultNames: ["Node-RED RGB Light"],
                    name: name
                },
                willReportState: true,
                attributes: {
                    colorModel: "rgb",
                    commandOnlyColorSetting: false,
                },
                deviceInfo: {
                    manufacturer: 'Node-RED',
                    model: 'nr-light-rgb-v1',
                    swVersion: '1.0',
                    hwVersion: '1.0'
                },
                customData: {
                    "nodeid": client.id,
                    "type": 'light-rgb'
                }
            }
        };

        device.states = states;

        if (this.registerDevice(client, device)) {
            return JSON.parse(JSON.stringify(states));
        } else {
            return {};
        }
    }
    //
    //
    //
    NewOutlet(client, name) {
        this.debug('Devices:NewOutlet()');

        let states = {
            online: true,
            on: false
        };

        let device = {
            id: client.id,
            properties: {
                type: 'action.devices.types.OUTLET',
                traits: ['action.devices.traits.OnOff'],
                name: {
                    defaultNames: ["Node-RED Outlet"],
                    name: name
                },
                willReportState: true,
                attributes: {
                },
                deviceInfo: {
                    manufacturer: 'Node-RED',
                    model: 'nr-outlet-v1',
                    swVersion: '1.0',
                    hwVersion: '1.0'
                },
                customData: {
                    "nodeid": client.id,
                    "type": 'outlet'
                }
            }
        };

        device.states = states;

        if (this.registerDevice(client, device)) {
            return JSON.parse(JSON.stringify(states));
        } else {
            return {};
        }
    }
    //
    //
    //
    NewScene(client, name, sceneReversible) {
        this.debug('Devices:NewScene()');

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

        if (this.registerDevice(client, device)) {
            return JSON.parse(JSON.stringify(states));
        } else {
            return {};
        }
    }
    //
    //
    //
    NewWindow(client, name) {
        this.debug('Devices:NewWindow(): BEGIN');

        let states = {
            online: true,
            openPercent: false
        };

        let device = {
            id: client.id,
            properties: {
                type: 'action.devices.types.WINDOW',
                traits: ['action.devices.traits.OpenClose'],
                name: {
                    defaultNames: ["Node-RED Window"],
                    name: name
                },
                willReportState: true,
                attributes: {
                },
                deviceInfo: {
                    manufacturer: 'Node-RED',
                    model: 'nr-window-v1',
                    swVersion: '1.0',
                    hwVersion: '1.0'
                },
                customData: {
                    "nodeid": client.id,
                    "type": 'window'
                }
            }
        };

        device.states = states;

        if (this.registerDevice(client, device)) {
            this.debug('Devices:NewWindow(): END ok');
            return JSON.parse(JSON.stringify(states));
        } else {
            this.debug('Devices:NewWindow(): END fail');
            return {};
        }
    }
    //
    //
    //
    NewThermostat(client, name) {
        this.debug('Devices:NewThermostat(): BEGIN');

        let states = {
            online: true,
            thermostatMode: "heat",
            thermostatTemperatureSetpoint: 20,
            thermostatTemperatureAmbient: 10,
        };

        let device = {
            id: client.id,
            properties: {
                type: 'action.devices.types.THERMOSTAT',
                traits: ['action.devices.traits.TemperatureSetting'],
                name: {
                    defaultNames: ["Node-RED Thermostat"],
                    name: name
                },
                willReportState: true,
                attributes: {
                    availableThermostatModes: "heat",
                    thermostatTemperatureUnit: "C",
                },
                deviceInfo: {
                    manufacturer: 'Node-RED',
                    model: 'nr-thermostat-v1',
                    swVersion: '1.0',
                    hwVersion: '1.0'
                },
                customData: {
                    "nodeid": client.id,
                    "type": 'thermostat'
                }
            }
        };

        device.states = states;

        if (this.registerDevice(client, device)) {
            this.debug('Devices:NewThermostat(): END ok');
            return JSON.parse(JSON.stringify(states));
        } else {
            this.debug('Devices:NewThermostat(): END fail');
            return {};
        }
    }
    //
    //
    //
    NewVacuum(client, name) {
        this.debug('Devices:NewVacuum()');

        let states = {
            online: true,
            on: false,
            currentModeSettings: { power: "standard" },
            capacityRemaining: { rawValue: 100, unit: "PERCENTAGE" },
            isCharging: true,
        };

        let device = {
            id: client.id,
            properties: {
                type: 'action.devices.types.VACUUM',
                traits: [
                    'action.devices.traits.OnOff',
                    'action.devices.traits.Dock',
                    'action.devices.traits.Modes',
                    'action.devices.traits.EnergyStorage',
                    'action.devices.traits.Locator',
                ],
                name: {
                    defaultNames: ["Node-RED Vacuum"],
                    name: name
                },
                willReportState: false,
                attributes: {
                    availableModes: [{
                        name: 'power',
                        name_values: [{
                            name_synonym: ['power', 'level'],
                            lang: 'en'
                        }, {
                            name_synonym: ['Stufe', 'Leistung'],
                            lang: 'de'
                        }],
                        settings: [{
                            setting_name: 'quiet',
                            setting_values: [{
                                setting_synonym: ['quiet', 'silent', 'low'],
                                lang: 'en'
                            }, {
                                setting_synonym: ['Still', 'Leise'],
                                lang: 'de'
                            }]
                        }, {
                            setting_name: 'standard',
                            setting_values: [{
                                setting_synonym: ['standard', 'normal', 'default'],
                                lang: 'en'
                            }, {
                                setting_synonym: ['Standard', 'Normal'],
                                lang: 'de'
                            }]
                        }, {
                            setting_name: 'medium',
                            setting_values: [{
                                setting_synonym: ['medium'],
                                lang: 'en'
                            }, {
                                setting_synonym: ['Mittel'],
                                lang: 'de'
                            }]
                        }, {
                            setting_name: 'turbo',
                            setting_values: [{
                                setting_synonym: ['turbo', 'maximum', 'highest'],
                                lang: 'en'
                            }, {
                                setting_synonym: ['Turbo', 'Maximum', 'Höchstleistung'],
                                lang: 'de'
                            }]
                        }],
                        ordered: true
                    }],
                    isRechargeable: true,
                    queryOnlyEnergyStorage: true
                },
                deviceInfo: {
                    manufacturer: 'Node-RED',
                    model: 'nr-vacuum-v1',
                    swVersion: '1.0',
                    hwVersion: '1.0'
                },
                customData: {
                    "nodeid": client.id,
                    "type": 'vacuum'
                }
            }
        };

        device.states = states;

        if (this.registerDevice(client, device)) {
            this.debug('Devices:NewVacuum(): END ok');
            return JSON.parse(JSON.stringify(states));
        } else {
            this.debug('Devices:NewVacuum(): END fail');
            return {};
        }
    }
    //
    //
    //
    NewFanOnOff(client, name) {
        this.debug('Devices:NewFanOnOff(): BEGIN');

        let states = {
            online: true,
            on: false
        };

        let device = {
            id: client.id,
            properties: {
                type: 'action.devices.types.FAN',
                traits: ['action.devices.traits.OnOff'],
                name: {
                    defaultNames: ["Node-RED On/Off Fan"],
                    name: name
                },
                willReportState: true,
                attributes: {
                },
                deviceInfo: {
                    manufacturer: 'Node-RED',
                    model: 'nr-fan-onoff-v1',
                    swVersion: '1.0',
                    hwVersion: '1.0'
                },
                customData: {
                    "nodeid": client.id,
                    "type": 'fan-onoff'
                }
            }
        };

        device.states = states;

        if (this.registerDevice(client, device)) {
            this.debug('Devices:NewFanOnOff(): END ok');
            return JSON.parse(JSON.stringify(states));
        } else {
            this.debug('Devices:NewFanOnOff(): END fail');
            return {};
        }
    }
    //
    //
    //
    DeleteDevice(client) {
        if (!this._devices[client.id]) {
            this.debug('Device:registerDevice(): device does not exist; client.id = ' + client.id);
            return false;
        } else {
            delete this._devices[client.id];
            delete this._nodes[client.id];

            this._devicesDoTimedSync();

            return true;
        }
    }
    //
    //
    //
    SetState(clientId, states) {
        let me = this;

        this.debug('Devices:SetState(): state = ' + JSON.stringify(states));

        if (!this._devices[clientId]) {
            me.debug('Device:SetState(): device does not exist');
            return false;
        }

        // update states
        Object.keys(states).forEach(function (key) {
            if (states.hasOwnProperty(key)) {
                me.debug('Device:SetState(): key = ' + JSON.stringify(key));
                me._devices[clientId].states[key] = states[key];
            }
        });

        this.reportState(clientId, this._devices[clientId].states);
    }
    //
    //
    //
    registerDevice(client, device) {
        if (!this._devices[device.id]) {
            this.debug('Device:registerDevice(): new device; device = ' + JSON.stringify(device));

            this._devices[device.id] = {
                states: {},
                properties: {},
                executionStates: [],
            };

            this._nodes[client.id] = client;

            this._devicesDoTimedSync();

            return this.execDevice(device, false);
        } else {
            this.debug('Device:registerDevice(): device already exist; device = ' + JSON.stringify(device));

            if (this._devices[device.id].properties.name.name !== device.properties.name.name) {
                this.debug('Device:registerDevice(): name for device changed');

                this._devices[device.id].properties.name.name = device.properties.name.name;

                this._devicesDoTimedSync();
            }

            return true;
        }
    }
    //
    //
    //
    execDevice(device, doUpdate) {
        let me = this;

        me.debug('Device:execDevice(): BEGIN');
        me.debug('Device:execDevice(): device = ' + JSON.stringify(device));

        if (!this._devices[device.id]) {
            me.debug('Device:execDevice(): device does not exist');
            return false;
        }

        if (device.hasOwnProperty('properties')) {
            // update properties
            Object.keys(device.properties).forEach(function (key) {
                if (device.properties.hasOwnProperty(key)) {
                    me.debug('Device:execDevice(): properties; key = ' + JSON.stringify(key));
                    me._devices[device.id].properties[key] = device.properties[key];
                }
            });
        }

        if (device.hasOwnProperty('states')) {
            // update states
            Object.keys(device.states).forEach(function (key) {
                if (device.states.hasOwnProperty(key)) {
                    me.debug('Device:execDevice(): states; key = ' + JSON.stringify(key));
                    me._devices[device.id].states[key] = device.states[key];
                }
            });
        }

        if (device.hasOwnProperty('executionStates')) {
            // update array of states
            me.debug('Device:execDevice(): executionStates = ' + JSON.stringify(device.executionStates));
            me._devices[device.id].executionStates = device.executionStates;
        }

        this._version++;

        //me.debug('Device:execDevice(): this._devices = ' + JSON.stringify(this._devices));
        me.debug('Device:execDevice(): this._devices[device.id] = ' + JSON.stringify(this._devices[device.id]));


        if (doUpdate) {
            me.debug('Device:execDevice(): doUpdate');
            //console.log('Device:execDevice(): node = ', this._nodes[device.id]);
            this._nodes[device.id].updated(this._devices[device.id].states);
        }

        me.debug('Device:execDevice(): END');

        return true;
    }
    //
    //
    //
    getProperties(deviceIds = undefined) {
        let me = this;
        let properties = {};

        if (!deviceIds) {
            Object.keys(me._devices).forEach(function (deviceId) {
                if (me._devices.hasOwnProperty(deviceId)) {
                    properties[deviceId] = me._devices[deviceId].properties;
                }
            });
        } else {
            for (let i = 0; i < deviceIds.length; i++) {
                let deviceId = deviceIds[i];

                if (me._devices.hasOwnProperty(deviceId)) {
                    properties[deviceId] = me._devices[deviceId].properties;
                }
            }
        }

        //this.debug('Device:getProperties(): properties = ' + JSON.stringify(properties));

        return properties;
    }
    //
    //
    //
    getStatus(deviceIds = undefined) {
        this.debug('Device:getStatus(): deviceIds = ' + JSON.stringify(deviceIds));

        if (!deviceIds || deviceIds == {} || (Object.keys(deviceIds).length === 0 && deviceIds.constructor === Object)) {
            this.debug('Device:getStatus(): no devices');
            return false;
        }

        let devices = {};

        for (let i = 0; i < deviceIds.length; i++) {
            let curId = deviceIds[i];

            if (!this._devices[curId]) {
                continue;
            }

            devices[curId] = this._devices[curId];
        }

        this.debug('Device:getStatus(): devices = ' + JSON.stringify(devices));

        return devices;
    }
    //
    //
    //
    getStates(deviceIds) {
        this.debug('Device:getStates(): deviceIds = ' + JSON.stringify(deviceIds));

        if (!deviceIds || !Object.keys(deviceIds).length) {
            this.debug('Device:getStates(): using empty device list');
            deviceIds = null;
        }

        let me = this;
        let states = {};

        if (!deviceIds) {
            Object.keys(me._devices).forEach(function (deviceId) {
                if (me._devices.hasOwnProperty(deviceId)) {
                    states[deviceId] = me._devices[deviceId].states;
                }
            });
        } else {
            for (let i = 0; i < deviceIds.length; i++) {
                let deviceId = deviceIds[i];
                this.debug('Device:getStates(with-deviceIds): deviceId = ' + JSON.stringify(deviceId));

                if (me._devices.hasOwnProperty(deviceId)) {
                    states[deviceId] = me._devices[deviceId].states;
                    this.debug('Device:getStates(with-deviceIds): states[deviceId] = ' + JSON.stringify(states[deviceId]));
                }
            }
        }

        return states;
    }
    /**
     *
     * @param devices
     * [{
     *   "id": "123"
     * }, {
     *   "id": "234"
     * }]
     * @return {Array} ["123", "234"]
     */
    getDeviceIds(devices) {
        let deviceIds = [];

        for (let i = 0; i < devices.length; i++) {
            if (devices[i] && devices[i].id) {
                deviceIds.push(devices[i].id);
            }
        }

        return deviceIds;
    }
    //
    //
    //
    _devicesDoTimedSync() {
        let me = this;

        if (this._devicesSyncTimer !== null) {
            clearTimeout(this._devicesSyncTimer);
        }

        this._devicesSyncTimer = setTimeout(function () {
            me.debug('Device:_devicesDoTimedSync(_devicesSyncTimer)');
            me.requestSync();
            me._devicesSyncTimer = null;
        }, syncRequestDelay);
    }
}

module.exports = Devices;
