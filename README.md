# WARNING: Beta code! (But we're getting there :-)

## Table of Contents
- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Nodes in this package](#nodes-in-this-package)
  - [General Information](#general-information)
  - [Light On/Off](#--light-onoff-a-light-that-can-be-switched-on-and-off-only)
  - [Dimmable Light](#--dimmable-light)
  - [Color Temperature Light](#--color-temperature-light)
  - [Color (HSV) Light](#--color-hsv-light)
  - [Color (RGB) Light](#--color-rgb-light)
  - [Color (RGB/Temp) Light](#--color-rgbtemp-light)
  - [Camera](#--camera)
  - [Outlet](#--outlet)
  - [Thermostat](#--thermostat)
  - [Window](#--window)
  - [Scene](#--scene)
  - [Vacuum](#--vacuum)
  - [Fan](#--fan)
  - [Kitchen Hood](#--kitchen-hood)
  - [Fireplace](#--fireplace)
  - [Sensor](#--sensor)
  - [Shutter](#--shutter)
  - [Switch](#--switch)
  - [Management](#--management)
- [The config node](#the-config-node)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)
- [Copyright and license](#copyright-and-license)

---
## Introduction

A collection of Node-RED nodes to control your smart home devices via Google Assistant.

---
## Prerequisites

1. You are going to need a 'real' SSL certificate e.g. from [Let’s Encrypt](https://letsencrypt.org/).
2. You also need to be able to forward TCP traffic coming in from the Internet to your Node-RED server on a port you
specify. This is not your full Node-RED server but a service started by `node-red-contrib-google-smarthome`, providing
only the functions needed by Google.
3. This package requires NodeJS version 7.6.0 at a minimum. If, during start of Node-RED, you get this warning, your version on NodeJS is too old:
`[warn] [node-red-contrib-google-smarthome/google-smarthome] SyntaxError: Unexpected token ( (line:30)`

---
## Setup Instructions

#### Create and set up project in Actions Console

See the developer guide and release notes at https://developers.google.com/assistant/smarthome/overview for more details.

1. Go to [Actions on Google Console](https://console.actions.google.com).
1. Click on *New project* to add a new project with a name and language of your choice and click *Create Project*. 
1. Choose type *Smart Home*, then click *Start Building*.
1. From the top menu under *Develop*, click on *Invocation*.
1. Enter your App's name. Click *Save*.
1. On the *Develop* tab, choose *Actions* on the left menu. Enter the URL for fulfillment, e.g. https://example.com:3001/smarthome. Leave all other fields empty. Click *Save*.
1. Still on the *Develop* tab, choose *Account linking* on the left menu. Fill out the fields as following:
    * Client ID and secret: Credentials, with wich Google will authenticate against your app. Use a password generator tool
      to generate two strings of reasonable length and complexity. Copy both strings, you'll need them later.
    * Authorization URL: is the hosted URL of your app with '/oauth' as the path, e.g. https://example.com:3001/oauth.
    * Token URL: is the hosted URL of your app with '/token' as the path, e.g. https://example.com:3001/token.
    * Leave all other fields empty.
1. Click *Save*.
1. You don't need to fill in anything on the *Deploy* tab.
1. On tab *Test*, click *Reset Test*.

*Note:* Adjust the URLs like https://example.com:3001/smarthome to your own hostname, port and settings.

#### Enable HomeGraph API

The HomeGraph API is used to report the state of your devices to Google and to request a SYNC to inform Google about new or updated devices.

1. Go to the [Home Graph API on Google Cloud Console API Manager](https://console.cloud.google.com/apis/api/homegraph.googleapis.com/overview).
1. In the header bar select your project from the project chooser.
1. Enable the [HomeGraph API].
1. Navigate to the [Google Cloud Console API & Services page](https://console.cloud.google.com/apis/credentials).
1. Again, select your project in the header bar.
1. Select *Create Credentials* and create a *Service account key*.
1. Enter a name for your service account and click *Create*.
1. You don't need to add roles or user in the next steps.
1. Your new service account is listed on the Credentials page. Click on it.
1. Click on *Add Key* to create a new key of type JSON.
1. Download the JSON file and copy it to your Node-RED server, in a location where the Node-RED service can read it.

#### Integrating Google Sign-In

The Google Sign-In feature allows to login using your Google credentials. See [Integrating Google Sign-In into your web app](https://developers.google.com/identity/sign-in/web/sign-in) for more datails.
If you want to use login with username/password instead, skip this section.

1. Navigate to the [Google Cloud Console API & Services page](https://console.cloud.google.com/apis/credentials)
1. Click Create credentials > OAuth client ID.
1. Select the Web application application type.
1. Name your OAuth 2.0 client and click Create.
1. Copy the client ID that was created. You will need it later.

#### Install and configure Node-RED module

1. Install `node-red-contrib-google-smarthome` from Node-RED's palette and restart Node-RED.
1. Place the Management node from the section "Google Smart Home" on a flow.
1. Edit the management node and open its config. Fill in the fields as following:
    * Name: A name for your config node.
    * Use Google Login: Check, if you want to use authentication via Google Sign-In.
    * Login Client ID: If Google Login is enabled, the client id you gained from the *Google Sign-In* integration.
    * Authorized emails: If Google Login is enabled, the email adresses, semicolon-separated, authorized to log in.  
    * Username/Password: If Google Login is disabled, the credentials you want to use when linking your account in the Google Home App later. These are not the credentials to your Google account!
    * Client ID and Secret: The same strings you generated and entered on Google Search Console earlier.
    * Jwt Key: The JSON file you downloaded earlier. Can be an absolute path or a path relative to Node-REDs user dir.
    * Port: The port on which the service should run. If left empty, it will run on the same port as Node-RED.
    * Path: URL path on which the service will run. If left empty, https://example.com:3001/smarthome will be used. If set, it will be https://example.com:3001/<yourpath>/smarthome.
    * Use external SSL offload: Check, if you want do SSL decryption on an external load balancer.
    * Public and Private Key: Path to public and private key of your SSL certificate (if you do not use external SSL decryption).
1. Deploy the flow.
1. Check if your service is reachable from the internet. Use a tool like https://reqbin.com to send a GET request to https://example.com:3001/check (using your domain name and port). It must answer with status 200 and the message "SUCCESS".

#### Setup Account linking

1. Open the Google Home App on a device logged into the same account used to create the project in the Actions Console.
1. Click the '+' sign to add a device.
1. Click *Set up device*.
1. Click *Have something already set up*.
1. Find your app in the list of providers. It will be `[test]` and then your app name.
1. Log in to your service. Username and password are the ones you specified in the configuration node.
1. Start using the Google Assistant.

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
          temperature: 3000
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

#### - Color (RGB/Temp) Light
`topic` can be `on`, `online`, `brightness`, `temperature`, `rgb` or something else.

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
          temperature: 3000,
          rgb: 255,
        }

#### - Camera
`topic` can be `online` or something else.

If `topic` is `online` then `payload` must be boolean and tells the online state of the camera.

        msg.topic = 'online'
        msg.payload = true

If `topic` is something else then `payload` must be an object and tells both the online state of the camera.

        msg.topic = 'set'
        msg.payload = {
          online: true
        }

Example flow:

        [{"id":"980e90e8.c7796","type":"mqtt in","z":"1fdba310.d04cad","name":"","topic":"home/camera/power","qos":"2","datatype":"auto","broker":"","x":530,"y":460,"wires":[["6637f52f.da97cc"]]},{"id":"6f5daaf0.f5dce4","type":"mqtt out","z":"1fdba310.d04cad","name":"","topic":"home/camera/set-power","qos":"","retain":"","broker":"","x":1340,"y":460,"wires":[]},{"id":"9eca40d3.9338b","type":"google-camera","z":"1fdba310.d04cad","client":"","name":"Example Camera","topic":"example","passthru":false,"x":940,"y":460,"wires":[["48723761.d78bb8"]]},{"id":"6637f52f.da97cc","type":"change","z":"1fdba310.d04cad","name":"topic = online","rules":[{"t":"set","p":"topic","pt":"msg","to":"online","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":740,"y":460,"wires":[["9eca40d3.9338b"]]},{"id":"48723761.d78bb8","type":"function","z":"1fdba310.d04cad","name":"Split","func":"return [\n    { payload: msg.payload.online },\n];","outputs":1,"noerr":0,"x":1130,"y":460,"wires":[["6f5daaf0.f5dce4"]],"outputLabels":["online"]}]

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

If `topic` is `openPercent` then `payload` must be integer and indicates the percentage that the window is opened
where 0 is closed and 100 is fully open. It can also be boolean where false is closed and true is 100% opened.

        msg.topic = 'openPercent'
        msg.payload = 50


If `topic` is `online` then `payload` must be boolean and tells the online state of the window.

        msg.topic = 'online'
        msg.payload = true

If `topic` is something else then `payload` must be an object and tells both the open state as well as the online state of the window.

        msg.topic = 'set'
        msg.payload = {
          openPercent: 50,
          online: true
        }

Example flow:

        [{"id":"9a73b064.fff81","type":"google-window","z":"1fdba310.d04cad","client":"","name":"Example Window","topic":"example","passthru":false,"x":890,"y":1340,"wires":[["90d22fa7.814b2"]]},{"id":"d928b0f2.a4b38","type":"change","z":"1fdba310.d04cad","name":"topic = openPercent","rules":[{"t":"set","p":"topic","pt":"msg","to":"openPercent","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":660,"y":1340,"wires":[["9a73b064.fff81"]]},{"id":"90d22fa7.814b2","type":"function","z":"1fdba310.d04cad","name":"Split","func":"return [\n    { payload: msg.payload.openPercent },\n];","outputs":1,"noerr":0,"x":1070,"y":1340,"wires":[["51c28adb.ae4ae4"]],"outputLabels":["openPercent"]},{"id":"ac90bdcb.277bc","type":"mqtt in","z":"1fdba310.d04cad","name":"","topic":"home/window/state","qos":"2","datatype":"auto","broker":"","x":430,"y":1340,"wires":[["d928b0f2.a4b38"]]},{"id":"51c28adb.ae4ae4","type":"mqtt out","z":"1fdba310.d04cad","name":"","topic":"home/window/set-state","qos":"","retain":"","broker":"","x":1260,"y":1340,"wires":[]}]


#### - Scene
Messages sent to this node is simply passed through. One cannot tell Google SmartHome to activate a scene, they tell us.


#### - Vacuum
`topic` can be `on`, `online` or something else.

If `msg.topic` is `currentModeSettings.power` then `msg.payload` must be string and tells the mode of the vacuum. It
can be one of `quiet`, `standard`, `medium` or `turbo`.

        msg.topic = 'currentModeSettings.power'
        msg.payload = 'standard'

If `msg.topic` is `capacityRemaining.rawValue` then `msg.payload` must be integer and tells the current battery power
of the vacuum in percent.

        msg.topic = 'capacityRemaining.rawValue'
        msg.payload = 100

If `msg.topic` is `isCharging` then `msg.payload` must be boolean and tells if the vacuum is charging.

        msg.topic = 'isCharging'
        msg.payload = true

If `topic` is `on` then `payload` must be boolean and and tells the state of the vacuum.

        msg.topic = 'on'
        msg.payload = true

If `topic` is `online` then `payload` must be boolean and tells the online state of the vacuum.

        msg.topic = 'online'
        msg.payload = true

If `topic` is something else then `payload` must be an object and tells both the on state as well as the online state of the vacuum.

        msg.topic = 'set'
        msg.payload = {
          currentModeSettings.power = 'standard'
          capacityRemaining.rawValue' = 100
          isCharging = true
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

#### - Kitchen Hood
`topic` can be `on`, `online` or something else.

If `topic` is `on` then `payload` must be boolean and and tells the state of the kitchen hood.

        msg.topic = 'on'
        msg.payload = true

If `topic` is `online` then `payload` must be boolean and tells the online state of the kitchen hood.

        msg.topic = 'online'
        msg.payload = true

If `topic` is something else then `payload` must be an object and tells both the on state as well as the online state of the kitchen hood.

        msg.topic = 'set'
        msg.payload = {
          on: true,
          online: true
        }

#### - Fireplace
`topic` can be `on`, `online` or something else.

If `topic` is `on` then `payload` must be boolean and and tells the state of the fireplace.

        msg.topic = 'on'
        msg.payload = true

If `topic` is `online` then `payload` must be boolean and tells the online state of the fireplace.

        msg.topic = 'online'
        msg.payload = true

If `topic` is something else then `payload` must be an object and tells both the on state as well as the online state of the fireplace.

        msg.topic = 'set'
        msg.payload = {
          on: true,
          online: true
        }

#### - Sensor
`topic` can be `temperatureAmbientCelsius`, `humidityAmbientPercent` or something else.

If `topic` is `temperatureAmbientCelsius` then `payload` must be a number that tells the sensor temperature (in celsius).

        msg.topic = 'temperatureAmbientCelsius'
        msg.payload = 19.5

If `topic` is `humidityAmbientPercent` then `payload` must be a number that tells the sensor ambient humidity (as percentage).

        msg.topic = 'humidityAmbientPercent'
        msg.payload = 70

If `topic` is something else then `payload` must be an object, that tells the states of the sensor.

        msg.topic = ''
        msg.payload = {
          temperatureAmbientCelsius: 17.5,
          humidityAmbientPercent: 60
        }

#### - Shutter
`topic` can be `openPercent`, `online` or something else.

If `topic` is `openPercent` then `payload` must be integer and indicates the percentage that the shutter is opened
where 0 is closed and 100 is fully open. It can also be boolean where false is closed and true is 100% opened.

        msg.topic = 'openPercent'
        msg.payload = 50


If `topic` is `online` then `payload` must be boolean and tells the online state of the shutter.

        msg.topic = 'online'
        msg.payload = true

If `topic` is something else then `payload` must be an object and tells both the open state as well as the online state of the shutter.

        msg.topic = 'set'
        msg.payload = {
          openPercent: 50,
          online: true
        }
        
#### - Blind
`topic` can be `openPercent`, `online` or something else.

If `topic` is `openPercent` then `payload` must be integer and indicates the percentage that the blind is opened
where 0 is closed and 100 is fully open. It can also be boolean where false is closed and true is 100% opened.

        msg.topic = 'openPercent'
        msg.payload = 50


If `topic` is `online` then `payload` must be boolean and tells the online state of the blind.

        msg.topic = 'online'
        msg.payload = true

If `topic` is something else then `payload` must be an object and tells both the open state as well as the online state of the blind.

        msg.topic = 'set'
        msg.payload = {
          openPercent: 50,
          online: true
        }
        
#### - Switch
`topic` can be `on`, `online` or something else.

If `topic` is `on` then `payload` must be boolean and tells the state of the switch.

        msg.topic = 'on'
        msg.payload = true

If `topic` is `online` then `payload` must be boolean and tells the online state of the switch.

        msg.topic = 'online'
        msg.payload = true

If `topic` is something else then `payload` must be an object and tells both the on state as well as the online state of the switch.

        msg.topic = 'set'
        msg.payload = {
          on: false,
          online: true
        }

#### - Audio/Video Receiver
#### - Remote Control
#### - Set-Top Box
#### - Sound Bar
#### - Speaker
#### - Streaming Box
#### - Streaming Sound Bar
#### - Streaming Stick
#### - Television
`topic` can be `currentApplication`, `currentInput`, `activityState`, `playbackState`,
`on`, `currentVolume`, `isMuted`, `toggles`, `modes` or something else.

If `topic` is `currentApplication` then `payload` must be a string and indicates the current application running.

        msg.topic = 'currentApplication'
        msg.payload = 'yourube'

If `topic` is `currentInput` then `payload` must be a string and indicates the current input selected.

        msg.topic = 'currentInput'
        msg.payload = 'hdmi_1'

If `topic` is `activityState` then `payload` must be a string and indicates the active state of the media device. Supported values are `INACTIVE`, `STANDBY`, `ACTIVE`.

        msg.topic = 'activityState'
        msg.payload = 'ACTIVE'

If `topic` is `playbackState` then `payload` must be a string and indicates the playback state of the media device. Supported values are `PAUSED`, `PLAYING`, `FAST_FORWARDING`, `REWINDING`, `BUFFERING`, `STOPPED`.

        msg.topic = 'playbackState'
        msg.payload = 'PAUSED'

If `topic` is `on` then `payload` must be boolean and tells the state of the media devices.

        msg.topic = 'on'
        msg.payload = true

If `topic` is `currentVolume` then `payload` must be an integer and indicates the current volume level.

        msg.topic = 'currentVolume'
        msg.payload = 5

If `topic` is `isMuted` then `payload` must be boolean and tells the mute state of the media devices.

        msg.topic = 'isMuted'
        msg.payload = true

If `topic` is `currentModeSettings` then `payload` must be an object and indicates the modes state of the media device.

        msg.topic = 'currentModeSettings'
        msg.payload = {
                "load_mode": "small_load",
                "temp_mode": "cold_temp"
        }

If `topic` is `currentToggleSettings` then `payload` must be an object and indicates the toggles state of the media device.

        msg.topic = 'currentToggleSettings'
        msg.payload = {
                "sterilization_toggle": true,
                "energysaving_toggle": false
        }

If `topic` is `applications` then `payload` must be json string, json object and tells the available applications of the media devices. The available applications will be saved on the applications file.

        msg.topic = 'applications'
        msg.payload = {....}

If `topic` is `applications` then `payload` is undefined the available applications will be loaded from the applications file.

        msg.topic = 'applications'

If `topic` is `channels` then `payload` must be json string, json object and tells the available channels of the media devices. The available channels will be saved on the channels file.

        msg.topic = 'channels'
        msg.payload = {....}

If `topic` is `channels` then `payload` is undefined the available channels will be loaded from the channels file.

        msg.topic = 'channels'

If `topic` is `inputs` then `payload` must be json string, json object and tells the available inputs of the media devices. The available inputs will be saved on the inputs file.

        msg.topic = 'inputs'
        msg.payload = {....}

If `topic` is `inputs` then `payload` is undefined the available inputs will be loaded from the inputs file.

        msg.topic = 'inputs'

If `topic` is `modes` then `payload` must be json string, json object and tells the available modes of the media devices. The available modes will be saved on the modes file.

        msg.topic = 'modes'
        msg.payload = {....}

If `topic` is `modes` then `payload` is undefined the available modes will be loaded from the modes file.

        msg.topic = 'modes'

If `topic` is `toggles` then `payload` must be json string, json object and tells the available toggles of the media devices. The available toggles will be saved on the toggles file.

        msg.topic = 'toggles'
        msg.payload = {....}

If `topic` is `toggles` then `payload` is undefined the available toggles will be loaded from the toggles file.

        msg.topic = 'toggles'

If `topic` is `online` then `payload` must be boolean and tells the online state of the media devices.

        msg.topic = 'online'
        msg.payload = true

If `topic` is something else then `payload` must be an object and tells the online state, ambient and target temperature of the thermostate.

        msg.topic = 'set'
        msg.payload = {
          currentApplication: 'youtube',
          currentInput: 'hdmi_1',
          activityState: 'ACTIVE',
          playbackState: 'PAUSED',
          on: true,
          currentVolume: 5,
          isMuted: false,
          currentToggleSettings:{
                "sterilization_toggle": true,
                "energysaving_toggle": false
          },
          currentModeSettings: {
                "load_mode": "small_load",
                "temp_mode": "cold_temp"
          },
          online: true
        }

Example flow:

        [{"id":"985701ca.58de9","type":"google-media","z":"dfd6855a.a9da98","client":"","name":"Example Television","topic":"tv","device_type":"TV","has_apps":false,"has_channels":false,"has_inputs":false,"has_media_state":false,"has_on_off":false,"has_transport_control":false,"has_modes":false,"has_toggles":false,"available_applications_file":"applications.json","available_channels_file":"channels.json","available_inputs_file":"inputs.json","command_only_input_selector":"","ordered_inputs":"","support_activity_state":false,"support_playback_state":false,"command_only_on_off":false,"query_only_on_off":false,"supported_commands":[],"volume_max_level":"50","can_mute_and_unmute":"","volume_default_percentage":40,"level_step_size":1,"command_only_volume":false,"available_modes_file":"modes.json","command_only_modes":false,"query_only_modes":false,"available_toggles_file":"toggles.json","command_only_toggles":false,"query_only_toggles":false,"passthru":false,"x":530,"y":40,"wires":[["48723761.d78bb8"]]},{"id":"6637f52f.da97cc","type":"change","z":"dfd6855a.a9da98","name":"topic = online","rules":[{"t":"set","p":"topic","pt":"msg","to":"online","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":320,"y":40,"wires":[["985701ca.58de9"]]},{"id":"48723761.d78bb8","type":"function","z":"dfd6855a.a9da98","name":"Split","func":"return [\n    { payload: msg.payload.online },\n];","outputs":1,"noerr":0,"x":710,"y":40,"wires":[["6f5daaf0.f5dce4"]],"outputLabels":["online"]},{"id":"980e90e8.c7796","type":"mqtt in","z":"dfd6855a.a9da98","name":"","topic":"home/tv/power","qos":"2","datatype":"auto","broker":"","x":100,"y":40,"wires":[["6637f52f.da97cc"]]},{"id":"6f5daaf0.f5dce4","type":"mqtt out","z":"dfd6855a.a9da98","name":"","topic":"home/tv/set-power","qos":"","retain":"","broker":"","x":900,"y":40,"wires":[]}]
        
#### - Management
`topic` can be `restart_server`, `report_state` or `request_sync`.

`payload` is not used for anything.

`restart_server` is used to stop then start the built-in webserver. Can be used when your SSL certificate has been renewed and needs to be re-read by the webserver.

`report_state` will force an update of all states to Google. Mostly usefull for debugging.

`request_sync` will request Google to sync to learn about new or changed devices. This usually happens automatically.

---
## The config node

**Local Authentication**

  `Use Google Login`: If enabled, use the Google login authentication.

  `Login Client ID`: If Google Login is enabled, The client id you gained from the *Google Sign-In* integration.

  `Authorized emails`: If Google Login is enabled, The email adresses, semicolon-separated, authorized to log in.

  `Username` and `Password`: If Google Login is disabled, a username and password used when you link Google SmartHome to this node.
  
  `Token Duration`: The authorization token duration used by Google SmartHome to identify itself to node-red SmartHome plugin. Default is 60 minutes.

**Actions on Google Project Settings**

  `Client ID`: The client id you entered in the *Google on Actions* project.

  `Client Secret`: The client secret you entered in the *Google on Actions* project.

**Google HomeGraph Settings**

  `Jwt Key`: Full or relative to the Node-RED config folder path to JWT key file (the one downloaded in the *Add Report State* section).

  `Report Interval (m)`: Time, in minutes, between report updates are sent to Google.

**Web Server Settings**

  `Use http Node-RED root path`: If enabled, use the same http root path prefix configured for Node-RED, otherwise use /.

  `Path`: Prefix for URLs provided by this module. Default fulfillment URL is https://example.com:3001/smarthome. With a
          path of "foo" this changes to https://example.com:3001/foo/smarthome. Same for URLs `/oauth` and `/token`.

  `Port`: TCP port of your choosing for incoming connections from Google. Must match what you entered in the *Google on Actions* project.

  `Use external SSL offload`: If enabled, SSL encryption is not used by the node and must be done elsewhere.

  `Public Key`: Full path to public key file, e.g. `fullchain.pem` from Let's Encrypt.

  `Private Key`: Full path to private key file, e.g. `privkey.pem` from Let's Encrypt.

---
## Troubleshooting

- Some errors and possible solutions are listed at
  [Possible errors](https://github.com/mikejac/node-red-contrib-google-smarthome/wiki/Possible-errors).
- Look at Node-Red's debug panel for error messages.
- Unlink and relink your account in the Google Home app. Meanwhile look for errors in the debug panel.
- Restart your flows (using the `Restart Flows` option in the dropdown menu of the deploy button) while the debug panel
  is open to see error messages during initialization.
- Go to [Actions on Google Console](https://console.actions.google.com), in tab *Test* choose *View logs in Google Cloud Platform*.
- Check if your service is reachable from the outside. Use [reqbin.com](https://reqbin.com/) or a similar tool to
  send a GET request to https://example.com:3001/check (with your hostname and port). It must answer with status
  200 (OK) and the message "SUCCESS". Use https://www.ssllabs.com/ssltest/ to check your SSL certificate.
- Check Node-RED's log output. Where you find this depends on how you installed Node-Red. Usually something like
  `journalctl -u nodered`, `docker logs <container>` or a file in `/var/log`. 
- Toggle "Enable Node debug" in the configuration node, connect a debug node to the output of the management node and
  look for debug messages. In Node-Red UI choose 'Restart Flows' on the 'Deploy' button to see messages during
  initialization.
- Go to [Actions on Google Console](https://console.actions.google.com), on tab *Test* click *Reset Test*. If this
  doesn't do anything, click the *Settings* button, disable "On device testing", then enable it again.
- Google might say that it cannot reach your device if that device did not update its state at least once after creation.

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

**command_on**
```
#!/usr/bin/env bash
. ./data
. ./code

SH_REQUEST="{\"inputs\":[{\"context\":{\"locale_country\":\"US\",\"locale_language\":\"en\"},\"intent\":\"action.devices.EXECUTE\",\"payload\":{\"commands\":[{\"devices\":[{\"customData\":{\"nodeid\":\"$NODE_ID\",\"type\":\"light-dimmable\"},\"id\":\"$NODE_ID\"}],\"execution\":[{\"command\":\"action.devices.commands.OnOff\",\"params\":{\"on\":true}}]}]}}],\"requestId\":\"123456789\"}"

curl -s \
        -H "authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json;charset=UTF-8" \
        --data "$SH_REQUEST" \
        $BASE_URL/smarthome
echo ""
```

**disconnect**
```
#!/usr/bin/env bash
. ./data
. ./code

SH_REQUEST="{\"inputs\":[{\"context\":{\"locale_country\":\"US\",\"locale_language\":\"en\"},\"intent\":\"action.devices.DISCONNECT\"}],\"requestId\":\"123456789\"}"

curl -s \
        -H "authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json;charset=UTF-8" \
        --data "$SH_REQUEST" \
        $BASE_URL/smarthome
echo ""
```

**data**
```
#!/usr/bin/env bash
PROJECT_ID="PROJECT_ID_FILL_IT"
GOOGLE_CLIENT_ID=123456789012345678901
STATE_STRING="STATE_STRING_FILL_IT"
REQUESTED_SCOPES="REQUESTED_SCOPES_FILL_IT"
LOCALE="LOCALE_FILL_IT"
REDIRECT_URI="https://oauth-redirect.googleusercontent.com/r/$PROJECT_ID"
REDIRECT_URI=$(printf "%q" "$REDIRECT_URI")
BASE_URL="http://localhost:1880/smart-home"
USERNAME="my_user"
PWD="my_password"
CLIENT_SECRET="some-secret-shared-with-google"
NODE_ID="1c188980.6d0c87"
```

---
## Credits
Parts of this README and large parts of the code comes from Google. [Actions on Google: Smart Home sample using Node.js](https://github.com/actions-on-google/smart-home-nodejs) in particular has been of great value.

## Copyright and license
Copyright 2018 - 2020 Michael Jacobsen under [the GNU General Public License version 3](LICENSE).
