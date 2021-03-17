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

test_json() {
    STR=$1
    JPATH=$2
    VAL=$3
    V=$(echo $STR | jq $JPATH)
    if [ "$V" != "$VAL" ] ; then
        echo "Response: $STR"
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

execute() {
    ./execute "$@"
}

NODE_ID="98599ced.c9cc6"

./refresh_token

dos2unix cmd/* 2>/dev/null

# AppSelector 
echo AppSelector
OUT=$(execute $NODE_ID appInstall mia_application)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID appInstall_name mia_application)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID appInstall youtube_application)
test_json "$OUT" ".payload.commands[0].status" '"ERROR"'
test_json "$OUT" ".payload.commands[0].errorCode" '"alreadyInstalledApp"'

OUT=$(execute $NODE_ID appInstall_name YouTube)
test_json "$OUT" ".payload.commands[0].status" '"ERROR"'
test_json "$OUT" ".payload.commands[0].errorCode" '"alreadyInstalledApp"'

OUT=$(execute $NODE_ID appSearch youtube_application)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID appSearch_name YouTube)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID appSearch no_installed_app)
test_json "$OUT" ".payload.commands[0].status" '"ERROR"'
test_json "$OUT" ".payload.commands[0].errorCode" '"noAvailableApp"'

OUT=$(execute $NODE_ID appSearch_name no_installed_app1)
test_json "$OUT" ".payload.commands[0].status" '"ERROR"'
test_json "$OUT" ".payload.commands[0].errorCode" '"noAvailableApp"'

OUT=$(execute $NODE_ID appSelect youtube_application)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID appSelect_name YouTube)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID appSelect no_installed_app2)
test_json "$OUT" ".payload.commands[0].status" '"ERROR"'
test_json "$OUT" ".payload.commands[0].errorCode" '"noAvailableApp"'

OUT=$(execute $NODE_ID appSelect_name no_installed_app3)
test_json "$OUT" ".payload.commands[0].status" '"ERROR"'
test_json "$OUT" ".payload.commands[0].errorCode" '"noAvailableApp"'

# ArmDisarm
echo
echo ArmDisarm
OUT=$(execute $NODE_ID ArmDisarm true 123)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'
# test_json "$OUT" ".payload.commands[0].states.online" 'true'

OUT=$(execute $NODE_ID ArmDisarm_level true 123 level3)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'
# test_json "$OUT" ".payload.commands[0].states.online" 'true'

OUT=$(execute $NODE_ID ArmDisarm_cancel true)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'
# test_json "$OUT" ".payload.commands[0].states.online" 'true'

# Brightness
echo
echo Brightness

OUT=$(execute $NODE_ID BrightnessAbsolute 128)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'
# test_json "$OUT" ".payload.commands[0].states.online" 'true'

OUT=$(execute $NODE_ID BrightnessRelative 4)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'
test_json "$OUT" ".payload.commands[0].states.online" 'true'

# CameraStream
echo
echo CameraStream
OUT=$(execute $NODE_ID GetCameraStream true '"progressive_mp4"')
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'
test_json "$OUT" ".payload.commands[0].states.online" 'true'

test_json "$OUT" ".payload.commands[0].states.cameraStreamAccessUrl" '"http://PROGRESSIVE_MP4"'
test_json "$OUT" ".payload.commands[0].states.cameraStreamProtocol" '"progressive_mp4"'
test_json "$OUT" ".payload.commands[0].states.cameraStreamAuthToken" '"Auth Token"'
test_json "$OUT" ".payload.commands[0].states.cameraStreamReceiverAppId" '"PROGRESSIVE_MP4_ID"'

# Channel 
echo
echo Channel 
OUT=$(execute $NODE_ID selectChannel 'NO channel' 'NO channel name')
test_json "$OUT" ".payload.commands[0].status" '"ERROR"'
test_json "$OUT" ".payload.commands[0].errorCode" '"noAvailableChannel"'

OUT=$(execute $NODE_ID selectChannel 'rai1' 'Rai 1')
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'
test_json "$OUT" ".payload.commands[0].states.online" 'true'

OUT=$(execute $NODE_ID selectChannel_number 'No channel number')
test_json "$OUT" ".payload.commands[0].status" '"ERROR"'
test_json "$OUT" ".payload.commands[0].errorCode" '"noAvailableChannel"'

OUT=$(execute $NODE_ID selectChannel_number '501')
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'
test_json "$OUT" ".payload.commands[0].states.online" 'true'

# ColorSetting 
echo
echo ColorSetting 
OUT=$(execute $NODE_ID ColorAbsolute 'Bianco Caldo' 3000)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'
# test_json "$OUT" ".payload.commands[0].states.online" 'true'

OUT=$(execute $NODE_ID ColorAbsolute_rgb 'Magenta' 16711935)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'
# test_json "$OUT" ".payload.commands[0].states.online" 'true'

OUT=$(execute $NODE_ID ColorAbsolute_hsv 'Magenta' 300 1 1)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'
# test_json "$OUT" ".payload.commands[0].states.online" 'true'

# Cook
echo
echo Cook
OUT=$(execute $NODE_ID Cook true 'BAKE')
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'
# test_json "$OUT" ".payload.commands[0].states.online" 'true'

OUT=$(execute $NODE_ID Cook_preset true 'COOK' 'white_rice' 2 "CUPS")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'
# test_json "$OUT" ".payload.commands[0].states.online" 'true'

OUT=$(execute $NODE_ID Cook true 'NO MODE')
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"' # TODO ERROR

OUT=$(execute $NODE_ID Cook_preset true 'COOK' 'no_preset' 2 "CUPS")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"' # TODO ERROR unknownFoodPreset 
# test_json "$OUT" ".payload.commands[0].states.online" 'true'

OUT=$(execute $NODE_ID Cook_preset true 'COOK' 'white_rice' 2 "NO_UNIT")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"' # TODO ERROR unknownFoodPreset?

# Dispense 
echo
echo Dispense 
OUT=$(execute $NODE_ID Dispense 1 "CUP" 'water')
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"' # TODO ERROR unknownFoodPreset?

OUT=$(execute $NODE_ID Dispense 1 'no_unit' "water")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"' # TODO ERROR unknownFoodPreset 
# test_json "$OUT" ".payload.commands[0].states.online" 'true'

OUT=$(execute $NODE_ID Dispense 1 'CUP' 'no_item')
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"' # TODO ERROR unknownFoodPreset?

OUT=$(execute $NODE_ID Dispense_preset "cat_bowl")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID Dispense_preset "no_preset")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"' # TODO ERROR unknownFoodPreset?

OUT=$(execute $NODE_ID Dispense_none )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# Dock
echo
echo Dock
OUT=$(execute $NODE_ID Dock )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# EnergyStorage 
echo
echo EnergyStorage 
OUT=$(execute $NODE_ID Charge true )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID Charge false )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# FanSpeed 
echo
echo FanSpeed 
OUT=$(execute $NODE_ID SetFanSpeed "speed_high" )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID SetFanSpeed_percent 50 )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID SetFanSpeedRelative -2 )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID SetFanSpeedRelative_percent 15 )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID Reverse )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# Fill 
echo
echo Fill 
OUT=$(execute $NODE_ID Fill true )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID Fill_level true "half_level" )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID Fill_level true "full_level" )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID Fill_percent true 30 )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# HumiditySetting 
echo
echo HumiditySetting 
OUT=$(execute $NODE_ID SetHumidity 30 )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID HumidityRelative -6 )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID HumidityRelative_percent 30 )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# InputSelector 
echo
echo InputSelector 
OUT=$(execute $NODE_ID SetInput "usb_1" )
test_json "$OUT" ".payload.commands[0].status" '"ERROR"'
test_json "$OUT" ".payload.commands[0].errorCode" '"unsupportedInput"'

OUT=$(execute $NODE_ID SetInput "hdmi_2_input" )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID NextInput )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID PreviousInput )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# LightEffects 
echo
echo LightEffects
OUT=$(execute $NODE_ID ColorLoop 3600 )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID Sleep 3601 )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID StopEffect )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID Wake 3602 )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# Locator
echo
echo Locator
OUT=$(execute $NODE_ID Locate true )
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID Locate_lang true "it")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# LockUnlock 
echo
echo LockUnlock 
OUT=$(execute $NODE_ID LockUnlock true "125")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# Modes 
echo
echo Modes 
OUT=$(execute $NODE_ID SetModes "load_mode" "small_load")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID SetModes "load_mode" "no_mode_value")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID SetModes "no_mode" "no_mode_value")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID SetModes_all '"load_mode":"small_load","temp_mode":"hot_temp"')
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# NetworkControl 
echo
echo NetworkControl 
OUT=$(execute $NODE_ID EnableDisableGuestNetwork true)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID EnableDisableNetworkProfile "kids" true)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID GetGuestNetworkPassword)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'
# test_json "$OUT" ".payload.commands[0].guestNetworkPassword" '"PASSWORD"' TODO

OUT=$(execute $NODE_ID TestNetworkSpeed true true)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# OnOff
echo
echo OnOff
OUT=$(execute $NODE_ID OnOff false)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'
test_json "$OUT" ".payload.commands[0].states.on" 'false'
test_json "$OUT" ".payload.commands[0].states.online" 'true'

OUT=$(execute $NODE_ID OnOff true)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'
test_json "$OUT" ".payload.commands[0].states.on" 'true'
test_json "$OUT" ".payload.commands[0].states.online" 'true'

# OpenClose 
echo
echo OpenClose 
OUT=$(execute $NODE_ID OpenClose 70)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID OpenClose_dir 70 "DOWN")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID OpenClose_dir 70 "NO_DIR")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"' # TODO ERROR

OUT=$(execute $NODE_ID OpenCloseRelative 5)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID OpenCloseRelative_dir -7 "UP")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID OpenCloseRelative_dir -9 "NO_DIR")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"' # TODO ERROR

# Reboot 
echo
echo Reboot 
OUT=$(execute $NODE_ID Reboot)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# Rotation 
echo
echo Rotation 
OUT=$(execute $NODE_ID RotateAbsolute 10)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID RotateAbsolute_deg 30)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# Scene
echo
echo Scene
OUT=$(execute $NODE_ID ActivateScene true)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID ActivateScene true)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# SoftwareUpdate 
echo
echo SoftwareUpdate 
OUT=$(execute $NODE_ID SoftwareUpdate)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# StartStop 
echo
echo StartStop 
OUT=$(execute $NODE_ID StartStop false)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID StartStop_zone true "Cucina")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID StartStop_zones true '"Cucina","Salotto"')
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID PauseUnpause true)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID PauseUnpause false)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# TemperatureControl 
echo
echo TemperatureControl 
OUT=$(execute $NODE_ID SetTemperature 176.67)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# TemperatureSetting 
echo
echo TemperatureSetting 
OUT=$(execute $NODE_ID ThermostatTemperatureSetpoint 176.67)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID ThermostatTemperatureSetRange 26 22)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID ThermostatSetMode "heatcool")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID TemperatureRelative "20")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID TemperatureRelative "20")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID TemperatureRelative_deg "10")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# Timer
echo
echo Timer
OUT=$(execute $NODE_ID TimerStart "10")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID TimerAdjust "-5")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID TimerPause)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID TimerResume)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID TimerCancel)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# Toggle
echo
echo Toggle
OUT=$(execute $NODE_ID SetToggles energysaving_toggle true)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID SetToggles_all '"energysaving_toggle": true,"boost_toggle": false')
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# TransportControl 
echo
echo TransportControl 
OUT=$(execute $NODE_ID mediaStop)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID mediaNext)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID mediaPrevious)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID mediaResume)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID mediaSeekRelative 1000)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID mediaSeekToPosition 30000)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID mediaRepeatMode true)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID mediaRepeatMode_2 true true)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID mediaShuffle)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID mediaClosedCaptioningOn en)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID mediaClosedCaptioningOn_2 it "en-US")
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID mediaClosedCaptioningOff)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

# Volume
echo
echo Volume
OUT=$(execute $NODE_ID mute true)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID setVolume 8)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

OUT=$(execute $NODE_ID volumeRelative -3)
test_json "$OUT" ".payload.commands[0].status" '"SUCCESS"'

echo
echo OK
