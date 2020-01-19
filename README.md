# WARNING: Beta code! (But we're getting there :-)

## Prerequisites

1. You are going to need a 'real' SSL certificate e.g. from [Let’s Encrypt](https://letsencrypt.org/). The public key and the private key must copied to your Node-RED server, in a location where the Node-RED service can read them.
2. You also need to be able to forward TCP traffic coming in from the Internet to your Node-RED server on a port you specify.
3. This package requires NodeJS version 7.6.0 at a minimum. If, during start of Node-RED, you get this warning, your version on NodeJS is too old:
`[warn] [node-red-contrib-google-smarthome/google-smarthome] SyntaxError: Unexpected token ( (line:30)`

## Installation
To install - change to your Node-RED user directory.

        cd ~/.node-red
        npm install node-red-contrib-google-smarthome

*Note:* This version can output a lot of debug messages on the console. These messages are optional.

## Nodes in this package
### General information
1. If `online` is set to `false` for a node, Google SmartHome is not going to be able to control the node. It will also show as `offline` in the Google Home app.
2. The nodes will do their best to convert incoming payload data to the required type. You can send a string of e.g. `ON` and it will be converted to `true`.
3. Topics must be either as stated below or prepended with one or more `/`. E.g. `my/topic/on`. The nodes only looks for the part after the last `/`, if any.

#### - Light On/Off (a light that can be swithed on and off only)
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

If `topic` is something else then `payload` must be an object and tells all the states of the light.

        msg.topic = 'set'
        msg.payload = {
          on: false,
          online: true,
          brightness: 100,
          hue: 120.0,
          saturation: 100.0
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

#### - Scene
Messages sent to this node is simply passed through. One cannot tell Google SmartHome to activate a scene, they tell us.

#### - Management
`topic` can be `restart_server` or `report_state`.

`payload` is not used for anything.

`restart_server` is used to stop then start the built-in webserver. Can be used when your SSL certificate has been renewed and needs to be re-read by the webserver.

`report_state` will force an update of all states to Google. Mostly usefull for debugging.

## The config node

**Local Authentication**

  `Username` and `Password`: A username and password used when you link Google SmartHome to this node.

**Actions on Google Project Settings**

  `Client ID`: The client id you entered in the *Google on Actions* project.

  `Client Secret`: The client secret you entered in the *Google on Actions* project.

**Google HomeGraph Settings**

  `Jwt Key`: Full path to JWT key file (the one downloaded in the *Add Report State* section).

  `Report Interval (m)`: Time, in minutes, between report updates are sent to Google.

**Built-in Web Server Settings**

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
## Credits
Parts of this README and large parts of the code comes from Google. [Actions on Google: Smart Home sample using Node.js](https://github.com/actions-on-google/smart-home-nodejs) in particular has been of great value.

## Copyright and license
Copyright 2018 - 2019 Michael Jacobsen under [the GNU General Public License version 3](LICENSE).