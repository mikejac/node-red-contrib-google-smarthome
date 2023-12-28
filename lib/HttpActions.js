/**
 * node-red-contrib-google-smarthome
 * Copyright (C) 2024 Michael Jacobsen and others.
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

const path = require('path');
const UidGenerator = require('uid-generator');
const { google } = require('googleapis');
const fs = require('fs');
const ipRangeCheck = require('ip-range-check');

const userId = '0';

const LOOPBACK_NETWORKS = [
    "127.0.0.0/8",
    "::1/128",
    "::ffff:127.0.0.0/104"
];
const PRIVATE_NETWORKS = [
    "fd00::/8",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16"
];

const isLocalIP = function (ip) {
    return ipRangeCheck(ip, LOOPBACK_NETWORKS) || ipRangeCheck(ip, PRIVATE_NETWORKS)
};

/******************************************************************************************************************
 * HttpActions
 *
 */
class HttpActions {
    /**
     * Constructor
     *
     * @param {GoogleSmartHome} smarthome
     */
    constructor(smarthome) {
        this._smarthome = smarthome;
        this._reqGen = new UidGenerator(128, UidGenerator.BASE62);
    }
    //
    //
    //
    httpActionsRegister(httpRoot, appHttp) {
        let me = this;
        if (typeof appHttp === 'undefined') {
            appHttp = this._smarthome.app;
        }

        /**
         *
         * action: {
         *   initialTrigger: {
         *     intent: [
         *       "action.devices.SYNC",
         *       "action.devices.QUERY",
         *       "action.devices.EXECUTE"
         *       "action.devices.IDENTIFY",
         *       "action.devices.REACHABLE_DEVICES",
         *     ]
         *   },
         *   httpExecution: "https://example.org/device/agent",
         *   accountLinking: {
         *     authenticationUrl: "https://example.org/device/auth"
         *   }
         * }
         */
        appHttp.post(me._smarthome.Path_join(httpRoot, 'smarthome'), function (request, response) {
            me._post(request, response, 'smarthome');
        });

        /**
         * Endpoint to check HTTP(S) reachability.
         */
        appHttp.get(me._smarthome.Path_join(httpRoot, 'check'), function (request, response) {
            me._smarthome.debug('HttpActions:httpActionsRegister(/check)');
            if (me._smarthome._debug) {
                fs.readFile(path.join(__dirname, 'frontend/check.html'), 'utf8', function (err, data) {
                    if (err) {
                        response.end();
                        throw (err);
                    }
                    response
                        .set("Content-Security-Policy", "default-src 'self' 'unsafe-inline' code.jquery.com")
                        .send(data);
                });
            } else {
                response.send('SUCCESS');
            }
        });

        /**
         * Enables preflight (OPTIONS) requests made cross-domain.
         */
        appHttp.options(me._smarthome.Path_join(httpRoot, 'smarthome'), function (request, response) {
            me._options(request, response);
        });
    }

