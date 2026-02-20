/**
 * node-red-contrib-google-smarthome
 * Copyright (C) 2026 Michael Jacobsen and others.
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

import { DeviceNode } from '../devices/device';
import { GoogleSmartHome } from './SmartHome';

const syncRequestDelay = 5000;

/******************************************************************************************************************
 * Devices
 *
 */
export default class Devices {
    private _smarthome: GoogleSmartHome;
    private _nodes: Record<string, DeviceNode>;
    private _devicesSyncTimer: NodeJS.Timeout | null;

    /**
     * Constructor
     *
     * @param {GoogleSmartHome} smarthome
     */
    constructor(smarthome: GoogleSmartHome) {
        this._smarthome = smarthome;
        this._nodes = {};
        this._devicesSyncTimer = null;
    }
    //
    //
    //
    DeleteDevice(client): boolean {
        if (!this._nodes[client.id]) {
            this._smarthome.debug('Device:DeleteDevice(): device does not exist; client.id = ' + client.id);
            return false;
        } else {
            delete this._nodes[client.id];

            this._devicesDoTimedSync();

            return true;
        }
    }
    //
    //
    //
    ReportState(deviceId: string): boolean {
        if (!this._nodes[deviceId]) {
            this._smarthome.debug('Device:ReportState(): device ' + deviceId + ' does not exist');
            return false;
        }

        this._smarthome.httpActions.reportState(deviceId, this._nodes[deviceId].states);
    }
    //
    //
    //
    SendNotifications(deviceId: string, notifications) {
        this._smarthome.debug('Devices:SendNotifications(): notifications = ' + JSON.stringify(notifications));

        if (!this._nodes[deviceId]) {
            this._smarthome.debug('Device:SendNotifications(): device does not exist');
            return false;
        }

        this._smarthome.httpActions.reportState(deviceId, undefined, notifications);
    }
    //
    //
    //
    GetIdFromName(name: string) {
        let nodeId;
        if (name) {
            Object.keys(this._nodes).forEach(nid => {
                let elm = this._nodes[nid];
                if (elm.device.properties.name.name === name) {
                    nodeId = nid;
                }
            });
        }
        return nodeId;
    }
    //
    //
    //
    registerDevice(client) {
        if (!this._nodes[client.id]) {
            this._smarthome.debug('Device:registerDevice(): new device ' + JSON.stringify(client.device));
        } else {
            this._smarthome.debug('Device:registerDevice(): update device ' + JSON.stringify(client.device));
        }
        this._nodes[client.id] = client;

        this._devicesDoTimedSync();
    }
    //
    // Executed in HttpActions:_execDevice
    //
    getDevice(deviceId: string) {
        return this._nodes[deviceId] ||  undefined;
    }
    //
    //
    //
    getProperties(deviceIds = undefined) {
        let properties = {};

        if (!deviceIds) {
            Object.keys(this._nodes).forEach((deviceId) => {
                if (Object.prototype.hasOwnProperty.call(this._nodes, deviceId)) {
                    properties[deviceId] = this._nodes[deviceId].device.properties;
                }
            });
        } else {
            for (let i = 0; i < deviceIds.length; i++) {
                let deviceId = deviceIds[i];

                if (Object.prototype.hasOwnProperty.call(this._nodes, deviceId)) {
                    properties[deviceId] = this._nodes[deviceId].device.properties;
                }
            }
        }

        return properties;
    }
    //
    //
    //
    getStates(deviceIds: string[] | null = null, onlyPersistent = false, useNames = false) {
        if (!deviceIds || !Object.keys(deviceIds).length) {
            this._smarthome.debug('Device:getStates(): all deviceIds');
            deviceIds = null;
        } else {
            this._smarthome.debug('Device:getStates(): deviceIds = ' + JSON.stringify(deviceIds));
        }

        let states = {};

        if (!deviceIds) {
            Object.keys(this._nodes).forEach((deviceId) => {
                if (Object.prototype.hasOwnProperty.call(this._nodes, deviceId)) {
                    let include = true;
                    let node = this._nodes[deviceId];
                    let key = useNames === true ? node.name : deviceId;
                    if (onlyPersistent === true) {
                        include = node.persistent_state || false;
                    } 
                    if (include) {
                        states[key] = this._nodes[deviceId].states;
                    }
                }
            });
        } else {
            for (let i = 0; i < deviceIds.length; i++) {
                let deviceId = deviceIds[i];
                this._smarthome.debug('Device:getStates(with-deviceIds): deviceId = ' + JSON.stringify(deviceId));

                if (Object.prototype.hasOwnProperty.call(this._nodes, deviceId)) {
                    states[deviceId] = this._nodes[deviceId].states;
                    this._smarthome.debug('Device:getStates(with-deviceIds): states[deviceId] = ' + JSON.stringify(states[deviceId]));
                }
            }
        }

        return states;
    }

    /**
     * Sets states for multiple devices.
     *
     * Example input is:
     * {
     *     "7d1ebd458adcbc46": {
     *         "on": true
     *     }
     * }
     *
     * @param {object} states - States to set
     */
    setStates(states) {
        this._smarthome.debug('Device:setStates()');

        Object.keys(states).forEach(deviceId => {
            this._smarthome.debug('Device:setStates(): deviceId = ' + JSON.stringify(deviceId));
            if (Object.prototype.hasOwnProperty.call(this._nodes, deviceId)) {
                this._nodes[deviceId].onInput({topic: this._nodes[deviceId].topicOut, payload: states[deviceId]});
            } else {
                let id = this.GetIdFromName(deviceId);
                if (id !== undefined) {
                    this._nodes[id].onInput({topic: this._nodes[id].topicOut, payload: states[deviceId]});
                }
            }
        });
    }
    /**
     *
     * @param devices
     * [{
     *   "id": "123"
     * }, {
     *   "id": "234"
     * }]
     * @returns {string[]} ["123", "234"]
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
    getReachableDeviceIds() {
        let reachableDevices = [];

        Object.keys(this._nodes).forEach(function (deviceId) {
            reachableDevices.push({verificationId: deviceId});
        });

        return reachableDevices;
    }
    //
    //
    //
    _devicesDoTimedSync() {
        if (this._devicesSyncTimer !== null) {
            clearTimeout(this._devicesSyncTimer);
        }

        this._devicesSyncTimer = setTimeout(() => {
            if (this._smarthome.auth.isAccountLinked()) {
                this._smarthome.debug('Device:_devicesDoTimedSync(_devicesSyncTimer)');
                this._smarthome.httpActions.requestSync();
            } else {
                this._smarthome.debug('Device:_devicesDoTimedSync(_devicesSyncTimer) skipped timed sync, no account linked yet');
            }
            this._devicesSyncTimer = null;
        }, syncRequestDelay);
    }
}
