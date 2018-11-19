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
 */

/**
 * https://github.com/actions-on-google/actions-on-google-nodejs
 *
 * https://github.com/actions-on-google/smart-home-nodejs
 * 
 * https://developers.google.com/actions/smarthome/
*/

module.exports = function(RED) {
    "use strict";

    const GoogleSmartHome = require('./lib/SmartHome.js');

    /******************************************************************************************************************
	 * 
	 *
	 */
    function GoogleSmartHomeNode(config) {
        RED.nodes.createNode(this, config);

        var node = this;

        this.app = new GoogleSmartHome(config.username, config.password, 
            parseInt(config.port), 
            config.publickey, 
            config.privatekey,
            config.jwtkey,
            config.clientid, 
            config.clientsecret,
            config.reportinterval);     // minutes

        let err = this.app.Start();
        if (err !== true) {
            RED.log.error(err);
            return;
        }

        /******************************************************************************************************************
         * functions called by our 'clients'
         *
         */
        this.register = function(client, type, name, param1) {
            RED.log.debug("GoogleSmartHomeNode(): register; type = " + type);

            switch (type) {
                case 'light-onoff':
                    node.app.NewLightOnOff(client, name);
                    break;

                case 'outlet':
                    node.app.NewOutlet(client, name);
                    break;

                case 'scene':
                    node.app.NewScene(client, name, param1);
                    break;
            }
        };

        this.deregister = function(client, type) {
            RED.log.debug("GoogleSmartHomeNode(): deregister; type = " + type);
        };

        this.remove = function(client, type) {
            RED.log.debug("GoogleSmartHomeNode(): remove; type = " + type);

            node.app.DeleteDevice(client);
        };

        this.setState = function(client, state) {
            RED.log.debug("GoogleSmartHomeNode:setState(): state = " + JSON.stringify(state));
            node.app.SetState(client.id, state);
        };

        this.on('close', function(removed, done) {
            node.app.Stop(done);
            
            if (removed) {
                // this node has been deleted
            } else {
                // this node is being restarted
                RED.log.debug("GoogleSmartHomeNode(on-close): restarting");
            }
        });

        /******************************************************************************************************************
         * notifications coming from clients
         *
         */
        /*this.on('manage', function(action, data) {
            RED.log.debug("HueBridgeNode(on-manage): action = " + action);

            if (action === 'clearconfig') {
                node.bridge.dsClearConfiguration();
                
                node.bridge.emit('rule-engine-reload');
            }
        });*/
        
        /*this.on('link', function(state) {
            RED.log.debug("HueBridgeNode(on-link): action = " + state);

            node.bridge.dsSetLinkbutton(state);
        });*/

        /******************************************************************************************************************
         * notifications coming from the application server
         *
         */
        this.app.on('server', function(state, param1) {
            RED.log.debug("GoogleSmartHomeNode(on-server): state  = " + state);
            RED.log.debug("GoogleSmartHomeNode(on-server): param1 = " + param1);
        });

        this.app.on('actions-reportstate', function(msg) {
            RED.log.debug("GoogleSmartHomeNode(on-actions-reportstate): msg = " + JSON.stringify(msg));
        });

        this.app.on('actions-requestsync', function(msg) {
            RED.log.debug("GoogleSmartHomeNode(on-actions-requestsync): msg = " + JSON.stringify(msg));
        });

        this.app.on('/login', function(msg, username, password) {
            RED.log.debug("GoogleSmartHomeNode(on-login): msg      = " + msg);
            RED.log.debug("GoogleSmartHomeNode(on-login): username = " + username);
            RED.log.debug("GoogleSmartHomeNode(on-login): password = " + password);
        });
    }

    RED.nodes.registerType("googlesmarthome-client", GoogleSmartHomeNode);
}