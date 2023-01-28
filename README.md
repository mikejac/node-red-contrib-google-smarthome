## Table of Contents
- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Nodes in this package](#nodes-in-this-package)
  - [General Information](#general-information)
  - [Google Device node](#--google-device-node-a-general-node-supporting-all-google-device-types-and-all-google-device-traits)
  - [Other device nodes](#other-device-nodes)
  - [Management](#--management)
- [The config node](#the-config-node)
- [Sending spoken notifications](#sending-spoken-notifications)
- [Inviting other users](#inviting-other-users)
- [Troubleshooting](#troubleshooting)
- [Troubleshooting local fulfillment](#troubleshooting-local-fulfillment)
- [Credits](#credits)
- [Copyright and license](#copyright-and-license)

---
## Introduction

A collection of Node-RED nodes to control your smart home devices via Google Assistant or the Google Home App.

This is done by implementing a smart home provider that runs on your own host. So you don't have to depend on any
third-party services (except Google) that may go offline, become chargeable or may leak your data.

What this module does NOT:
- It does not talk to your physical devices. It only provides virtual devices in Node-RED. It's up to you to forward
  commands from the virtual to the physical device.
- It is not an interface to Google devices (like Nest Thermostats, Nest Cams, etc.).
- It is only for controlling devices. It does not let you implement your own conversations with Google Assistant.

---
## Prerequisites

- You need your own domain. You can use a free domain from any DynDNS provider. The DNS record for this domain must point to your host.
- You are going to need a 'real' SSL certificate e.g. from [Let’s Encrypt](https://letsencrypt.org/). You must have either the
  certificate files (e.g. from Certbot). Or you can use a reverse proxy with automatic certificate management, such as
  Caddy or Traefik. Tip: There's a guide on [how to use Caddy](docs/caddy.md).
- You need to be able to forward incoming traffic from the internet to a specific port on your host. This may be difficult if your
  ISP uses carrier-grade NAT, or if you can't configure port forwarding on your router.
- This package requires NodeJS version 10.0.0 at a minimum.

---
## Setup Instructions

Follow our [setup instructions](docs/setup_instructions.md).

---
## Nodes in this package
### General information
1. If `online` is set to `false` for a node, Google SmartHome is not going to be able to control the node. It will also show as `offline` in the Google Home app.
2. The nodes will do their best to convert incoming payload data to the required type. You can send a string of e.g. `ON` and it will be converted to `true`.
3. Topics must be either as stated below or prepended with one or more `/`. E.g. `my/topic/on`. The nodes only looks for the part after the last `/`, if any.

#### - Google device node (a general node supporting all Google device types and all Google device traits)
This is a generic node, supporting the following Google [devices](https://developers.google.com/assistant/smarthome/guides):

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
        See the flow used for the automatic tests [here](test/sh/flows.json)

#### - Management
`topic` can be `restart_server`, `report_state` or `request_sync`.

`payload` is not used for anything.

`restart_server` is used to stop then start the built-in webserver. Can be used when your SSL certificate has been renewed and needs to be re-read by the webserver.

`report_state` will force an update of all states to Google. Mostly useful for debugging.

`request_sync` will request Google to sync to learn about new or changed devices. This usually happens automatically.

---
## The config node

  `Name`: A name for your config node.

  `Enable Node Debug`: If enabbled, debug messages will be written to Node-RED's log output.

  `Default Language`: The language of your project.

**Local Authentication**

  `Use Google Login`: If enabled, use the Google login authentication.

  `Login Client ID`: If Google Login is enabled, the client ID you gained from the *Google Sign-In* integration.

  `Authorized emails`: If Google Login is enabled, The email addresses authorized to log in.

  `Username` and `Password`: If Google Login is disabled, a username and password used when you link Google SmartHome to this node.
  
**Actions on Google Project Settings**

  `Client ID`: The client ID you entered in the *Actions on Google* project.

  `Client Secret`: The client secret you entered in the *Actions on Google* project.

**Google HomeGraph Settings**

  `Jwt Key`: Path to the JSON file you downloaded during setup. Can be an absolute path or a path relative to Node-REDs
             user dir (where your settings.js, flows.json etc. are stored). 

**Web Server Settings**

  `Port`: TCP port of your choosing for incoming connections from Google. Must match what you entered in the
          *Actions on Google* project. If empty, it will use the same port as Node-RED.

  `Path`: Prefix for URLs provided by this module. Default fulfillment URL is https://example.com:3001/smarthome. With a
          path of "foo" this changes to https://example.com:3001/foo/smarthome. Same for URLs `/oauth` and `/token`.

  `Use http Node-RED root path`: If enabled, use the same http root path prefix configured for Node-RED, otherwise use /.

  `Use external SSL offload`: If enabled, the smarthome service will use HTTP instead of HTTPS. Check if you want to
                              do SSL termination on a reverse proxy.

  `Public Key`: Full path to public key file, e.g. `fullchain.pem` from Let's Encrypt.

  `Private Key`: Full path to private key file, e.g. `privkey.pem` from Let's Encrypt.

**Local Fulfillment**

  `Scan Type`: The service discovery method to use. Must match what is set in the *Actions on Google* project.

  `Discovery Port`: A port number to use for UDP or MDNS service discovery. 

  `HTTP Port`: A port number to from your smart speaker to Node-RED. If empty, it will use the same port as Node-RED.
               If you use Node-RED's built-in HTTPS encryption or you have a httpAdminRoot set, you need to
               set a port. Don't create a forwarding rule for this port!

**Advanced Settings**

  `Token Duration`: The authorization token duration used by Google SmartHome to identify itself to node-red SmartHome plugin. Default is 60 minutes.

  `Report Interval (m)`: Time, in minutes, between report updates are sent to Google (default value 60 m).

  `Request sync delay (s)`: Delay, in seconds, for request devices sync after a deploy, 0 or empty for disable (default value 0).

  `Set state delay (s)`: Delay, in seconds, for sending the set_state message after state changes, 0 or empty for disable (default value 0).

---
## Sending spoken notifications

Some devices support sending spoken notifications to your smart speaker. For example, you can play a notification on your
speaker when somebody rings at the front door or when the washing machine completes its cycle. Unfortunately you can not
send custom messages, you can only trigger predefined messages.

See https://developers.google.com/assistant/smarthome/develop/notifications.

1. Create a device using the "Google Device" node with one of the supported traits in Node-RED and deploy. Currently,
   only the traits "Object detection", "Run cycle" and "Sensor state" support notifications.
2. In your Google Home App open your new device and enable "Spoken Notifications".
3. To trigger the notification send a message with a specific payload into the device node. You can find examples for
   all supported notifications in the [examples folder](examples/Spoken%20Notifications). Payloads are documented
   [here](https://developers.google.com/assistant/smarthome/develop/notifications#events).

---
## Inviting other users

You can invite other people into your smart home in the app by following
[these steps](https://support.google.com/googlenest/answer/9155535?hl=en#zippy=%2Cinvite-members-to-a-home).

Inviting people does not work in all cases. For example, it won't work if you or the other person has a commercial
Google Workspace account. If this is the case, you can share access to your smart home project like this:

1. If you are currently using username/password authentication, switch to Google Sign-In by following the instructions
   on [Integrating Google Sign-In](docs/setup_instructions.md#integrating-google-sign-in-optional). Only continue if you successfully unlinked and
   relinked your own account.
2. In "Authorized emails" add the email address of the account you want to add. Save and deploy.
3. Open your project in Google Actions Console.
4. From the menu (three dots on the upper right) choose "Manage user access".
5. Select "Add".
6. Enter the email address for the account you want to add. As role select at least "Viewer".
7. Go back to Google Actions Console. In tab `Test` choose `Settings` and disable `On device testing`.
   Then click `Start testing`.
8. The person you just added should now able to link to your project by following the steps in
   [Setup Account linking](docs/setup_instructions.md#setup-account-linking).

---
## Troubleshooting

- Some devices can be controlled via voice, but not via Google Home App. For example windows and sensors. These devices
  only show a general page with their room assignments in the app, but they don't show their current state or buttons to
  control it. There is nothing we can do about it, this has to be implemented by Google.
- Some errors and possible solutions are listed at
  [Possible errors](https://github.com/mikejac/node-red-contrib-google-smarthome/wiki/Possible-errors).
- Look at Node-Red's debug panel for error messages.
- Unlink and relink your account in the Google Home app. Meanwhile, look for errors in the debug panel.
- If you have problems during account linking, disable Wi-Fi on your phone to use the cellular network only.
- If you have problems during account linking, disable "Use Google Login" and try login with username/password first. You can switch back to Google Login later.
- Restart your flows (using the `Restart Flows` option in the dropdown menu of the deploy button) while the debug panel
  is open to see error messages during initialization.
- Go to [Actions on Google Console](https://console.actions.google.com), in tab *Test* choose *logs in Google Cloud*.
- Check if your service is reachable from the outside. Use [reqbin.com](https://reqbin.com/) or a similar tool to
  send a GET request to https://example.com:3001/check (with your hostname and port). It must answer with status
  200 (OK) and the message "SUCCESS: Smart Home service is reachable!" as one of the first lines. Use
  https://www.ssllabs.com/ssltest/ to check your SSL certificate.
- Check Node-RED's log output. Where you find this depends on how you installed Node-Red. Usually something like
  `journalctl -u nodered`, `docker logs <container>` or a file in `/var/log`.
- Toggle "Enable Node debug" in the configuration node, connect a debug node to the output of the management node and
  look for debug messages. In Node-Red UI choose 'Restart Flows' on the 'Deploy' button to see messages during
  initialization.
- Go to [Actions on Google Console](https://console.actions.google.com), on tab *Test* click *Reset Test*. If this
  doesn't do anything, click the *Settings* button, disable "On device testing", then click "Start testing" to enable it again. This is
  especially important after making changes in the Google Actions Console.
- Check that you have only one single management node and one single config node.
- Google might say that it cannot reach your device if that device did not update its state at least once after creation.
- Go through the [setup instructions](docs/setup_instructions.md) again and compare your settings to what you see on the
  screenshots

For problems related to local fulfillment have a look at [Troubleshooting local fulfillment](https://github.com/mikejac/node-red-contrib-google-smarthome/blob/master/docs/local_fulfillment.md#troubleshooting-local-fulfillment).


---

## Credits
Parts of this README and large parts of the code comes from Google. [Actions on Google: Smart Home sample using Node.js](https://github.com/actions-on-google/smart-home-nodejs) in particular has been of great value.

## Copyright and license
Copyright 2018 - 2023 Michael Jacobsen and others under [the GNU General Public License version 3](LICENSE).
