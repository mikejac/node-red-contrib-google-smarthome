/**
 * node-red-contrib-google-smarthome
 * Copyright (C) 2025 Michael Jacobsen and others.
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

import express from 'express';
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { google } from 'googleapis';
import ipRangeCheck from 'ip-range-check';
import { Request, Response } from 'express';
import { GoogleSmartHome } from './SmartHome';

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
export default class HttpActions {
    private _smarthome: GoogleSmartHome;


    /**
     * Constructor
     *
     * @param {GoogleSmartHome} smarthome - Instance of the GoogleSmartHome class
     */
    constructor(smarthome: GoogleSmartHome) {
        this._smarthome = smarthome;
    }

    /**
     * Register HTTP endpoints for cloud fulfillment.
     *
     * @param httpRoot - URL prefix for HTTP endpoints.
     * @param appHttp - Express application instance.
     */
    httpActionsRegister(httpRoot: string, appHttp: express.Express | undefined): void {
        if (typeof appHttp === 'undefined') {
            appHttp = this._smarthome.app;
        }

        // POST /smarthome
        appHttp.post(this._smarthome.Path_join(httpRoot, 'smarthome'), (request, response) => this._handlePostSmarthome(request, response));

        // GET /check
        appHttp.get(this._smarthome.Path_join(httpRoot, 'check'), (request, response) => this._handleGetCheck(request, response));

        // OPTIONS /smarthome
        appHttp.options(this._smarthome.Path_join(httpRoot, 'smarthome'), (request, response) => this._handleOptionsSmarthome(request, response));
    }

    /**
     * Register HTTP endpoints for local fulfillment.
     * 
     * @param httpLocalRoot - URL prefix for local HTTP endpoints.
     * @param appHttp - Express application instance.
     */
    httpLocalActionsRegister(httpLocalRoot: string, appHttp: express.Express): void {
        // POST /smarthome
        appHttp.post(this._smarthome.Path_join(httpLocalRoot, 'smarthome'), (request, response) => this._handleLocalPostSmarthome(request, response));

        // OPTIONS /smarthome
        appHttp.options(this._smarthome.Path_join(httpLocalRoot, 'smarthome'), (request, response) => this._handleOptionsSmarthome(request, response));

        // GET /check
        appHttp.get(this._smarthome.Path_join(httpLocalRoot, 'check'), (request, response) => this._handleLocalGetCheck(request, response));
    }

    /**
     * Handle POST requests to the /smarthome endpoint.
     * These requests contain the SYNC, QUERY, EXECUTE, IDENTIFY and REACHABLE_DEVICES intents
     * to query and control devices via cloud fulfillment.
     * 
     * @param request  - Express request object
     * @param response - Express response object
     */
    private _handlePostSmarthome(request: Request, response: Response) {
        this._post(request, response, 'smarthome');
    }

    /**
     * Handle GET requests to the /check endpoint.
     * This endpoint can be used to verify that the HTTP server for cloud fulfillment
     * is reachable.
     *
     * @param request  - Express request object
     * @param response - Express response object
     */
    private _handleGetCheck(request: Request, response: Response) {
        this._smarthome.debug('HttpActions:_handleGetCheck()');
        if (this._smarthome._debug) {
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
            response.send('SUCCESS - Cloud fulfillment HTTP server is reachable');
        }
    }

    /**
     * Handle Google's preflight check.
     * Used for both cloud and local fulfillment.
     *
     * @param request  - Express request object
     * @param response - Express response object
     */
    private _handleOptionsSmarthome(request: Request, response: Response): void {
        response
            .status(200)
            .set({'Access-Control-Allow-Headers': 'Content-Type, Authorization'})
            .send('null');
    }

    /**
     * Handle POST requests to the /smarthome endpoint for local fulfillment.
     * These requests contain the IDENTIFY, REACHABLE_DEVICES, QUERY and EXECUTE intents
     * to query and control devices via local fulfillment.
     * 
     * @param request  - Express request object
     * @param response - Express response object
     */
    private _handleLocalPostSmarthome(request: Request, response: Response): void {
        this._smarthome.debug('local smarthome: request.headers = ' + JSON.stringify(request.headers));
        if (!isLocalIP(request.ip)) {
            response.status(200).set({
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).json({});
        }
        this._post(request, response, 'smarthome');
    }

    /**
     * Handle GET requests to the /check endpoint for local fulfillment.
     * This endpoint can be used to verify that the HTTP server for
     * local fulfillment is reachable.
     * 
     * @param request  - Express request object
     * @param response - Express response object
     */
    private _handleLocalGetCheck(request: Request, response: Response): void {
        this._smarthome.debug('HttpActions:_handleLocalGetCheck()');
        response.send('SUCCESS - Local fulfillment HTTP server is reachable');
    }

    /**
     * @param {Request} request   - Express request object
     * @param {Response} response - Express response object
     */
    private _post(request: Request, response: Response, url: string) {
        let reqdata = request.body;

        this._smarthome.debug('HttpActions:_post(/' + url + '): request.headers = ' + JSON.stringify(request.headers));
        this._smarthome.debug('HttpActions:_post(/' + url + '): reqdata = ' + JSON.stringify(reqdata));

        let res = request.headers.authorization;
        if (!res) {
            this._smarthome.error('HttpActions:_post(/' + url + '): missing authorization header; res = ' + JSON.stringify(res));

            response.status(401).set({
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).json({ error: 'missing inputs' });

            return;
        }

        res = res.split(" ");
        if (res.length != 2 || res[0] !== 'Bearer') {
            this._smarthome.error('HttpActions:_post(/' + url + '): invalid authorization data; res = ' + JSON.stringify(res));

            response.status(401).set({
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).json({ error: 'missing inputs' });

            return;
        }

        let accessToken = res[1];
        const is_local_execution = this._smarthome.auth.isValidLocalAccessToken(accessToken);
        const user = this._smarthome.auth.getuserForAccessToken(accessToken);
        if (user === null) {
            this._smarthome.error('HttpActions:_post(/' + url + '): no user found for access token "' + accessToken + '"');

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

        this._smarthome.debug('HttpActions:_post(/' + url + '): user: ' + user);

        if (!reqdata.inputs) {
            this._smarthome.error('HttpActions:_post(/' + url + '): missing reqdata.inputs');

            response.status(401).set({
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).json({ error: 'missing inputs' });

            return;
        }

        for (let i = 0; i < reqdata.inputs.length; i++) {
            let input = reqdata.inputs[i];
            let intent = input.intent;

            if (!intent) {
                this._smarthome.error('HttpActions:_post(/' + url + '): missing intent');

                response.status(401).set({
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }).json({ error: 'missing inputs' });

                continue;
            }

            switch (intent) {
                case 'action.devices.SYNC':
                    this._smarthome.debug('HttpActions:_post(/' + url + '): SYNC');
                    /**
                     * request:
                     * {
                     *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
                     *  "inputs": [{
                     *      "intent": "action.devices.SYNC",
                     *  }]
                     * }
                     */
                    this._sync(reqdata.requestId, response);
                    break;

                case 'action.devices.QUERY':
                    this._smarthome.debug('HttpActions:_post(/' + url + '): QUERY');
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
                    this._query(reqdata.requestId, reqdata.inputs[i].payload.devices, response);
                    break;

                case 'action.devices.EXECUTE':
                    this._smarthome.debug('HttpActions:_post(/' + url + '): EXECUTE');
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
                    this._exec(reqdata.requestId, reqdata.inputs[i].payload.commands, response, is_local_execution);
                    break;

                case 'action.devices.DISCONNECT':
                    this._smarthome.debug('HttpActions:_post(/' + url + '): DISCONNECT');
                    this._smarthome.auth.removeAllTokensForUser(user);

                    response.status(200).set({
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    }).json({});
                    break;

                case 'action.devices.IDENTIFY':
                    this._smarthome.debug('HttpActions:_post(/' + url + '): IDENTIFY');

                    this._smarthome.checkAppJsVersion(reqdata.appJsVersion);

                    response.status(200).json({
                        requestId: reqdata.requestId,
                        payload: {
                            device: {
                                id: this._smarthome.configNode.id,
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
                    this._smarthome.debug('HttpActions:_post(/' + url + '): REACHABLE_DEVICES');
                    this._reachable_devices(reqdata.requestId, response);
                    break;

                default:
                    this._smarthome.error('HttpActions:_post(/' + url + '): invalid intent');

                    response.status(401).set({
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    }).json({ error: 'missing intent' });
                    break;
            }
        }
    }

    /**
     * @param {Response} response - Express response object
     */
    private _sync(requestId, response: Response) {
        this._smarthome.debug('HttpActions:_sync()');

        let devices = this._smarthome.devices.getProperties();
        if (!devices) {
            response.status(500).set({
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }).json({ error: 'failed' });

            return;
        }

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

        this._smarthome.debug('HttpActions:_sync(): response = ' + JSON.stringify(deviceProps));

        response.status(200).json(deviceProps);

        return deviceProps;
    }

    /**
     * @param {Response} response - Express response object
     */
    private _query(requestId, devices, response: Response) {
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

    /**
     * @param {Response} response - Express response object
     * @param {boolean} is_local - Indicates whether the current command was issued using local fulfillment.
     */
    private _exec(requestId, commands, response: Response, is_local: boolean) {
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

    /**
     * @param {boolean} is_local - Indicates whether the current command was issued using local fulfillment.
     */
    private _execDevice(command, device, is_local: boolean) {
        this._smarthome.debug('HttpActions:_execDevice(): command = ' + JSON.stringify(command));

        const deviceId = device.id;

        const cur_device = this._smarthome.devices.getDevice(deviceId);
        // check whether the device exists or whether it exists and it is disconnected.
        if (!cur_device || !cur_device.states.online) {
            this._smarthome.configNode.warn('HttpActions:_execDevice(): the device you want to control is offline');
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
                let s = this._smarthome.devices.getStates([deviceId]);
                this.reportState(deviceId, s[deviceId]);
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

    /**
     * @param {Response} response - Express response object
     */
    private _reachable_devices(requestId, response: Response) {
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
    reportState(deviceId: string, states, notifications) {
        if (deviceId == undefined && Object.keys(states).length === 0 && notifications == undefined) {
            this._smarthome.error('HttpActions:reportState(): skipped reporting states, no devices registered');
            return;
        }

        if (!this._smarthome.IsHttpServerRunning()) {
            this._smarthome.error('HttpActions:reportState(): skipped reporting states, http server is not running');
            return;
        }

        if (!this._smarthome.auth.isAccountLinked()) {
            this._smarthome.error('HttpActions:reportState(): skipped reporting states, account is not linked. (Re-)link your account in the app.');
            return;
        }

        if (!this._smarthome.auth._jwtkey || !this._smarthome.auth._jwtkey.private_key) {
            this._smarthome.error('HttpActions:reportState(): skipped reporting states, JWT key is not loaded');
            return;
        }

        const postData = {
            requestId: nanoid(),
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
            postData.eventId = nanoid();
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
                this._smarthome.debug('HttpActions:reportState(): successfully reported state to Google: ' + JSON.stringify(postData));
            })
            .catch(error => {
                let myError = {
                    "msg": "Error in HttpActions:reportState()",
                    "org_msg": (error.response !== undefined ? error.response.data.error : error),
                    "data": {
                        "postData": postData,
                    },
                };

                this._smarthome.error(myError);
            });
    }

    /**
     * Sends a request to Google to sync devices.
     */
    requestSync() {
        this._smarthome.debug('HttpActions:requestSync()');

        if (!this._smarthome.IsHttpServerRunning()) {
            this._smarthome.error('HttpActions:requestSync(): skipped requested sync, http server is not running');
            return;
        }

        if (!this._smarthome.auth.isAccountLinked()) {
            this._smarthome.error('HttpActions:requestSync(): skipped requested sync, account is not linked. (Re-)link your account in the app.');
            return;
        }

        if (!this._smarthome.auth._jwtkey || !this._smarthome.auth._jwtkey.private_key) {
            this._smarthome.error('HttpActions:requestSync(): skipped requested sync, JWT is not loaded');
            return;
        }

        const postData = {
            agentUserId: userId,
            async: true,
        };

        this._smarthome.debug('HttpActions:requestSync(): postData = ' + JSON.stringify(postData));

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
                this._smarthome.debug('HttpActions:requestSync(): success');
            })
            .catch(error => {
                let myError = {
                    "msg": "Error in HttpActions:requestSync()",
                    "org_msg": (error.response !== undefined ? error.response.data.error : error),
                    "data": {
                        "postData": postData,
                    },
                };

                this._smarthome.error(myError);
            });
    }
}
