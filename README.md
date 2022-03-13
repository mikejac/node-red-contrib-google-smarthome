**WARNING: Beta code! (But we're getting there :-)**

**Breaking change:** On upgrade to v0.1.0 you have to re-enter your credentials. See the [release notes](https://github.com/mikejac/node-red-contrib-google-smarthome/releases/tag/v0.1.0).

**Deprecation note:** As of v0.2.0 all device nodes except the Google Device are deprecated and will be removed later. Please migrate to the Google Device node.

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

1. You are going to need a 'real' SSL certificate e.g. from [Let’s Encrypt](https://letsencrypt.org/).
2. You also need to be able to forward TCP traffic coming in from the Internet to your Node-RED server on a port you
specify. This is not your full Node-RED server but a service started by `node-red-contrib-google-smarthome`, providing
only the functions needed by Google.
3. This package requires NodeJS version 8.0.0 at a minimum.

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

#### Other device nodes

All other device nodes except the Google device are deprecated. Please use the Google device node instead.
        
#### - Management
`topic` can be `restart_server`, `report_state` or `request_sync`.

`payload` is not used for anything.

`restart_server` is used to stop then start the built-in webserver. Can be used when your SSL certificate has been renewed and needs to be re-read by the webserver.

`report_state` will force an update of all states to Google. Mostly useful for debugging.

`request_sync` will request Google to sync to learn about new or changed devices. This usually happens automatically.

---
## The config node

**Local Authentication**

  `Use Google Login`: If enabled, use the Google login authentication.

  `Login Client ID`: If Google Login is enabled, the client id you gained from the *Google Sign-In* integration.

  `Authorized emails`: If Google Login is enabled, The email addresses authorized to log in.

  `Username` and `Password`: If Google Login is disabled, a username and password used when you link Google SmartHome to this node.
  
**Actions on Google Project Settings**

  `Client ID`: The client id you entered in the *Actions on Google* project.

  `Client Secret`: The client secret you entered in the *Actions on Google* project.

**Google HomeGraph Settings**

  `Jwt Key`: Full or relative to the Node-RED config folder path to JWT key file (the one downloaded in the *Add Report State* section).

**Web Server Settings**

  `Use http Node-RED root path`: If enabled, use the same http root path prefix configured for Node-RED, otherwise use /.

  `Path`: Prefix for URLs provided by this module. Default fulfillment URL is https://example.com:3001/smarthome. With a
          path of "foo" this changes to https://example.com:3001/foo/smarthome. Same for URLs `/oauth` and `/token`.

  `Port`: TCP port of your choosing for incoming connections from Google. Must match what you entered in the
          *Actions on Google* project. If empty, it will use the same port as Node-RED.

  `Use external SSL offload`: If enabled, the smarthome service will use HTTP instead of HTTPS. Check if you want to
                              do SSL termination on a reverse proxy.

  `Public Key`: Full path to public key file, e.g. `fullchain.pem` from Let's Encrypt.

  `Private Key`: Full path to private key file, e.g. `privkey.pem` from Let's Encrypt.

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
3. To trigger the notification send a message with a specific payload into the device node. Payloads are documented
   [here](https://developers.google.com/assistant/smarthome/develop/notifications#events).

Example flow:

    [{"id":"43a13163.4a3e6","type":"google-device","z":"1fdba310.d04cad","client":"","name":"Front Door","topic":"","room_hint":"","device_type":"DOORBELL","trait_appselector":false,"trait_channel":false,"trait_inputselector":false,"trait_mediastate":false,"trait_onoff":false,"trait_transportcontrol":false,"trait_modes":false,"trait_volume":false,"trait_toggles":false,"trait_brightness":false,"trait_colorsetting":false,"appselector_file":"applications.json","channel_file":"channels.json","inputselector_file":"inputs.json","command_only_input_selector":false,"ordered_inputs":false,"support_activity_state":false,"support_playback_state":false,"command_only_onoff":false,"query_only_onoff":false,"supported_commands":["CAPTION_CONTROL","NEXT","PAUSE","PREVIOUS","RESUME","SEEK_RELATIVE","SEEK_TO_POSITION","SET_REPEAT","SHUFFLE","STOP"],"volume_max_level":100,"can_mute_and_unmute":true,"volume_default_percentage":40,"level_step_size":1,"command_only_volume":false,"command_only_brightness":false,"command_only_colorsetting":false,"color_model":"temp","temperature_min_k":2000,"temperature_max_k":9000,"modes_file":"modes.json","command_only_modes":false,"query_only_modes":false,"toggles_file":"toggles.json","command_only_toggles":false,"query_only_toggles":false,"trait_camerastream":false,"hls":"","hls_app_id":"","dash":"","dash_app_id":"","smooth_stream":"","smooth_stream_app_id":"","progressive_mp4":"","progressive_mp4_app_id":"","auth_token":"","passthru":false,"trait_scene":false,"scene_reversible":true,"trait_timer":false,"trait_temperaturesetting":false,"max_timer_limit_sec":86400,"command_only_timer":false,"available_thermostat_modes":["off","heat","cool","on","heatcool","auto","fan-only","purifier","eco","dry"],"min_threshold_celsius":"10","max_threshold_celsius":"32","thermostat_temperature_unit":"C","buffer_range_celsius":2,"command_only_temperaturesetting":false,"query_only_temperaturesetting":false,"trait_temperaturecontrol":false,"tc_min_threshold_celsius":0,"tc_max_threshold_celsius":40,"tc_temperature_step_celsius":1,"tc_temperature_unit_for_ux":"C","tc_command_only_temperaturecontrol":false,"tc_query_only_temperaturecontrol":false,"trait_humiditysetting":false,"min_percent":0,"max_percent":100,"command_only_humiditysetting":false,"query_only_humiditysetting":false,"trait_dock":false,"trait_locator":false,"trait_lockunlock":false,"trait_reboot":false,"trait_openclose":false,"discrete_only_openclose":false,"open_direction":[],"command_only_openclose":false,"query_only_openclose":false,"trait_startstop":false,"pausable":false,"available_zones":[],"lang":"en","trait_runcycle":false,"trait_softwareupdate":false,"trait_rotation":false,"supports_degrees":true,"supports_percent":true,"rotation_degrees_min":0,"rotation_degrees_max":360,"supports_continuous_rotation":false,"command_only_rotation":false,"trait_lighteffects":false,"default_sleep_duration":1800,"default_wake_duration":1800,"supported_effects":["colorLoop","sleep","wake"],"trait_statusreport":false,"trait_cook":false,"supported_cooking_modes":[],"food_presets_file":"foodPresets.json","trait_fanspeed":false,"reversible":false,"supports_fan_speed_percent":true,"fan_speeds_ordered":true,"command_only_fanspeed":false,"available_fan_speeds_file":"availableFanSpeeds.json","trait_sensorstate":false,"sensor_states_supported":[],"arm_levels_ordered":true,"trait_fill":false,"available_fill_levels_file":"availableFillLevels.json","supports_fill_percent":false,"trait_armdisarm":false,"available_arm_levels_file":"availableArmLevels.json","trait_energystorage":false,"is_rechargeable":false,"query_only_energy_storage":false,"energy_storage_distance_unit_for_ux":"KILOMETERS","trait_dispense":false,"supported_dispense_items_file":"supportedDispenseItems.json","supported_dispense_presets_file":"supportedDispensePresets.json","trait_networkcontrol":false,"supports_enabling_guest_network":false,"supports_disabling_guest_network":false,"supports_getting_guest_network_password":false,"network_profiles":[],"supports_enabling_network_profile":false,"supports_disabling_network_profile":false,"supports_network_download_speedtest":false,"supports_network_upload_speedtest":false,"trait_objectdetection":true,"show_trait":"selected","advanced_settings":false,"x":870,"y":1120,"wires":[[]]},{"id":"b20005f.91069f8","type":"inject","z":"1fdba310.d04cad","name":"Object Detection","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":"10","topic":"ObjectDetection","payload":"{\"named\":\"Alice\"}","payloadType":"json","x":640,"y":1120,"wires":[["43a13163.4a3e6"]]},{"id":"61d16f84.337cd","type":"inject","z":"1fdba310.d04cad","name":"Object Detection","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":"10","topic":"ObjectDetection","payload":"{\"unclassified\":2}","payloadType":"json","x":640,"y":1160,"wires":[["43a13163.4a3e6"]]}]

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
- Check that you only have one single config node and this config is selected in your management node and all your
  devices.
- Google might say that it cannot reach your device if that device did not update its state at least once after creation.
- Go through the [setup instructions](docs/setup_instructions.md) again and compare your settings to what you see on the
  screenshots


--
## Troubleshooting Local fulfillment

- You can test if local fulfillment was successfully enabled by saying "Hey Google, force local" (works on non-english
  devices too). Then try to control your devices. All actions will now be executed locally or will fail if local
  fulfillment is not available. After you are done testing, revert to normal mode by saying "Hey Google, force default".
- Set a port for local fulfillment in the management node's config.
- Send an HTTP POST request to `http://192.168.178.25:13002/smarthome` (with the IP address of your host and the
  port you chose). E.g. run `curl -X POST http://192.168.178.25:13002/smarthome`. It should answer with
  `{"error":"missing inputs"}`. This error message is okay, all other messages indicate connection problems with the
  local fulfillment service.
- Install [Service Browser](https://play.google.com/store/apps/details?id=com.druk.servicebrowser) or a similar mDNS
  discovery tool on your phone. It must find a service named "_nodered-google._tcp.". Tap on it, then tap again on
  "nodered" to see the details. Check if the IP address and port are correct.
- If Service Browser lists the "nodered" service with an additional domain, check the configuration files /etc/hostname
  and /etc/hosts. Both files must contain the host name without a domain.
- Open [chrome://inspect](chrome://inspect) in Chrome on your computer (not available on phone). Let it run for a while
  until your smart speaker is discovered. Click the `inspect` link. You'll see the console output of your smart speaker.
  The first two lines should read "Ready, App version: x.y" and "node-red-contrib-google-smarthome app.js ready!". If
  the local fulfillment connection was successfully established, you should see lines starting with "IDENTIFY" and
  "REACHABLE_DEVICES" as well as lots of other lines. Yellow warning lines are okay, but you should not see red error
  lines.
- The first lines in  the chrome://inspect console will show the version number of the app.js script. Compare the
  version number to the one on the third line of the official
  [app.js script](https://raw.githubusercontent.com/mikejac/node-red-contrib-google-smarthome/master/local-execution/app.js).
  If they are different, update the app.js script as explained
  in the [setup instructions](docs/setup_instructions.md#enable-local-fulfillment-optional). After updating app.js, you
  might have to restart your smart speaker.
- Sometimes it takes several hours for the local fulfillment connection to be established.

---

## Credits
Parts of this README and large parts of the code comes from Google. [Actions on Google: Smart Home sample using Node.js](https://github.com/actions-on-google/smart-home-nodejs) in particular has been of great value.

## Copyright and license
Copyright 2018 - 2021 Michael Jacobsen under [the GNU General Public License version 3](LICENSE).
