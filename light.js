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

    /******************************************************************************************************************
	 * 
	 *
	 */
    function LightOnOffNode(config) {
        RED.nodes.createNode(this, config);

        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);
        this.topicOut   = config.topic;
        this.passthru   = config.passthru;
        this.topicDelim = '/';

        if (!this.clientConn) {
            this.error(RED._("light.errors.missing-config"));
            this.status({fill:"red", shape:"dot", text:"Missing config"});
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("light.errors.missing-bridge"));
            this.status({fill:"red", shape:"dot", text:"Missing bridge"});
            return;            
        }

        let node = this;

        RED.log.debug("LightOnOffNode(): node.topicOut = " + node.topicOut);

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        this.updated = function(states) {   // this must be defined before the call to clientConn.register()
            RED.log.debug("LightOnOffNode(updated): states = " + JSON.stringify(states));

            if (states.on) {
                node.status({fill:"green", shape:"dot", text:"ON"});
            } else {
                node.status({fill:"red", shape:"dot", text:"OFF"});
            }

            let msg = {
                topic: node.topicOut + "/updated",
                payload: states
            };

            node.send(msg);
        };

        this.clientConn.register(this, 'light-onoff', config.name);

        // get a COPY of the light
        //this.light = node.clientConn.bridge.dsGetLight(this.lightid);
        //RED.log.debug("LightOnOffNode(startup): light = " + JSON.stringify(this.light));

        this.status({fill:"yellow", shape:"dot", text:"Ready"});

        /*setTimeout(function(node) {
            RED.log.debug("LightOnOffNode(): initial write");

            outputState(node, node.light.state, node.light.state);
        }, 100, node);*/


        //
        // light state change
        //
        this.on('light-state-modified', function(id, object) {
            /*RED.log.debug("LightOnOffNode(light-state-modified): object = " + JSON.stringify(object));
            
            var changedState = {};

            if (object.hasOwnProperty('on')) {
                changedState.on = object.on;
            }
            if (object.hasOwnProperty('transitiontime')) {
                changedState.transitiontime = object.transitiontime;
            }
            if (object.hasOwnProperty('bri')) {     // well, this doesn't make sense for an on/off light ...
                changedState.bri = object.bri;
            }
            if (object.hasOwnProperty('colormode')) {
                changedState.colormode = object.colormode;
            }
            if (object.hasOwnProperty('effect')) {
                changedState.effect = object.effect;
            }

            this.status({fill:"green", shape:"dot", text:"Light state changed"});
            setTimeout(function () { node.status({}) }, 3000);

            outputState(node, node.light.state, changedState);
            
            // update our copy
            this.light = node.clientConn.bridge.dsGetLight(this.lightid);*/
        });
        //
        // light modified
        //
        this.on('light-modified', function(id, object) {
            /*RED.log.debug("LightOnOffNode(light-modified): object = " + JSON.stringify(object));

            this.status({fill:"green", shape:"dot", text:"Light config modified"});
            setTimeout(function () { node.status({}) }, 3000);*/
        });
        //
        // respond to inputs from NodeRED
        //
        this.on('input', function (msg) {
            RED.log.debug("LightOnOffNode(input)");

            let topicArr = msg.topic.split(node.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("LightOnOffNode(input): topic = " + topic);

            if (topic.toUpperCase() === 'SET') {
                RED.log.debug("LightOnOffNode(input): SET");
                let object = {};

                if (typeof msg.payload === 'object') {
                    object = msg.payload;
                } else {
                    RED.log.debug("LightOnOffNode(input): typeof payload = " + typeof msg.payload);
                    return;
                }

                let state = {};

                // on
                if (object.hasOwnProperty('on')) {
                    state.on = object.on;
                }

                // online
                if (object.hasOwnProperty('online')) {
                    state.online = object.online;
                }

                node.clientConn.setState(node, state);  // tell Google ...

                if (node.passthru) {
                    node.send(msg);
                }
            } else if (topic.toUpperCase() === 'ON') {
                RED.log.debug("LightOnOffNode(input): ON");
                let state = {
                    on: msg.payload
                };
                
                node.clientConn.setState(node, state);  // tell Google ...

                if (node.passthru) {
                    node.send(msg);
                }
            } else if (topic.toUpperCase() === 'ONLINE') {
                RED.log.debug("LightOnOffNode(input): ONLINE");
                let state = {
                    online: msg.payload
                };

                node.clientConn.setState(node, state);  // tell Google ...
                
                if (node.passthru) {
                    node.send(msg);
                }
            }    
        });

        this.on('close', function(removed, done) {
            if (removed) {
                // this node has been deleted
                node.clientConn.remove(node, 'light-onoff');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'light-onoff');
            }
            
            done();
        });
    }

    RED.nodes.registerType("google-light-onoff", LightOnOffNode);
}
