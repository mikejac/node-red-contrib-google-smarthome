"use strict";

const VERSION = '2.7';

/// <reference types="@google/local-home-sdk" />
/*
BASED ON: https://github.com/home-assistant/home-assistant.io/blob/current/source/assets/integrations/google_assistant/app.js
Modified for use with Node Red
For license information please check the repository.
*/
var App = smarthome.App;
var Constants = smarthome.Constants;
var DataFlow = smarthome.DataFlow;
var Execute = smarthome.Execute;
var Intents = smarthome.Intents; 
var IntentFlow = smarthome.IntentFlow;

const hex2a = (hexx) => {
    var hex = hexx.toString();
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substring(i, 2), 16));
    return str;
}

const findNodeRedDeviceDataByClientId = (requestId, devices, clientId) => {
    let device;
    device = devices.find((dev) => {
        const customData = dev.customData;
        return (customData && (!clientId || customData.clientId === clientId));
    });

    if (!device) {
        console.log(requestId, "Unable to find Node Red Google Smarthome connection info.", devices);
        throw new IntentFlow.HandlerError(requestId, "invalidRequest", "Unable to find Node Red Google Smarthome connection info.");
    }

    return device.customData;
};

const findNodeRedDeviceDataByDeviceId = (requestId, devices, deviceId) => {
    let device;
    device = devices.find((dev) => {
        const customData = dev.customData;
        return (customData && customData.clientId === deviceId);
    });

    if (!device) {
        console.log(requestId, "Unable to find Node Red Google Smarthome connection info.", devices);
        throw new IntentFlow.HandlerError(requestId, "invalidRequest", "Unable to find Node Red Google Smarthome connection info.");
    }
    return device.customData;
};

const createResponse = (request, payload) => ({
    intent: request.inputs[0].intent,
    requestId: request.requestId,
    payload,
});

class UnknownInstance extends Error {
    constructor(requestId) {
        super();
        this.requestId = requestId;
    }
    throwHandlerError() {
        throw new IntentFlow.HandlerError(this.requestId, "invalidRequest", "Unknown Instance");
    }
}

const forwardRequest = async (nodeRedData, targetDeviceId, request) => {
    const command = new DataFlow.HttpRequestData();
    command.method = Constants.HttpOperation.POST;
    command.requestId = request.requestId;
    command.deviceId = targetDeviceId;
    command.port = nodeRedData.httpPort;
    command.path = `${nodeRedData.httpPathPrefix}smarthome`;
    command.data = JSON.stringify(request);
    command.dataType = "application/json";
    command.additionalHeaders = {
        'Authorization': `Bearer ${nodeRedData.accessToken}`
    };
    console.log(request.requestId, "Sending", command);
    const deviceManager = await app.getDeviceManager();

    let resp;
    try {
        resp = await new Promise((resolve, reject) => {
            setTimeout(() => reject(-1), 10000);
            deviceManager
                .send(command)
                .then(
                    (response) => { console.log("resolve: ", response); resolve(response); },
                    (response) => { console.log("reject: ", response); reject(response); }
                );
        });
        // resp = (await deviceManager.send(command)) as HttpResponseData;
        console.log(request.requestId, "Raw Response", resp);
    }
    catch (err) {
        console.error(request.requestId, "Error making request", err);
        throw new IntentFlow.HandlerError(request.requestId, "invalidRequest", err === -1 ? "Timeout" : err.message);
    }

    // Response if the webhook is not registered.
    if (resp.httpResponse.statusCode === 200 && !resp.httpResponse.body) {
        throw new UnknownInstance(request.requestId);
    }

    try {
        const response = JSON.parse(resp.httpResponse.body);
        // Local SDK wants this.
        response.intent = request.inputs[0].intent;
        console.log(request.requestId, "Response", response);
        return response;
    }
    catch (err) {
        console.error(request.requestId, "Error parsing body", err);
        throw new IntentFlow.HandlerError(request.requestId, "invalidRequest", err.message);
    }
};

