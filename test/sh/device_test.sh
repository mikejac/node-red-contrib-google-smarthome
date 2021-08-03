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
# node-red -u $HOME/nrsh | awk '/HttpActions:reportState..: postData = / { pd=substr($0, 39); print pd; print pd > "reportState.json"; close("reportState.json"); }'
# ./device_test.sh "a5782b1b.e120f8" "bab53c06.fc9c3"
#

. ./data
. ./code

NODE_ID=$1 || "a5782b1b.e120f8"
NODE_ID1=$2 || "bab53c06.fc9c3"
PAYLOAD_FILE="$HOME/payload.json"
REPORT_STATE_FILE="$HOME/reportState.json"
OUT_FILE="$HOME/out.json"
PAYLOAD_URL=$(dirname $BASE_URL)/payload
TEST_NUM=0

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
        echo "${TYPE}: $STR"
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
    # if [ "$1" != ".command" ] ; then
    Q=$1
    if [[ "$Q" != ".command" && $Q != .params.* ]] ; then
        test_json ReportState "$REPORT_STATE" ".payload.devices.states.\"$LAST_NODE_ID\"$1" "$2"
    fi
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
    echo
    ((TEST_NUM=TEST_NUM+1))
    echo "# $TEST_NUM"
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
    mv "$PAYLOAD_FILE" "$PAYLOAD_FILE.old" 
    echo "{}" > "$PAYLOAD_FILE" 
    # echo "{}" > "$REPORT_STATE_FILE" 
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
    REPORT_STATE=$(cat "$REPORT_STATE_FILE")
    LAST_NODE_ID="$NODE_ID"
}

