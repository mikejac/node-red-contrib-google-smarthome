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
    function SceneNode(config) {
        RED.nodes.createNode(this, config);

        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);
        this.topicOut   = config.topic;
        this.topicDelim = '/';

        if (!this.clientConn) {
            this.error(RED._("scene.errors.missing-config"));
            this.status({fill:"red", shape:"dot", text:"Missing config"});
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("scene.errors.missing-bridge"));
            this.status({fill:"red", shape:"dot", text:"Missing SmartHome"});
            return;            
        }

        let node = this;

        RED.log.debug("SceneNode(): node.topicOut = " + node.topicOut);

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        this.updated = function(states) {   // this must be defined before the call to clientConn.register()
            RED.log.debug("SceneNode(updated): states = " + JSON.stringify(states));

            if (!states.deactivate) {
                node.status({fill:"green", shape:"dot", text:"Activate"});
            } else {
                node.status({fill:"red", shape:"dot", text:"Deactivate"});
            }

            setTimeout(function () { node.status({}) }, 10000);

            let msg = {
                topic: node.topicOut,
                payload: !states.deactivate
            };

            node.send(msg);
        };

        this.clientConn.register(this, 'scene', config.name, config.scenereversible);

        this.status({fill:"yellow", shape:"dot", text:"Ready"});

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("SceneNode(input)");

            let topicArr = msg.topic.split(node.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("SceneNode(input): topic = " + topic);

            if (topic.toUpperCase() === 'ON') {
                RED.log.debug("SceneNode(input): ON");
                
                if (msg.payload) {
                    node.status({fill:"green", shape:"dot", text:"Activate"});
                } else {
                    node.status({fill:"red", shape:"dot", text:"Deactivate"});
                }

                setTimeout(function () { node.status({}) }, 10000);

                node.send(msg);
            }
        });

        this.on('close', function(removed, done) {
            if (removed) {
                // this node has been deleted
                node.clientConn.remove(node, 'scene');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'scene');
            }
            
            done();
        });
    }

    RED.nodes.registerType("google-scene", SceneNode);
}
