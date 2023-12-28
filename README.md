## Table of Contents
- [Introduction](#introduction)
- [Setup Instructions](#prerequisites-and-setup-instructions)
- [Nodes in this package](#nodes-in-this-package)
  - [General Information](#general-information)
  - [Google Device node](#--google-device-node)
  - [Management](#--management)
- [The config node](#the-config-node)
- [Sending spoken notifications](#sending-spoken-notifications)
- [Inviting other users](#inviting-other-users)
- [Troubleshooting](#troubleshooting)
- [Contact us](#contact-us)
- [Developer resources](#developer-resources)
- [Credits](#credits)
- [Copyright and license](#copyright-and-license)

---
## Introduction

A collection of Node-RED nodes to control your smart home devices via Google Assistant or the Google Home app.

This is done by implementing a smart home provider that runs on your own host. So you don't have to rely on any third
party services (other than Google) that can go offline, charge you, or leak your data.

What this module does NOT do:
- It is not a cloud-hosted solution that you just install and it works. You host a publicly accessible service on your
  own hardware. It can be difficult to set up. And you do this at your own risk.
- It does not talk to your physical devices. It only provides virtual devices in Node-RED. It's up to you to pass
  commands from the virtual to the physical devices.
- It is not an interface to Google devices (like Nest Thermostats, Nest Cams, etc.).
- It is for controlling devices only. It does not let you implement your own conversations with Google Assistant.

---
## Prerequisites and Setup Instructions

Follow our [setup instructions](docs/setup_instructions.md).

---
## Nodes in this package
### General Information
- If `online` is set to `false` for a node, Google SmartHome will not be able to control the node. It will also show up
  as `offline` in the Google Home app.
- Nodes will do their best to convert incoming payload data to the required type. For example, you can send a string of
  `ON` and it will be converted to `true`.
- Topics must be either as listed below or prepended with one or more `/`. E.g. `my/topic/on`. The nodes will only look
  for the part after the last `/`, if any.


### Google device node
This is a generic node that supports the following Google [devices](https://developers.google.com/assistant/smarthome/guides):

* Air conditioning unit
* Air cooler
* Air freshener
* Air purifier
* Audio-Video receiver
* Awning
* Bathtub
* Bed
* Blender
* Blinds
* Boiler
* Camera
* Carbon monoxide detector
* Charger
* Closet
* Coffee Maker
* Cooktop
* Curtain
* Dehumidifier
* Dehydrator
* Dishwasher
* Door
* Doorbell
* Drawer
* Dryer
* Fan
* Faucet
* Fireplace
* Freezer
* Fryer
* Garage
* Gate
* Grill
* Heater
* Hood
* Humidifier
* Kettle
* Light
* Lock
* Microwave
* Mop
* Mower
* Multicooker
* Network
* Outlet
* Oven
* Pergola
* Pet feeder
* Pressure cooker
* Radiator
* Refrigerator
* Remote control
* Router
* Scene
* Security system
* Sensor
* Settop
* Shower
* Shutter
* Smoke detector
* Soundbar
* Sousvide
* Speaker
* Sprinkler
* Stand mixer
* Streaming box
* Streaming soundbar
* Streaming stick
* Switch
* Thermostat
* Television
* Vacuum
* Valve
* Washer
* Water heater
* Water purifier
* Water softener
* Window
* Yogurt maker

and the following Google [traits](https://developers.google.com/assistant/smarthome/traits):

* App selector
* Arm/Disarm
* Brightness
* Camera stream
* Channel
* Color setting
* Color temperature
* Cook
* Dispense
* Dock
* Energy storage
* Fan speed
* Fill
* Humidity setting
* Input selector
* Light effects
* Locator
* Lock/Unlock
* Media state
* Modes
* Network control
* Object detection
* On/Off
* Open/Close
* Reboot
* Rotation
* Run cycle
* Scene
* Sensor state
* Software update
* Start stop
* Status report
* Temperature control
* Temperature Setting
* Timer
* Toggles
* Transport control
* Volume

Example flow:
        See the flow used for the automated tests [here](test/sh/flows.json)

### Management
`topic` can be `restart_server`, `report_state` or `request_sync`.

`payload` is not used for anything.

`restart_server` restarts the built-in web server.

`report_state` will force an update of all states to Google. Mostly useful for debugging.

`request_sync` will ask Google for a sync to learn about new or changed devices. This is usually done automatically.

---
## The config node

  `Name`: A name for your config node.

  `Enable Node Debug`: If enabled, debug messages will be written to Node-RED's log output.

  `Default Language`: The language of your project.

**Local Authentication**

  `Use Google Login`: If checked, use Google login authentication.

  `Login Client ID`: If Google Login is enabled, the client ID you received from the *Google Sign-In* integration.

  `Authorized emails`: If Google Login is enabled, the email addresses authorized to log in.

  `Username` and `Password`: If Google Login is disabled, a username and password used during account linking in the
      Google Home app.
  
**Actions on Google Project Settings**

  `Client ID`: The client ID you entered in the *Actions on Google* project.

  `Client Secret`: The client secret you entered in the *Actions on Google* project.

**Google HomeGraph Settings**

  `Jwt Key`: Path to the JSON file that you downloaded during setup. Can be an absolute path or a path relative to
             Node-REDs user dir (where your settings.js, flows.json etc. are stored). 

**Web Server Settings**

  `Port`: TCP port of your choice for incoming connections from Google. Must match what you specified in the
          *Actions on Google* project. If empty, it will use the same port as Node-RED.

  `URL subpath`: URL subpath to add to the URL. If set, the URL will change from `https://example.com:3001/check` to
    `https://example.com:3001/<subpath>/check` (resp. `/<subpath>/smarthome`, `/<subpath>/oauth`, `/<subpath>/token`).

  `Use http Node-RED root path`: If enabled, use the same http root path prefix configured for Node-RED, otherwise use /.

  `Use external SSL offload`: If enabled, the smarthome service will use HTTP instead of HTTPS. Check if you want to
                              do SSL termination on a reverse proxy.

  `Public Key`: Full path to the SSL certificate file, e.g. `fullchain.pem` from Let's Encrypt.

  `Private Key`: Full path to private SSL key file, e.g. `privkey.pem` from Let's Encrypt.

    Note: Certificates are automatically reloaded after renewal. You don't need to restart Node-RED.

**Local Fulfillment**

  `Scan Type`: The service discovery method to use. Must match what is set in the *Actions on Google* project.

  `Discovery Port`: A port number to use for UDP or mDNS service discovery. 

  `HTTP Port`: A port number to use for the connection from your smart speaker to Node-RED. If empty, it will use the
               same port as Node-RED. If you are using Node-RED's built-in HTTPS encryption or have a httpAdminRoot set,
               you need to set a port. Don't create a forwarding rule for this port!


**Advanced Settings**

  `Token Duration`: The duration of the authorization token used by Google SmartHome to identify itself to the Node-RED
                    SmartHome plugin. Default is 60 minutes.

  `Report Interval (m)`: Time in minutes between sending report updates to Google (default is 60 minutes).

  `Request sync delay (s)`: Delay in seconds, for requesting devices sync after a deployment. 0 or empty for disable
                            (default is 0).

  `Set state delay (s)`: Delay, in seconds, for sending the set_state message after state changes, 0 or empty to disable
                         (default value 0).

---
## Sending spoken notifications

Some devices support sending spoken notifications to your smart speaker. For example, you can play a notification on
your speaker when someone rings at the front door or when the washing machine completes a cycle. Unfortunately, you
cannot send custom notifications, you can only trigger predefined notifications.

See https://developers.google.com/assistant/smarthome/develop/notifications.

1. Using the "Google Device" node, create a device with one of the supported traits in Node-RED and deploy it.
   Currently, only the Object Detection, Run Cycle, and Sensor State traits support notifications.
2. In the Google Home app, open your new device and enable Spoken Notifications.
3. To trigger the notification, send a message with a specific payload to the device node. You can find examples for
   all supported notifications in the examples folder (examples/Spoken%20Notifications). Payloads are documented
   [here](https://developers.google.com/assistant/smarthome/develop/notifications#events).

---
## Inviting other users

You can invite other people into your smart home in the app by following
[these steps](https://support.google.com/googlenest/answer/9155535?hl=en#zippy=%2Cinvite-members-to-a-home).

Inviting people will not work in all cases. For example, it won't work if either you or the other person has a
commercial Google Workspace account. If this is the case, you can share access to your Smart Home project as follows:

1. If you are currently using username/password authentication, switch to Google Sign-In by following the instructions
   on [Integrating Google Sign-In](docs/google_signin.md).
   Proceed only after you have successfully unlinked and relinked your own account.
2. In "Authorized emails", add the email address of the account you want to add. Save and deploy.
3. Open your project in the Google Actions Console.
4. Select "Manage user access" from the menu (three dots on the top right) choose "Manage user access".
5. Select "Add".
6. Enter the email address for the account you want to add. Select at least "Viewer" as the role.
7. Return to the Google Actions Console. On the `Test` tab, select `Settings` and disable `On device testing`.
   Then click `Start testing`.
8. The person you just added should now able to link to your project by following the steps in
   [Setup Account linking](docs/setup_instructions.md#setup-account-linking).

---
## Troubleshooting

- Some devices can be controlled by voice, but not by the Google Home app. For example windows and sensors. These
  devices will only show a general page with their room assignments in the app, but they don't show their current state
  or any buttons to control them. There is nothing we can do about this. This has to be implemented by Google.
- Some errors and possible solutions are listed at
  [Possible errors](wiki/Possible-errors).
- Check Node-Red's debug panel for error messages.
- Unlink and relink your account in the Google Home app. Check Node-RED's debug panel for errors while doing so.
- If you are having trouble linking your account, try turning off Wi-Fi on your phone to use only the cellular network.
- If you are having trouble linking your account, disable "Use Google Login" and try logging in with username/password
  first. You can switch back to Google Login later.
- Restart your flows (using the `Restart Flows` option in the dropdown menu of the deploy button) while the debug panel
  is open to see any error messages during initialization.
- Go to [Actions on Google Console](https://console.actions.google.com), in tab *Test* choose *logs in Google Cloud*.
- Check if your service is reachable from the outside. Use [reqbin.com](https://reqbin.com/) or a similar tool to send a
  GET request to https://example.com:3001/check (with your hostname and port). It should respond with status
  200 (OK) and the message "SUCCESS: Smart Home service is reachable!" as one of the first lines. Use
  https://www.ssllabs.com/ssltest/ to check your SSL certificate.
- Check Node-RED's log output. Where you find it depends on how you installed Node-Red. Usually something like
  `journalctl -u nodered`, `docker logs <container>` or a file in `/var/log`.
- Toggle "Enable Node debug" in the configuration node, connect a debug node to the output of the management node and
  look for debug messages. In the Node-Red UI select 'Restart Flows' on the 'Deploy' button to see messages during
  initialization.
- Go to [Actions on Google Console](https://console.actions.google.com), on tab `Test` click `Reset Test`. If this
  doesn't do anything, click the `Settings` button, disable and re-enable `On device testing`.
- Check that you have only one single management node and one single config node.
- Go through the [setup instructions](docs/setup_instructions.md) again and compare your settings with what you see on
  the screenshots

For problems related to local fulfillment, see [Troubleshooting local fulfillment](docs/local_fulfillment.md#troubleshooting-local-fulfillment).

---

## Contact us

- If you have questions, ask them on our [Discussions page](https://github.com/mikejac/node-red-contrib-google-smarthome/discussions).
- If you think you have found a bug, report it on our [Issue Tracker](https://github.com/mikejac/node-red-contrib-google-smarthome/issues).

---

## Developer resources

- [Google Smart Home project](https://developers.home.google.com/cloud-to-cloud/get-started)
- [Google Smart Home traits list](https://developers.home.google.com/cloud-to-cloud/traits)
- [Actions on Google Console](https://console.actions.google.com/project/wohnung-45a57/overview)
- [Google's Smart Home sample project](https://github.com/actions-on-google/smart-home-nodejs)
- [SYNC Data Validator](https://developers.home.google.com/cloud-to-cloud/tools/sync-data-validator)
- [Google Home Playground](https://home-playground.withgoogle.com/)
- Similar projects:
  - [SmartNORA](https://github.com/andrei-tatar/node-red-contrib-smartnora) (cloud-hosted Google integration for Node-RED)
  - [Nabu Casa](https://github.com/NabuCasa/hass-nabucasa) (Google integration for Home Assistant)
  - [node-red-contrib-googlehome](https://googlehome.hardill.me.uk/) (Google integration for Node-RED by Ben Hardill)
  - [Node-RED Smart Home Control](https://red.cb-net.co.uk/) (Google integration for Node-RED, based on node-red-contrib-googlehome)

---

## Credits
Parts of this README and much of the code come from Google. In particular,
[Actions on Google: Smart Home sample using Node.js](https://github.com/actions-on-google/smart-home-nodejs) was of
great value.

## Copyright and license
Copyright 2018 - 2024 Michael Jacobsen and others under [the GNU General Public License version 3](LICENSE).
