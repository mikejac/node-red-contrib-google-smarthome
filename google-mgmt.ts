/**
 * node-red-contrib-google-smarthome
 * Copyright (C) 2025 Michael Jacobsen and others.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { NodeAPI } from "node-red";
import { setRED, RED } from "./lib/SmartHome";
import { GoogleSmartHomeNode } from "./google-smarthome";

/******************************************************************************************************************
 *
 *
 */
export class MgmtNode {
    private clientConn: GoogleSmartHomeNode;


    constructor(config) {
        RED.nodes.createNode(this, config);

        this.client = config.client;
        this.clientConn = RED.nodes.getNode(this.client);

        if (!this.clientConn) {
            this.error(RED._("googlemanagement.errors.missing-config"));
            this.status({ fill: "red", shape: "dot", text: "Missing config" });
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("googlemanagement.errors.missing-bridge"));
            this.status({ fill: "red", shape: "dot", text: "Missing SmartHome" });
            return;
        }

        this.set_state_type = config.set_state_type || 'filtered_by_id';

        this.clientConn.register(this, 'mgmt', config.name);

        this.status({ fill: "yellow", shape: "dot", text: "Ready" });

        this.on('input', this.onInput);
        this.on('close', this.onClose);
    }

    _debug(msg) {
        if (this.clientConn.enabledebug) {
            console.log(msg)
        } else {
            RED.log.debug(msg);
        }
    }

    /******************************************************************************************************************
     * called when state is updated from Google Assistant
     *
     */
    updated(data) {   // this must be defined before the call to clientConn.register()
        const me = this;
        me._debug("MgmtNode(updated): data = " + JSON.stringify(data));

        let msg = {
            topic: "management",
            payload: data
        };

        me.send(msg);
    }

    /**
     * respond to inputs from NodeRED
     *
     * @param {object} msg - The incoming message
     * @param {Function} send - Function to send outgoing messages
     * @param {Function} done - Function to inform the runtime that this node has finished its operation
     */
    onInput(msg, send, done) {
        const me = this;

        let topicArr = (msg.topic || '').split(me.topicDelim);
        let topic = topicArr[topicArr.length - 1];   // get last part of topic
        const topic_upper = topic.toUpperCase();

        try {
            if (topic_upper === 'RESTART_SERVER') {
                me._debug("MgmtNode(input): RESTART_SERVER");

                this.clientConn.app.Restart(RED.httpNode || RED.httpAdmin, RED.server);
            } else if (topic_upper === 'REPORT_STATE') {
                me._debug("MgmtNode(input): REPORT_STATE");

                this.clientConn.app.ReportAllStates();
            } else if (topic_upper === 'REQUEST_SYNC') {
                me._debug("MgmtNode(input): REQUEST_SYNC");

                this.clientConn.app.RequestSync();
            } else if (topic_upper === 'GET_STATE' || topic_upper === 'GETSTATE') {
                me._debug("MgmtNode(input): GET_STATE");

                let onlyPersistent = ['filtered_by_id', 'filtered_by_name'].includes(me.set_state_type );
                let useNames = ['all_by_name', 'filtered_by_name'].includes(me.set_state_type );
                let deviceIds = undefined;
                if (typeof msg.payload === 'boolean') {
                    onlyPersistent = msg.payload;
                } else if (typeof msg.payload === 'string') {
                    deviceIds = [msg.payload];
                } else if (Array.isArray(msg.payload)) {
                    deviceIds = msg.payload;
                } else if (typeof msg.payload === 'object') {
                    if (typeof msg.payload.onlyPersistent === 'boolean') {
                        onlyPersistent = msg.payload.onlyPersistent;
                    }
                    if (typeof msg.payload.useNames === 'boolean') {
                        useNames = msg.payload.useNames;
                    }
                    if (typeof msg.payload.devices === 'string') {
                        deviceIds = [msg.payload.devices];
                    } else if (Array.isArray(msg.payload.devices)) {
                        deviceIds = msg.payload.devices;
                    }
                }
                let states = this.clientConn.app.devices.getStates(deviceIds, onlyPersistent, useNames);
                if (states) {
                    send({
                        topic: topic,
                        payload: states
                    });
                }
            } else if (topic_upper === 'SET_STATE' || topic_upper === 'SETSTATE') {
                me._debug("MgmtNode(input): SET_STATE");

                if (typeof msg.payload === 'object') {
                    this.clientConn.app.devices.setStates(msg.payload);
                }
            }
            else {
                this.error(`Unknown command "${topic}"`);
            }

            done();
        } catch (err) {
            done(err);
        }
    }

    /**
     * Called by the runtime when this node is being removed or restarted
     *
     * @param {boolean} removed - true if the is being removed, false on restart
     * @param {Function} done - Function to inform the runtime that this node has finished its operation
     */
    onClose(removed, done) {
        if (removed) {
            // this node has been deleted
            this.clientConn.remove(this, 'mgmt');
        } else {
            // this node is being restarted
            this.clientConn.deregister(this, 'mgmt');
        }

        done();
    }

    sendSetState() {
        if (this.set_state_type === 'no_nodes') return;
        let onlyPersistent = ['filtered_by_id', 'filtered_by_name'].includes(this.set_state_type);
        let useNames = ['all_by_name', 'filtered_by_name'].includes(this.set_state_type);
        let states = this.clientConn.app.devices.getStates(undefined, onlyPersistent, useNames);
        if (states) {
            this.send({
                topic: 'set_state',
                payload: states
            });
        }
    }
}

module.exports = function(RED:NodeAPI) {
    setRED(RED);

    RED.nodes.registerType("google-mgmt", MgmtNode);
};