    httpLocalActionsRegister(httpLocalRoot, appHttp) {
        let me = this;

        /**
         *
         * action: {
         *   initialTrigger: {
         *     intent: [
         *       "action.devices.IDENTIFY",
         *       "action.devices.REACHABLE_DEVICES",
         *       "action.devices.QUERY",
         *       "action.devices.EXECUTE"
         *     ]
         *   },
         * }
         */
        appHttp.post(me._smarthome.Path_join(httpLocalRoot, 'smarthome'), function (request, response) {
            me._smarthome.debug('local smarthome: request.headers = ' + JSON.stringify(request.headers));
            if (!isLocalIP(request.ip)) {
                response.status(200).set({
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }).json({});
            }
            me._post(request, response, 'smarthome');
        });

        /**
         * Enables preflight (OPTIONS) requests made cross-domain.
         */
        appHttp.options(me._smarthome.Path_join(httpLocalRoot, 'smarthome'), function (request, response) {
            me._options(request, response);
        });
    }
    /******************************************************************************************************************
     * private methods
     *
     */
    _options(request, response) {
        response.status(200).set({
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }).send('null');
    }
    //
    //
    //
    _post(request, response, url) {
        let me = this;
        let reqdata = request.body;

        me._smarthome.debug('HttpActions:httpActionsRegister(/' + url + '): request.headers = ' + JSON.stringify(request.headers));
        me._smarthome.debug('HttpActions:httpActionsRegister(/' + url + '): reqdata = ' + JSON.stringify(reqdata));

        let res = request.headers.authorization;
        if (!res) {
            me._smarthome.error('HttpActions:httpActionsRegister(/' + url + '): missing authorization header; res = ' + JSON.stringify(res));

            response.status(401).set({
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).json({ error: 'missing inputs' });

            return;
        }

        res = res.split(" ");
        if (res.length != 2 || res[0] !== 'Bearer') {
            me._smarthome.error('HttpActions:httpActionsRegister(/' + url + '): invalid authorization data; res = ' + JSON.stringify(res));

            response.status(401).set({
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).json({ error: 'missing inputs' });

            return;
        }

        let accessToken = res[1];
        const is_local_execution = me._smarthome.auth.isValidLocalAccessToken(accessToken);
        const user = me._smarthome.auth.getuserForAccessToken(accessToken);
        if (user === null) {
            me._smarthome.error('HttpActions:httpActionsRegister(/' + url + '): no user found for access token "' + accessToken + '"');

            response.status(401).set({
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).json({ error: 'missing inputs' });

            return;
        }
        if (is_local_execution) {
            if (!isLocalIP(request.ip)) {
                response.status(200).set({
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }).json({});
            }
        }

        me._smarthome.debug('HttpActions:httpActionsRegister(/' + url + '): user: ' + user);

        if (!reqdata.inputs) {
            me._smarthome.error('HttpActions:httpActionsRegister(/' + url + '): missing reqdata.inputs');

            response.status(401).set({
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).json({ error: 'missing inputs' });

            return;
        }

        for (let i = 0; i < reqdata.inputs.length; i++) {
            let input = reqdata.inputs[i];
            let intent = input.intent;

            if (!intent) {
                me._smarthome.error('HttpActions:httpActionsRegister(/' + url + '): missing intent');

                response.status(401).set({
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }).json({ error: 'missing inputs' });

                continue;
            }

            switch (intent) {
                case 'action.devices.SYNC':
                    me._smarthome.debug('HttpActions:httpActionsRegister(/' + url + '): SYNC');
                    /**
                     * request:
                     * {
                     *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
                     *  "inputs": [{
                     *      "intent": "action.devices.SYNC",
                     *  }]
                     * }
                     */
                    me._sync(reqdata.requestId, response);
                    break;

                case 'action.devices.QUERY':
                    me._smarthome.debug('HttpActions:httpActionsRegister(/' + url + '): QUERY');
                    /**
                     * request:
                     * {
                     *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
                     *   "inputs": [{
                     *       "intent": "action.devices.QUERY",
                     *       "payload": {
                     *          "devices": [{
                     *            "id": "123",
                     *            "customData": {
                     *              "fooValue": 12,
                     *              "barValue": true,
                     *              "bazValue": "alpaca sauce"
                     *            }
                     *          }, {
                     *            "id": "234",
                     *            "customData": {
                     *              "fooValue": 74,
                     *              "barValue": false,
                     *              "bazValue": "sheep dip"
                     *            }
                     *          }]
                     *       }
                     *   }]
                     * }
                     */
                    me._query(reqdata.requestId, reqdata.inputs[i].payload.devices, response);
                    break;

                case 'action.devices.EXECUTE':
                    me._smarthome.debug('HttpActions:httpActionsRegister(/' + url + '): EXECUTE');
                    /**
                     * request:
                     * {
                     *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
                     *   "inputs": [{
                     *     "intent": "action.devices.EXECUTE",
                     *     "payload": {
                     *       "commands": [{
                     *         "devices": [{
                     *           "id": "123",
                     *           "customData": {
                     *             "fooValue": 12,
                     *             "barValue": true,
                     *             "bazValue": "alpaca sauce"
                     *           }
                     *         }, {
                     *           "id": "234",
                     *           "customData": {
                     *              "fooValue": 74,
                     *              "barValue": false,
                     *              "bazValue": "sheep dip"
                     *           }
                     *         }],
                     *         "execution": [{
                     *           "command": "action.devices.commands.OnOff",
                     *           "params": {
                     *             "on": true
                     *           }
                     *         }]
                     *       }]
                     *     }
                     *   }]
                     * }
                     */
                    me._exec(reqdata.requestId, reqdata.inputs[i].payload.commands, response, is_local_execution);
                    break;

                case 'action.devices.DISCONNECT':
                    me._smarthome.debug('HttpActions:httpActionsRegister(/' + url + '): DISCONNECT');
                    me._smarthome.auth.removeAllTokensForUser(user);

                    response.status(200).set({
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    }).json({});
                    break;

                case 'action.devices.IDENTIFY':
                    me._smarthome.debug('HttpActions:httpActionsRegister(/' + url + '): IDENTIFY');

                    me._smarthome.checkAppJsVersion(reqdata.appJsVersion);

                    response.status(200).json({
                        requestId: reqdata.requestId,
                        payload: {
                            device: {
                                id: me._smarthome._nodeId,
                                isLocalOnly: true,
                                isProxy: true,
                                deviceInfo: {
                                    manufacturer: 'Node-RED',
                                    model: 'Node-Red',
                                    swVersion: '1.0',
                                    hwVersion: '1.0'
                                }
                            }
                        }
                    });
                    break;

                case 'action.devices.REACHABLE_DEVICES':
                    me._smarthome.debug('HttpActions:httpActionsRegister(/' + url + '): REACHABLE_DEVICES');
                    me._reachable_devices(reqdata.requestId, reqdata.inputs[i].payload.commands, response);
                    break;

                default:
                    me._smarthome.error('HttpActions:httpActionsRegister(/' + url + '): invalid intent');

                    response.status(401).set({
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    }).json({ error: 'missing intent' });
                    break;
            }
        }
    }
    //
    //
    //
    _sync(requestId, response) {
        this._smarthome.debug('HttpActions:_sync()');

        let devices = this._smarthome.devices.getProperties();
        if (!devices) {
            response.status(500).set({
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).json({ error: 'failed' });

            return;
        }

        let me = this;
        let deviceList = [];

        Object.keys(devices).forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(devices, key) && devices[key]) {
                let device = devices[key];
                device.id = key;
                deviceList.push(device);
            }
        });

        if (deviceList.length === 0) {
            deviceList.push({
                type: "action.devices.types.SCENE",
                traits: [
                    "action.devices.traits.Scene"
                ],
                name: {
                    defaultNames: [
                        "Node-RED Scene"
                    ],
                    name: "Dummy"
                },
                willReportState: true,
                attributes: {
                    sceneReversible: false
                },
                deviceInfo: {
                    manufacturer: "Node-RED",
                    model: "nr-device-scene-v1",
                    swVersion: "1.0",
                    hwVersion: "1.0"
                },
                id: "dummy.node"
            });
        }

        let deviceProps = {
            requestId: requestId,
            payload: {
                agentUserId: userId,
                devices: deviceList,
            },
        };

        me._smarthome.debug('HttpActions:_sync(): response = ' + JSON.stringify(deviceProps));

        response.status(200).json(deviceProps);

        return deviceProps;
    }
    //
    //
    //
    _query(requestId, devices, response) {
        this._smarthome.debug('HttpActions:_query()');

        let deviceIds = this._smarthome.devices.getDeviceIds(devices);

        let states = this._smarthome.devices.getStates(deviceIds);
        if (!states) {
            response.status(500).set({
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).json({ error: 'failed' });

            return;
        }

        let deviceStates = {
            requestId: requestId,
            payload: {
                devices: states,
            },
        };

        this._smarthome.debug('HttpActions:_query(): deviceStates = ' + JSON.stringify(deviceStates));

        response.status(200).json(deviceStates);
        return deviceStates;
    }
    // Called by http post
    //
    //
    _exec(requestId, commands, response, is_local) {
        this._smarthome.debug('HttpActions:_exec()');

        // Prevent loop bound injection (https://codeql.github.com/codeql-query-help/javascript/js-loop-bound-injection/)
        if (!(commands instanceof Array)) {
            throw new Error('Parameter "commands" must be of type Array');
        }

        let respCommands = [];

        for (let i = 0; i < commands.length; i++) {
            let curCommand = commands[i];

            for (let j = 0; j < curCommand.execution.length; j++) {
                let curExec = curCommand.execution[j];
                let devices = curCommand.devices;

                for (let k = 0; k < devices.length; k++) {
                    let executionResponse = this._execDevice(curExec, devices[k], is_local);

                    this._smarthome.debug('HttpActions:_exec(): executionResponse = ' + JSON.stringify(executionResponse));

                    const execState = {};

                    if (executionResponse.executionStates) {
                        executionResponse.executionStates.map((key) => {
                            execState[key] = executionResponse.states[key];
                        });
                    } else {
                        this._smarthome.debug('HttpActions:_exec(): no execution states were found for this device');
                    }

                    respCommands.push({
                        ids: [devices[k].id],
                        status: executionResponse.status,
                        errorCode: executionResponse.errorCode ? executionResponse.errorCode : undefined,
                        states: execState,
                        challengeNeeded: executionResponse.challengeNeeded || undefined
                    });
                }
            }
        }

        let resBody = {
            requestId: requestId,
            payload: {
                commands: respCommands,
            },
        };

        this._smarthome.debug('HttpActions:_exec(): resBody = ' + JSON.stringify(resBody));

        response.status(200).json(resBody);

        return resBody;
    }
    // Called by _exec
    //
    //
    _execDevice(command, device, is_local) {
        let me = this;

        me._smarthome.debug('HttpActions:_execDevice(): command = ' + JSON.stringify(command));

        const deviceId = device.id;

        const cur_device = me._smarthome.devices.getDevice(deviceId);
        // check whether the device exists or whether it exists and it is disconnected.
        if (!cur_device || !cur_device.states.online) {
            me._smarthome._mgmtNode.warn('HttpActions:_execDevice(): the device you want to control is offline');
            return { status: 'ERROR', errorCode: 'deviceOffline' };
        }

        let curDevice = {
            id: deviceId,
            states: {},
        };

        curDevice.command = command.command;
        const result = cur_device.execCommand(command);
        if (Object.prototype.hasOwnProperty.call(result, 'status')) {
            return result;
        }
        cur_device.updated(command, result, is_local);

        let reportState = true;
        let allParams = false;
        if (Object.prototype.hasOwnProperty.call(result, 'reportState')) {
            reportState = result.reportState;
        }
        if (Object.prototype.hasOwnProperty.call(result, "params") && Object.keys(result.params).length > 0) {
            command.params = result.params;
            allParams = true;
        }

        if (Object.prototype.hasOwnProperty.call(command, 'params')) {
            Object.keys(command.params).forEach(function (key) {
                if (allParams || Object.prototype.hasOwnProperty.call(cur_device.states, key)) {
                    curDevice.states[key] = command.params[key];
                }
            });
        }

        if (reportState) {
            // update states in HomeGraph
            process.nextTick(() => {
                let s = me._smarthome.devices.getStates([deviceId]);
                me.reportState(deviceId, s[deviceId]);
            });
        }

        let states = cur_device.states;
        if (Object.prototype.hasOwnProperty.call(result, "states") && Object.keys(result.states).length > 0) {
            states = result.states;
        }

        return {
            status: 'SUCCESS',
            states: states,
            executionStates: result.executionStates,
        };
    }
    //
    //
    //
    _reachable_devices(requestId, devices, response) {
        this._smarthome.debug('HttpActions:_reachable_devices()');

        let reachableDevices = this._smarthome.devices.getReachableDeviceIds();
        if (!reachableDevices) {
            response.status(500).set({
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).json({ error: 'failed' });

            return;
        }

        let resBody = {
            requestId: requestId,
            payload: {
                devices: reachableDevices,
            },
        };


        this._smarthome.debug('HttpActions:_reachable_devices(): reachableDevices = ' + JSON.stringify(resBody));

        response.status(200).json(resBody);

        return reachableDevices;
    }
    //
    //
    //
    reportState(deviceId, states, notifications) {
        let me = this;

        if (deviceId == undefined && Object.keys(states).length === 0 && notifications == undefined) {
            me._smarthome.error('HttpActions:reportState(): skipped reporting states, no devices registered');
            return;
        }

        if (!this._smarthome.IsHttpServerRunning()) {
            me._smarthome.error('HttpActions:reportState(): skipped reporting states, http server is not running');
            return;
        }

        if (!this._smarthome.auth.isAccountLinked()) {
            me._smarthome.error('HttpActions:reportState(): skipped reporting states, account is not linked. (Re-)link your account in the app.');
            return;
        }

        const postData = {
            requestId: this._reqGen.generateSync(),
            agentUserId: userId,
            payload: {
                devices: {
                }
            }
        };

        if (states) {
            postData.payload.devices.states = {};
        }

        if (notifications) {
            postData.eventId = this._reqGen.generateSync();
            postData.payload.devices.notifications = {};
            postData.payload.devices.notifications[deviceId] = notifications;     // single device
        }

        if (states) {
            if (!deviceId) {
                postData.payload.devices.states = states;               // all devices
            } else {
                delete states["command"];
                postData.payload.devices.states[deviceId] = states;     // single device
            }
        }

        if (!this._smarthome.auth._jwtkey.private_key) {
            return;
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: this._smarthome._jwtKeyFile.startsWith(path.sep) ? this._smarthome._jwtKeyFile : path.join(this._smarthome._userDir, this._smarthome._jwtKeyFile),
            scopes: ['https://www.googleapis.com/auth/homegraph']
        });

        const homegraph = google.homegraph({
            version: 'v1',
            auth: auth,
        });

        homegraph.devices.reportStateAndNotification({ 'requestBody': postData })
            .then(() => {
                me._smarthome.debug('HttpActions:reportState(): successfully reported state to Google: ' + JSON.stringify(postData));
            })
            .catch(error => {
                let myError = {
                    "msg": "Error in HttpActions:reportState()",
                    "org_msg": (error.response !== undefined ? error.response.data.error : error),
                    "data": {
                        "postData": postData,
                    },
                };

                me._smarthome.error(myError);
            });
    }
    //
    //
    //
    requestSync() {
        let me = this;

        this._smarthome.debug('HttpActions:requestSync()');

        if (!this._smarthome.IsHttpServerRunning()) {
            me._smarthome.error('HttpActions:requestSync(): skipped requested sync, http server is not running');
            return;
        }

        if (!this._smarthome.auth.isAccountLinked()) {
            me._smarthome.error('HttpActions:requestSync(): skipped requested sync, account is not linked. (Re-)link your account in the app.');
            return;
        }

        const postData = {
            agentUserId: userId,
            async: true,
        };

        this._smarthome.debug('HttpActions:requestSync(): postData = ' + JSON.stringify(postData));

        if (!this._smarthome.auth._jwtkey.private_key) {
            return;
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: this._smarthome._jwtKeyFile.startsWith(path.sep) ? this._smarthome._jwtKeyFile : path.join(this._smarthome._userDir, this._smarthome._jwtKeyFile),
            scopes: ['https://www.googleapis.com/auth/homegraph']
        });

        const homegraph = google.homegraph({
            version: 'v1',
            auth: auth,
        });

        homegraph.devices.requestSync({ 'requestBody': postData })
            .then(() => {
                me._smarthome.debug('HttpActions:requestSync(): success');
            })
            .catch(error => {
                let myError = {
                    "msg": "Error in HttpActions:requestSync()",
                    "org_msg": (error.response !== undefined ? error.response.data.error : error),
                    "data": {
                        "postData": postData,
                    },
                };

                me._smarthome.error(myError);
            });
    }
}

module.exports = HttpActions;
