# WARNING: Beta code! (But we're getting there :-)

## Table of Contents
- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Nodes in this package](#nodes-in-this-package)
  - [General Information](#general-information)
  - [Light On/Off](#--light-onoff-a-light-that-can-be-switched-on-and-off-only)
  - [Dimmable Light](#--dimmable-light)
  - [Color Temperature Light](#--color-temperature-light)
  - [Color (HSV) Light](#--color-hsv-light)
  - [Color (RGB) Light](#--color-rgb-light)
  - [Outlet](#--outlet)
  - [Thermostat](#--thermostat)
  - [Window](#--window)
  - [Scene](#--scene)
  - [Vacuum](#--vacuum)
  - [Fan](#--fan)
  - [Management](#--management)
- [The config node](#the-config-node)
- [Google SmartHome Setup Instructions](#google-smarthome-setup-instructions)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)
- [Copyright and license](#copyright-and-license)

---
## Introduction

A collection of Node-RED nodes to control your smart home devices via Google Assistant.

---
## Prerequisites

1. You are going to need a 'real' SSL certificate e.g. from [Let’s Encrypt](https://letsencrypt.org/). The public key and the private key must copied to your Node-RED server, in a location where the Node-RED service can read them.
2. You also need to be able to forward TCP traffic coming in from the Internet to your Node-RED server on a port you
specify. This is not your full Node-RED server but a service started by `node-red-contrib-google-smarhome`, providing
only the functions needed by Google.
3. This package requires NodeJS version 7.6.0 at a minimum. If, during start of Node-RED, you get this warning, your version on NodeJS is too old:
`[warn] [node-red-contrib-google-smarthome/google-smarthome] SyntaxError: Unexpected token ( (line:30)`

---
## Installation
To install - change to your Node-RED user directory.

        cd ~/.node-red
        npm install node-red-contrib-google-smarthome

*Note:* This version can output a lot of debug messages on the console. These messages are optional.

---
## Nodes in this package
### General information
1. If `online` is set to `false` for a node, Google SmartHome is not going to be able to control the node. It will also show as `offline` in the Google Home app.
2. The nodes will do their best to convert incoming payload data to the required type. You can send a string of e.g. `ON` and it will be converted to `true`.
3. Topics must be either as stated below or prepended with one or more `/`. E.g. `my/topic/on`. The nodes only looks for the part after the last `/`, if any.

#### - Light On/Off (a light that can be switched on and off only)
`topic` can be `on`, `online` or something else.

If `topic` is `on` then `payload` must be boolean and tells the state of the light.

        msg.topic = 'on'
        msg.payload = true

If `topic` is `online` then `payload` must be boolean and tells the online state of the light.

        msg.topic = 'online'
        msg.payload = true

If `topic` is something else then `payload` must be an object and tells all the states of the light.

        msg.topic = 'set'
        msg.payload = {
          on: false,
          online: true
        }

#### - Dimmable Light
`topic` can be `on`, `online`, `brightness` or something else.

If `topic` is `on` then `payload` must be boolean and tells the state of the light.

        msg.topic = 'on'
        msg.payload = true

If `topic` is `online` then `payload` must be boolean and tells the online state of the light.

        msg.topic = 'online'
        msg.payload = true

If `topic` is `brightness` then `payload` must be a number and tells the brightness of the light. Range is 0 through 100.

        msg.topic = 'brightness'
        msg.payload = 75

If `topic` is something else then `payload` must be an object and tells all the states of the light.

        msg.topic = 'set'
        msg.payload = {
          on: false,
          online: true,
          brightness: 100
        }

#### - Color Temperature Light
`topic` can be `on`, `online`, `brightness`, `temperature` or something else.

If `topic` is `on` then `payload` must be boolean and tells the state of the light.

        msg.topic = 'on'
        msg.payload = true

If `topic` is `online` then `payload` must be boolean and tells the online state of the light.

        msg.topic = 'online'
        msg.payload = true

If `topic` is `brightness` then `payload` must be a number and tells the brightness of the light. Range is 0 through 100.

        msg.topic = 'brightness'
        msg.payload = 75

If `topic` is `temperature` then `payload` must be a number and tells the color temperature of the light. Range is 2000 through 6000.

        msg.topic = 'temperature'
        msg.payload = 3000


If `topic` is something else then `payload` must be an object and tells all the states of the light.

        msg.topic = 'set'
        msg.payload = {
          on: false,
          online: true,
          brightness: 100,
          temperature: 100
        }

Example flow:

        [{"id":"43870b89.3a30f4","type":"mqtt in","z":"1fdba310.d04cad","name":"","topic":"home/lamp/power","qos":"2","datatype":"auto","broker":"","x":310,"y":1640,"wires":[["45ed43ce.a1c31c"]]},{"id":"e099c1c7.36ea5","type":"mqtt out","z":"1fdba310.d04cad","name":"","topic":"home/lamp/set-power","qos":"","retain":"","broker":"","x":1260,"y":1640,"wires":[]},{"id":"45ed43ce.a1c31c","type":"change","z":"1fdba310.d04cad","name":"topic = on","rules":[{"t":"set","p":"topic","pt":"msg","to":"on","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":540,"y":1640,"wires":[["d068a2c2.0e73a"]]},{"id":"295718c8.bc2448","type":"mqtt in","z":"1fdba310.d04cad","name":"","topic":"home/lamp/brightness","qos":"2","datatype":"auto","broker":"","x":320,"y":1680,"wires":[["a82a5960.98e028"]]},{"id":"a82a5960.98e028","type":"change","z":"1fdba310.d04cad","name":"topic = brightness","rules":[{"t":"set","p":"topic","pt":"msg","to":"brightness","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":570,"y":1680,"wires":[["d068a2c2.0e73a"]]},{"id":"90c6be23.e6b76","type":"function","z":"1fdba310.d04cad","name":"Split","func":"return [\n    { payload: msg.payload.on },\n    { payload: msg.payload.brightness },\n    { payload: msg.payload.temperature },\n];","outputs":3,"noerr":0,"initialize":"","finalize":"","x":1050,"y":1680,"wires":[["e099c1c7.36ea5"],["57b812df.521b7c"],["d5b88148.ecde9"]],"outputLabels":["on","brightness","temperature"]},{"id":"57b812df.521b7c","type":"mqtt out","z":"1fdba310.d04cad","name":"","topic":"home/lamp/set-brightness","qos":"","retain":"","broker":"","x":1270,"y":1680,"wires":[]},{"id":"d068a2c2.0e73a","type":"google-light-temperature","z":"1fdba310.d04cad","client":"","name":"Example Colortemp Light","topic":"example-colortemp-light","passthru":false,"x":830,"y":1680,"wires":[["90c6be23.e6b76"]]},{"id":"e99a1c80.cbf9b","type":"mqtt in","z":"1fdba310.d04cad","name":"","topic":"home/lamp/colortemp","qos":"2","datatype":"auto","broker":"","x":320,"y":1720,"wires":[["e2b08d53.e775"]]},{"id":"e2b08d53.e775","type":"change","z":"1fdba310.d04cad","name":"topic = temperature","rules":[{"t":"set","p":"topic","pt":"msg","to":"temperature","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":570,"y":1720,"wires":[["d068a2c2.0e73a"]]},{"id":"d5b88148.ecde9","type":"mqtt out","z":"1fdba310.d04cad","name":"","topic":"home/lamp/set-brightness","qos":"","retain":"","broker":"","x":1270,"y":1720,"wires":[]}]

#### - Color (HSV) Light
`topic` can be `on`, `online`, `brightness`, `hue`, `saturation`, `value` or something else.

If `topic` is `on` then `payload` must be boolean and tells the state of the light.

        msg.topic = 'on'
        msg.payload = true

If `topic` is `online` then `payload` must be boolean and tells the online state of the light.

        msg.topic = 'online'
        msg.payload = true

If `topic` is `brightness` then `payload` must be a number and tells the brightness of the light. Range is 0 through 100.

        msg.topic = 'brightness'
        msg.payload = 75

If `topic` is `hue` then `payload` must be a number and tells the hue of the light. Range is 0.0 through 360.0.

        msg.topic = 'hue'
        msg.payload = 120.0

If `topic` is `saturation` then `payload` must be a number and tells the saturation of the light. Range is 0.0 through 100.0.

        msg.topic = 'saturation'
        msg.payload = 100.0

If `topic` is `value` then `payload` must be a number and tells the value of the light. Range is 0.0 through 100.0.

        msg.topic = 'value'
        msg.payload = 100.0

If `topic` is something else then `payload` must be an object and tells all the states of the light.

        msg.topic = 'set'
        msg.payload = {
          on: false,
          online: true,
          brightness: 100,
          hue: 120.0,
          saturation: 100.0,
          value: 100.0
        }

#### - Color (RGB) Light
`topic` can be `on`, `online`, `brightness`, `rgb` or something else.

If `topic` is `on` then `payload` must be boolean and tells the state of the light.

        msg.topic = 'on'
        msg.payload = true

If `topic` is `online` then `payload` must be boolean and tells the online state of the light.

        msg.topic = 'online'
        msg.payload = true

If `topic` is `brightness` then `payload` must be a number and tells the brightness of the light. Range is 0 through 100.

        msg.topic = 'brightness'
        msg.payload = 75

If `topic` is `rgb` then `payload` must be a number and tells the RGB values of the light. Range is 0 through 16777215.

        msg.topic = 'rgb'
        msg.payload = 255

*Hint:* red = 16711680, green = 65280, blue = 255.

If `topic` is something else then `payload` must be an object and tells all the states of the light.

        msg.topic = 'set'
        msg.payload = {
          on: false,
          online: true,
          brightness: 100,
          rgb: 255,
        }

#### - Outlet
`topic` can be `on`, `online` or something else.

If `topic` is `on` then `payload` must be boolean and tells the state of the outlet.

        msg.topic = 'on'
        msg.payload = true

If `topic` is `online` then `payload` must be boolean and tells the online state of the outlet.

        msg.topic = 'online'
        msg.payload = true

If `topic` is something else then `payload` must be an object and tells both the on state as well as the online state of the outlet.

        msg.topic = 'set'
        msg.payload = {
          on: false,
          online: true
        }

Example flow:

        [{"id":"980e90e8.c7796","type":"mqtt in","z":"1fdba310.d04cad","name":"","topic":"home/outlet/power","qos":"2","datatype":"auto","broker":"","x":530,"y":460,"wires":[["6637f52f.da97cc"]]},{"id":"6f5daaf0.f5dce4","type":"mqtt out","z":"1fdba310.d04cad","name":"","topic":"home/outlet/set-power","qos":"","retain":"","broker":"","x":1340,"y":460,"wires":[]},{"id":"9eca40d3.9338b","type":"google-outlet","z":"1fdba310.d04cad","client":"","name":"Example Outlet","topic":"example","passthru":false,"x":940,"y":460,"wires":[["48723761.d78bb8"]]},{"id":"6637f52f.da97cc","type":"change","z":"1fdba310.d04cad","name":"topic = on","rules":[{"t":"set","p":"topic","pt":"msg","to":"on","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":740,"y":460,"wires":[["9eca40d3.9338b"]]},{"id":"48723761.d78bb8","type":"function","z":"1fdba310.d04cad","name":"Split","func":"return [\n    { payload: msg.payload.on },\n];","outputs":1,"noerr":0,"x":1130,"y":460,"wires":[["6f5daaf0.f5dce4"]],"outputLabels":["on"]}]

#### - Thermostat
`topic` can be `thermostatTemperatureAmbient`, `thermostatTemperatureSetpoint` or something else.

If `topic` is `thermostatTemperatureAmbient` then `payload` must be a float and indicates the current ambient (room) temperature.

        msg.topic = 'thermostatTemperatureAmbient'
        msg.payload = 21.5

If `topic` is `thermostatTemperatureSetpoint` then `payload` must be a float and indicates the target temperature of the thermostat.

        msg.topic = 'thermostatTemperatureSetpoint'
        msg.payload = 20.0

If `topic` is `online` then `payload` must be boolean and tells the online state of the thermostat.

        msg.topic = 'online'
        msg.payload = true

If `topic` is something else then `payload` must be an object and tells the online state, ambient and target temperature of the thermostate.

        msg.topic = 'set'
        msg.payload = {
          thermostatTemperatureAmbient: 21.5,
          thermostatTemperatureSetpoint: 20.0,
          online: true
        }

Example flow:

        [{"id":"891efa41.8e8308","type":"google-thermostat","z":"1fdba310.d04cad","client":"","name":"Example Thermostat","topic":"example","passthru":false,"x":940,"y":740,"wires":[["cdfe8ddc.ab3c6"]]},{"id":"3086bc12.910434","type":"change","z":"1fdba310.d04cad","name":"topic = thermostatTemperatureAmbient","rules":[{"t":"set","p":"topic","pt":"msg","to":"thermostatTemperatureAmbient","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":650,"y":720,"wires":[["891efa41.8e8308"]]},{"id":"1344bd56.a60ac3","type":"change","z":"1fdba310.d04cad","name":"topic = thermostatTemperatureSetpoint","rules":[{"t":"set","p":"topic","pt":"msg","to":"thermostatTemperatureSetpoint","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":650,"y":760,"wires":[["891efa41.8e8308"]]},{"id":"cdfe8ddc.ab3c6","type":"function","z":"1fdba310.d04cad","name":"Split","func":"return [\n    { payload: msg.payload.thermostatTemperatureSetpoint },\n];\n\n// Google returns thermostat mode too, but we currently don't handle different thermostat modes","outputs":1,"noerr":0,"x":1130,"y":740,"wires":[["e2c467bd.2a2e58"]],"outputLabels":["thermostatTemperatureSetpoint"]},{"id":"5efccd01.2e28f4","type":"mqtt in","z":"1fdba310.d04cad","name":"","topic":"home/kitchen/current-temp","qos":"2","datatype":"auto","broker":"","x":350,"y":720,"wires":[["3086bc12.910434"]]},{"id":"62becde4.16ca84","type":"mqtt in","z":"1fdba310.d04cad","name":"","topic":"home/kitchen/target-temp","qos":"2","datatype":"auto","broker":"","x":350,"y":760,"wires":[["1344bd56.a60ac3"]]},{"id":"e2c467bd.2a2e58","type":"mqtt out","z":"1fdba310.d04cad","name":"","topic":"home/kitchen/set-target-temp","qos":"","retain":"","broker":"","x":1340,"y":740,"wires":[]}]

#### - Window
`topic` can be `openPercent`, `online` or something else.

If `topic` is `openPercent` then `payload` must be integer and indicates the percentage that the window is opened where 0 is closed and 100 is fully open.

        msg.topic = 'openPercent'
        msg.payload = 50


If `topic` is `online` then `payload` must be boolean and tells the online state of the window.

        msg.topic = 'online'
        msg.payload = true

If `topic` is something else then `payload` must be an object and tells both the open state as well as the online state of the window.

        msg.topic = 'set'
        msg.payload = {
          openPercent: false,
          online: true
        }

Example flow:

        [{"id":"9a73b064.fff81","type":"google-window","z":"1fdba310.d04cad","client":"","name":"Example Window","topic":"example","passthru":false,"x":890,"y":1340,"wires":[["90d22fa7.814b2"]]},{"id":"d928b0f2.a4b38","type":"change","z":"1fdba310.d04cad","name":"topic = openPercent","rules":[{"t":"set","p":"topic","pt":"msg","to":"openPercent","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":660,"y":1340,"wires":[["9a73b064.fff81"]]},{"id":"90d22fa7.814b2","type":"function","z":"1fdba310.d04cad","name":"Split","func":"return [\n    { payload: msg.payload.openPercent },\n];","outputs":1,"noerr":0,"x":1070,"y":1340,"wires":[["51c28adb.ae4ae4"]],"outputLabels":["openPercent"]},{"id":"ac90bdcb.277bc","type":"mqtt in","z":"1fdba310.d04cad","name":"","topic":"home/window/state","qos":"2","datatype":"auto","broker":"","x":430,"y":1340,"wires":[["d928b0f2.a4b38"]]},{"id":"51c28adb.ae4ae4","type":"mqtt out","z":"1fdba310.d04cad","name":"","topic":"home/window/set-state","qos":"","retain":"","broker":"","x":1260,"y":1340,"wires":[]}]


#### - Scene
Messages sent to this node is simply passed through. One cannot tell Google SmartHome to activate a scene, they tell us.


#### - Vacuum
`topic` can be `on`, `online` or something else.

If `topic` is `on` then `payload` must be boolean and and tells the state of the vacuum.

        msg.topic = 'on'
        msg.payload = true

If `topic` is `online` then `payload` must be boolean and tells the online state of the vacuum.

        msg.topic = 'online'
        msg.payload = true

If `topic` is something else then `payload` must be an object and tells both the on state as well as the online state of the vacuum.

        msg.topic = 'set'
        msg.payload = {
          on: true,
          online: true
        }


#### - Fan
`topic` can be `on`, `online` or something else.

If `topic` is `on` then `payload` must be boolean and and tells the state of the fan.

        msg.topic = 'on'
        msg.payload = true

If `topic` is `online` then `payload` must be boolean and tells the online state of the fan.

        msg.topic = 'online'
        msg.payload = true

If `topic` is something else then `payload` must be an object and tells both the on state as well as the online state of the fan.

        msg.topic = 'set'
        msg.payload = {
          on: true,
          online: true
        }

#### - Management
`topic` can be `restart_server`, `report_state` or `request_sync`.

`payload` is not used for anything.

`restart_server` is used to stop then start the built-in webserver. Can be used when your SSL certificate has been renewed and needs to be re-read by the webserver.

`report_state` will force an update of all states to Google. Mostly usefull for debugging.

`request_sync` will request Google to sync to learn about new or changed devices. This usually happens automatically.

---
## The config node

**Local Authentication**

  `Username` and `Password`: A username and password used when you link Google SmartHome to this node.
  
  `Token Duration`: The authorization token duration used by Google SmartHome to identify itself to node-red SmartHome plugin.

**Actions on Google Project Settings**

  `Client ID`: The client id you entered in the *Google on Actions* project.

  `Client Secret`: The client secret you entered in the *Google on Actions* project.

**Google HomeGraph Settings**

  `Jwt Key`: Full or relative to the Node-RED config folder path to JWT key file (the one downloaded in the *Add Report State* section).

  `Report Interval (m)`: Time, in minutes, between report updates are sent to Google.

**Built-in Web Server Settings**

  `Use http Node-RED root path`: If enabled, use the same http root path prefix configured for Node-RED, otherwise use /.

  `Port`: TCP port of your choosing for incoming connections from Google. Must match what you entered in the *Google on Actions* project.

  `Use external SSL offload`: If enabled, SSL encryption is not used by the node and must be done elsewhere.

  `Public Key`: Full path to public key file, e.g. `fullchain.pem` from Let's Encrypt.

  `Private Key`: Full path to private key file, e.g. `privkey.pem` from Let's Encrypt.

---
## Google SmartHome Setup Instructions

See the developer guide and release notes at [https://developers.google.com/actions/](https://developers.google.com/actions/) for more details.

#### Create and setup project in Actions Console

1. Use the [Actions on Google Console](https://console.actions.google.com) to add a new project with a name of your choosing and click *Create Project*.
2. Click *Home Control*, then click *Smart Home*.
3. On the left navigation menu under *SETUP*, click on *Invocation*.
4. Add your App's name. Click *Save*.
5. On the left navigation menu under *DEPLOY*, click on *Directory Information*.
6. Add your App info, including images, a contact email and privacy policy. This information can all be edited before submitting for review.
7. Click *Save*.

#### Add Request Sync
~~*Note: I'm almost certain this part is not needed.*~~

The Request Sync feature allows the nodes in this package to send a request to the Home Graph to send a new SYNC request.

1. Navigate to the [Google Cloud Console API Manager](https://console.developers.google.com/apis) for your project id.
2. Enable the [HomeGraph API](https://console.cloud.google.com/apis/api/homegraph.googleapis.com/overview). This will be used to request a new sync and to report the state back to the HomeGraph.
3. ~~Click Credentials~~
4. ~~Click 'Create credentials'~~
5. ~~Click 'API key'~~
6. ~~Copy the API key shown and insert it in `smart-home-provider/cloud/config-provider.js`~~
7. ~~Enable Request-Sync API using [these instructions](https://developers.google.com/actions/smarthome/create-app#request-sync).~~

#### Add Report State
The Report State feature allows the nodes in this package to proactively provide the current state of devices to the Home Graph without a `QUERY` request. This is done securely through [JWT (JSON web tokens)](https://jwt.io/).

1. Navigate to the [Google Cloud Console API & Services page](https://console.cloud.google.com/apis/credentials)
2. Select **Create Credentials** and create a **Service account key**
3. Create the account and download a JSON file.
   Save this as `jwt-key.json`. You must copy this file to your Node-RED server, in a location where the Node-RED service can read it.

#### Final touches

1. Navigate back to the [Actions on Google Console](https://console.actions.google.com).
2. On the left navigation menu under *BUILD*, click on *Actions*. Click on *Add Your First Action* and choose your app's language(s).
3. Enter the URL for fulfillment, e.g. https://example.com:3001/smarthome, click *Done*.
4. On the left navigation menu under *ADVANCED OPTIONS*, click on *Account Linking*.
5. Select *No, I only want to allow account creation on my website*. Click *Next*.
6. For Linking Type, select *OAuth*.
7. For Grant Type, select 'Authorization Code' for Grant Type.
8. Under Client Information, enter the client ID and secret from earlier.
9. The Authorization URL is the hosted URL of your app with '/oauth' as the path, e.g. https://example.com:3001/oauth
10. The Token URL is the hosted URL of your app with '/token' as the path, e.g. https://example.com:3001/token
11. Enter any remaining necessary information you might need for authentication your app. Click *Save*.
12. On the left navigation menu under *Test*, click on *Simulator*, to begin using this app.

*Note:* The `example.com` name in the above text must be your actual domain name (and the same name as used in your SSL certficate).

#### Setup Account linking

1. On a device with the Google Assistant logged into the same account used to create the project in the Actions Console, enter your Assistant settings.
2. Click Home Control.
3. Click the '+' sign to add a device.
4. Find your app in the list of providers. It will be `[test]` and then your app name.
5. Log in to your service. Username and password is the ones you specified in the configuration node.
6. Start using the Google Assistant.

---
## Troubleshooting

- It seems that the Google Smart Home app is taken partially out of test after some time (months?). Existing devices works fine but new devices cannot be added and existing devices cannot be deleted. The Management node will output messages like this:

        "_type": "actions-requestsync",
        "msg": {
                "error": {
                        "code": 400,
                        "message": "Request contains an invalid argument.",
                        "status": "INVALID_ARGUMENT"
                }
        }
  Go to [Actions on Google Console](https://console.actions.google.com), select the *Simulator* and start the test again.
- Google might say that it cannot reach your device if that device did not update its state at least once after creation.
- Check if your service is reachable from the outside. Use [reqbin.com](https://reqbin.com/) or a similar tool to
  send a GET request to https://example.com:3001/login (with your hostname and port). It must answer with status
  200 (OK) and some HTML code in the body. Use https://www.ssllabs.com/ssltest/ to check your SSL certificate.
- Unlink and relink your account in the Google Home app.
- Check Node-RED's logfiles.
- Toggle "Enable Node debug" in the configuration node, connect a debug node to the output of the management node and
  look for debug messages.

---
## Test script

**login_get**
```
#!/usr/bin/env bash
. ./data
curl "$BASE_URL/oauth?client_id=$GOOGLE_CLIENT_ID&response_type=code&state=$STATE_STRING&scope=$REQUESTED_SCOPES&user_locale=$LOCALE&redirect_uri=$REDIRECT_URI"
echo
```

**login_post**
```
#!/usr/bin/env bash
. ./data

EPWD=$(printf "%q" $PWD)
echo LOGIN POST
AUTH=$(curl -s --data "response_type=code" --data "state=$STATE_STRING" --data "client_id=$GOOGLE_CLIENT_ID" --data "username=$USERNAME" --data-urlencode "password=$PWD" --data-urlencode "redirect_uri=$REDIRECT_URI" $BASE_URL/oauth)
echo "AUTH RESPONSE: $AUTH"
CODE=${AUTH##*code=}
echo "CODE $CODE"
CODE=${CODE%%&*}
echo "CODE $CODE"
echo "CODE=\"$CODE\"" > code
```
**authorization_code**
```
#!/usr/bin/env bash
. ./data
. ./code

AUTH=$(curl -s --data "client_id=$GOOGLE_CLIENT_ID" \
--data "client_secret=$CLIENT_SECRET" \
--data "grant_type=authorization_code" \
--data "code=$CODE" \
--data-urlencode "redirect_uri=$REDIRECT_URI" \
$BASE_URL/token)
echo "AUTH $AUTH"
# echo "$AUTH" > auth.json
ACCESS_TOKEN=$(echo "$AUTH" | jq ".access_token")
REFRESH_TOKEN=$(echo "$AUTH" | jq ".refresh_token")
echo "ACCESS_TOKEN=$ACCESS_TOKEN" > code
echo "REFRESH_TOKEN=$REFRESH_TOKEN" >>code
echo
```

**refresh_token**
```
#!/usr/bin/env bash
. ./data
. ./code

AUTH=$(curl -s --data "client_id=$GOOGLE_CLIENT_ID" \
--data "client_secret=$CLIENT_SECRET" \
--data "grant_type=refresh_token" \
--data "refresh_token=$REFRESH_TOKEN" \
$BASE_URL/token)
echo "AUTH $AUTH"
if [[ $AUTH == *access_token* ]] ; then
  ACCESS_TOKEN=$(echo "$AUTH" | jq ".access_token")
  if [ -n "$ACCESS_TOKEN" ] ; then
    echo "ACCESS_TOKEN=$ACCESS_TOKEN" > code
    echo "REFRESH_TOKEN=$REFRESH_TOKEN" >>code
  fi
fi
echo
```

**data**
```
#!/usr/bin/env bash
PROJECT_ID=PROJECT_ID_FILL_IT
GOOGLE_CLIENT_ID=123456789012345678901
STATE_STRING=STATE_STRING_FILL_IT
REQUESTED_SCOPES=REQUESTED_SCOPES_FILL_IT
LOCALE=LOCALE_FILL_IT
REDIRECT_URI=https://oauth-redirect.googleusercontent.com/r/$PROJECT_ID
REDIRECT_URI=$(printf "%q" "$REDIRECT_URI")
REDIREDT_URI=TEST
BASE_URL=http://localhost:3001
USERNAME=my_user
PWD=my_password
CLIENT_SECRET="some-secret-shared-with-google"
```

---
## Credits
Parts of this README and large parts of the code comes from Google. [Actions on Google: Smart Home sample using Node.js](https://github.com/actions-on-google/smart-home-nodejs) in particular has been of great value.

## Copyright and license
Copyright 2018 - 2020 Michael Jacobsen under [the GNU General Public License version 3](LICENSE).