const identifyHandler = async (request) => {
    console.log("IDENTIFY intent:", request);
    const deviceToIdentify = request.inputs[0].payload.device;
    var clientId = "";
    if (deviceToIdentify.udpScanData) {
        console.log("IDENTIFY intent data:" + deviceToIdentify.udpScanData.data);
        const data = hex2a(deviceToIdentify.udpScanData.data);
        console.log("IDENTIFY intent data:" + data);
        const json_data = JSON.parse(data);
        clientId = json_data.clientId;
    } else {
        if (!deviceToIdentify.mdnsScanData) {
            console.error(request.requestId, "No usable mdns scan data");
            return createResponse(request, {});
        }
        if (deviceToIdentify.mdnsScanData.type !== "nodered-google") {
            console.error(request.requestId, "Not Node Red Google Smarthome type. expected: 'nodered-google' got: '" + deviceToIdentify.mdnsScanData.type + "'");
            return createResponse(request, {});
        }
        clientId = deviceToIdentify.mdnsScanData.txt.clientId;
    }
    try {
        const nodeRedData = findNodeRedDeviceDataByClientId(request.requestId, request.devices, clientId);
        request.appJsVersion = VERSION;
        return await forwardRequest(nodeRedData, "", request);
    }
    catch (err) {
        if (err instanceof UnknownInstance) {
            return createResponse(request, {});
        }
        throw err;
    }
};

const reachableDevicesHandler = async (request) => {
    console.log("REACHABLE_DEVICES intent:", request);
    const nodeRedData = findNodeRedDeviceDataByDeviceId(request.requestId, request.devices, request.inputs[0].payload.device.id);
    try {
        return forwardRequest(nodeRedData, request.inputs[0].payload.device.id, request);
    }
    catch (err) {
        if (err instanceof UnknownInstance) {
            err.throwHandlerError();
        }
        throw err;
    }
};

const executeHandler = async (request) => {
    console.log("EXECUTE intent:", request);
    const device = request.inputs[0].payload.commands[0].devices[0];
    try {
        return forwardRequest(device.customData, device.id, request);
    }
    catch (err) {
        if (err instanceof UnknownInstance) {
            err.throwHandlerError();
        }
        throw err;
    }
};

const queryHandler = async (request) => {
    console.log("QUERY intent:", request);
	const device = request.inputs[0].payload.devices[0];
    try {
        return forwardRequest(device.customData, device.id, request);
    }
    catch (err) {
        if (err instanceof UnknownInstance) {
            err.throwHandlerError();
        }
        throw err;
    }
};

const app = new App(VERSION);

app
    .onIdentify(identifyHandler)
    .onReachableDevices(reachableDevicesHandler)
    .onExecute(executeHandler)
    .onQuery(queryHandler)
    // Undocumented in TypeScript
    // Suggested by Googler, seems to work :shrug:
    // https://github.com/actions-on-google/smart-home-local/issues/1#issuecomment-515706997
    // June '22: Disabled because it breaks local execution
    // @ts-ignore
    //.onProxySelected((req) => {
    //    console.log("ProxySelected", req);
    //    return createResponse(req, {});
    //})
    // @ts-ignore
    .onIndicate((req) => console.log("Indicate", req))
    // @ts-ignore
    .onParseNotification((req) => console.log("ParseNotification", req))
    // @ts-ignore
    .onProvision((req) => console.log("Provision", req))
    // @ts-ignore
    .onRegister((req) => console.log("Register", req))
    // @ts-ignore
    .onUnprovision((req) => console.log("Unprovision", req))
    // @ts-ignore
    .onUpdate((req) => console.log("Update", req))
    .listen()
    .then(() => {
        console.log("node-red-contrib-google-smarthome app.js ready!");
    })
    .catch((e) => console.error(e));
