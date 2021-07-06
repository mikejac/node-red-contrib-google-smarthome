#!/usr/bin/env bash

#
# NodeRED Google SmartHome
# Copyright (C) 2021 Claudio Chimera.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#

. ./data
. ./code

NODE_ID=$1 || "a5782b1b.e120f8"
PAYLOAD_FILE="$HOME/payload.json"
OUT_FILE="$HOME/out.json"
PAYLOAD_URL=$(dirname $BASE_URL)/payload
TEST_TYPE=$2 || '1'

./refresh_token

dos2unix cmd/* 2>/dev/null

test_json() {
    TYPE=$1
    STR=$2
    JPATH=$3
    VAL=$4
    V=$(echo $STR | jq $JPATH)
    if [ "$V" != "$VAL" ] ; then
        echo
        echo "CMD: ./execute $CMD_EXEC"
        echo "$TYPE: $STR"
        echo "JSON tag: $JPATH"
        echo "Value expected: $VAL"
        echo "Value found: $V"
        echo ERROR
        echo "Request: "
        cat request.json
        exit 2
    fi
    echo -n .
}

test_out() {
    test_json Response "$OUT" "$@"
}

test_payload() {
    test_json Payload "$PAYLOAD" "$@"
}

test_no_payload() {
    if [ "$PAYLOAD" != "{}" ] ; then
        echo
        echo test no payload failed
        echo "CMD: ./execute $CMD_EXEC"
        echo "Value expected: {}"
        echo "Value found: $PAYLOAD"
        echo ERROR
        echo "Request: "
        cat request.json
        exit 2
    fi
}

execute_payload() {
    CMD_EXEC="$@"
    echo "$@" > request.json
    TOPIC="$1"
    PAYLOAD="$2"
    if [ -z "$PAYLOAD" ] ; then
        PAYLOAD ="$1"
        TOPIC=""
    fi
    REQUEST="{\"payload\": $PAYLOAD, \"topic\": \"$TOPIC\"}"
    echo $REQUEST
    echo "{}" > "$PAYLOAD_FILE" 
    curl -s \
        -H "Content-Type: application/json;charset=UTF-8" \
        --data "$REQUEST" \
        $PAYLOAD_URL  > "$OUT_FILE"
    OUT=$(cat  "$OUT_FILE")
    if [ "$OUT" != "OK" ] ; then
        echo ERROR
        echo "Result $OUT"
        echo "Request: "
        echo $REQUEST
    fi
    PAYLOAD=$(cat "$PAYLOAD_FILE")
}

execute() {
    CMD_EXEC="$@"
    echo
    CMD_=$2
    CMD="${CMD_%%_*}"
    echo ./execute "$@"
    mv "$PAYLOAD_FILE" "$PAYLOAD_FILE.old" 
    echo "{}" > "$PAYLOAD_FILE" 
    ./execute "$@" > "$OUT_FILE"
    OUT=$(cat  "$OUT_FILE")
    #sleep 1
    PAYLOAD=$(cat "$PAYLOAD_FILE")
    test_out ".payload.commands[0].status" '"SUCCESS"'
    test_payload .online true
    test_payload .command "\"$CMD\""
}

execute_no_payload() {
    CMD_EXEC="$@"
    echo
    echo ./execute "$@"
    echo "{}" > "$PAYLOAD_FILE" 
    ./execute "$@" > "$OUT_FILE"
    OUT=$(cat  "$OUT_FILE")
    PAYLOAD=$(cat "$PAYLOAD_FILE")
    test_out ".payload.commands[0].status" '"SUCCESS"'
    test_no_payload
}

execute_error() {
    CMD_EXEC="$@"
    echo
    echo ./execute "$@"
    echo "{}" > "$PAYLOAD_FILE" 
    OUT=$(./execute "$@")
    PAYLOAD=$(cat "$PAYLOAD_FILE")
    test_out ".payload.commands[0].status" '"ERROR"'
    test_no_payload
}
# if [ 1 == 2 ] ; then
# fi # fi

# AppSelector 
echo AppSelector
execute $NODE_ID appInstall mia_application
test_payload ".params.newApplication" '"mia_application"'

execute $NODE_ID appInstall_name mia_application

execute_error $NODE_ID appInstall youtube_application
test_out ".payload.commands[0].errorCode" '"alreadyInstalledApp"'

execute_error $NODE_ID appInstall_name YouTube
test_out ".payload.commands[0].errorCode" '"alreadyInstalledApp"'

execute $NODE_ID appSearch youtube_application

execute $NODE_ID appSearch_name YouTube

execute_error $NODE_ID appSearch no_installed_app
test_out ".payload.commands[0].errorCode" '"noAvailableApp"'

execute_error $NODE_ID appSearch_name no_installed_app1
test_out ".payload.commands[0].errorCode" '"noAvailableApp"'

execute $NODE_ID appSelect_name "Prime Video"
test_payload .currentApplication '"amazon_prime_video_application"'
test_payload .params.newApplicationName '"Prime Video"'

execute $NODE_ID appSelect youtube_application
test_payload .params.newApplication '"youtube_application"'

execute $NODE_ID appSelect amazon_prime_video_application
test_payload .params.newApplication '"amazon_prime_video_application"'

execute $NODE_ID appSelect_name YouTube
test_payload .currentApplication '"youtube_application"'
test_payload .params.newApplicationName '"YouTube"'

execute_error $NODE_ID appSelect no_installed_app2
test_out ".payload.commands[0].errorCode" '"noAvailableApp"'

execute_error $NODE_ID appSelect_name no_installed_app3
test_out ".payload.commands[0].errorCode" '"noAvailableApp"'

# ArmDisarm
echo
echo ArmDisarm The Arm/Disarm logic should be outside the node
execute $NODE_ID ArmDisarm true 123
# test_out ".payload.commands[0].states.online" true

execute $NODE_ID ArmDisarm_level true L2 123
# test_out ".payload.commands[0].states.online" true

execute_error $NODE_ID ArmDisarm_level true NO_LEVEL 456

execute $NODE_ID ArmDisarm_cancel true
# test_out ".payload.commands[0].states.online" true

# Brightness
echo
echo Brightness

execute $NODE_ID BrightnessAbsolute 128
test_payload ".brightness" 128

execute $NODE_ID BrightnessAbsolute 200
test_payload ".brightness" 200

execute $NODE_ID BrightnessRelative 4
test_out ".payload.commands[0].states.online" true
test_payload ".brightness" 208

# CameraStream
echo
echo CameraStream
execute $NODE_ID GetCameraStream true '"progressive_mp4"'
test_out ".payload.commands[0].states.online" true
test_out ".payload.commands[0].states.cameraStreamAccessUrl" '"http://PROGRESSIVE_MP4"'
test_out ".payload.commands[0].states.cameraStreamProtocol" '"progressive_mp4"'
test_out ".payload.commands[0].states.cameraStreamAuthToken" '"Auth Token"'
test_out ".payload.commands[0].states.cameraStreamReceiverAppId" '"PROGRESSIVE_MP4_APPID"'

execute $NODE_ID GetCameraStream true '"hls","dash","smooth_stream","progressive_mp4"'
test_out ".payload.commands[0].states.online" true
test_out ".payload.commands[0].states.cameraStreamAccessUrl" '"http://PROGRESSIVE_MP4"'
test_out ".payload.commands[0].states.cameraStreamProtocol" '"progressive_mp4"'
test_out ".payload.commands[0].states.cameraStreamAuthToken" '"Auth Token"'
test_out ".payload.commands[0].states.cameraStreamReceiverAppId" '"PROGRESSIVE_MP4_APPID"'

execute $NODE_ID GetCameraStream true '"hls"'
test_out ".payload.commands[0].states.online" true
test_out ".payload.commands[0].states.cameraStreamAccessUrl" '"http://HLS"'
test_out ".payload.commands[0].states.cameraStreamProtocol" '"hls"'
test_out ".payload.commands[0].states.cameraStreamAuthToken" '"Auth Token"'
test_out ".payload.commands[0].states.cameraStreamReceiverAppId" '"HLS_APPID"'

execute $NODE_ID GetCameraStream true '"dash"'
test_out ".payload.commands[0].states.online" true
test_out ".payload.commands[0].states.cameraStreamAccessUrl" '"http://DASH"'
test_out ".payload.commands[0].states.cameraStreamProtocol" '"dash"'
test_out ".payload.commands[0].states.cameraStreamAuthToken" '"Auth Token"'
test_out ".payload.commands[0].states.cameraStreamReceiverAppId" '"DASH_APPID"'

execute $NODE_ID GetCameraStream true '"smooth_stream"'
test_out ".payload.commands[0].states.online" true
test_out ".payload.commands[0].states.cameraStreamAccessUrl" '"http://SMOOTH_STREAM"'
test_out ".payload.commands[0].states.cameraStreamProtocol" '"smooth_stream"'
test_out ".payload.commands[0].states.cameraStreamAuthToken" '"Auth Token"'
test_out ".payload.commands[0].states.cameraStreamReceiverAppId" '"SMOOTH_STREAM_APPID"'

# Channel 
echo
echo Channel 
execute_error $NODE_ID selectChannel 'NO channel' 'NO channel name'
test_out ".payload.commands[0].errorCode" '"noAvailableChannel"'

execute $NODE_ID selectChannel 'rai1' 'Rai 1'
test_out ".payload.commands[0].states.online" true
test_payload ".currentChannel" '"rai1"'
test_payload ".currentChannelNumber" '"1"'

execute_error $NODE_ID selectChannel_number 'No channel number'
test_out ".payload.commands[0].errorCode" '"noAvailableChannel"'

execute $NODE_ID selectChannel_number '501'
test_out ".payload.commands[0].states.online" true
test_payload ".currentChannel" '"rai1_hd"'
test_payload ".currentChannelNumber" '"501"'

# ColorSetting 
echo
echo ColorSetting 
execute $NODE_ID ColorAbsolute 'Bianco Caldo' 3000
test_payload ".color.temperatureK" 3000
# test_out ".payload.commands[0].states.online" true

if [ "$TEST_TYPE" == '1' ] ; then
    execute $NODE_ID ColorAbsolute_rgb 'Magenta' 16711935
    test_payload ".color.spectrumRgb" 16711935
    test_payload ".color.temperatureK" null
    # test_out ".payload.commands[0].states.online" true
fi

if [ "$TEST_TYPE" == '2' ] ; then
    execute $NODE_ID ColorAbsolute_hsv 'Magenta' 300 1 1
    # test_out ".payload.commands[0].states.online" true
    test_payload ".color.spectrumHsv.hue" 300
    test_payload ".color.spectrumHsv.saturation" 1
    test_payload ".color.spectrumHsv.value" 1
    test_payload ".color.temperatureK" null
    test_payload ".color.spectrumRgb" null
fi

execute $NODE_ID ColorAbsolute 'Bianco Freddo' 7000
test_payload ".color.spectrumRgb" null
test_payload ".color.spectrumHsv.hue" null
test_payload ".color.spectrumHsv.saturation" null
test_payload ".color.spectrumHsv.value" null
# test_out ".payload.commands[0].states.online" true

# Cook
echo
echo Cook
execute $NODE_ID Cook true BAKE
test_payload ".params.start" true
test_out ".payload.commands[0].states.online" true
test_out ".payload.commands[0].states.currentCookingMode" '"BAKE"'

execute $NODE_ID Cook false BAKE
test_payload ".params.start" false
test_out ".payload.commands[0].states.online" true
test_out ".payload.commands[0].states.currentCookingMode" '"BAKE"'

execute $NODE_ID Cook_preset true COOK white_rice 2 CUPS
test_payload ".params.start" true
test_out ".payload.commands[0].states.online" true
test_out ".payload.commands[0].states.currentCookingMode" '"COOK"'
test_out ".payload.commands[0].states.currentFoodPreset" '"white_rice"'
test_out ".payload.commands[0].states.currentFoodQuantity" 2
test_out ".payload.commands[0].states.currentFoodUnit" '"CUPS"'

execute_error $NODE_ID Cook true 'NO MODE'
test_out ".payload.commands[0].errorCode" '"transientError"'

execute_error $NODE_ID Cook_preset true COOK no_preset 2 "CUPS"
test_out ".payload.commands[0].errorCode" '"unknownFoodPreset"'

execute_error $NODE_ID Cook_preset true 'COOK' 'white_rice' 2 "NO_UNIT"
test_out ".payload.commands[0].errorCode" '"transientError"'

# Dispense 
echo
echo Dispense
execute $NODE_ID Dispense 1 "CUPS" 'water'
test_out ".payload.commands[0].status" '"SUCCESS"'

execute_error $NODE_ID Dispense 1 'no_unit' "water"
test_out ".payload.commands[0].errorCode" '"transientError"'

execute_error $NODE_ID Dispense 1 'CUPS' 'no_item'
test_out ".payload.commands[0].errorCode" '"transientError"'

execute_error $NODE_ID Dispense 1 'no_unit' 'no_item'
test_out ".payload.commands[0].errorCode" '"transientError"'

execute $NODE_ID Dispense_preset "cat_bowl"
test_out ".payload.commands[0].status" '"SUCCESS"'

execute_error $NODE_ID Dispense_preset "no_preset"
test_out ".payload.commands[0].errorCode" '"transientError"'

execute $NODE_ID Dispense_none 
test_out ".payload.commands[0].status" '"SUCCESS"'

# Dock
echo
echo Dock
execute $NODE_ID Dock 
test_out ".payload.commands[0].states.online" true
test_out ".payload.commands[0].states.isDocked" true
test_payload ".isDocked" true

execute $NODE_ID Dock 
test_out ".payload.commands[0].states.online" true
test_out ".payload.commands[0].states.isDocked" true
test_payload ".isDocked" true

# EnergyStorage
echo
echo EnergyStorage The logic should be outside
execute $NODE_ID Charge true 

execute $NODE_ID Charge false 

# FanSpeed 
echo
echo FanSpeed
execute_error $NODE_ID SetFanSpeed "unkwnown_speed"

execute $NODE_ID SetFanSpeed "speed_high"
test_payload ".currentFanSpeedSetting" '"speed_high"'

execute $NODE_ID SetFanSpeed_percent 50 
test_payload ".currentFanSpeedPercent" 50
test_payload ".currentFanSpeedSetting" '"speed_high"'

execute $NODE_ID SetFanSpeedRelative -2 
test_payload ".currentFanSpeedPercent" 48
test_payload ".currentFanSpeedSetting" '"speed_high"'

execute $NODE_ID SetFanSpeedRelative_percent 15 
test_payload ".currentFanSpeedPercent" 55
test_payload ".currentFanSpeedSetting" '"speed_high"'

execute $NODE_ID Reverse 

# Fill
echo
echo Fill
execute $NODE_ID Fill true 
test_payload ".params.fill" true

execute $NODE_ID Fill_level true "half_level" 
test_payload ".params.fill" true
test_payload ".params.fillLevel" '"half_level"'

execute $NODE_ID Fill_level true "full_level" 
test_payload ".params.fillLevel" '"full_level"'

execute $NODE_ID Fill_percent true 30 
test_payload ".params.fillPercent" 30

# HumiditySetting 
echo
echo HumiditySetting 
execute $NODE_ID SetHumidity 30 
test_payload ".humiditySetpointPercent" 30

execute $NODE_ID HumidityRelative -6 
test_payload ".humiditySetpointPercent" 24

execute $NODE_ID HumidityRelative_percent 5 
test_payload ".humiditySetpointPercent" 25

# InputSelector 
echo
echo InputSelector 
execute_error $NODE_ID SetInput "usb_1" 
test_out ".payload.commands[0].errorCode" '"unsupportedInput"'

execute $NODE_ID SetInput "hdmi_2_input" 
test_payload ".currentInput" '"hdmi_2_input"'

execute $NODE_ID NextInput 
test_payload ".currentInput" '"hdmi_3_input"'

execute $NODE_ID PreviousInput 
test_payload ".currentInput" '"hdmi_2_input"'

# LightEffects 
echo
echo LightEffects
execute $NODE_ID ColorLoop 3600 
test_payload ".activeLightEffect" '"colorLoop"'

execute $NODE_ID Sleep 3601 
test_payload ".activeLightEffect" '"sleep"'

execute $NODE_ID StopEffect 
test_payload ".activeLightEffect" '""'

execute $NODE_ID Wake 3602 
test_payload ".activeLightEffect" '"wake"'

# Locator
echo
echo Locator
execute $NODE_ID Locate true 

execute $NODE_ID Locate_lang true "it"

# LockUnlock 
echo
echo LockUnlock 
execute $NODE_ID LockUnlock true "125"
test_payload ".isLocked" false

execute $NODE_ID LockUnlock false "125"
test_payload ".isLocked" false

# Modes 
echo
echo Modes 
execute $NODE_ID SetModes_all '"load_mode":"medium_load","temp_mode":"hot_temp"'
test_payload ".currentModeSettings.load_mode" '"medium_load"'
test_payload ".currentModeSettings.temp_mode" '"hot_temp"'

execute $NODE_ID SetModes "load_mode" "small_load"
test_payload ".currentModeSettings.load_mode" '"small_load"'
test_payload ".currentModeSettings.temp_mode" '"hot_temp"'

execute $NODE_ID SetModes "load_mode" "no_mode_value"
test_payload ".currentModeSettings.load_mode" '"small_load"'
test_payload ".currentModeSettings.temp_mode" '"hot_temp"'

execute $NODE_ID SetModes "no_mode" "no_mode_value"
test_payload ".currentModeSettings.load_mode" '"small_load"'
test_payload ".currentModeSettings.temp_mode" '"hot_temp"'

execute $NODE_ID SetModes_all '"load_mode":"large_load","temp_mode":"cold_temp"'
test_payload ".currentModeSettings.load_mode" '"large_load"'
test_payload ".currentModeSettings.temp_mode" '"cold_temp"'

execute $NODE_ID SetModes_all '"load_mode":"large_load","temp_mode":"cold_temp"'
test_payload ".currentModeSettings.load_mode" '"large_load"'
test_payload ".currentModeSettings.temp_mode" '"cold_temp"'

# NetworkControl
echo
echo NetworkControl 
execute $NODE_ID EnableDisableGuestNetwork true
test_out ".payload.commands[0].states.guestNetworkEnabled" true

execute $NODE_ID EnableDisableGuestNetwork false
test_out ".payload.commands[0].states.guestNetworkEnabled" false

execute $NODE_ID EnableDisableNetworkProfile Kids true

execute_error $NODE_ID EnableDisableNetworkProfile "NO PROFILE" true
test_out ".payload.commands[0].errorCode" '"networkProfileNotRecognized"'

execute $NODE_ID EnableDisableNetworkProfile Kids false

execute_no_payload $NODE_ID GetGuestNetworkPassword
test_out ".payload.commands[0].states.guestNetworkPassword" '"1234567890"'

execute $NODE_ID TestNetworkSpeed true true

# OnOff
echo
echo OnOff
execute $NODE_ID OnOff false
test_out ".payload.commands[0].states.on" 'false'
test_out ".payload.commands[0].states.online" true

execute $NODE_ID OnOff true
test_out ".payload.commands[0].states.on" true
test_out ".payload.commands[0].states.online" true

# OpenClose
echo
echo OpenClose 
execute $NODE_ID OpenClose 70

execute $NODE_ID OpenClose_dir 50 "UP"
test_payload ".openState[0].openPercent" 50

execute $NODE_ID OpenClose_dir 70 "DOWN"
test_payload ".openState[1].openPercent" 70

execute $NODE_ID OpenClose_dir 61 "LEFT"
test_payload ".openState[2].openPercent" 61

execute $NODE_ID OpenClose_dir 60 "LEFT"
test_payload ".openState[2].openPercent" 60

execute $NODE_ID OpenClose_dir 45 "RIGHT"
test_payload ".openState[3].openPercent" 45

execute $NODE_ID OpenClose_dir 20 "IN"
test_payload ".openState[4].openPercent" 20

execute $NODE_ID OpenClose_dir 10 "OUT"
test_payload ".openState[5].openPercent" 10

execute $NODE_ID OpenClose_dir 70 "NO_DIR"
test_out ".payload.commands[0].status" '"SUCCESS"' # ERROR??
test_payload ".openState[0].openPercent" 50
test_payload ".openState[1].openPercent" 70
test_payload ".openState[2].openPercent" 60
test_payload ".openState[3].openPercent" 45
test_payload ".openState[4].openPercent" 20
test_payload ".openState[5].openPercent" 10

execute $NODE_ID OpenCloseRelative 5

execute $NODE_ID OpenCloseRelative_dir -1 "UP"
test_payload ".openState[0].openPercent" 49

execute $NODE_ID OpenCloseRelative_dir 3 "DOWN"
test_payload ".openState[1].openPercent" 73

execute $NODE_ID OpenCloseRelative_dir -5 "LEFT"
test_payload ".openState[2].openPercent" 55

execute $NODE_ID OpenCloseRelative_dir 11 "RIGHT"
test_payload ".openState[3].openPercent" 56

execute $NODE_ID OpenCloseRelative_dir -7 "IN"
test_payload ".openState[4].openPercent" 13

execute $NODE_ID OpenCloseRelative_dir 17 "OUT"
test_payload ".openState[5].openPercent" 27

execute $NODE_ID OpenCloseRelative_dir -9 "NO_DIR"
test_out ".payload.commands[0].status" '"SUCCESS"' # ERROR??
test_payload ".openState[0].openPercent" 49
test_payload ".openState[1].openPercent" 73
test_payload ".openState[2].openPercent" 55
test_payload ".openState[3].openPercent" 56
test_payload ".openState[4].openPercent" 13
test_payload ".openState[5].openPercent" 27

# Reboot 
echo
echo Reboot 
execute $NODE_ID Reboot

# Rotation 
echo
echo Rotation 
execute $NODE_ID RotateAbsolute 10
test_payload ".rotationPercent" 10

execute $NODE_ID RotateAbsolute_deg 30
test_payload ".rotationDegrees" 30
test_payload ".rotationPercent" 10

# Scene
echo
echo Scene
execute $NODE_ID ActivateScene true
test_payload ".params.deactivate" true

execute $NODE_ID ActivateScene false
test_payload ".params.deactivate" false

# SoftwareUpdate 
echo
echo SoftwareUpdate 
execute $NODE_ID SoftwareUpdate

# StartStop 
echo
echo StartStop 
execute $NODE_ID StartStop false
test_payload ".isRunning" false

execute $NODE_ID StartStop_zone true "Cucina"
test_payload ".isRunning" true
test_payload ".isPaused" false
test_payload ".activeZones[0]" '"Cucina"'
test_payload ".activeZones[1]" null

execute $NODE_ID StartStop false
test_payload ".isRunning" false
test_payload ".isPaused" false
test_payload ".activeZones[0]" '"Cucina"'
test_payload ".activeZones[1]" null

execute $NODE_ID StartStop_zone true "None"
test_payload ".isRunning" true
test_payload ".isPaused" false
test_payload ".activeZones" '[]'

execute $NODE_ID StartStop_zones true '"Cucina","Salotto"'
test_payload ".isRunning" true
test_payload ".isPaused" false
test_payload ".activeZones[0]" '"Cucina"'
test_payload ".activeZones[1]" '"Salotto"'
test_payload ".activeZones[2]" null

execute $NODE_ID PauseUnpause true
test_payload ".isRunning" true
test_payload ".isPaused" true
test_payload ".activeZones[0]" '"Cucina"'
test_payload ".activeZones[1]" '"Salotto"'
test_payload ".activeZones[2]" null

execute $NODE_ID PauseUnpause false
test_payload ".isRunning" true
test_payload ".isPaused" false
test_payload ".activeZones[0]" '"Cucina"'
test_payload ".activeZones[1]" '"Salotto"'
test_payload ".activeZones[2]" null

# TemperatureControl 
echo
echo TemperatureControl 
execute $NODE_ID SetTemperature 28.5
test_payload ".temperatureSetpointCelsius" 28.5

execute $NODE_ID SetTemperature 16.5
test_payload ".temperatureSetpointCelsius" 16.5

# TemperatureSetting 
echo
echo TemperatureSetting 
execute $NODE_ID ThermostatTemperatureSetpoint 17.67
test_payload ".thermostatTemperatureSetpoint" 17.67
test_payload ".thermostatTemperatureSetpointHigh" null
test_payload ".thermostatTemperatureSetpointLow" null

execute $NODE_ID ThermostatTemperatureSetpoint 17.55
test_payload ".thermostatTemperatureSetpoint" 17.55
test_payload ".thermostatTemperatureSetpointHigh" null
test_payload ".thermostatTemperatureSetpointLow" null

execute $NODE_ID ThermostatTemperatureSetRange 26.2 22.8
test_payload ".thermostatTemperatureSetpoint" null
test_payload ".thermostatTemperatureSetpointHigh" 26.2
test_payload ".thermostatTemperatureSetpointLow" 22.8

execute $NODE_ID ThermostatTemperatureSetRange 27.2 21.8
test_payload ".thermostatTemperatureSetpoint" null
test_payload ".thermostatTemperatureSetpointHigh" 27.2
test_payload ".thermostatTemperatureSetpointLow" 21.8

execute $NODE_ID ThermostatTemperatureSetpoint 27.88
test_payload ".thermostatTemperatureSetpoint" 27.88
test_payload ".thermostatTemperatureSetpointHigh" null
test_payload ".thermostatTemperatureSetpointLow" null

execute $NODE_ID ThermostatTemperatureSetRange 16.2 12.8
test_payload ".thermostatTemperatureSetpoint" null
test_payload ".thermostatTemperatureSetpointHigh" 16.2
test_payload ".thermostatTemperatureSetpointLow" 12.8

execute $NODE_ID ThermostatSetMode "heatcool"
test_payload ".thermostatMode" '"heatcool"'

execute $NODE_ID ThermostatSetMode "eco"
test_payload ".thermostatMode" '"eco"'

execute $NODE_ID ThermostatTemperatureSetpoint 15.67
test_payload ".thermostatTemperatureSetpoint" 15.67
test_payload ".thermostatTemperatureSetpointHigh" null
test_payload ".thermostatTemperatureSetpointLow" null

execute $NODE_ID TemperatureRelative 20
# test_payload ".thermostatTemperatureSetpoint" 35.67

execute $NODE_ID TemperatureRelative 5
# test_payload ".thermostatTemperatureSetpoint" 40.67

execute $NODE_ID TemperatureRelative_deg 10
# test_payload ".thermostatTemperatureSetpoint" 50.67

# Timer
echo
echo Timer
execute_error $NODE_ID TimerPause
test_out ".payload.commands[0].errorCode" '"noTimerExists"'

execute_error $NODE_ID TimerResume
test_out ".payload.commands[0].errorCode" '"noTimerExists"'

execute_error $NODE_ID TimerAdjust -5
test_out ".payload.commands[0].errorCode" '"noTimerExists"'

execute_error $NODE_ID TimerCancel
test_out ".payload.commands[0].errorCode" '"noTimerExists"'

execute $NODE_ID TimerStart 1000
test_payload ".timerRemainingSec" 1000
test_payload ".timerPaused" false

execute $NODE_ID TimerAdjust -5
test_payload ".timerPaused" false

execute $NODE_ID TimerPause
test_payload ".timerPaused" true

execute $NODE_ID TimerResume
test_payload ".timerPaused" false

execute $NODE_ID TimerAdjust -5
test_payload ".timerPaused" false

execute $NODE_ID TimerCancel

# Toggle
echo
echo Toggle
execute $NODE_ID SetToggles quiet_toggle true
test_payload ".currentToggleSettings.quiet_toggle" true

execute $NODE_ID SetToggles quiet_toggle false
test_payload ".currentToggleSettings.quiet_toggle" false

execute $NODE_ID SetToggles_all '"extra_bass_toggle": true,"energy_saving_toggle": false'
test_payload ".currentToggleSettings.extra_bass_toggle" true
test_payload ".currentToggleSettings.energy_saving_toggle" false

# TransportControl 
echo
echo TransportControl 
execute $NODE_ID mediaStop

execute $NODE_ID mediaNext

execute $NODE_ID mediaPrevious

execute $NODE_ID mediaResume

execute $NODE_ID mediaSeekRelative 1000

execute $NODE_ID mediaSeekToPosition 30000

execute $NODE_ID mediaRepeatMode true

execute $NODE_ID mediaRepeatMode_2 true true

execute $NODE_ID mediaShuffle

execute $NODE_ID mediaClosedCaptioningOn en

execute $NODE_ID mediaClosedCaptioningOn_2 it "en-US"

execute $NODE_ID mediaClosedCaptioningOff

# Volume
echo
echo Volume
execute $NODE_ID mute true
test_payload ".isMuted" true

execute $NODE_ID setVolume 8
test_payload ".currentVolume" 8
test_payload ".isMuted" false

execute $NODE_ID volumeRelative -3
test_payload ".currentVolume" 5
test_payload ".isMuted" false

echo
echo OK
