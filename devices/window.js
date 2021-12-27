/**
 * NodeRED Google SmartHome
 * Copyright (C) 2021 Michael Jacobsen.
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

const BaseDevice = require('./baseDevice');

module.exports = function(RED) {
    "use strict";

    class WindowNode extends BaseDevice {

        constructor(config) {
            config.device_type = 'WINDOW';
            config.trait_openclose = true;

            config.discrete_only_openclose = false;
            config.open_direction = [];
            config.command_only_openclose = false;
            config.query_only_openclose = false;

            super(config, RED);
        }

        updateStatusIcon() {
            this.status({fill: 'red', shape: 'ring', text: 'DEPRECATED!'});
        }
    }

    RED.nodes.registerType("google-window", WindowNode);
}
