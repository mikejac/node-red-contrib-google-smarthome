/**
 * NodeRED Google SmartHome
 * Copyright (C) 2020 Michael Jacobsen.
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
        this._devicesSyncTimer = null;
    }
    //
    //
    //
    DeleteDevice(client) {
        if (!this._devices[client.id]) {
            this.debug('Device:DeleteDevice(): device does not exist; client.id = ' + client.id);
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
    // Calls the device node execCommand function
    // Used to manage not status parameters
    // Executed in HttpActions:_execDevice
    execCommand(device, command) {
        let me = this;

        me.debug('Device:execCommand(): device = ' + JSON.stringify(device));

        if (!this._devices[device.id]) {
            me.debug('Device:execCommand(): device does not exist');
            return false;
        }

        if (typeof this._nodes[device.id].execCommand === 'function') {
            let result = this._nodes[device.id].execCommand(device, command, this._devices[device.id]);
            this.debug('Device:execCommand(): result = ' + JSON.stringify(result));
            return result;
        }
        me.debug('Device:execCommand(): device has no execCommand');
        return false;
    }
    // Called by HttpAction._execDevice
    //
    //
    execDevice(device, doUpdate, params, original_params) {
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

        if (device.hasOwnProperty('command')) {
            // update command
                    me.debug('Device:execDevice(): command = ' + device.command);
                    me._devices[device.id].command = device.command;
        }
        
        if (device.hasOwnProperty('executionStates')) {
            // update array of states
            me.debug('Device:execDevice(): executionStates = ' + JSON.stringify(device.executionStates));
            me._devices[device.id].executionStates = device.executionStates;
        }

        me.debug('Device:execDevice(): this._devices[device.id] = ' + JSON.stringify(this._devices[device.id]));


        if (doUpdate) {
            me.debug('Device:execDevice(): doUpdate');
            this._nodes[device.id].updated(this._devices[device.id], params, original_params);
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
            if (me.isUserLoggedIn()) {
                me.debug('Device:_devicesDoTimedSync(_devicesSyncTimer)');
                me.requestSync();
            } else {
                me.debug('Device:_devicesDoTimedSync(_devicesSyncTimer) no user connected yet');
            }
            me._devicesSyncTimer = null;
        }, syncRequestDelay);
    }
}

module.exports = Devices;
