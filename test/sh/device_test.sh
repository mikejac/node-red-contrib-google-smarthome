#!/usr/bin/env bash

#
# node-red-contrib-google-smarthome
# Copyright (C) 2024 Claudio Chimera and others.
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
# cd ; node-red -u $HOME/nrsh | awk '{ print; } /HttpActions:reportState..: postData = / { pd=substr($0, 39); print pd > "reportState.json"; close("reportState.json"); }'
# cd $HOME/nrsh/node_modules/node-red-contrib-google-smarthome/test/sh/ ; ./device_test.sh "a5782b1b.e120f8" "bab53c06.fc9c3" "d06e999d.718b68"
#

. ./data
. ./code

NODE_ID=$1 || "a5782b1b.e120f8"
NODE_ID1=$2 || "bab53c06.fc9c3"
NODE_ID2=$3 || "d06e999d.718b68"
PAYLOAD_FILE="$HOME/payload.json"
REPORT_STATE_FILE="$HOME/reportState.json"
OUT_FILE="$HOME/out.json"
SYNC_FILE="$HOME/sync.json"
PAYLOAD_URL=$(dirname $BASE_URL)/payload
LANG="it"
TEST_NUM=0

./login_post
./authorization_code
./refresh_token

dos2unix cmd/* 2>/dev/null

test_json() {
    TYPE=$1
    STR=$2
    JPATH=$3
    VAL=$4
    V=$(echo $STR | jq "$JPATH")
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

test_payload_no_report_state() {
    test_json Payload "$PAYLOAD" "$@"
}

test_payload() {
    test_json Payload "$PAYLOAD" "$@"
    # if [ "$1" != ".command" ] ; then
    Q=$1
    if [[ -n "$REPORT_STATE" && "$Q" != ".command" && $Q != .params.* ]] ; then
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
    REQUEST="{\"payload\": $PAYLOAD, \"topic\": \"$TOPIC\", \"test_num\": $TEST_NUM}"
    echo $REQUEST
    mv "$PAYLOAD_FILE" "$PAYLOAD_FILE.old"
    if [ -f "$REPORT_STATE_FILE" ] ; then
        mv "$REPORT_STATE_FILE" "$REPORT_STATE_FILE.old"
    fi
    echo "{}" > "$PAYLOAD_FILE" 
    echo "" > "$REPORT_STATE_FILE" 
    curl -s \
        -H "Content-Type: application/json;charset=UTF-8" \
        --data "$REQUEST" \
        $PAYLOAD_URL  > "$OUT_FILE"
    OUT=$(cat "$OUT_FILE")
    if [ "$OUT" != "OK" ] ; then
        echo ERROR
        echo "Result $OUT"
        echo "Request: "
        echo $REQUEST
    fi
    while [ ! -f "$PAYLOAD_FILE" ] ; do sleep 1 ; done
    sleep 1
    PAYLOAD=$(cat "$PAYLOAD_FILE")
    REPORT_STATE=$(cat "$REPORT_STATE_FILE")
    LAST_NODE_ID="$NODE_ID"
}

execute() {
    execute_no_report_state "$@"
    while [ ! -f "$REPORT_STATE_FILE" ] ; do sleep 1 ; done
    REPORT_STATE=$(cat "$REPORT_STATE_FILE")
}

execute_no_report_state() {
    CMD_EXEC="$@"
    echo
    ((TEST_NUM=TEST_NUM+1))
    echo "# $TEST_NUM"
    CMD_=$2
    CMD="${CMD_%%_*}"
    echo ./execute "$@"
    mv "$PAYLOAD_FILE" "$PAYLOAD_FILE.old"
    if [ -f "$REPORT_STATE_FILE" ] ; then
        mv "$REPORT_STATE_FILE" "$REPORT_STATE_FILE.old"
    fi
    REPORT_STATE=''
    # echo "{}" > "$PAYLOAD_FILE" 
    # echo "{}" > "$REPORT_STATE_FILE" 
    ./execute "$@" > "$OUT_FILE"
    OUT=$(cat "$OUT_FILE")
    while [ ! -f "$PAYLOAD_FILE" ] ; do sleep 1 ; done
    PAYLOAD=$(cat "$PAYLOAD_FILE")
    LAST_NODE_ID="$1"
    test_out ".payload.commands[0].status" '"SUCCESS"'
    test_payload .online true
    test_payload .command "\"$CMD\""
}

request_sync() {
    echo
    ((TEST_NUM=TEST_NUM+1))
    echo "# $TEST_NUM"
    echo ./request_sync
    mv "$SYNC_FILE" "$SYNC_FILE.old" 
    echo "{}" > "$SYNC_FILE" 
    ./request_sync "$@" > "$SYNC_FILE"
    SYNC_STATE=$(cat "$SYNC_FILE")
    test_sync .payload.agentUserId "\"0\""
}

test_sync() {
    test_json Sync "$SYNC_STATE" "$@"
}

execute_no_payload() {
    CMD_EXEC="$@"
    echo
    ((TEST_NUM=TEST_NUM+1))
    echo ./execute "$@"
    echo "{}" > "$PAYLOAD_FILE" 
    ./execute "$@" > "$OUT_FILE"
    OUT=$(cat "$OUT_FILE")
    PAYLOAD=$(cat "$PAYLOAD_FILE")
    test_out ".payload.commands[0].status" '"SUCCESS"'
    test_no_payload
}

execute_error() {
    CMD_EXEC="$@"
    echo
    ((TEST_NUM=TEST_NUM+1))
    echo ./execute "$@"
    echo "{}" > "$PAYLOAD_FILE" 
    OUT=$(./execute "$@")
    PAYLOAD=$(cat "$PAYLOAD_FILE")
    test_out ".payload.commands[0].status" '"ERROR"'
    test_no_payload
}
# if [ 1 == 2 ] ; then
# fi # fi

request_sync
test_sync .payload.devices[0].type "\""action.devices.types.TV"\""
test_sync .payload.devices[0].traits[0] "\""action.devices.traits.AppSelector"\""
test_sync .payload.devices[0].traits[1] "\""action.devices.traits.ArmDisarm"\""
test_sync .payload.devices[0].traits[2] "\""action.devices.traits.Brightness"\""
test_sync .payload.devices[0].traits[3] "\""action.devices.traits.CameraStream"\""
test_sync .payload.devices[0].traits[4] "\""action.devices.traits.Channel"\""
test_sync .payload.devices[0].traits[5] "\""action.devices.traits.ColorSetting"\""
test_sync .payload.devices[0].traits[6] "\""action.devices.traits.Cook"\""
test_sync .payload.devices[0].traits[7] "\""action.devices.traits.Dispense"\""
test_sync .payload.devices[0].traits[8] "\""action.devices.traits.Dock"\""
test_sync .payload.devices[0].traits[9] "\""action.devices.traits.EnergyStorage"\""
test_sync .payload.devices[0].traits[10] "\""action.devices.traits.FanSpeed"\""
test_sync .payload.devices[0].traits[11] "\""action.devices.traits.Fill"\""
test_sync .payload.devices[0].traits[12] "\""action.devices.traits.HumiditySetting"\""
test_sync .payload.devices[0].traits[13] "\""action.devices.traits.InputSelector"\""
test_sync .payload.devices[0].traits[14] "\""action.devices.traits.LightEffects"\""
test_sync .payload.devices[0].traits[15] "\""action.devices.traits.Locator"\""
test_sync .payload.devices[0].traits[16] "\""action.devices.traits.LockUnlock"\""
test_sync .payload.devices[0].traits[17] "\""action.devices.traits.MediaState"\""
test_sync .payload.devices[0].traits[18] "\""action.devices.traits.Modes"\""
test_sync .payload.devices[0].traits[19] "\""action.devices.traits.NetworkControl"\""
test_sync .payload.devices[0].traits[20] "\""action.devices.traits.ObjectDetection"\""
test_sync .payload.devices[0].traits[21] "\""action.devices.traits.OnOff"\""
test_sync .payload.devices[0].traits[22] "\""action.devices.traits.OpenClose"\""
test_sync .payload.devices[0].traits[23] "\""action.devices.traits.Reboot"\""
test_sync .payload.devices[0].traits[24] "\""action.devices.traits.Rotation"\""
test_sync .payload.devices[0].traits[25] "\""action.devices.traits.RunCycle"\""
test_sync .payload.devices[0].traits[26] "\""action.devices.traits.SensorState"\""
test_sync .payload.devices[0].traits[27] "\""action.devices.traits.SoftwareUpdate"\""
test_sync .payload.devices[0].traits[28] "\""action.devices.traits.StartStop"\""
test_sync .payload.devices[0].traits[29] "\""action.devices.traits.StatusReport"\""
test_sync .payload.devices[0].traits[30] "\""action.devices.traits.TemperatureControl"\""
test_sync .payload.devices[0].traits[31] "\""action.devices.traits.TemperatureSetting"\""
test_sync .payload.devices[0].traits[32] "\""action.devices.traits.Timer"\""
test_sync .payload.devices[0].traits[33] "\""action.devices.traits.Toggles"\""
test_sync .payload.devices[0].traits[34] "\""action.devices.traits.TransportControl"\""
test_sync .payload.devices[0].traits[35] "\""action.devices.traits.Volume"\""
test_sync .payload.devices[0].traits[36] null
test_sync .payload.devices[0].name.defaultNames[0] "\""Node-RED\ Television"\""
test_sync .payload.devices[0].name.name "\""MultiDevice\ Cucina"\""
test_sync .payload.devices[0].roomHint "\"Cucina""\""
test_sync .payload.devices[0].willReportState  true
test_sync .payload.devices[0].notificationSupportedByAgent  true
test_sync .payload.devices[0].deviceInfo.manufacturer "\""Node-RED"\""
test_sync .payload.devices[0].deviceInfo.model "\""nr-device-television-v1"\""
test_sync .payload.devices[0].deviceInfo.swVersion "\""1.0"\""
test_sync .payload.devices[0].deviceInfo.hwVersion "\""1.0"\""
test_sync .payload.devices[0].id "\""$NODE_ID"\""
test_sync .payload.devices[1].id "\""$NODE_ID1"\""
test_sync .payload.devices[2].id "\""$NODE_ID2"\""
test_sync .payload.devices[3] null

# availableApplications
test_sync .payload.devices[0].attributes.availableApplications[0].key "\""YouTube"\""
test_sync .payload.devices[0].attributes.availableApplications[0].names[0].lang "\""$LANG"\""
test_sync .payload.devices[0].attributes.availableApplications[0].names[0].name_synonym[0] "\""YouTube"\""
test_sync .payload.devices[0].attributes.availableApplications[0].names[0].name_synonym[1] null
test_sync .payload.devices[0].attributes.availableApplications[0].names[1] null

test_sync .payload.devices[0].attributes.availableApplications[1].key "\""video"\""
test_sync .payload.devices[0].attributes.availableApplications[1].names[0].lang "\""$LANG"\""
test_sync .payload.devices[0].attributes.availableApplications[1].names[0].name_synonym[0] "\""Google\ Video"\""
test_sync .payload.devices[0].attributes.availableApplications[1].names[0].name_synonym[1] "\""Video"\""
test_sync .payload.devices[0].attributes.availableApplications[1].names[0].name_synonym[2] null
test_sync .payload.devices[0].attributes.availableApplications[1].names[1] null

test_sync .payload.devices[0].attributes.availableApplications[2].key "\""Amazon\ Prime\ Video"\""
test_sync .payload.devices[0].attributes.availableApplications[2].names[0].lang "\""$LANG"\""
test_sync .payload.devices[0].attributes.availableApplications[2].names[0].name_synonym[0] "\""Amazon\ Prime\ Video"\""
test_sync .payload.devices[0].attributes.availableApplications[2].names[0].name_synonym[1] "\""Prime\ Video"\""
test_sync .payload.devices[0].attributes.availableApplications[2].names[0].name_synonym[2] null
test_sync .payload.devices[0].attributes.availableApplications[2].names[1] null

test_sync .payload.devices[0].attributes.availableApplications[3] null

# availableArmLevels
test_sync .payload.devices[0].attributes.availableArmLevels.levels[0].level_name "\""L1"\""
test_sync .payload.devices[0].attributes.availableArmLevels.levels[0].level_values[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.availableArmLevels.levels[0].level_values[0].level_synonym[0] "\""home\ and\ guarding"\""
test_sync .payload.devices[0].attributes.availableArmLevels.levels[0].level_values[0].level_synonym[1] "\""SL1"\""
test_sync .payload.devices[0].attributes.availableArmLevels.levels[0].level_values[0].level_synonym[2] null
test_sync .payload.devices[0].attributes.availableArmLevels.levels[0].level_values[1].lang "\""it"\""
test_sync .payload.devices[0].attributes.availableArmLevels.levels[0].level_values[1].level_synonym[0] "\""Allarme\ in\ casa"\""
test_sync .payload.devices[0].attributes.availableArmLevels.levels[0].level_values[1].level_synonym[1] "\""SL1"\""
test_sync .payload.devices[0].attributes.availableArmLevels.levels[0].level_values[1].level_synonym[2] null
test_sync .payload.devices[0].attributes.availableArmLevels.levels[0].level_values[2] null

test_sync .payload.devices[0].attributes.availableArmLevels.levels[1].level_name "\""L2"\""
test_sync .payload.devices[0].attributes.availableArmLevels.levels[1].level_values[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.availableArmLevels.levels[1].level_values[0].level_synonym[0] "\""away\ and\ guarding"\""
test_sync .payload.devices[0].attributes.availableArmLevels.levels[1].level_values[0].level_synonym[1] "\""SL2"\""
test_sync .payload.devices[0].attributes.availableArmLevels.levels[1].level_values[0].level_synonym[2] null
test_sync .payload.devices[0].attributes.availableArmLevels.levels[1].level_values[1].lang "\""it"\""
test_sync .payload.devices[0].attributes.availableArmLevels.levels[1].level_values[1].level_synonym[0] "\""Allarme\ fuori\ casa"\""
test_sync .payload.devices[0].attributes.availableArmLevels.levels[1].level_values[1].level_synonym[1] "\""SL2"\""
test_sync .payload.devices[0].attributes.availableArmLevels.levels[1].level_values[1].level_synonym[2] null
test_sync .payload.devices[0].attributes.availableArmLevels.levels[1].level_values[2] null
test_sync .payload.devices[0].attributes.availableArmLevels.ordered true

test_sync .payload.devices[0].attributes.commandOnlyBrightness false

# availableChannels
test_sync .payload.devices[0].attributes.availableChannels[0].key "\""rai1"\""
test_sync .payload.devices[0].attributes.availableChannels[0].names[0] "\""Rai\ 1"\""
test_sync .payload.devices[0].attributes.availableChannels[0].names[1] null
test_sync .payload.devices[0].attributes.availableChannels[0].number "\""1"\""

test_sync .payload.devices[0].attributes.availableChannels[1].key "\""rai1_hd"\""
test_sync .payload.devices[0].attributes.availableChannels[1].names[0] "\""Rai\ 1\ HD"\""
test_sync .payload.devices[0].attributes.availableChannels[1].names[1] null
test_sync .payload.devices[0].attributes.availableChannels[1].number "\""501"\""

test_sync .payload.devices[0].attributes.availableChannels[2].key "\""rai2"\""
test_sync .payload.devices[0].attributes.availableChannels[2].names[0] "\""Rai\ 2"\""
test_sync .payload.devices[0].attributes.availableChannels[2].names[1] null
test_sync .payload.devices[0].attributes.availableChannels[2].number "\""2"\""

test_sync .payload.devices[0].attributes.availableChannels[3].key "\""rai2_hd"\""
test_sync .payload.devices[0].attributes.availableChannels[3].names[0] "\""Rai\ 2\ HD"\""
test_sync .payload.devices[0].attributes.availableChannels[3].names[1] null
test_sync .payload.devices[0].attributes.availableChannels[3].number "\""502"\""

test_sync .payload.devices[0].attributes.availableChannels[4].key "\""rai3"\""
test_sync .payload.devices[0].attributes.availableChannels[4].names[0] "\""Rai\ 3"\""
test_sync .payload.devices[0].attributes.availableChannels[4].names[1] null
test_sync .payload.devices[0].attributes.availableChannels[4].number "\""3"\""

test_sync .payload.devices[0].attributes.availableChannels[5].key "\""rai3_hd"\""
test_sync .payload.devices[0].attributes.availableChannels[5].names[0] "\""Rai\ 3\ HD"\""
test_sync .payload.devices[0].attributes.availableChannels[5].names[1] null
test_sync .payload.devices[0].attributes.availableChannels[5].number "\""503"\""

test_sync .payload.devices[0].attributes.availableChannels[6].key "\""realtime"\""
test_sync .payload.devices[0].attributes.availableChannels[6].names[0] "\""Realtime"\""
test_sync .payload.devices[0].attributes.availableChannels[6].names[1] null
test_sync .payload.devices[0].attributes.availableChannels[6].number "\""31"\""

test_sync .payload.devices[0].attributes.availableChannels[7] null

test_sync .payload.devices[0].attributes.commandOnlyColorSetting false
test_sync .payload.devices[0].attributes.colorModel "\""rgb"\""
test_sync .payload.devices[0].attributes.colorTemperatureRange.temperatureMinK 2000
test_sync .payload.devices[0].attributes.colorTemperatureRange.temperatureMaxK 9000
test_sync .payload.devices[0].attributes.cameraStreamSupportedProtocols[0] "\""hls"\""
test_sync .payload.devices[0].attributes.cameraStreamSupportedProtocols[1] "\""dash"\""
test_sync .payload.devices[0].attributes.cameraStreamSupportedProtocols[2] "\""smooth_stream"\""
test_sync .payload.devices[0].attributes.cameraStreamSupportedProtocols[3] "\""progressive_mp4"\""
test_sync .payload.devices[0].attributes.cameraStreamSupportedProtocols[4] "\""webrtc"\""
test_sync .payload.devices[0].attributes.cameraStreamSupportedProtocols[5] null
test_sync .payload.devices[0].attributes.cameraStreamNeedAuthToken true

test_sync .payload.devices[0].attributes.supportedCookingModes[0] "\""UNKNOWN_COOKING_MODE"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[1] "\""BAKE"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[2] "\""BEAT"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[3] "\""BLEND"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[4] "\""BOIL"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[5] "\""BREW"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[6] "\""BROIL"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[7] "\""CONVECTION_BAKE"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[8] "\""COOK"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[9] "\""DEFROST"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[10] "\""DEHYDRATE"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[11] "\""FERMENT"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[12] "\""FRY"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[13] "\""GRILL"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[14] "\""KNEAD"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[15] "\""MICROWAVE"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[16] "\""MIX"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[17] "\""PRESSURE_COOK"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[18] "\""PUREE"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[19] "\""ROAST"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[20] "\""SAUTE"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[21] "\""SLOW_COOK"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[22] "\""SOUS_VIDE"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[23] "\""STEAM"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[24] "\""STEW"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[25] "\""STIR"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[26] "\""WARM"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[27] "\""WHIP"\""
test_sync .payload.devices[0].attributes.supportedCookingModes[28] null

# foodPresets
test_sync .payload.devices[0].attributes.foodPresets[0].food_preset_name "\""white_rice"\""
test_sync .payload.devices[0].attributes.foodPresets[0].supported_units[0] "\""CUPS"\""
test_sync .payload.devices[0].attributes.foodPresets[0].supported_units[1] null
test_sync .payload.devices[0].attributes.foodPresets[0].food_synonyms[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.foodPresets[0].food_synonyms[0].synonym[0] "\""White\ Rice"\""
test_sync .payload.devices[0].attributes.foodPresets[0].food_synonyms[0].synonym[1] "\""Rice"\""
test_sync .payload.devices[0].attributes.foodPresets[0].food_synonyms[0].synonym[2] null
test_sync .payload.devices[0].attributes.foodPresets[0].food_synonyms[1] null

test_sync .payload.devices[0].attributes.foodPresets[1].food_preset_name "\""brown_rice"\""
test_sync .payload.devices[0].attributes.foodPresets[1].supported_units[0] "\""CUPS"\""
test_sync .payload.devices[0].attributes.foodPresets[1].supported_units[1] null
test_sync .payload.devices[0].attributes.foodPresets[1].food_synonyms[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.foodPresets[1].food_synonyms[0].synonym[0] "\""Brown\ Rice"\""
test_sync .payload.devices[0].attributes.foodPresets[1].food_synonyms[0].synonym[1] null
test_sync .payload.devices[0].attributes.foodPresets[1].food_synonyms[1] null

test_sync .payload.devices[0].attributes.foodPresets[2] null

# supportedDispenseItems
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].item_name "\""water"\""
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].item_name_synonyms[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].item_name_synonyms[0].synonyms[0] "\""water"\""
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].item_name_synonyms[0].synonyms[1] null
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].supported_units[0] "\""TEASPOONS"\""
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].supported_units[1] "\""TABLESPOONS"\""
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].supported_units[2] "\""FLUID_OUNCES"\""
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].supported_units[3] "\""CUPS"\""
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].supported_units[4] "\""PINTS"\""
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].supported_units[5] "\""QUARTS"\""
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].supported_units[6] "\""GALLONS"\""
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].supported_units[7] "\""MILLILITERS"\""
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].supported_units[8] "\""LITERS"\""
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].supported_units[9] "\""DECILITERS"\""
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].supported_units[10] null
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].default_portion.amount 2
test_sync .payload.devices[0].attributes.supportedDispenseItems[0].default_portion.unit "\""CUPS"\""

test_sync .payload.devices[0].attributes.supportedDispenseItems[0].item_name_synonyms[1] null

test_sync .payload.devices[0].attributes.supportedDispenseItems[1] null

# supportedDispensePresets
test_sync .payload.devices[0].attributes.supportedDispensePresets[0].preset_name "\""cat_bowl"\""
test_sync .payload.devices[0].attributes.supportedDispensePresets[0].preset_name_synonyms[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.supportedDispensePresets[0].preset_name_synonyms[0].synonyms[0] "\""cat\ water\ bowl"\""
test_sync .payload.devices[0].attributes.supportedDispensePresets[0].preset_name_synonyms[0].synonyms[1] "\""cat\ water\ dish"\""
test_sync .payload.devices[0].attributes.supportedDispensePresets[0].preset_name_synonyms[0].synonyms[2] "\""cat\ water\ cup"\""
test_sync .payload.devices[0].attributes.supportedDispensePresets[0].preset_name_synonyms[0].synonyms[3] null

test_sync .payload.devices[0].attributes.supportedDispensePresets[1].preset_name "\""glass_1"\""
test_sync .payload.devices[0].attributes.supportedDispensePresets[1].preset_name_synonyms[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.supportedDispensePresets[1].preset_name_synonyms[0].synonyms[0] "\""glass\ of\ water"\""
test_sync .payload.devices[0].attributes.supportedDispensePresets[1].preset_name_synonyms[0].synonyms[1] "\""glass"\""
test_sync .payload.devices[0].attributes.supportedDispensePresets[1].preset_name_synonyms[0].synonyms[2] null

test_sync .payload.devices[0].attributes.supportedDispensePresets[2] null

test_sync .payload.devices[0].attributes.queryOnlyEnergyStorage false
test_sync .payload.devices[0].attributes.energyStorageDistanceUnitForUX "\""KILOMETERS"\""
test_sync .payload.devices[0].attributes.isRechargeable true
test_sync .payload.devices[0].attributes.reversible false
test_sync .payload.devices[0].attributes.commandOnlyFanSpeed false
test_sync .payload.devices[0].attributes.supportsFanSpeedPercent false

# availableFanSpeeds
test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[0].speed_name "\""speed_low"\""
test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[0].speed_values[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[0].speed_values[0].speed_synonym[0] "\""low"\""
test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[0].speed_values[0].speed_synonym[1] "\""slow"\""
test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[0].speed_values[0].speed_synonym[2] null

test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[0].speed_values[1].lang "\""it"\""
test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[0].speed_values[1].speed_synonym[0] "\""lento"\""
test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[0].speed_values[1].speed_synonym[1] "\""basso"\""
test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[0].speed_values[1].speed_synonym[2] null

test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[0].speed_values[2] null

test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[1].speed_name "\""speed_high"\""
test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[1].speed_values[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[1].speed_values[0].speed_synonym[0] "\""high"\""
test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[1].speed_values[0].speed_synonym[1] "\""fast"\""
test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[1].speed_values[0].speed_synonym[2] null

test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[1].speed_values[1].lang "\""it"\""
test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[1].speed_values[1].speed_synonym[0] "\""veloce"\""
test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[1].speed_values[1].speed_synonym[1] "\""massimo"\""
test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[1].speed_values[1].speed_synonym[2] null

test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[1].speed_values[2] null

test_sync .payload.devices[0].attributes.availableFanSpeeds.speeds[2] null
test_sync .payload.devices[0].attributes.availableFanSpeeds.ordered true


# availableFillLevels
test_sync .payload.devices[0].attributes.availableFillLevels.levels[0].level_name "\""half_level"\""
test_sync .payload.devices[0].attributes.availableFillLevels.levels[0].level_values[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.availableFillLevels.levels[0].level_values[0].level_synonym[0] "\""half"\""
test_sync .payload.devices[0].attributes.availableFillLevels.levels[0].level_values[0].level_synonym[1] "\""half\ way"\""
test_sync .payload.devices[0].attributes.availableFillLevels.levels[0].level_values[0].level_synonym[2] "\""one\ half"\""
test_sync .payload.devices[0].attributes.availableFillLevels.levels[0].level_values[0].level_synonym[3] null
test_sync .payload.devices[0].attributes.availableFillLevels.levels[0].level_values[1] null

test_sync .payload.devices[0].attributes.availableFillLevels.levels[1].level_name "\""full_level"\""
test_sync .payload.devices[0].attributes.availableFillLevels.levels[1].level_values[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.availableFillLevels.levels[1].level_values[0].level_synonym[0] "\""full"\""
test_sync .payload.devices[0].attributes.availableFillLevels.levels[1].level_values[0].level_synonym[1] "\""all\ the\ way"\""
test_sync .payload.devices[0].attributes.availableFillLevels.levels[1].level_values[0].level_synonym[2] "\""complete"\""
test_sync .payload.devices[0].attributes.availableFillLevels.levels[1].level_values[0].level_synonym[3] null
test_sync .payload.devices[0].attributes.availableFillLevels.levels[1].level_values[1] null

test_sync .payload.devices[0].attributes.availableFillLevels.levels[2] null

test_sync .payload.devices[0].attributes.availableFillLevels.ordered true
test_sync .payload.devices[0].attributes.availableFillLevels.supportsFillPercent false

test_sync .payload.devices[0].attributes.humiditySetpointRange.minPercent 0
test_sync .payload.devices[0].attributes.humiditySetpointRange.maxPercent 100

test_sync .payload.devices[0].attributes.commandOnlyHumiditySetting false
test_sync .payload.devices[0].attributes.queryOnlyHumiditySetting false


# availableInputs
test_sync .payload.devices[0].attributes.availableInputs[0].key "\""hdmi\ 1"\""
test_sync .payload.devices[0].attributes.availableInputs[0].names[0].lang "\""it"\""
test_sync .payload.devices[0].attributes.availableInputs[0].names[0].name_synonym[0] "\""hdmi\ 1"\""
test_sync .payload.devices[0].attributes.availableInputs[0].names[0].name_synonym[1] null
test_sync .payload.devices[0].attributes.availableInputs[0].names[1] null

test_sync .payload.devices[0].attributes.availableInputs[1].key "\""hdmi_2"\""
test_sync .payload.devices[0].attributes.availableInputs[1].names[0].lang "\""it"\""
test_sync .payload.devices[0].attributes.availableInputs[1].names[0].name_synonym[0] "\""hdmi\ 2"\""
test_sync .payload.devices[0].attributes.availableInputs[1].names[0].name_synonym[1] "\""Second\ HDMI"\""
test_sync .payload.devices[0].attributes.availableInputs[1].names[0].name_synonym[2] "\""DVD\ Reader"\""
test_sync .payload.devices[0].attributes.availableInputs[1].names[0].name_synonym[3] "\""DVD"\""
test_sync .payload.devices[0].attributes.availableInputs[1].names[0].name_synonym[4] null
test_sync .payload.devices[0].attributes.availableInputs[1].names[1] null

test_sync .payload.devices[0].attributes.availableInputs[2].key "\""hdmi\ 3"\""
test_sync .payload.devices[0].attributes.availableInputs[2].names[0].lang "\""it"\""
test_sync .payload.devices[0].attributes.availableInputs[2].names[0].name_synonym[0] "\""hdmi\ 3"\""
test_sync .payload.devices[0].attributes.availableInputs[2].names[0].name_synonym[1] "\""Third\ HDMI"\""
test_sync .payload.devices[0].attributes.availableInputs[2].names[0].name_synonym[2] "\""Playstation\ 5"\""
test_sync .payload.devices[0].attributes.availableInputs[2].names[0].name_synonym[3] "\""PS5"\""
test_sync .payload.devices[0].attributes.availableInputs[2].names[0].name_synonym[4] null
test_sync .payload.devices[0].attributes.availableInputs[2].names[1] null

test_sync .payload.devices[0].attributes.availableInputs[3] null

test_sync .payload.devices[0].attributes.commandOnlyInputSelector false
test_sync .payload.devices[0].attributes.orderedInputs false
test_sync .payload.devices[0].attributes.defaultSleepDuration 1800
test_sync .payload.devices[0].attributes.defaultWakeDuration 1800

# supportedEffects

test_sync .payload.devices[0].attributes.supportActivityState false
test_sync .payload.devices[0].attributes.supportPlaybackState false

# availableModes
test_sync .payload.devices[0].attributes.availableModes[0].name "\""load_mode"\""
test_sync .payload.devices[0].attributes.availableModes[0].name_values[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.availableModes[0].name_values[0].name_synonym[0] "\""load"\""
test_sync .payload.devices[0].attributes.availableModes[0].name_values[0].name_synonym[1] "\""size"\""
test_sync .payload.devices[0].attributes.availableModes[0].name_values[0].name_synonym[2] "\""load\ size"\""
test_sync .payload.devices[0].attributes.availableModes[0].name_values[0].name_synonym[3] null
test_sync .payload.devices[0].attributes.availableModes[0].name_values[1] null

test_sync .payload.devices[0].attributes.availableModes[0].settings[0].setting_name "\""small_load"\""
test_sync .payload.devices[0].attributes.availableModes[0].settings[0].setting_values[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.availableModes[0].settings[0].setting_values[0].setting_synonym[0] "\""small"\""
test_sync .payload.devices[0].attributes.availableModes[0].settings[0].setting_values[0].setting_synonym[1] "\""half"\""
test_sync .payload.devices[0].attributes.availableModes[0].settings[0].setting_values[0].setting_synonym[2] null
test_sync .payload.devices[0].attributes.availableModes[0].settings[0].setting_values[1] null
test_sync .payload.devices[0].attributes.availableModes[0].settings[1].setting_name "\""medium_load"\""
test_sync .payload.devices[0].attributes.availableModes[0].settings[1].setting_values[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.availableModes[0].settings[1].setting_values[0].setting_synonym[0] "\""medium"\""
test_sync .payload.devices[0].attributes.availableModes[0].settings[1].setting_values[0].setting_synonym[1] "\""normal"\""
test_sync .payload.devices[0].attributes.availableModes[0].settings[1].setting_values[0].setting_synonym[2] null
test_sync .payload.devices[0].attributes.availableModes[0].settings[1].setting_values[1] null
test_sync .payload.devices[0].attributes.availableModes[0].settings[2].setting_name "\""large_load"\""
test_sync .payload.devices[0].attributes.availableModes[0].settings[2].setting_values[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.availableModes[0].settings[2].setting_values[0].setting_synonym[0] "\""large"\""
test_sync .payload.devices[0].attributes.availableModes[0].settings[2].setting_values[0].setting_synonym[1] "\""full"\""
test_sync .payload.devices[0].attributes.availableModes[0].settings[2].setting_values[0].setting_synonym[2] null
test_sync .payload.devices[0].attributes.availableModes[0].settings[2].setting_values[1] null
test_sync .payload.devices[0].attributes.availableModes[0].settings[3] null
test_sync .payload.devices[0].attributes.availableModes[0].ordered true

test_sync .payload.devices[0].attributes.availableModes[1].name "\""temp_mode"\""
test_sync .payload.devices[0].attributes.availableModes[1].name_values[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.availableModes[1].name_values[0].name_synonym[0] "\""temperature"\""
test_sync .payload.devices[0].attributes.availableModes[1].name_values[0].name_synonym[1] "\""temp"\""
test_sync .payload.devices[0].attributes.availableModes[1].name_values[0].name_synonym[2] null
test_sync .payload.devices[0].attributes.availableModes[1].name_values[1] null

test_sync .payload.devices[0].attributes.availableModes[1].settings[0].setting_name "\""hot_temp"\""
test_sync .payload.devices[0].attributes.availableModes[1].settings[0].setting_values[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.availableModes[1].settings[0].setting_values[0].setting_synonym[0] "\""hot"\""
test_sync .payload.devices[0].attributes.availableModes[1].settings[0].setting_values[0].setting_synonym[1] "\""white"\""
test_sync .payload.devices[0].attributes.availableModes[1].settings[0].setting_values[0].setting_synonym[2] null
test_sync .payload.devices[0].attributes.availableModes[1].settings[0].setting_values[1] null
test_sync .payload.devices[0].attributes.availableModes[1].settings[1].setting_name "\""warm_temp"\""
test_sync .payload.devices[0].attributes.availableModes[1].settings[1].setting_values[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.availableModes[1].settings[1].setting_values[0].setting_synonym[0] "\""warm"\""
test_sync .payload.devices[0].attributes.availableModes[1].settings[1].setting_values[0].setting_synonym[1] "\""color"\""
test_sync .payload.devices[0].attributes.availableModes[1].settings[1].setting_values[0].setting_synonym[2] null
test_sync .payload.devices[0].attributes.availableModes[1].settings[1].setting_values[1] null
test_sync .payload.devices[0].attributes.availableModes[1].settings[2].setting_name "\""cold_temp"\""
test_sync .payload.devices[0].attributes.availableModes[1].settings[2].setting_values[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.availableModes[1].settings[2].setting_values[0].setting_synonym[0] "\""cold"\""
test_sync .payload.devices[0].attributes.availableModes[1].settings[2].setting_values[0].setting_synonym[1] "\""delicate"\""
test_sync .payload.devices[0].attributes.availableModes[1].settings[2].setting_values[0].setting_synonym[2] null
test_sync .payload.devices[0].attributes.availableModes[1].settings[2].setting_values[1] null
test_sync .payload.devices[0].attributes.availableModes[1].settings[3] null
test_sync .payload.devices[0].attributes.availableModes[1].ordered false

test_sync .payload.devices[0].attributes.availableModes[2] null


test_sync .payload.devices[0].attributes.commandOnlyModes false
test_sync .payload.devices[0].attributes.queryOnlyModes false
test_sync .payload.devices[0].attributes.supportsEnablingGuestNetwork false
test_sync .payload.devices[0].attributes.supportsDisablingGuestNetwork false
test_sync .payload.devices[0].attributes.supportsGettingGuestNetworkPassword false
test_sync .payload.devices[0].attributes.networkProfiles[0] "\""Kids"\""
test_sync .payload.devices[0].attributes.networkProfiles[1] null

test_sync .payload.devices[0].attributes.supportsEnablingNetworkProfile false
test_sync .payload.devices[0].attributes.supportsDisablingNetworkProfile false
test_sync .payload.devices[0].attributes.supportsNetworkDownloadSpeedTest false
test_sync .payload.devices[0].attributes.supportsNetworkUploadSpeedTest false
test_sync .payload.devices[0].attributes.commandOnlyOnOff false
test_sync .payload.devices[0].attributes.queryOnlyOnOff false
test_sync .payload.devices[0].attributes.discreteOnlyOpenClose false

test_sync .payload.devices[0].attributes.openDirection[0] "\""UP"\""
test_sync .payload.devices[0].attributes.openDirection[1] "\""DOWN"\""
test_sync .payload.devices[0].attributes.openDirection[2] "\""LEFT"\""
test_sync .payload.devices[0].attributes.openDirection[3] "\""RIGHT"\""
test_sync .payload.devices[0].attributes.openDirection[4] "\""IN"\""
test_sync .payload.devices[0].attributes.openDirection[5] "\""OUT"\""
test_sync .payload.devices[0].attributes.openDirection[6] null

test_sync .payload.devices[0].attributes.commandOnlyOpenClose false
test_sync .payload.devices[0].attributes.queryOnlyOpenClose false
test_sync .payload.devices[0].attributes.supportsDegrees true
test_sync .payload.devices[0].attributes.supportsPercent true
test_sync .payload.devices[0].attributes.rotationDegreesRange[0].rotationDegreesMin 0
test_sync .payload.devices[0].attributes.rotationDegreesRange[0].rotationDegreesMax 360
test_sync .payload.devices[0].attributes.rotationDegreesRange[1] null

test_sync .payload.devices[0].attributes.supportsContinuousRotation false
test_sync .payload.devices[0].attributes.commandOnlyRotation false

# sensorStatesSupported
# TODO descriptiveCapabilities numericCapabilities
test_sync .payload.devices[0].attributes.sensorStatesSupported[0].name "\""AirQuality"\""
test_sync .payload.devices[0].attributes.sensorStatesSupported[1].name "\""CarbonMonoxideLevel"\""
test_sync .payload.devices[0].attributes.sensorStatesSupported[2].name "\""SmokeLevel"\""
test_sync .payload.devices[0].attributes.sensorStatesSupported[3].name "\""FilterCleanliness"\""
test_sync .payload.devices[0].attributes.sensorStatesSupported[4].name "\""WaterLeak"\""
test_sync .payload.devices[0].attributes.sensorStatesSupported[5].name "\""RainDetection"\""
test_sync .payload.devices[0].attributes.sensorStatesSupported[6].name "\""FilterLifeTime"\""
test_sync .payload.devices[0].attributes.sensorStatesSupported[7].name "\""PreFilterLifeTime"\""
test_sync .payload.devices[0].attributes.sensorStatesSupported[8].name "\""HEPAFilterLifeTime"\""
test_sync .payload.devices[0].attributes.sensorStatesSupported[9].name "\""Max2FilterLifeTime"\""
test_sync .payload.devices[0].attributes.sensorStatesSupported[10].name "\""CarbonDioxideLevel"\""
test_sync .payload.devices[0].attributes.sensorStatesSupported[11].name "\""PM2.5"\""
test_sync .payload.devices[0].attributes.sensorStatesSupported[12].name "\""PM10"\""
test_sync .payload.devices[0].attributes.sensorStatesSupported[13].name "\""VolatileOrganicCompounds"\""
test_sync .payload.devices[0].attributes.sensorStatesSupported[14] null

test_sync .payload.devices[0].attributes.pausable false

test_sync .payload.devices[0].attributes.availableZones[0] "\""Cucina"\""
test_sync .payload.devices[0].attributes.availableZones[1] "\""Salotto"\""
test_sync .payload.devices[0].attributes.availableZones[2] "\""Camera\ di\ Eliana"\""
test_sync .payload.devices[0].attributes.availableZones[3] "\""Soggiorno"\""
test_sync .payload.devices[0].attributes.availableZones[4] null

test_sync .payload.devices[0].attributes.temperatureRange.minThresholdCelsius 0
test_sync .payload.devices[0].attributes.temperatureRange.maxThresholdCelsius 40

test_sync .payload.devices[0].attributes.temperatureStepCelsius 1
test_sync .payload.devices[0].attributes.temperatureUnitForUX "\""C"\""
test_sync .payload.devices[0].attributes.commandOnlyTemperatureControl false
test_sync .payload.devices[0].attributes.queryOnlyTemperatureControl false

test_sync .payload.devices[0].attributes.availableThermostatModes[0] "\""off"\""
test_sync .payload.devices[0].attributes.availableThermostatModes[1] "\""heat"\""
test_sync .payload.devices[0].attributes.availableThermostatModes[2] "\""cool"\""
test_sync .payload.devices[0].attributes.availableThermostatModes[3] "\""on"\""
test_sync .payload.devices[0].attributes.availableThermostatModes[4] "\""heatcool"\""
test_sync .payload.devices[0].attributes.availableThermostatModes[5] "\""auto"\""
test_sync .payload.devices[0].attributes.availableThermostatModes[6] "\""fan-only"\""
test_sync .payload.devices[0].attributes.availableThermostatModes[7] "\""purifier"\""
test_sync .payload.devices[0].attributes.availableThermostatModes[8] "\""eco"\""
test_sync .payload.devices[0].attributes.availableThermostatModes[9] "\""dry"\""
test_sync .payload.devices[0].attributes.availableThermostatModes[10] null

test_sync .payload.devices[0].attributes.thermostatTemperatureRange.minThresholdCelsius 1
test_sync .payload.devices[0].attributes.thermostatTemperatureRange.maxThresholdCelsius 50

test_sync .payload.devices[0].attributes.thermostatTemperatureUnit "\""C"\""
test_sync .payload.devices[0].attributes.bufferRangeCelsius 2
test_sync .payload.devices[0].attributes.commandOnlyTemperatureSetting false
test_sync .payload.devices[0].attributes.queryOnlyTemperatureSetting false
test_sync .payload.devices[0].attributes.maxTimerLimitSec 86400
test_sync .payload.devices[0].attributes.commandOnlyTimer false

# availableToggles
test_sync .payload.devices[0].attributes.availableToggles[0].name "\""quiet"\""
test_sync .payload.devices[0].attributes.availableToggles[0].name_values[0].lang "\""it"\""
test_sync .payload.devices[0].attributes.availableToggles[0].name_values[0].name_synonym[0] "\""quiet"\""
test_sync .payload.devices[0].attributes.availableToggles[0].name_values[0].name_synonym[1] null
test_sync .payload.devices[0].attributes.availableToggles[0].name_values[1] null

test_sync .payload.devices[0].attributes.availableToggles[1].name "\""Silenzio"\""
test_sync .payload.devices[0].attributes.availableToggles[1].name_values[0].lang "\""it"\""
test_sync .payload.devices[0].attributes.availableToggles[1].name_values[0].name_synonym[0] "\""Silenzio"\""
test_sync .payload.devices[0].attributes.availableToggles[1].name_values[0].name_synonym[1] "\""Basso"\""
test_sync .payload.devices[0].attributes.availableToggles[1].name_values[0].name_synonym[2] null
test_sync .payload.devices[0].attributes.availableToggles[1].name_values[1] null

test_sync .payload.devices[0].attributes.availableToggles[2].name "\""extra_bass"\""
test_sync .payload.devices[0].attributes.availableToggles[2].name_values[0].lang "\""it"\""
test_sync .payload.devices[0].attributes.availableToggles[2].name_values[0].name_synonym[0] "\""Extra\ bass"\""
test_sync .payload.devices[0].attributes.availableToggles[2].name_values[0].name_synonym[1] "\""Loud\ bass"\""
test_sync .payload.devices[0].attributes.availableToggles[2].name_values[0].name_synonym[2] "\""Powerful\ bass"\""
test_sync .payload.devices[0].attributes.availableToggles[2].name_values[0].name_synonym[3] null
test_sync .payload.devices[0].attributes.availableToggles[2].name_values[1] null

test_sync .payload.devices[0].attributes.availableToggles[3].name "\""Energy\ Saving"\""
test_sync .payload.devices[0].attributes.availableToggles[3].name_values[0].lang "\""it"\""
test_sync .payload.devices[0].attributes.availableToggles[3].name_values[0].name_synonym[0] "\""Energy\ Saving"\""
test_sync .payload.devices[0].attributes.availableToggles[3].name_values[0].name_synonym[1] "\""Low\ Energy"\""
test_sync .payload.devices[0].attributes.availableToggles[3].name_values[0].name_synonym[2] null
test_sync .payload.devices[0].attributes.availableToggles[3].name_values[1] null

test_sync .payload.devices[0].attributes.availableToggles[4].name "\""extra_bass1"\""
test_sync .payload.devices[0].attributes.availableToggles[4].name_values[0].lang "\""en"\""
test_sync .payload.devices[0].attributes.availableToggles[4].name_values[0].name_synonym[0] "\""Extra\ bass"\""
test_sync .payload.devices[0].attributes.availableToggles[4].name_values[0].name_synonym[1] "\""Loud\ bass"\""
test_sync .payload.devices[0].attributes.availableToggles[4].name_values[0].name_synonym[2] "\""Powerful\ bass"\""
test_sync .payload.devices[0].attributes.availableToggles[4].name_values[0].name_synonym[3] null
test_sync .payload.devices[0].attributes.availableToggles[4].name_values[1] null

test_sync .payload.devices[0].attributes.availableToggles[5] null

test_sync .payload.devices[0].attributes.commandOnlyToggles false
test_sync .payload.devices[0].attributes.queryOnlyToggles false

test_sync .payload.devices[0].attributes.transportControlSupportedCommands[0] "\""CAPTION_CONTROL"\""
test_sync .payload.devices[0].attributes.transportControlSupportedCommands[1] "\""NEXT"\""
test_sync .payload.devices[0].attributes.transportControlSupportedCommands[2] "\""PAUSE"\""
test_sync .payload.devices[0].attributes.transportControlSupportedCommands[3] "\""PREVIOUS"\""
test_sync .payload.devices[0].attributes.transportControlSupportedCommands[4] "\""RESUME"\""
test_sync .payload.devices[0].attributes.transportControlSupportedCommands[5] "\""SEEK_RELATIVE"\""
test_sync .payload.devices[0].attributes.transportControlSupportedCommands[6] "\""SEEK_TO_POSITION"\""
test_sync .payload.devices[0].attributes.transportControlSupportedCommands[7] "\""SET_REPEAT"\""
test_sync .payload.devices[0].attributes.transportControlSupportedCommands[8] "\""SHUFFLE"\""
test_sync .payload.devices[0].attributes.transportControlSupportedCommands[9] "\""STOP"\""
test_sync .payload.devices[0].attributes.transportControlSupportedCommands[10] null

test_sync .payload.devices[0].attributes.volumeMaxLevel 100
test_sync .payload.devices[0].attributes.volumeCanMuteAndUnmute true
test_sync .payload.devices[0].attributes.volumeDefaultPercentage 40
test_sync .payload.devices[0].attributes.levelStepSize 1
test_sync .payload.devices[0].attributes.commandOnlyVolume false

echo


execute_payload fake_topic1 '{"online":false,"isArmed":false,"currentApplication":"video","currentArmLevel":"L1","color":{"temperatureK":9000},"currentCookingMode":"NONE","dispenseItems":[{"itemName":"water","amountRemaining":{"amount":10,"unit":"NO_UNITS"},"amountLastDispensed":{"amount":11,"unit":"NO_UNITS"},"isCurrentlyDispensing":false},{"itemName":"cat_bowl","amountRemaining":{"amount":12,"unit":"NO_UNITS"},"amountLastDispensed":{"amount":13,"unit":"NO_UNITS"},"isCurrentlyDispensing":false},{"itemName":"glass_1","amountRemaining":{"amount":14,"unit":"NO_UNITS"},"amountLastDispensed":{"amount":15,"unit":"NO_UNITS"},"isCurrentlyDispensing":false}],"descriptiveCapacityRemaining":"FULL","capacityRemaining":[],"capacityUntilFull":[],"isPluggedIn":false,"currentFanSpeedPercent":0,"isFilled":false,"currentFillLevel":"half_level","currentInput":"hdmi 1","activeLightEffect":"colorLoop","currentModeSettings":{"load_mode":"large_load","temp_mode":"cold_temp"},"openState":[{"openPercent":0,"openDirection":"UP"},{"openPercent":0,"openDirection":"DOWN"},{"openPercent":0,"openDirection":"LEFT"},{"openPercent":0,"openDirection":"RIGHT"},{"openPercent":0,"openDirection":"IN"},{"openPercent":0,"openDirection":"OUT"}],"currentRunCycle":[{"currentCycle":"unknown","lang":"en"}],"currentTotalRemainingTime":0,"currentCycleRemainingTime":0,"currentSensorStateData":[{"name":"AirQuality","currentSensorState":"unknown","rawValue":0},{"name":"CarbonMonoxideLevel","currentSensorState":"unknown","rawValue":0},{"name":"SmokeLevel","currentSensorState":"unknown","rawValue":0},{"name":"FilterCleanliness","currentSensorState":"unknown"},{"name":"WaterLeak","currentSensorState":"unknown"},{"name":"RainDetection","currentSensorState":"unknown"},{"name":"FilterLifeTime","currentSensorState":"unknown","rawValue":0},{"name":"PreFilterLifeTime","rawValue":0},{"name":"HEPAFilterLifeTime","rawValue":0},{"name":"Max2FilterLifeTime","rawValue":0},{"name":"CarbonDioxideLevel","rawValue":0},{"name":"PM2.5","rawValue":0},{"name":"PM10","rawValue":0},{"name":"VolatileOrganicCompounds","rawValue":0}],"lastSoftwareUpdateUnixTimestampSec":0,"isRunning":false,"currentStatusReport":[],"temperatureSetpointCelsius":0,"thermostatMode":"off","thermostatTemperatureAmbient":1,"thermostatTemperatureSetpoint":1,"timerRemainingSec":-1,"currentToggleSettings":{"quiet":false,"extra_bass":false,"Energy Saving":false},"currentVolume":40,"on":true,"isDocked":false}'

execute_payload fake_topic2 '{"online":true,"isArmed":false,"currentApplication":"video","currentArmLevel":"L2","color":{"temperatureK":9000},"currentCookingMode":"NONE","dispenseItems":[{"itemName":"water","amountRemaining":{"amount":10,"unit":"NO_UNITS"},"amountLastDispensed":{"amount":11,"unit":"NO_UNITS"},"isCurrentlyDispensing":false},{"itemName":"cat_bowl","amountRemaining":{"amount":12,"unit":"NO_UNITS"},"amountLastDispensed":{"amount":13,"unit":"NO_UNITS"},"isCurrentlyDispensing":false},{"itemName":"glass_1","amountRemaining":{"amount":14,"unit":"NO_UNITS"},"amountLastDispensed":{"amount":15,"unit":"NO_UNITS"},"isCurrentlyDispensing":false}],"descriptiveCapacityRemaining":"FULL","capacityRemaining":[],"capacityUntilFull":[],"isPluggedIn":false,"currentFanSpeedPercent":0,"isFilled":false,"currentFillLevel":"full_level","currentInput":"hdmi 1","activeLightEffect":"sleep","currentModeSettings":{"load_mode":"small_load","temp_mode":"warm_temp"},"openState":[{"openPercent":0,"openDirection":"UP"},{"openPercent":0,"openDirection":"DOWN"},{"openPercent":0,"openDirection":"LEFT"},{"openPercent":0,"openDirection":"RIGHT"},{"openPercent":0,"openDirection":"IN"},{"openPercent":0,"openDirection":"OUT"}],"currentRunCycle":[{"currentCycle":"unknown","lang":"en"}],"currentTotalRemainingTime":0,"currentCycleRemainingTime":0,"currentSensorStateData":[{"name":"AirQuality","currentSensorState":"unknown","rawValue":0},{"name":"CarbonMonoxideLevel","currentSensorState":"unknown","rawValue":0},{"name":"SmokeLevel","currentSensorState":"unknown","rawValue":0},{"name":"FilterCleanliness","currentSensorState":"unknown"},{"name":"WaterLeak","currentSensorState":"unknown"},{"name":"RainDetection","currentSensorState":"unknown"},{"name":"FilterLifeTime","currentSensorState":"unknown","rawValue":0},{"name":"PreFilterLifeTime","rawValue":0},{"name":"HEPAFilterLifeTime","rawValue":0},{"name":"Max2FilterLifeTime","rawValue":0},{"name":"CarbonDioxideLevel","rawValue":0},{"name":"PM2.5","rawValue":0},{"name":"PM10","rawValue":0},{"name":"VolatileOrganicCompounds","rawValue":0}],"lastSoftwareUpdateUnixTimestampSec":0,"isRunning":false,"currentStatusReport":[],"temperatureSetpointCelsius":0,"thermostatMode":"off","thermostatTemperatureAmbient":1,"thermostatTemperatureSetpoint":1,"timerRemainingSec":-1,"currentToggleSettings":{"quiet":false,"extra_bass":false,"Energy Saving":false},"currentVolume":40,"on":true,"isDocked":false}'
test_payload .online true
test_payload .isArmed false
test_payload .currentArmLevel '"L2"'
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
test_payload .capacityRemaining null # '[]'
test_payload .capacityUntilFull null # '[]'
test_payload .isPluggedIn false
test_payload .currentFanSpeedPercent 0
test_payload .isFilled false
test_payload .currentFillLevel '"full_level"'
test_payload .currentInput '"hdmi 1"'
test_payload .activeLightEffect '"sleep"'
test_payload .currentModeSettings.load_mode '"small_load"'
test_payload .currentModeSettings.temp_mode '"warm_temp"'
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
test_payload .openState[6] null
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
test_payload .currentSensorStateData[14] null
test_payload .lastSoftwareUpdateUnixTimestampSec 0
test_payload .isRunning false
test_payload .currentStatusReport null # '[]'
test_payload .temperatureSetpointCelsius 0
test_payload .thermostatMode '"off"'
test_payload .thermostatTemperatureAmbient 1
test_payload .thermostatTemperatureSetpoint 1
test_payload .timerRemainingSec -1
test_payload .currentToggleSettings.quiet false
test_payload .currentToggleSettings.extra_bass false
test_payload '.currentToggleSettings."Energy Saving"' false
test_payload .currentToggleSettings.Silenzio false
test_payload .currentToggleSettings.extra_bass1 false
test_payload .currentVolume 40
test_payload .on true
test_payload .isDocked false

execute_payload fake_topic3 '{"on":true, "isDocked":null}'
test_payload .isDocked null
test_payload .on true

execute_payload fake_topic4 '{"on":false, "isDocked":false}'
test_payload .isDocked false
test_payload .on false

execute_payload fake_topic5 '{"on":true, "isDocked":null}'
test_payload .on true
test_payload .isDocked null

execute_payload null '{"currentStatusReport":[]}'
test_payload .currentStatusReport null # '[]'

execute_payload currentStatusReport '[]'
test_payload .currentStatusReport null # '[]'
test_payload .currentStatusReport null # '[]'

execute_payload null '{"currentStatusReport":[{"blocking":false,"deviceTarget":"PIPPO","priority":0,"statusCode":"lowBattery"}]}'
test_payload .currentStatusReport null # '[]'

execute_payload null '{"currentStatusReport":[{"blocking":false,"deviceTarget":"Garage","priority":0,"statusCode":"lowBattery"}, {"blocking":false,"deviceTarget":"Ingresso","priority":0,"statusCode":"lowBattery"}]}'
test_payload .currentStatusReport null # '[]'

execute_payload null '{"currentStatusReport":[{"blocking":false,"deviceTarget":"MultiDevice Cucina","priority":0,"statusCode":"allBattery"}]}'
test_payload .currentStatusReport[0].blocking false
test_payload .currentStatusReport[0].priority 0
test_payload .currentStatusReport[0].statusCode '"allBattery"'
test_payload .currentStatusReport[0].deviceTarget "\"$NODE_ID\""
test_payload .currentStatusReport[1] null

execute_payload currentStatusReport '[{"blocking":true,"deviceTarget":"MultiDevice Cucina","priority":1,"statusCode":"lowBattery"}]'
test_payload .currentStatusReport[0].blocking true
test_payload .currentStatusReport[0].priority 1
test_payload .currentStatusReport[0].statusCode '"lowBattery"'
test_payload .currentStatusReport[0].deviceTarget "\"$NODE_ID\""
test_payload .currentStatusReport[1] null

execute_payload StatusReport '[{"blocking":false,"deviceTarget":"MultiDevice Cucina","priority":2,"statusCode":"okBattery"}]'
test_payload .currentStatusReport[0].blocking true
test_payload .currentStatusReport[0].priority 1
test_payload .currentStatusReport[0].statusCode '"lowBattery"'
test_payload .currentStatusReport[0].deviceTarget "\"$NODE_ID\""
test_payload .currentStatusReport[1].blocking false
test_payload .currentStatusReport[1].priority 2
test_payload .currentStatusReport[1].statusCode '"okBattery"'
test_payload .currentStatusReport[1].deviceTarget "\"$NODE_ID\""
test_payload .currentStatusReport[2] null

execute_payload StatusReport '[{"blocking":false,"deviceTarget":"MultiDevice Cucina","priority":3,"statusCode":"okBattery"}]'
test_payload .currentStatusReport[0].blocking true
test_payload .currentStatusReport[0].priority 1
test_payload .currentStatusReport[0].statusCode '"lowBattery"'
test_payload .currentStatusReport[0].deviceTarget "\"$NODE_ID\""
test_payload .currentStatusReport[1].blocking false
test_payload .currentStatusReport[1].priority 3
test_payload .currentStatusReport[1].statusCode '"okBattery"'
test_payload .currentStatusReport[1].deviceTarget "\"$NODE_ID\""
test_payload .currentStatusReport[2] null

execute_payload StatusReport '[]'
test_payload .currentStatusReport[0].blocking true
test_payload .currentStatusReport[0].priority 1
test_payload .currentStatusReport[0].statusCode '"lowBattery"'
test_payload .currentStatusReport[0].deviceTarget "\"$NODE_ID\""
test_payload .currentStatusReport[1].blocking false
test_payload .currentStatusReport[1].priority 3
test_payload .currentStatusReport[1].statusCode '"okBattery"'
test_payload .currentStatusReport[1].deviceTarget "\"$NODE_ID\""
test_payload .currentStatusReport[2] null

execute_payload StatusReport '[{"blocking":false,"deviceTarget":"MultiDevice Salotto","priority":4,"statusCode":"lowBattery"}]'
test_payload .currentStatusReport[0].blocking true
test_payload .currentStatusReport[0].priority 1
test_payload .currentStatusReport[0].statusCode '"lowBattery"'
test_payload .currentStatusReport[0].deviceTarget "\"$NODE_ID\""
test_payload .currentStatusReport[1].blocking false
test_payload .currentStatusReport[1].priority 3
test_payload .currentStatusReport[1].statusCode '"okBattery"'
test_payload .currentStatusReport[1].deviceTarget "\"$NODE_ID\""
test_payload .currentStatusReport[2].blocking false
test_payload .currentStatusReport[2].priority 4
test_payload .currentStatusReport[2].statusCode '"lowBattery"'
test_payload .currentStatusReport[2].deviceTarget "\"$NODE_ID1\""
test_payload .currentStatusReport[3] null

execute_payload capacityRemaining '[{"unit":"SECONDS","rawValue":61}]'
test_payload .capacityRemaining[0].unit '"SECONDS"'
test_payload .capacityRemaining[0].rawValue 61
test_payload .capacityRemaining[1] null

execute_payload capacityUntilFull '[{"unit":"PERCENTAGE","rawValue":7}]'
test_payload .capacityUntilFull[0].unit '"PERCENTAGE"'
test_payload .capacityUntilFull[0].rawValue 7
test_payload .capacityUntilFull[1] null

execute_payload capacityRemaining '[{"unit":"SECONDS","rawValue":70},{"unit":"KILOMETERS","rawValue":27}]'
test_payload .capacityRemaining[0].unit '"SECONDS"'
test_payload .capacityRemaining[0].rawValue 70
test_payload .capacityRemaining[1].unit '"KILOMETERS"'
test_payload .capacityRemaining[1].rawValue 27
test_payload .capacityRemaining[2] null
test_payload .capacityUntilFull[0].unit '"PERCENTAGE"'
test_payload .capacityUntilFull[0].rawValue 7
test_payload .capacityUntilFull[1] null

execute_payload capacityUntilFull '[{"unit":"SECONDS","rawValue":60}]'
test_payload .capacityUntilFull[0].unit '"SECONDS"'
test_payload .capacityUntilFull[0].rawValue 60
test_payload .capacityUntilFull[1] null
test_payload .capacityRemaining[0].unit '"SECONDS"'
test_payload .capacityRemaining[0].rawValue 70
test_payload .capacityRemaining[1].unit '"KILOMETERS"'
test_payload .capacityRemaining[1].rawValue 27
test_payload .capacityRemaining[2] null

execute_payload capacityRemaining '[{"unit":"PERCENTAGE","rawValue":7}]'
test_payload .capacityRemaining[0].unit '"PERCENTAGE"'
test_payload .capacityRemaining[0].rawValue 7
test_payload .capacityRemaining[1] null
test_payload .capacityUntilFull[0].unit '"SECONDS"'
test_payload .capacityUntilFull[0].rawValue 60
test_payload .capacityUntilFull[1] null

execute_payload capacityUntilFull '[{"unit":"SECONDS","rawValue":72},{"unit":"KILOMETERS","rawValue":29}]'
test_payload .capacityUntilFull[0].unit '"SECONDS"'
test_payload .capacityUntilFull[0].rawValue 72
test_payload .capacityUntilFull[1].unit '"KILOMETERS"'
test_payload .capacityUntilFull[1].rawValue 29
test_payload .capacityUntilFull[2] null
test_payload .capacityRemaining[0].unit '"PERCENTAGE"'
test_payload .capacityRemaining[0].rawValue 7
test_payload .capacityRemaining[1] null

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
test_payload .openState[6] null

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
test_payload .openState[6] null

execute_payload currentRunCycle '[{"currentCycle":"Riscaldamento piatto","nextCycle":"Riscaldamento ugello","lang":"it"},{"currentCycle":"Nozzle heating","nextCycle":"Print","lang":"en"}]'
test_payload .currentRunCycle[0].currentCycle '"Riscaldamento piatto"'
test_payload .currentRunCycle[0].nextCycle '"Riscaldamento ugello"'
test_payload .currentRunCycle[0].lang '"it"'
test_payload .currentRunCycle[1].currentCycle '"Nozzle heating"'
test_payload .currentRunCycle[1].nextCycle '"Print"'
test_payload .currentRunCycle[1].lang '"en"'
test_payload .currentRunCycle[2] null

execute_payload currentRunCycle '[{"currentCycle":"Stampa"}]'
test_payload .currentRunCycle[0].currentCycle '"Stampa"'
test_payload .currentRunCycle[0].nextCycle null
test_payload .currentRunCycle[0].lang '"it"'
test_payload .currentRunCycle[1] null

execute_payload currentSensorStateData '[{"name":"CarbonMonoxideLevel","currentSensorState":"no carbon monoxide detected","rawValue":7}]'
test_payload .currentSensorStateData[0].name '"AirQuality"'
test_payload .currentSensorStateData[0].currentSensorState '"unknown"'
test_payload .currentSensorStateData[0].rawValue 0
test_payload .currentSensorStateData[1].name '"CarbonMonoxideLevel"'
test_payload .currentSensorStateData[1].currentSensorState '"no carbon monoxide detected"'
test_payload .currentSensorStateData[1].rawValue 7
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
test_payload .currentSensorStateData[14] null

execute_payload activeZones '["Cucina", "Salotto"]'
test_payload .activeZones[0] '"Cucina"'
test_payload .activeZones[1] '"Salotto"'
test_payload .activeZones[2] null

execute_payload activeZones '["Cucina", "Salotto", "Soggiorno"]'
test_payload .activeZones[0] '"Cucina"'
test_payload .activeZones[1] '"Salotto"'
test_payload .activeZones[2] '"Soggiorno"'
test_payload .activeZones[3] null

execute_payload activeZones '["Bagno"]'
test_payload .activeZones[0] null

execute_payload activeZones '["Bagno", "Salotto", "Garage"]'
test_payload .activeZones[0] '"Salotto"'
test_payload .activeZones[1] null

execute_payload errorCode '"inSoftwareUpdate"'
execute_error $NODE_ID appInstall YouTube
test_out ".payload.commands[0].errorCode" '"inSoftwareUpdate"'

execute_payload errorCode '""'

echo

# AppSelector 
echo AppSelector
execute_no_report_state $NODE_ID appInstall mia_application
test_payload ".params.newApplication" '"mia_application"'

execute_no_report_state $NODE_ID appInstall_name mia_application

execute_error $NODE_ID appInstall YouTube
test_out ".payload.commands[0].errorCode" '"alreadyInstalledApp"'

execute_error $NODE_ID appInstall_name YouTube
test_out ".payload.commands[0].errorCode" '"alreadyInstalledApp"'

execute_no_report_state $NODE_ID appSearch YouTube

execute_no_report_state $NODE_ID appSearch_name YouTube

execute_error $NODE_ID appSearch no_installed_app
test_out ".payload.commands[0].errorCode" '"noAvailableApp"'

execute_error $NODE_ID appSearch_name no_installed_app1
test_out ".payload.commands[0].errorCode" '"noAvailableApp"'

execute_no_report_state $NODE_ID appSelect YouTube
execute $NODE_ID appSelect_name "Prime Video"
test_payload .currentApplication '"Amazon Prime Video"'
test_payload .params.newApplicationName '"Prime Video"'

execute $NODE_ID appSelect YouTube
test_payload .params.newApplication '"YouTube"'

execute $NODE_ID appSelect "Amazon\ Prime\ Video"
test_payload .params.newApplication '"Amazon Prime Video"'

execute $NODE_ID appSelect_name YouTube
test_payload .currentApplication '"YouTube"'
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
test_payload .currentArmLevel '"L1"'
test_payload .isArmed true

execute $NODE_ID ArmDisarm_level true L2 123
test_out ".payload.commands[0].states.online" true
test_payload .currentArmLevel '"L2"'
test_payload .isArmed true

execute_error $NODE_ID ArmDisarm_level true NO_LEVEL 456
test_out ".payload.commands[0].errorCode" '"transientError"'

execute $NODE_ID ArmDisarm false
test_payload .isArmed false

execute $NODE_ID ArmDisarm_cancel true
test_out ".payload.commands[0].states.online" true

# Brightness
echo
echo Brightness

execute $NODE_ID BrightnessAbsolute 64
test_payload ".brightness" 64

execute $NODE_ID BrightnessAbsolute 200
test_payload ".brightness" 64

execute $NODE_ID BrightnessRelative 4
test_out ".payload.commands[0].states.online" true
test_payload ".brightness" 64

# CameraStream
echo
echo CameraStream
execute_no_report_state $NODE_ID GetCameraStream true '"progressive_mp4"'
test_out ".payload.commands[0].states.online" true
test_out ".payload.commands[0].states.cameraStreamAccessUrl" '"http://PROGRESSIVE_MP4"'
test_out ".payload.commands[0].states.cameraStreamProtocol" '"progressive_mp4"'
test_out ".payload.commands[0].states.cameraStreamAuthToken" '"Auth Token"'
test_out ".payload.commands[0].states.cameraStreamReceiverAppId" '"PROGRESSIVE_MP4_APPID"'

execute_no_report_state $NODE_ID GetCameraStream true '"hls","dash","smooth_stream","progressive_mp4"'
test_out ".payload.commands[0].states.online" true
test_out ".payload.commands[0].states.cameraStreamAccessUrl" '"http://PROGRESSIVE_MP4"'
test_out ".payload.commands[0].states.cameraStreamProtocol" '"progressive_mp4"'
test_out ".payload.commands[0].states.cameraStreamAuthToken" '"Auth Token"'
test_out ".payload.commands[0].states.cameraStreamReceiverAppId" '"PROGRESSIVE_MP4_APPID"'

execute_no_report_state $NODE_ID GetCameraStream true '"hls"'
test_out ".payload.commands[0].states.online" true
test_out ".payload.commands[0].states.cameraStreamAccessUrl" '"http://HLS"'
test_out ".payload.commands[0].states.cameraStreamProtocol" '"hls"'
test_out ".payload.commands[0].states.cameraStreamAuthToken" '"Auth Token"'
test_out ".payload.commands[0].states.cameraStreamReceiverAppId" '"HLS_APPID"'

execute_no_report_state $NODE_ID GetCameraStream true '"dash"'
test_out ".payload.commands[0].states.online" true
test_out ".payload.commands[0].states.cameraStreamAccessUrl" '"http://DASH"'
test_out ".payload.commands[0].states.cameraStreamProtocol" '"dash"'
test_out ".payload.commands[0].states.cameraStreamAuthToken" '"Auth Token"'
test_out ".payload.commands[0].states.cameraStreamReceiverAppId" '"DASH_APPID"'

execute_no_report_state $NODE_ID GetCameraStream true '"smooth_stream"'
test_out ".payload.commands[0].states.online" true
test_out ".payload.commands[0].states.cameraStreamAccessUrl" '"http://SMOOTH_STREAM"'
test_out ".payload.commands[0].states.cameraStreamProtocol" '"smooth_stream"'
test_out ".payload.commands[0].states.cameraStreamAuthToken" '"Auth Token"'
test_out ".payload.commands[0].states.cameraStreamReceiverAppId" '"SMOOTH_STREAM_APPID"'

execute_no_report_state $NODE_ID GetCameraStream true '"webrtc"'
test_out ".payload.commands[0].states.online" true
test_out ".payload.commands[0].states.cameraStreamProtocol" '"webrtc"'
test_out ".payload.commands[0].states.cameraStreamSignalingUrl" '"http://WEBRTC_SIGNALING"'
test_out ".payload.commands[0].states.cameraStreamAuthToken" '"Auth Token"'
test_out ".payload.commands[0].states.cameraStreamOffer" '"o=- 4611731400430051336 2 IN IP4 127.0.0.1..."'
test_out ".payload.commands[0].states.cameraStreamIceServers" '"[{\"urls\":\"stun:stun.l.partner.com:19302\"},{\"urls\":\"turn:192.158.29.39:3478?transport=udp\",\"credential\":\"JZEOEt2V3Qb0y27GRntt2u2PAYA=\",\"username\":\"28224511:1379330808\"},{\"urls\":\"turn:192.158.29.39:3478?transport=tcp\",\"credential\":\"JZEOEt2V3Qb0y27GRntt2u2PAYA=\",\"username\":\"28224511:1379330808\"}]"'

# Channel 
echo
echo Channel 
execute_error $NODE_ID selectChannel 'NO channel' 'NO channel name'
test_out ".payload.commands[0].errorCode" '"noAvailableChannel"'

execute $NODE_ID selectChannel 'rai1' 'Rai 1'
test_out ".payload.commands[0].states.online" true
test_payload_no_report_state ".currentChannel" '"rai1"'
test_payload_no_report_state ".currentChannelNumber" '"1"'

execute_error $NODE_ID selectChannel_number 'No channel number'
test_out ".payload.commands[0].errorCode" '"noAvailableChannel"'

execute $NODE_ID selectChannel_number '501'
test_out ".payload.commands[0].states.online" true
test_payload_no_report_state ".currentChannel" '"rai1_hd"'
test_payload_no_report_state ".currentChannelNumber" '"501"'

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

execute $NODE_ID ColorAbsolute 'Bianco Caldo' 4001
test_payload ".color.temperatureK" 4001
test_payload ".color.spectrumRgb" null
test_payload ".color.spectrumHsv.hue" null
test_payload ".color.spectrumHsv.saturation" null
test_payload ".color.spectrumHsv.value" null
test_out ".payload.commands[0].states.online" true

execute $NODE_ID1 ColorAbsolute 'Bianco Caldo' 4002
test_payload ".color.temperatureK" 4002
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

execute $NODE_ID1 ColorAbsolute_hsv 'Blu' 360 0.5 0.5
test_out ".payload.commands[0].states.online" true
test_payload ".color.spectrumHsv.hue" 360
test_payload ".color.spectrumHsv.saturation" 0.5
test_payload ".color.spectrumHsv.value" 0.5
test_payload ".color.temperatureK" null
test_payload ".color.spectrumRgb" null

execute $NODE_ID1 ColorAbsolute 'Bianco Caldo' 2000
test_payload ".color.temperatureK" 2000
test_payload ".color.spectrumRgb" null
test_payload ".color.spectrumHsv.hue" null
test_payload ".color.spectrumHsv.saturation" null
test_payload ".color.spectrumHsv.value" null
test_out ".payload.commands[0].states.online" true

execute $NODE_ID2 ColorAbsolute 'Bianco Freddo' 7000
test_payload ".color.temperatureK" 7000
test_payload ".color.spectrumRgb" null
test_payload ".color.spectrumHsv.hue" null
test_payload ".color.spectrumHsv.saturation" null
test_payload ".color.spectrumHsv.value" null
test_out ".payload.commands[0].states.online" true

execute $NODE_ID2 ColorAbsolute_hsv 'Blu' 360 0.5 0.5
test_payload ".color.temperatureK" 7000
test_payload ".color.spectrumRgb" null
test_payload ".color.spectrumHsv.hue" null
test_payload ".color.spectrumHsv.saturation" null
test_payload ".color.spectrumHsv.value" null
test_out ".payload.commands[0].states.online" true

execute $NODE_ID2 ColorAbsolute 'Bianco Medio' 4000
test_payload ".color.temperatureK" 4000
test_payload ".color.spectrumRgb" null
test_payload ".color.spectrumHsv.hue" null
test_payload ".color.spectrumHsv.saturation" null
test_payload ".color.spectrumHsv.value" null
test_out ".payload.commands[0].states.online" true

execute $NODE_ID2 ColorAbsolute_rgb 'Magenta' 16711935
test_payload ".color.temperatureK" 4000
test_payload ".color.spectrumRgb" null
test_payload ".color.spectrumHsv.hue" null
test_payload ".color.spectrumHsv.saturation" null
test_payload ".color.spectrumHsv.value" null
test_out ".payload.commands[0].states.online" true

execute $NODE_ID2 ColorAbsolute 'Bianco Caldo' 2001
test_payload ".color.temperatureK" 2001
test_payload ".color.spectrumRgb" null
test_payload ".color.spectrumHsv.hue" null
test_payload ".color.spectrumHsv.saturation" null
test_payload ".color.spectrumHsv.value" null
test_out ".payload.commands[0].states.online" true

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

execute $NODE_ID SetInput "hdmi_2" 
test_payload ".currentInput" '"hdmi_2"'

execute $NODE_ID NextInput 
test_payload ".currentInput" '"hdmi 3"'

execute $NODE_ID PreviousInput 
test_payload ".currentInput" '"hdmi_2"'

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
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 50
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
test_payload .openState[6] null

execute $NODE_ID OpenClose_dir 70 "DOWN"
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 50
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 70
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 5
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 0
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 9
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 0
test_payload .openState[6] null

execute $NODE_ID OpenClose_dir 61 "LEFT"
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 50
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 70
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 61
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 0
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 9
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 0
test_payload .openState[6] null


execute $NODE_ID OpenClose_dir 60 "LEFT"
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 50
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 70
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 60
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 0
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 9
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 0
test_payload .openState[6] null

execute $NODE_ID OpenClose_dir 45 "RIGHT"
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 50
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 70
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 60
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 45
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 9
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 0
test_payload .openState[6] null

execute $NODE_ID OpenClose_dir 20 "IN"
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 50
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 70
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 60
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 45
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 20
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 0
test_payload .openState[6] null

execute $NODE_ID OpenClose_dir 10 "OUT"
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 50
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 70
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 60
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 45
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 20
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 10
test_payload .openState[6] null

execute $NODE_ID OpenClose_dir 70 "NO_DIR"
test_out ".payload.commands[0].status" '"SUCCESS"' # ERROR??
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 50
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 70
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 60
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 45
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 20
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 10
test_payload .openState[6] null

execute $NODE_ID OpenCloseRelative 5
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 50
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 70
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 60
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 45
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 20
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 10
test_payload .openState[6] null

execute $NODE_ID OpenCloseRelative_dir -1 "UP"
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 50
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 70
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 60
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 45
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 20
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 10
test_payload .openState[6] null

execute $NODE_ID OpenCloseRelative_dir 3 "DOWN"
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 50
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 70
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 60
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 45
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 20
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 10
test_payload .openState[6] null

execute $NODE_ID OpenCloseRelative_dir -5 "LEFT"
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 50
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 70
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 60
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 45
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 20
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 10
test_payload .openState[6] null

execute $NODE_ID OpenCloseRelative_dir 11 "RIGHT"
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 50
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 70
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 60
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 45
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 20
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 10
test_payload .openState[6] null

execute $NODE_ID OpenCloseRelative_dir -7 "IN"
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 50
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 70
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 60
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 45
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 20
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 10
test_payload .openState[6] null

execute $NODE_ID OpenCloseRelative_dir 17 "OUT"
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 50
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 70
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 60
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 45
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 20
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 10
test_payload .openState[6] null

execute $NODE_ID OpenCloseRelative_dir -9 "NO_DIR"
test_out ".payload.commands[0].status" '"SUCCESS"' # ERROR??
test_payload .openState[0].openDirection '"UP"'
test_payload .openState[0].openPercent 50
test_payload .openState[1].openDirection '"DOWN"'
test_payload .openState[1].openPercent 70
test_payload .openState[2].openDirection '"LEFT"'
test_payload .openState[2].openPercent 60
test_payload .openState[3].openDirection '"RIGHT"'
test_payload .openState[3].openPercent 45
test_payload .openState[4].openDirection '"IN"'
test_payload .openState[4].openPercent 20
test_payload .openState[5].openDirection '"OUT"'
test_payload .openState[5].openPercent 10
test_payload .openState[6] null

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
execute $NODE_ID ThermostatSetMode "cool"
test_payload ".thermostatMode" '"cool"'

execute $NODE_ID ThermostatSetMode "eco"
test_payload ".thermostatMode" '"eco"'
test_payload ".thermostatTemperatureSetpointHigh" null
test_payload ".thermostatTemperatureSetpointLow" null

execute $NODE_ID ThermostatSetMode "heatcool"
test_payload ".thermostatMode" '"heatcool"'
test_payload ".thermostatTemperatureSetpoint" null

execute $NODE_ID ThermostatSetMode "heat"
test_payload ".thermostatMode" '"heat"'
test_payload ".thermostatTemperatureSetpointHigh" null
test_payload ".thermostatTemperatureSetpointLow" null

execute $NODE_ID ThermostatTemperatureSetpoint 17.67
test_payload ".thermostatMode" '"heat"'
test_payload ".thermostatTemperatureSetpoint" 17.67
test_payload ".thermostatTemperatureSetpointHigh" null
test_payload ".thermostatTemperatureSetpointLow" null

execute $NODE_ID ThermostatTemperatureSetpoint 17.55
test_payload ".thermostatMode" '"heat"'
test_payload ".thermostatTemperatureSetpoint" 17.55
test_payload ".thermostatTemperatureSetpointHigh" null
test_payload ".thermostatTemperatureSetpointLow" null

execute $NODE_ID ThermostatTemperatureSetRange 26.2 22.8
test_payload ".thermostatMode" '"heat"'
test_payload ".thermostatTemperatureSetpoint" 17.55
test_payload ".thermostatTemperatureSetpointHigh" null
test_payload ".thermostatTemperatureSetpointLow" null

execute $NODE_ID ThermostatSetMode "heatcool"
test_payload ".thermostatMode" '"heatcool"'
test_payload ".thermostatTemperatureSetpoint" null
test_payload ".thermostatTemperatureSetpointHigh" 26.2
test_payload ".thermostatTemperatureSetpointLow" 22.8

execute $NODE_ID ThermostatTemperatureSetRange 27.2 21.8
test_payload ".thermostatMode" '"heatcool"'
test_payload ".thermostatTemperatureSetpoint" null
test_payload ".thermostatTemperatureSetpointHigh" 27.2
test_payload ".thermostatTemperatureSetpointLow" 21.8

execute $NODE_ID ThermostatTemperatureSetpoint 27.88
test_payload ".thermostatMode" '"heatcool"'
test_payload ".thermostatTemperatureSetpoint" null
test_payload ".thermostatTemperatureSetpointHigh" 27.2
test_payload ".thermostatTemperatureSetpointLow" 21.8

execute $NODE_ID ThermostatSetMode "cool"
test_payload ".thermostatMode" '"cool"'
test_payload ".thermostatTemperatureSetpoint" 27.88
test_payload ".thermostatTemperatureSetpointHigh" null
test_payload ".thermostatTemperatureSetpointLow" null

execute $NODE_ID ThermostatSetMode "heatcool"
test_payload ".thermostatMode" '"heatcool"'
test_payload ".thermostatTemperatureSetpoint" null
test_payload ".thermostatTemperatureSetpointHigh" 27.2
test_payload ".thermostatTemperatureSetpointLow" 21.8

execute $NODE_ID ThermostatTemperatureSetRange 16.2 12.8
test_payload ".thermostatMode" '"heatcool"'
test_payload ".thermostatTemperatureSetpoint" null
test_payload ".thermostatTemperatureSetpointHigh" 16.2
test_payload ".thermostatTemperatureSetpointLow" 12.8

execute $NODE_ID ThermostatTemperatureSetpoint 15.67
test_payload ".thermostatMode" '"heatcool"'
test_payload ".thermostatTemperatureSetpoint" null
test_payload ".thermostatTemperatureSetpointHigh" 16.2
test_payload ".thermostatTemperatureSetpointLow" 12.8

execute $NODE_ID ThermostatSetMode "off"
test_payload ".thermostatMode" '"off"'
test_payload ".thermostatTemperatureSetpoint" 15.67
test_payload ".thermostatTemperatureSetpointHigh" null
test_payload ".thermostatTemperatureSetpointLow" null

execute $NODE_ID ThermostatSetMode "NOT_VALID"
test_payload ".thermostatMode" '"off"'

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
execute $NODE_ID SetToggles quiet true
test_payload ".currentToggleSettings.quiet" true

execute $NODE_ID SetToggles quiet false
test_payload ".currentToggleSettings.quiet" false

execute $NODE_ID SetToggles_all '"extra_bass": true,"Energy Saving": false'
test_payload ".currentToggleSettings.extra_bass" true
test_payload '.currentToggleSettings."Energy Saving"' false

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
