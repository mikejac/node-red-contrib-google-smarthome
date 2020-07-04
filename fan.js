/**
 * NodeRED Google SmartHome
 * Copyright (C) 2018 Michael Jacobsen.
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
 **/

module.exports = function(RED) {
    "use strict";

    const formats = require('./formatvalues.js');

    /******************************************************************************************************************
     *
     *
     */
    function FanOnOffNode(config) {
        RED.nodes.createNode(this, config);

        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);
        this.topicOut   = config.topic;
        this.passthru   = config.passthru;
        this.topicDelim = '/';

        if (!this.clientConn) {
            this.error(RED._("fan.errors.missing-config"));
            this.status({fill:"red", shape:"dot", text:"Missing config"});
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("fan.errors.missing-bridge"));
            this.status({fill:"red", shape:"dot", text:"Missing SmartHome"});
            return;            
        }

        let node = this;

        RED.log.debug("FanOnOffNode(): node.topicOut = " + node.topicOut);

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        this.updated = function(states) {   // this must be defined before the call to clientConn.register()
            RED.log.debug("FanOnOffNode(updated): states = " + JSON.stringify(states));

            if (states.on) {
                node.status({fill:"green", shape:"dot", text:"ON"});
            } else {
                node.status({fill:"red", shape:"dot", text:"OFF"});
            }

            let msg = {
                topic: node.topicOut,
                payload: {
                    online: states.online,
                    on: states.on
                }
            };

            node.send(msg);
        };

        this.states = this.clientConn.register(this, 'fan-onoff', config.name);

        this.status({fill:"yellow", shape:"dot", text:"Ready"});

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("FanOnOffNode(input)");

            let topicArr = String(msg.topic).split(node.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("FanOnOffNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'ON') {
                    RED.log.debug("FanOnOffNode(input): ON");
                    let on = formats.FormatValue(formats.Formats.BOOL, 'on', msg.payload);

                    if (node.states.on !== on) {
                        node.states.on = on;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.on;
                            node.send(msg);
                        }

                        if (node.states.on) {
                            node.status({fill:"green", shape:"dot", text:"ON"});
                        } else {
                            node.status({fill:"red", shape:"dot", text:"OFF"});
                        }
                    }
                } else if (topic.toUpperCase() === 'ONLINE') {
                    RED.log.debug("FanOnOffNode(input): ONLINE");
                    let online = formats.FormatValue(formats.Formats.BOOL, 'online', msg.payload);

                    if (node.states.online !== online) {
                        node.states.online = online;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.online;
                            node.send(msg);
                        }
                    }
                } else {
                    RED.log.debug("FanOnOffNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("FanOnOffNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    let on     = node.states.on;
                    let online = node.states.online;

                    // on
                    if (object.hasOwnProperty('on')) {
                        on = formats.FormatValue(formats.Formats.BOOL, 'on', object.on);
                    }

                    // online
                    if (object.hasOwnProperty('online')) {
                        online = formats.FormatValue(formats.Formats.BOOL, 'online', object.online);
                    }

                    if (node.states.on !== on || node.states.online !== online){
                        node.states.on     = on;
                        node.states.online = online;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload             = {};
                            msg.payload.online      = node.states.online;
                            msg.payload.on          = node.states.on;
                            node.send(msg);
                        }

                        if (node.states.on) {
                            node.status({fill:"green", shape:"dot", text:"ON"});
                        } else {
                            node.status({fill:"red", shape:"dot", text:"OFF"});
                        }
                    }
                }
            } catch (err) {
                RED.log.error(err);
            }
        });

        this.on('close', function(removed, done) {
            if (removed) {
                // this node has been deleted
                node.clientConn.remove(node, 'fan-onoff');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'fan-onoff');
            }
            
            done();
        });
    }

    RED.nodes.registerType("google-fan-onoff", FanOnOffNode);

}
