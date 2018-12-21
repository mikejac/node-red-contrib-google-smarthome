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

const https          = require('https');
const TokenGenerator = require('uuid-token-generator');
const {google}       = require('googleapis');

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
    httpActionsRegister() {
        let me = this;

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
        this.app.post('/smarthome', function(request, response) {
            let reqdata = request.body;

            me.debug('HttpActions:httpActionsRegister(/smarthome): request.headers = ' + JSON.stringify(request.headers));
            me.debug('HttpActions:httpActionsRegister(/smarthome): request.headers.authorization = ' + request.headers.authorization);
            me.debug('HttpActions:httpActionsRegister(/smarthome): reqdata = ' + JSON.stringify(reqdata));
            
            let res = request.headers.authorization.split(" ");
            if (res.length != 2 || res[0] != 'Bearer') {
                me.debug('HttpActions:httpActionsRegister(/smarthome): invalid authorization data; res = ' + JSON.stringify(res));

                response.status(401).set({
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }).json({error: 'missing inputs'});

                return;
            }

            let accessToken = res[1];;
            if (!me.isValidAccessToken(accessToken)) {
                me.debug('HttpActions:httpActionsRegister(/smarthome): no accessToken found');

                response.status(401).set({
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }).json({error: 'missing inputs'});

                return;
            }

            if (!reqdata.inputs) {
                me.debug('HttpActions:httpActionsRegister(/smarthome): missing reqdata.inputs');

                response.status(401).set({
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }).json({error: 'missing inputs'});

                return;
            }
          
            let uid = me.getUid(accessToken);

            for (let i = 0; i < reqdata.inputs.length; i++) {
                let input  = reqdata.inputs[i];
                let intent = input.intent;

                if (!intent) {
                    me.debug('HttpActions:httpActionsRegister(/smarthome): missing intent');

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
                        me._sync({
                            uid: uid,
                            auth: accessToken,
                            requestId: reqdata.requestId,
                        }, response);
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
                        me._query({
                            uid: uid,
                            auth: accessToken,
                            requestId: reqdata.requestId,
                            devices: reqdata.inputs[0].payload.devices,
                        }, response);
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
                        me._exec({
                            uid: uid,
                            auth: accessToken,
                            requestId: reqdata.requestId,
                            commands: reqdata.inputs[0].payload.commands,
                        }, response);
                        break;

                    case 'action.devices.DISCONNECT':
                        me.debug('HttpActions:httpActionsRegister(/smarthome): DISCONNECT');

                        response.status(200).set({
                            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        }).json({});
                        break;

                    default:
                        me.debug('HttpActions:httpActionsRegister(/smarthome): invalid intent');

                        response.status(401).set({
                            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        }).json({error: 'missing intent'});
                        break;
                }
            }
        });
        /**
         * Enables prelight (OPTIONS) requests made cross-domain.
         */
        this.app.options('/smarthome', function(request, response) {
            response.status(200).set({
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).send('null');
        });
    }
    /******************************************************************************************************************
     * private methods
     *
     */
    _sync(data, response) {
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
                me.debug('HttpActions:_sync(): key = ' + key);

                let device = devices[key];
                device.id  = key;
                deviceList.push(device);
            }
        });

        let deviceProps = {
            requestId: data.requestId,
            payload: {
                agentUserId: data.uid,
                devices: deviceList,
            },
        };

        //this.debug('HttpActions:_sync(): deviceProps = ' + JSON.stringify(deviceProps));

        response.status(200).json(deviceProps);

        return deviceProps;
    }
    //
    //
    //
    _query(data, response) {
        this.debug('HttpActions:_query(): data = ' + JSON.stringify(data));

        let deviceIds = this.getDeviceIds(data.devices);

        let devices = this.getStates(deviceIds);
        if (!devices) {
            response.status(500).set({
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).json({error: 'failed'});

            return;
        }

        let deviceStates = {
            requestId: data.requestId,
            payload: {
                devices: devices,
            },
        };

        this.debug('HttpActions:_query(): deviceStates = ' + JSON.stringify(deviceStates));

        response.status(200).json(deviceStates);
        return deviceStates;
    }
    //
    //
    //
    _exec(data, response) {
        this.debug('HttpActions:_exec(): data = ' + JSON.stringify(data));

        let respCommands = [];

        for (let i = 0; i < data.commands.length; i++) {
            let curCommand = data.commands[i];

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
            requestId: data.requestId,
            payload: {
                commands: respCommands,
            },
        };

        this.debug('HttpActions:_exec(): resBody = ' + JSON.stringify(resBody));

        response.status(200).json(resBody);

        return resBody;      
    }
    //
    //
    //
    _execDevice(command, device) {
        let curDevice = {
            id: device.id,
            states: {},
        };

        Object.keys(command.params).forEach(function(key) {
            // arrgggghhhh - why Google, why ...
            if (key === 'color' && command.params.color.hasOwnProperty('spectrumHSV')) {
                command.params.color.spectrumHsv = command.params.color.spectrumHSV;
                delete command.params.color.spectrumHSV;
            }/* else if (key === 'color' && command.params.color.hasOwnProperty('spectrumRGB')) {
                this.debug('HttpActions:_execDevice(): spectrumRGB');
                command.params.color.spectrumRgb = command.params.color.spectrumRGB;
                delete command.params.color.spectrumRGB;
            }*/

            if (command.params.hasOwnProperty(key)) {
                curDevice.states[key] = command.params[key];
            }
        });

        let payLoadDevice = {
            ids: [curDevice.id],
            status: 'SUCCESS',
            states: {},
        };

        this.execDevice(curDevice, true);

        let execDevice = this.getStatus([curDevice.id]);
        this.debug('HttpActions:_execDevice(): execDevice = ' + JSON.stringify(execDevice));

        // check whether the device exists or whether it exists and it is disconnected.
        if (!execDevice || !execDevice[device.id].states.online) {
            this.debug('HttpActions:_execDevice(): the device you want to control is offline');
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
    
        Object.keys(command.params).forEach(function(key) {
            if (command.params.hasOwnProperty(key)) {
                if (payLoadDevice.states[key] != command.params[key]) {
                    return {status: 'ERROR', errorCode: 'notSupported'};
                }
            }
        });

        let me = this;
        let id = device.id;

    /*
ttpActions:reportState(): deviceId = c905c45e.10e118
HttpActions:reportState(): states = {"online":true,"on":true,"brightness":100,"color":{"name":"","spectrumHsv":{"hue":0,"saturation":0,"value":1}}}
HttpActions:reportState(): postData = {"requestId":"2OFFw21K2JW17GYrmhyUZV","agentUserId":"634","payload":{"devices":{"states":{"c905c45e.10e118":{"online":true,"on":true,"brightness":100,"color":{"name":"","spectrumHsv":{"hue":0,"saturation":0,"value":1}}}}}}}
POST /smarthome 200 14.558 ms - 119


HttpActions:reportState(): deviceId = 42883a0d.ef2fa4
HttpActions:reportState(): states = {"online":true,"on":false,"brightness":100,"color":{"name":"","spectrumRgb":0}}
HttpActions:reportState(): postData = {"requestId":"31tlFvOE4r2Vn2Y9tgEwYw","agentUserId":"634","payload":{"devices":{"states":{"42883a0d.ef2fa4":{"online":true,"on":false,"brightness":100,"color":{"name":"","spectrumRgb":0}}}}}}
POST /smarthome 200 14.841 ms - 119
    */

        // update states in HomeGraph
        process.nextTick(() => {
            let s = me.getStates([id]);
            me.reportState(id, s[id]);
        });

        return {
            status: 'SUCCESS',
            states: execDevice.states,
            executionStates: execDevice.executionStates,
        };
    }
    //
    //
    //
    reportState(deviceId, states) {
        let me = this;
        
        this.debug('HttpActions:reportState(): deviceId = ' + deviceId);
        this.debug('HttpActions:reportState(): states = ' + JSON.stringify(states));

        if (!this.IsHttpServerRunning()) {
            this.debug('HttpActions:requestSync(): http server is not running');
            return;
        }

        const jwtClient = new google.auth.JWT(
            this.getJwtClientEmail(),
            null,
            this.getJwtPrivateKey(),
            ['https://www.googleapis.com/auth/homegraph'],
            null
        );
        
        let requestId = this._reqGen.generate();

        const postData = {
            requestId: requestId,
            agentUserId: this.getDefaultUid(),
            payload: {
                devices: {
                    states: {
                    }
                }
            }
        };

        if (!deviceId) {
            postData.payload.devices.states = states;               // all devices
        } else {
            postData.payload.devices.states[deviceId] = states;     // single device
        }

        this.debug('HttpActions:reportState(): postData = ' + JSON.stringify(postData));

        jwtClient.authorize((err, tokens) => {
            if (err) {
                console.error(err);
                return;
            }

            const options = {
                hostname: 'homegraph.googleapis.com',
                port: 443,
                path: '/v1/devices:reportStateAndNotification',
                method: 'POST',
                headers: {
                    Authorization: ` Bearer ${tokens.access_token}`,
                },
            };

            return new Promise((resolve, reject) => {
                let responseData = '';
                const req = https.request(options, (res) => {
                    res.on('data', (d) => {
                        responseData += d.toString();
                    });

                    res.on('end', () => {
                        resolve(responseData);
                    });
                });

                req.on('error', (e) => {
                    reject(e);
                });

                // write data to request body
                req.write(JSON.stringify(postData));
                req.end();
            }).then((data) => {
                let d = JSON.parse(data);
                if (d.hasOwnProperty('error')) {
                    process.nextTick(() => {
                        me.emit('actions-reportstate', d);
                    });        
                } else {
                    me.debug('HttpActions:reportState(): success');
                }
            });
        });
    }
    //
    //
    //
    requestSync() {
        let me = this;

        this.debug('HttpActions:requestSync()');

        if (!this.IsHttpServerRunning()) {
            this.debug('HttpActions:requestSync(): http server is not running');
            return;
        }

        const jwtClient = new google.auth.JWT(
            this.getJwtClientEmail(),
            null,
            this.getJwtPrivateKey(),
            ['https://www.googleapis.com/auth/homegraph'],
            null
        );
        
        const postData = {
            agentUserId: this.getDefaultUid()
        };

        this.debug('HttpActions:requestSync(): postData = ' + JSON.stringify(postData));

        jwtClient.authorize((err, tokens) => {
            if (err) {
                console.error(err);
                return;
            }

            const options = {
                hostname: 'homegraph.googleapis.com',
                port: 443,
                path: '/v1/devices:requestSync',
                method: 'POST',
                headers: {
                    Authorization: ` Bearer ${tokens.access_token}`,
                },
            };

            return new Promise((resolve, reject) => {
                let responseData = '';
                const req = https.request(options, (res) => {
                    res.on('data', (d) => {
                        responseData += d.toString();
                    });

                    res.on('end', () => {
                        resolve(responseData);
                    });
                });

                req.on('error', (e) => {
                    reject(e);
                });

                // write data to request body
                req.write(JSON.stringify(postData));
                req.end();
            }).then((data) => {
                let d = JSON.parse(data);
                if (d.hasOwnProperty('error')) {
                    process.nextTick(() => {
                        me.emit('actions-requestsync', d);
                    });        
                } else {
                    me.debug('HttpActions:requestSync(): success');
                }
            });
        });
    }
}

module.exports = HttpActions;
