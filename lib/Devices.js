/**
 * NodeRED Google SmartHome
 * Copyright (C) 2021 Michael Jacobsen.
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
        this._nodes = {};
        this._devicesSyncTimer = null;
    }
    //
    //
    //
    DeleteDevice(client) {
        if (!this._nodes[client.id]) {
            this.debug('Device:DeleteDevice(): device does not exist; client.id = ' + client.id);
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
    ReportState(deviceId) {
        let me = this;

        if (!this._nodes[deviceId]) {
            me.debug('Device:SetState(): device ' + deviceId + ' does not exist');
            return false;
        }

        this.reportState(deviceId, me._nodes[deviceId].states);
    }
    //
    //
    //
    SendNotifications(deviceId, notifications) {
        let me = this;

        this.debug('Devices:SendNotifications(): notifications = ' + JSON.stringify(notifications));

        if (!this._nodes[deviceId]) {
            me.debug('Device:SendNotifications(): device does not exist');
            return false;
        }

        this.reportState(deviceId, undefined, notifications);
    }
    //
    //
    //
    GetIdFromName(name) {
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
            this.debug('Device:registerDevice(): new device ' + JSON.stringify(client.device));
        } else {
            this.debug('Device:registerDevice(): update device ' + JSON.stringify(client.device));
        }
        this._nodes[client.id] = client;

        this._devicesDoTimedSync();
    }
    //
    // Executed in HttpActions:_execDevice
    //
    getDevice(deviceId) {
        return this._nodes[deviceId] ||  undefined;
    }
    //
    //
    //
    getProperties(deviceIds = undefined) {
        let me = this;
        let properties = {};

        if (!deviceIds) {
            Object.keys(me._nodes).forEach(function (deviceId) {
                if (me._nodes.hasOwnProperty(deviceId)) {
                    properties[deviceId] = me._nodes[deviceId].device.properties;
                }
            });
        } else {
            for (let i = 0; i < deviceIds.length; i++) {
                let deviceId = deviceIds[i];

                if (me._nodes.hasOwnProperty(deviceId)) {
                    properties[deviceId] = me._nodes[deviceId].device.properties;
                }
            }
        }

        return properties;
    }
    //
    //
    //
    getStates(deviceIds, onlyPersistent, useNames, RED) {
        if (!deviceIds || !Object.keys(deviceIds).length) {
            this.debug('Device:getStates(): all deviceIds');
            deviceIds = null;
        } else {
            this.debug('Device:getStates(): deviceIds = ' + JSON.stringify(deviceIds));
        }

        let me = this;
        let states = {};

        if (!deviceIds) {
            Object.keys(me._nodes).forEach(function (deviceId) {
                if (me._nodes.hasOwnProperty(deviceId)) {
                    let include = true;
                    let node = me._nodes[deviceId];
                    let key = useNames === true ? node.name : deviceId;
                    if (onlyPersistent === true) {
                        include = node.persistent_state || false;
                    } 
                    if (include) {
                        states[key] = me._nodes[deviceId].states;
                    }
                }
            });
        } else {
            for (let i = 0; i < deviceIds.length; i++) {
                let deviceId = deviceIds[i];
                this.debug('Device:getStates(with-deviceIds): deviceId = ' + JSON.stringify(deviceId));

                if (me._nodes.hasOwnProperty(deviceId)) {
                    states[deviceId] = me._nodes[deviceId].states;
                    this.debug('Device:getStates(with-deviceIds): states[deviceId] = ' + JSON.stringify(states[deviceId]));
                }
            }
        }

        return states;
    }
    //
    //
    //
    setStates(states) {
        this.debug('Device:setStates()');

        let me = this;
        Object.keys(states).forEach(deviceId => {
            this.debug('Device:setStates(): deviceId = ' + JSON.stringify(deviceId));
            if (me._nodes.hasOwnProperty(deviceId)) {
                me._nodes[deviceId].onInput({payload: states[deviceId]});
            } else {
                let id = me.GetIdFromName(deviceId);
                if (id !== undefined) {
                    me._nodes[id].onInput({payload: states[deviceId]});
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
    getReachableDeviceIds() {
        let me = this;
        let reachableDevices = [];

        Object.keys(me._nodes).forEach(function (deviceId) {
            reachableDevices.push({verificationId: deviceId});
        });

        return reachableDevices;
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
