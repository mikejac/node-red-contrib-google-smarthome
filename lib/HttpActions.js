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

const path           = require('path');
const TokenGenerator = require('uuid-token-generator');
const {google}       = require('googleapis');

const userId         = '0';

/******************************************************************************************************************
 * HttpActions
 *
 */
class HttpActions {
    constructor() {
        this._reqGen = new TokenGenerator(128, TokenGenerator.BASE62);
    }
    //
    //
    //
    httpActionsRegister(httpRoot, appHttp) {
        let me = this;
        if (typeof appHttp === 'undefined') {
            appHttp = this.app;
        }

        /**
         *
         * action: {
         *   initialTrigger: {
         *     intent: [
         *       "action.devices.SYNC",
         *       "action.devices.QUERY",
         *       "action.devices.EXECUTE"
         *     ]
         *   },
         *   httpExecution: "https://example.org/device/agent",
         *   accountLinking: {
         *     authenticationUrl: "https://example.org/device/auth"
         *   }
         * }
         */
        appHttp.post(me.Path_join(httpRoot, 'smarthome'), function(request, response) {
            let reqdata = request.body;

            me.debug('HttpActions:httpActionsRegister(/smarthome): request.headers = ' + JSON.stringify(request.headers));
            me.debug('HttpActions:httpActionsRegister(/smarthome): request.headers.authorization = ' + request.headers.authorization);
            me.debug('HttpActions:httpActionsRegister(/smarthome): reqdata = ' + JSON.stringify(reqdata));
            
            let res = request.headers.authorization;
            if (!res) {
                me._mgmtNode.error('HttpActions:httpActionsRegister(/smarthome): missing authorization header; res = ' + JSON.stringify(res));

                response.status(401).set({
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }).json({error: 'missing inputs'});

                return;
            }

            res = res.split(" ");
            if (res.length != 2 || res[0] != 'Bearer') {
                me._mgmtNode.error('HttpActions:httpActionsRegister(/smarthome): invalid authorization data; res = ' + JSON.stringify(res));

                response.status(401).set({
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }).json({error: 'missing inputs'});

                return;
            }

            let accessToken = res[1];
            if (!me.isValidAccessToken(accessToken)) {
                me._mgmtNode.error('HttpActions:httpActionsRegister(/smarthome): no accessToken found');

                response.status(401).set({
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }).json({error: 'missing inputs'});

                return;
            }

            const user = me.getuserForAccessToken(accessToken);
            me.debug('HttpActions:httpActionsRegister(/smarthome): user: ' + user);

            if (!reqdata.inputs) {
                me._mgmtNode.error('HttpActions:httpActionsRegister(/smarthome): missing reqdata.inputs');

                response.status(401).set({
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }).json({error: 'missing inputs'});

                return;
            }

            for (let i = 0; i < reqdata.inputs.length; i++) {
                let input  = reqdata.inputs[i];
                let intent = input.intent;

                if (!intent) {
                    me._mgmtNode.error('HttpActions:httpActionsRegister(/smarthome): missing intent');

                    response.status(401).set({
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    }).json({error: 'missing inputs'});

                    continue;
                }

                switch (intent) {
                    case 'action.devices.SYNC':
                        me.debug('HttpActions:httpActionsRegister(/smarthome): SYNC');
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
                        me.debug('HttpActions:httpActionsRegister(/smarthome): QUERY');
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
                        me._query(reqdata.requestId, reqdata.inputs[0].payload.devices, response);
                        break;

                    case 'action.devices.EXECUTE':
                        me.debug('HttpActions:httpActionsRegister(/smarthome): EXECUTE');
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
                        me._exec(reqdata.requestId, reqdata.inputs[0].payload.commands, response);
                        break;

                    case 'action.devices.DISCONNECT':
                        me.debug('HttpActions:httpActionsRegister(/smarthome): DISCONNECT');
                        me.removeAllTokensForUser(user);

                        response.status(200).set({
                            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        }).json({});
                        break;

                    default:
                        me._mgmtNode.error('HttpActions:httpActionsRegister(/smarthome): invalid intent');

                        response.status(401).set({
                            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        }).json({error: 'missing intent'});
                        break;
                }
            }
        });

        /**
         * Endpoint to check HTTP(S) reachability.
         */
        appHttp.get(me.Path_join(httpRoot, 'check'), function(request, response) {
            me.debug('HttpActions:httpActionsRegister(/check)');
            response.send('SUCCESS');
        });

        /**
         * Enables prelight (OPTIONS) requests made cross-domain.
         */
        appHttp.options(me.Path_join(httpRoot, 'smarthome'), function(request, response) {
            response.status(200).set({
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).send('null');
        });
    }
    /******************************************************************************************************************
     * private methods
     *
     */
    _sync(requestId, response) {
        this.debug('HttpActions:_sync()');

        let devices = this.getProperties();
        if (!devices) {
            response.status(500).set({
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).json({error: 'failed'});

            return;
        }

        let me = this;
        let deviceList = [];

        Object.keys(devices).forEach(function(key) {
            if (devices.hasOwnProperty(key) && devices[key]) {
                let device = devices[key];
                device.id  = key;
                deviceList.push(device);
            }
        });

        let deviceProps = {
            requestId: requestId,
            payload: {
                agentUserId: userId,
                devices: deviceList,
            },
        };

        me.debug('HttpActions:_sync(): response = ' + JSON.stringify(deviceProps));

        response.status(200).json(deviceProps);

        return deviceProps;
    }
    //
    //
    //
    _query(requestId, devices, response) {
        this.debug('HttpActions:_query()');

        let deviceIds = this.getDeviceIds(devices);

        let states = this.getStates(deviceIds);
        if (!states) {
            response.status(500).set({
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).json({error: 'failed'});

            return;
        }

        let deviceStates = {
            requestId: requestId,
            payload: {
                devices: states,
            },
        };

        this.debug('HttpActions:_query(): deviceStates = ' + JSON.stringify(deviceStates));

        response.status(200).json(deviceStates);
        return deviceStates;
    }
    // Called by http post
    //
    //
    _exec(requestId, commands, response) {
        this.debug('HttpActions:_exec()');

        let respCommands = [];

        for (let i = 0; i < commands.length; i++) {
            let curCommand = commands[i];

            for (let j = 0; j < curCommand.execution.length; j++) {
                let curExec = curCommand.execution[j];
                let devices = curCommand.devices;

                for (let k = 0; k < devices.length; k++) {
                    let executionResponse = this._execDevice(curExec, devices[k]);

                    this.debug('HttpActions:_exec(): executionResponse = ' + JSON.stringify(executionResponse));

                    const execState = {};

                    if (executionResponse.executionStates) {
                        executionResponse.executionStates.map((key) => {
                            execState[key] = executionResponse.states[key];
                        });
                    } else {
                        this.debug('HttpActions:_exec(): no execution states were found for this device');
                    }

                    respCommands.push({
                        ids: [devices[k].id],
                        status: executionResponse.status,
                        errorCode: executionResponse.errorCode ? executionResponse.errorCode : undefined,
                        states: execState,
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

        this.debug('HttpActions:_exec(): resBody = ' + JSON.stringify(resBody));

        response.status(200).json(resBody);

        return resBody;      
    }
    // Called by _exec
    //
    //
    _execDevice(command, device) {
        this.debug('HttpActions:_execDevice(): command = ' + JSON.stringify(command));

        const params = command.hasOwnProperty('params') ? command.params : {};
        let curDevice = {
            id: device.id,
            states: {},
        };
        
        let result = {};
        let reportState = true;
        let allParams = false;
        if (command.hasOwnProperty('command')) {
            curDevice.command = command.command;
            result = this.execCommand(curDevice, command); // Devices.execCommand
            if (result) {
                if (result.hasOwnProperty('status')) {
                    return result;
                }
                if (result.hasOwnProperty('reportState')) {
                    reportState = result.reportState;
                }
                if (result.hasOwnProperty("params") && Object.keys(result.params).length > 0) {
                    command.params = result.params;
                    allParams = true;
                }
            }
        }
        
        if (command.hasOwnProperty('params')) {
            let cur_device=this._devices[device.id] || { "states":{} };
            Object.keys(command.params).forEach(function (key) {
                // arrgggghhhh - why Google, why ...
                if (key === 'color' && command.params.color.hasOwnProperty('spectrumHSV')) {
                    command.params.color.spectrumHsv = command.params.color.spectrumHSV;
                    delete command.params.color.spectrumHSV;
                }/* else if (key === 'color' && command.params.color.hasOwnProperty('spectrumRGB')) {
                    this.debug('HttpActions:_execDevice(): spectrumRGB');
                    command.params.color.spectrumRgb = command.params.color.spectrumRGB;
                    delete command.params.color.spectrumRGB;
                }*/

                if (allParams || cur_device.states.hasOwnProperty(key)) {
                    curDevice.states[key] = command.params[key];
                }
            });
        }

        let payLoadDevice = {
            ids: [curDevice.id],
            status: 'SUCCESS',
            states: {},
        };

        this.execDevice(curDevice, true, command.params, params); // Devices.execDevice

        let execDevice = this.getStatus([curDevice.id]);
        this.debug('HttpActions:_execDevice(): execDevice = ' + JSON.stringify(execDevice));

        // check whether the device exists or whether it exists and it is disconnected.
        if (!execDevice || !execDevice[device.id] || !execDevice[device.id].states.online) {
            this._mgmtNode.warn('HttpActions:_execDevice(): the device you want to control is offline');
            return {status: 'ERROR', errorCode: 'deviceOffline'};
        }

        let deviceCommand = {
            type: 'change',
            state: {},
        };

        // TODO - add error and debug to response

        deviceCommand.state[curDevice.id] = execDevice[curDevice.id].states;

        execDevice = execDevice[curDevice.id];

        payLoadDevice.states = execDevice.states;

        if (command.hasOwnProperty('params')) {
            Object.keys(command.params).forEach(function (key) {
                if (command.params.hasOwnProperty(key)) {
                    if (payLoadDevice.states[key] != command.params[key]) {
                        return { status: 'ERROR', errorCode: 'notSupported' };
                    }
                }
            });
        }

        let me = this;
        let id = device.id;

        if (reportState) {
            // update states in HomeGraph
            process.nextTick(() => {
                let s = me.getStates([id]);
                me.reportState(id, s[id]);
            });
        }

        let executionStates = execDevice.executionStates;
        if (result.hasOwnProperty('executionStates') && Object.keys(result.executionStates).length > 0) {
            executionStates = result['executionStates'];
        }

        let states = execDevice.states;
        if (result.hasOwnProperty("states") && Object.keys(result.states).length > 0) {
            states = result.states;
        }

        return {
            status: 'SUCCESS',
            states: states,
            executionStates: executionStates,
        };
    }
    //
    //
    //
    reportState(deviceId, states, notifications) {
        let me = this;
        
        this.debug('HttpActions:reportState(): deviceId = ' + deviceId);
        if (states) {
            this.debug('HttpActions:reportState(): states = ' + JSON.stringify(states));
        }
        if (notifications) {
            this.debug('HttpActions:reportState(): notifications = ' + JSON.stringify(notifications));
        }

        if (!this.IsHttpServerRunning()) {
            me._mgmtNode.error('HttpActions:reportState(): http server is not running');
            return;
        }

        if (!this.isUserLoggedIn()) {
            me._mgmtNode.error('HttpActions:reportState(): no user logged!');
            return;
        }

        const postData = {
            requestId: this._reqGen.generate(),
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
            postData.eventId = this._reqGen.generate();
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

        this.debug('HttpActions:reportState(): postData = ' + JSON.stringify(postData));

        const auth = new google.auth.GoogleAuth({
            keyFile: this._jwtKey.startsWith(path.sep) ? this._jwtKey : path.join(this._userDir, this._jwtKey),
            scopes: ['https://www.googleapis.com/auth/homegraph']
        });

        const homegraph = google.homegraph({
            version: 'v1',
            auth: auth,
        });

        homegraph.devices.reportStateAndNotification({'requestBody': postData})
            .then(result => {
                me.debug('HttpActions:reportState(): success');
            })
            .catch(error => {
                let myError = {
                    "msg": "Error in HttpActions:reportState()",
                    "org_msg": (error.response !== undefined ? error.response.data.error : error),
                    "data": {
                        "postData": postData,
                    },
                };

                me._mgmtNode.error(myError);
                me.debug(JSON.stringify(myError));
            });
    }
    //
    //
    //
    requestSync() {
        let me = this;

        this.debug('HttpActions:requestSync()');

        if (!this.IsHttpServerRunning()) {
            me._mgmtNode.error('HttpActions:requestSync(): http server is not running');
            return;
        }

        if (!this.isUserLoggedIn()) {
            me._mgmtNode.error('HttpActions:requestSync(): no user logged!');
            return;
        }

        const postData = {
            agentUserId: userId,
        };

        this.debug('HttpActions:requestSync(): postData = ' + JSON.stringify(postData));

        const auth = new google.auth.GoogleAuth({
            keyFile: this._jwtKey.startsWith(path.sep) ? this._jwtKey : path.join(this._userDir, this._jwtKey),
            scopes: ['https://www.googleapis.com/auth/homegraph']
        });

        const homegraph = google.homegraph({
            version: 'v1',
            auth: auth,
        });

        homegraph.devices.requestSync({'requestBody': postData})
            .then(result => {
                me.debug('HttpActions:requestSync(): success');
            })
            .catch(error => {
                let myError = {
                    "msg": "Error in HttpActions:requestSync()",
                    "org_msg": (error.response !== undefined ? error.response.data.error : error),
                    "data": {
                        "postData": postData,
                    },
                };

                me._mgmtNode.error(myError);
                me.debug(JSON.stringify(myError));
            });
    }
}

module.exports = HttpActions;