execute() {
    CMD_EXEC="$@"
    echo
    ((TEST_NUM=TEST_NUM+1))
    echo "# $TEST_NUM"
    CMD_=$2
    CMD="${CMD_%%_*}"
    echo ./execute "$@"
    mv "$PAYLOAD_FILE" "$PAYLOAD_FILE.old" 
    echo "{}" > "$PAYLOAD_FILE" 
    # echo "{}" > "$REPORT_STATE_FILE" 
    ./execute "$@" > "$OUT_FILE"
    OUT=$(cat  "$OUT_FILE")
    #sleep 1
    PAYLOAD=$(cat "$PAYLOAD_FILE")
    REPORT_STATE=$(cat "$REPORT_STATE_FILE")
    LAST_NODE_ID="$1"
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

execute_payload topic '{"online":false,"isArmed":false,"currentArmLevel":"","color":{"temperatureK":9000},"currentCookingMode":"NONE","dispenseItems":[{"itemName":"water","amountRemaining":{"amount":10,"unit":"NO_UNITS"},"amountLastDispensed":{"amount":11,"unit":"NO_UNITS"},"isCurrentlyDispensing":false},{"itemName":"cat_bowl","amountRemaining":{"amount":12,"unit":"NO_UNITS"},"amountLastDispensed":{"amount":13,"unit":"NO_UNITS"},"isCurrentlyDispensing":false},{"itemName":"glass_1","amountRemaining":{"amount":14,"unit":"NO_UNITS"},"amountLastDispensed":{"amount":15,"unit":"NO_UNITS"},"isCurrentlyDispensing":false}],"descriptiveCapacityRemaining":"FULL","capacityRemaining":[],"capacityUntilFull":[],"isPluggedIn":false,"currentFanSpeedPercent":0,"isFilled":false,"currentFillLevel":"","currentInput":"","activeLightEffect":"","currentModeSettings":{"load_mode":"","temp_mode":""},"openState":[{"openPercent":0,"openDirection":"UP"},{"openPercent":0,"openDirection":"DOWN"},{"openPercent":0,"openDirection":"LEFT"},{"openPercent":0,"openDirection":"RIGHT"},{"openPercent":0,"openDirection":"IN"},{"openPercent":0,"openDirection":"OUT"}],"currentRunCycle":[{"currentCycle":"unknown","lang":"en"}],"currentTotalRemainingTime":0,"currentCycleRemainingTime":0,"currentSensorStateData":[{"name":"AirQuality","currentSensorState":"unknown","rawValue":0},{"name":"CarbonMonoxideLevel","currentSensorState":"unknown","rawValue":0},{"name":"SmokeLevel","currentSensorState":"unknown","rawValue":0},{"name":"FilterCleanliness","currentSensorState":"unknown"},{"name":"WaterLeak","currentSensorState":"unknown"},{"name":"RainDetection","currentSensorState":"unknown"},{"name":"FilterLifeTime","currentSensorState":"unknown","rawValue":0},{"name":"PreFilterLifeTime","rawValue":0},{"name":"HEPAFilterLifeTime","rawValue":0},{"name":"Max2FilterLifeTime","rawValue":0},{"name":"CarbonDioxideLevel","rawValue":0},{"name":"PM2.5","rawValue":0},{"name":"PM10","rawValue":0},{"name":"VolatileOrganicCompounds","rawValue":0}],"lastSoftwareUpdateUnixTimestampSec":0,"isRunning":false,"currentStatusReport":[],"temperatureSetpointCelsius":0,"thermostatMode":"off","thermostatTemperatureAmbient":1,"thermostatTemperatureSetpoint":1,"timerRemainingSec":-1,"currentToggleSettings":{"quiet_toggle":false,"extra_bass_toggle":false,"energy_saving_toggle":false},"currentVolume":40,"on":true,"isDocked":false}'

execute_payload topic '{"online":true,"isArmed":false,"currentArmLevel":"","color":{"temperatureK":9000},"currentCookingMode":"NONE","dispenseItems":[{"itemName":"water","amountRemaining":{"amount":10,"unit":"NO_UNITS"},"amountLastDispensed":{"amount":11,"unit":"NO_UNITS"},"isCurrentlyDispensing":false},{"itemName":"cat_bowl","amountRemaining":{"amount":12,"unit":"NO_UNITS"},"amountLastDispensed":{"amount":13,"unit":"NO_UNITS"},"isCurrentlyDispensing":false},{"itemName":"glass_1","amountRemaining":{"amount":14,"unit":"NO_UNITS"},"amountLastDispensed":{"amount":15,"unit":"NO_UNITS"},"isCurrentlyDispensing":false}],"descriptiveCapacityRemaining":"FULL","capacityRemaining":[],"capacityUntilFull":[],"isPluggedIn":false,"currentFanSpeedPercent":0,"isFilled":false,"currentFillLevel":"","currentInput":"","activeLightEffect":"","currentModeSettings":{"load_mode":"","temp_mode":""},"openState":[{"openPercent":0,"openDirection":"UP"},{"openPercent":0,"openDirection":"DOWN"},{"openPercent":0,"openDirection":"LEFT"},{"openPercent":0,"openDirection":"RIGHT"},{"openPercent":0,"openDirection":"IN"},{"openPercent":0,"openDirection":"OUT"}],"currentRunCycle":[{"currentCycle":"unknown","lang":"en"}],"currentTotalRemainingTime":0,"currentCycleRemainingTime":0,"currentSensorStateData":[{"name":"AirQuality","currentSensorState":"unknown","rawValue":0},{"name":"CarbonMonoxideLevel","currentSensorState":"unknown","rawValue":0},{"name":"SmokeLevel","currentSensorState":"unknown","rawValue":0},{"name":"FilterCleanliness","currentSensorState":"unknown"},{"name":"WaterLeak","currentSensorState":"unknown"},{"name":"RainDetection","currentSensorState":"unknown"},{"name":"FilterLifeTime","currentSensorState":"unknown","rawValue":0},{"name":"PreFilterLifeTime","rawValue":0},{"name":"HEPAFilterLifeTime","rawValue":0},{"name":"Max2FilterLifeTime","rawValue":0},{"name":"CarbonDioxideLevel","rawValue":0},{"name":"PM2.5","rawValue":0},{"name":"PM10","rawValue":0},{"name":"VolatileOrganicCompounds","rawValue":0}],"lastSoftwareUpdateUnixTimestampSec":0,"isRunning":false,"currentStatusReport":[],"temperatureSetpointCelsius":0,"thermostatMode":"off","thermostatTemperatureAmbient":1,"thermostatTemperatureSetpoint":1,"timerRemainingSec":-1,"currentToggleSettings":{"quiet_toggle":false,"extra_bass_toggle":false,"energy_saving_toggle":false},"currentVolume":40,"on":true,"isDocked":false}'
test_payload .online true
test_payload .isArmed false
test_payload .currentArmLevel '""'
test_payload .color.temperatureK 9000
test_payload .currentCookingMode '"NONE"'
test_payload .dispenseItems[0].itemName '"water"'
test_payload .dispenseItems[0].amountRemaining.amount 10
test_payload .dispenseItems[0].amountRemaining.unit '"NO_UNITS"'
test_payload .dispenseItems[0].amountLastDispensed.amount 11
test_payload .dispenseItems[0].amountLastDispensed.unit '"NO_UNITS"'
test_payload .dispenseItems[0].isCurrentlyDispensing false
test_payload .dispenseItems[1].itemName '"cat_bowl"'
test_payload .dispenseItems[1].amountRemaining.amount 12
test_payload .dispenseItems[1].amountRemaining.unit '"NO_UNITS"'
test_payload .dispenseItems[1].amountLastDispensed.amount 13
test_payload .dispenseItems[1].amountLastDispensed.unit '"NO_UNITS"'
test_payload .dispenseItems[1].isCurrentlyDispensing false
test_payload .dispenseItems[2].itemName '"glass_1"'
test_payload .dispenseItems[2].amountRemaining.amount 14
test_payload .dispenseItems[2].amountRemaining.unit '"NO_UNITS"'
test_payload .dispenseItems[2].amountLastDispensed.amount 15
test_payload .dispenseItems[2].amountLastDispensed.unit '"NO_UNITS"'
test_payload .dispenseItems[2].isCurrentlyDispensing false
test_payload .descriptiveCapacityRemaining '"FULL"'
test_payload .capacityRemaining '[]'
test_payload .capacityUntilFull '[]'
test_payload .isPluggedIn false
test_payload .currentFanSpeedPercent 0
test_payload .isFilled false
test_payload .currentFillLevel '""'
test_payload .currentInput '""'
test_payload .activeLightEffect '""'
test_payload .currentModeSettings.load_mode '""'
test_payload .currentModeSettings.temp_mode '""'
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 0
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 0
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 0
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 0
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 0
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 0
test_payload .currentRunCycle[0].currentCycle '"unknown"'
test_payload .currentRunCycle[0].lang '"en"'
test_payload .currentTotalRemainingTime 0
test_payload .currentCycleRemainingTime 0
test_payload .currentSensorStateData[0].name '"AirQuality"'
test_payload .currentSensorStateData[0].currentSensorState '"unknown"'
test_payload .currentSensorStateData[0].rawValue 0
test_payload .currentSensorStateData[1].name '"CarbonMonoxideLevel"'
test_payload .currentSensorStateData[1].currentSensorState '"unknown"'
test_payload .currentSensorStateData[1].rawValue 0
test_payload .currentSensorStateData[2].name '"SmokeLevel"'
test_payload .currentSensorStateData[2].currentSensorState '"unknown"'
test_payload .currentSensorStateData[2].rawValue 0
test_payload .currentSensorStateData[3].name '"FilterCleanliness"'
test_payload .currentSensorStateData[3].currentSensorState '"unknown"'
test_payload .currentSensorStateData[3].rawValue null
test_payload .currentSensorStateData[4].name '"WaterLeak"'
test_payload .currentSensorStateData[4].currentSensorState '"unknown"'
test_payload .currentSensorStateData[4].rawValue null
test_payload .currentSensorStateData[5].name '"RainDetection"'
test_payload .currentSensorStateData[5].currentSensorState '"unknown"'
test_payload .currentSensorStateData[5].rawValue null
test_payload .currentSensorStateData[6].name '"FilterLifeTime"'
test_payload .currentSensorStateData[6].currentSensorState '"unknown"'
test_payload .currentSensorStateData[6].rawValue 0
test_payload .currentSensorStateData[7].name '"PreFilterLifeTime"'
test_payload .currentSensorStateData[7].currentSensorState null
test_payload .currentSensorStateData[7].rawValue 0
test_payload .currentSensorStateData[8].name '"HEPAFilterLifeTime"'
test_payload .currentSensorStateData[8].currentSensorState null
test_payload .currentSensorStateData[8].rawValue 0
test_payload .currentSensorStateData[9].name '"Max2FilterLifeTime"'
test_payload .currentSensorStateData[9].currentSensorState null
test_payload .currentSensorStateData[9].rawValue 0
test_payload .currentSensorStateData[10].name '"CarbonDioxideLevel"'
test_payload .currentSensorStateData[10].currentSensorState null
test_payload .currentSensorStateData[10].rawValue 0
test_payload .currentSensorStateData[11].name '"PM2.5"'
test_payload .currentSensorStateData[11].currentSensorState null
test_payload .currentSensorStateData[11].rawValue 0
test_payload .currentSensorStateData[12].name '"PM10"'
test_payload .currentSensorStateData[12].currentSensorState null
test_payload .currentSensorStateData[12].rawValue 0
test_payload .currentSensorStateData[13].name '"VolatileOrganicCompounds"'
test_payload .currentSensorStateData[13].currentSensorState null
test_payload .currentSensorStateData[13].rawValue 0
test_payload .lastSoftwareUpdateUnixTimestampSec 0
test_payload .isRunning false
test_payload .currentStatusReport '[]'
test_payload .temperatureSetpointCelsius 0
test_payload .thermostatMode '"off"'
test_payload .thermostatTemperatureAmbient 1
test_payload .thermostatTemperatureSetpoint 1
test_payload .timerRemainingSec -1
test_payload .currentToggleSettings.quiet_toggle false
test_payload .currentToggleSettings.extra_bass_toggle false
test_payload .currentToggleSettings.energy_saving_toggle false
test_payload .currentVolume 40
test_payload .on true
test_payload .isDocked false

execute_payload topic '{"on":true, "isDocked":null}'
test_payload .isDocked null
test_payload .on true

execute_payload topic '{"on":false, "isDocked":false}'
test_payload .isDocked false
test_payload .on false

execute_payload topic '{"on":true, "isDocked":null}'
test_payload .on true
test_payload .isDocked null

execute_payload null '{"currentStatusReport":[]}'
test_payload .currentStatusReport '[]'

execute_payload currentStatusReport '[]'
test_payload .currentStatusReport '[]'
test_payload .currentStatusReport '[]'

execute_payload null '{"currentStatusReport":[{"blocking":false,"deviceTarget":"PIPPO","priority":0,"statusCode":"lowBattery"}]}'
test_payload .currentStatusReport '[]'

execute_payload null '{"currentStatusReport":[{"blocking":false,"deviceTarget":"Garage","priority":0,"statusCode":"lowBattery"}, {"blocking":false,"deviceTarget":"Ingresso","priority":0,"statusCode":"lowBattery"}]}'
test_payload .currentStatusReport '[]'

execute_payload null '{"currentStatusReport":[{"blocking":false,"deviceTarget":"Cucina","priority":0,"statusCode":"allBattery"}]}'
test_payload .currentStatusReport[0].blocking false
test_payload .currentStatusReport[0].priority 0
test_payload .currentStatusReport[0].statusCode '"allBattery"'
test_payload .currentStatusReport[0].deviceTarget "\"$NODE_ID\""

execute_payload currentStatusReport '[{"blocking":true,"deviceTarget":"Cucina","priority":1,"statusCode":"lowBattery"}]'
test_payload .currentStatusReport[0].blocking true
test_payload .currentStatusReport[0].priority 1
test_payload .currentStatusReport[0].statusCode '"lowBattery"'
test_payload .currentStatusReport[0].deviceTarget "\"$NODE_ID\""

execute_payload StatusReport '[{"blocking":false,"deviceTarget":"Cucina","priority":2,"statusCode":"okBattery"}]'
test_payload .currentStatusReport[0].blocking true
test_payload .currentStatusReport[0].priority 1
test_payload .currentStatusReport[0].statusCode '"lowBattery"'
test_payload .currentStatusReport[0].deviceTarget "\"$NODE_ID\""
test_payload .currentStatusReport[1].blocking false
test_payload .currentStatusReport[1].priority 2
test_payload .currentStatusReport[1].statusCode '"okBattery"'
test_payload .currentStatusReport[1].deviceTarget "\"$NODE_ID\""

execute_payload StatusReport '[{"blocking":false,"deviceTarget":"Cucina","priority":2,"statusCode":"okBattery"}]'
test_payload .currentStatusReport[0].blocking true
test_payload .currentStatusReport[0].priority 1
test_payload .currentStatusReport[0].statusCode '"lowBattery"'
test_payload .currentStatusReport[0].deviceTarget "\"$NODE_ID\""
test_payload .currentStatusReport[1].blocking false
test_payload .currentStatusReport[1].priority 2
test_payload .currentStatusReport[1].statusCode '"okBattery"'
test_payload .currentStatusReport[1].deviceTarget "\"$NODE_ID\""

execute_payload StatusReport '[]'
test_payload .currentStatusReport[0].blocking true
test_payload .currentStatusReport[0].priority 1
test_payload .currentStatusReport[0].statusCode '"lowBattery"'
test_payload .currentStatusReport[0].deviceTarget "\"$NODE_ID\""
test_payload .currentStatusReport[1].blocking false
test_payload .currentStatusReport[1].priority 2
test_payload .currentStatusReport[1].statusCode '"okBattery"'
test_payload .currentStatusReport[1].deviceTarget "\"$NODE_ID\""

execute_payload StatusReport '[{"blocking":false,"deviceTarget":"Salotto","priority":3,"statusCode":"lowBattery"}]'
test_payload .currentStatusReport[0].blocking true
test_payload .currentStatusReport[0].priority 1
test_payload .currentStatusReport[0].statusCode '"lowBattery"'
test_payload .currentStatusReport[0].deviceTarget "\"$NODE_ID\""
test_payload .currentStatusReport[1].blocking false
test_payload .currentStatusReport[1].priority 2
test_payload .currentStatusReport[1].statusCode '"okBattery"'
test_payload .currentStatusReport[1].deviceTarget "\"$NODE_ID\""
test_payload .currentStatusReport[2].blocking false
test_payload .currentStatusReport[2].priority 3
test_payload .currentStatusReport[2].statusCode '"lowBattery"'
test_payload .currentStatusReport[2].deviceTarget "\"$NODE_ID1\""

execute_payload capacityRemaining '[{"unit":"SECONDS","rawValue":60}]'
test_payload .capacityRemaining[0].unit '"SECONDS"'
test_payload .capacityRemaining[0].rawValue 60

execute_payload capacityUntilFull '[{"unit":"PERCENTAGE","rawValue":7}]'
test_payload .capacityUntilFull[0].unit '"PERCENTAGE"'
test_payload .capacityUntilFull[0].rawValue 7

execute_payload capacityRemaining '[{"unit":"SECONDS","rawValue":70},{"unit":"KILOMETERS","rawValue":27}]'
test_payload .capacityRemaining[0].unit '"SECONDS"'
test_payload .capacityRemaining[0].rawValue 70
test_payload .capacityRemaining[1].unit '"KILOMETERS"'
test_payload .capacityRemaining[1].rawValue 27
test_payload .capacityUntilFull[0].unit '"PERCENTAGE"'
test_payload .capacityUntilFull[0].rawValue 7

execute_payload capacityUntilFull '[{"unit":"SECONDS","rawValue":60}]'
test_payload .capacityUntilFull[0].unit '"SECONDS"'
test_payload .capacityUntilFull[0].rawValue 60
test_payload .capacityRemaining[0].unit '"SECONDS"'
test_payload .capacityRemaining[0].rawValue 70
test_payload .capacityRemaining[1].unit '"KILOMETERS"'
test_payload .capacityRemaining[1].rawValue 27

execute_payload capacityRemaining '[{"unit":"PERCENTAGE","rawValue":7}]'
test_payload .capacityRemaining[0].unit '"PERCENTAGE"'
test_payload .capacityRemaining[0].rawValue 7
test_payload .capacityUntilFull[0].unit '"SECONDS"'
test_payload .capacityUntilFull[0].rawValue 60

execute_payload openState '[{"openDirection":"DOWN","openPercent":7}]'
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 0
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 7
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 0
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 0
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 0
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 0

execute_payload openState '[{"openDirection":"LEFT","openPercent":5},{"openDirection":"IN","openPercent":9}]'
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 0
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 7
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 5
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 0
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 9
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 0

execute_payload currentRunCycle '[{"currentCycle":"Riscaldamento piatto","nextCycle":"Riscaldamento ugello","lang":"it"},{"currentCycle":"Riscaldamento ugello","nextCycle":"Stampa","lang":"it"}]'
test_payload .currentRunCycle[0].currentCycle '"Riscaldamento piatto"'
test_payload .currentRunCycle[0].nextCycle '"Riscaldamento ugello"'
test_payload .currentRunCycle[0].lang '"it"'
test_payload .currentRunCycle[1].currentCycle '"Riscaldamento ugello"'
test_payload .currentRunCycle[1].nextCycle '"Stampa"'
test_payload .currentRunCycle[1].lang '"it"'

execute_payload currentSensorStateData '[{"name":"CarbonMonoxideLevel","currentSensorState":"no carbon monoxide detected","rawValue":7}]'
test_payload .currentSensorStateData[1].name '"CarbonMonoxideLevel"'
test_payload .currentSensorStateData[1].currentSensorState '"no carbon monoxide detected"'
test_payload .currentSensorStateData[1].rawValue 7

execute_payload activeZones '["Cucina","Salotto"]'
test_payload .activeZones[0] '"Cucina"'
test_payload .activeZones[1] '"Salotto"'
test_payload .activeZones[2] null

execute_payload activeZones '["Cucina","Salotto", "Soggiorno"]'
test_payload .activeZones[0] '"Cucina"'
test_payload .activeZones[1] '"Salotto"'
test_payload .activeZones[2] '"Soggiorno"'
test_payload .activeZones[3] null

execute_payload activeZones '["Bagno"]'
test_payload .activeZones[0] '"Bagno"'
test_payload .activeZones[1] null

echo

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
test_out ".payload.commands[0].states.online" true

execute $NODE_ID ArmDisarm_level true L2 123
test_out ".payload.commands[0].states.online" true

execute_error $NODE_ID ArmDisarm_level true NO_LEVEL 456

execute $NODE_ID ArmDisarm_cancel true
test_out ".payload.commands[0].states.online" true

# Brightness
echo
echo Brightness

execute $NODE_ID BrightnessAbsolute 128
test_payload ".brightness" 128

execute $NODE_ID BrightnessAbsolute 200
test_payload ".brightness" 200

execute $NODE_ID BrightnessRelative 4
test_out ".payload.commands[0].states.online" true
test_payload ".brightness" 200

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
test_payload ".color.spectrumRgb" null
test_payload ".color.spectrumHsv.hue" null
test_payload ".color.spectrumHsv.saturation" null
test_payload ".color.spectrumHsv.value" null
test_out ".payload.commands[0].states.online" true

execute $NODE_ID ColorAbsolute_rgb 'Magenta' 16711935
test_payload ".color.spectrumRgb" 16711935
test_payload ".color.temperatureK" null
test_payload ".color.spectrumHsv.hue" null
test_payload ".color.spectrumHsv.saturation" null
test_payload ".color.spectrumHsv.value" null
test_out ".payload.commands[0].states.online" true

execute $NODE_ID ColorAbsolute 'Bianco Caldo' 4000
test_payload ".color.temperatureK" 4000
test_payload ".color.spectrumRgb" null
test_payload ".color.spectrumHsv.hue" null
test_payload ".color.spectrumHsv.saturation" null
test_payload ".color.spectrumHsv.value" null
test_out ".payload.commands[0].states.online" true

execute $NODE_ID1 ColorAbsolute_hsv 'Magenta' 300 1 1
test_out ".payload.commands[0].states.online" true
test_payload ".color.spectrumHsv.hue" 300
test_payload ".color.spectrumHsv.saturation" 1
test_payload ".color.spectrumHsv.value" 1
test_payload ".color.temperatureK" null
test_payload ".color.spectrumRgb" null

execute $NODE_ID1 ColorAbsolute 'Bianco Freddo' 7000
test_payload ".color.temperatureK" 7000
test_payload ".color.spectrumRgb" null
test_payload ".color.spectrumHsv.hue" null
test_payload ".color.spectrumHsv.saturation" null
test_payload ".color.spectrumHsv.value" null
test_out ".payload.commands[0].states.online" true

execute $NODE_ID1 ColorAbsolute_hsv 'Blu' 500 2 3
test_out ".payload.commands[0].states.online" true
test_payload ".color.spectrumHsv.hue" 500
test_payload ".color.spectrumHsv.saturation" 2
test_payload ".color.spectrumHsv.value" 3
test_payload ".color.temperatureK" null
test_payload ".color.spectrumRgb" null

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
test_payload ".currentFanSpeedPercent" 50
test_payload ".currentFanSpeedSetting" '"speed_high"'

execute $NODE_ID SetFanSpeedRelative_percent 15 
test_payload ".currentFanSpeedPercent" 50
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
test_payload ".humiditySetpointPercent" 30

execute $NODE_ID HumidityRelative_percent 5 
test_payload ".humiditySetpointPercent" 30

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
test_payload ".isLocked" true

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
test_payload ".openState[0].openPercent" 50

execute $NODE_ID OpenCloseRelative_dir 3 "DOWN"
test_payload ".openState[1].openPercent" 70

execute $NODE_ID OpenCloseRelative_dir -5 "LEFT"
test_payload ".openState[2].openPercent" 60

execute $NODE_ID OpenCloseRelative_dir 11 "RIGHT"
test_payload ".openState[3].openPercent" 45

execute $NODE_ID OpenCloseRelative_dir -7 "IN"
test_payload ".openState[4].openPercent" 20

execute $NODE_ID OpenCloseRelative_dir 17 "OUT"
test_payload ".openState[5].openPercent" 10

execute $NODE_ID OpenCloseRelative_dir -9 "NO_DIR"
test_out ".payload.commands[0].status" '"SUCCESS"' # ERROR??
test_payload ".openState[0].openPercent" 50
test_payload ".openState[1].openPercent" 70
test_payload ".openState[2].openPercent" 60
test_payload ".openState[3].openPercent" 45
test_payload ".openState[4].openPercent" 20
test_payload ".openState[5].openPercent" 10

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
test_payload ".timerPaused" null

execute $NODE_ID TimerAdjust -5
test_payload ".timerPaused" null

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
