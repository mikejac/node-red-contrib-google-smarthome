/**
 * node-red-contrib-google-smarthome
 * Copyright (C) 2025 Claudio Chimera and others.
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

import fs from 'fs';
import path from 'path';
import assert from 'assert/strict';
import helper from 'node-red-node-test-helper';

import DeviceNode from '../devices/device';
import GoogleSmartHomeNode from '../google-smarthome';
import MgmtNode from '../google-mgmt';

helper.init(require.resolve('node-red'));

const flowPath = path.join(__dirname, 'device_flow.json');
const flow = JSON.parse(fs.readFileSync(flowPath, 'utf-8'));

describe('HTTP servers', function () {
    before(async function () {
        helper.settings({ userDir: '/tmp' });
        await new Promise<void>((resolve) => helper.startServer(resolve));

        await helper.load([GoogleSmartHomeNode, MgmtNode, DeviceNode], flow);
    });

    after(async function () {
        await helper.unload();
        await new Promise<void>((resolve) => helper.stopServer(resolve));
    });

    describe('Cloud HTTP Server', function () {
        it('/check should respond with "SUCCESS"', async function () {
            const url = 'http://localhost:3801/check';
            const res = await fetch(url);
            const body = await res.text();

            assert.equal(res.status, 200);
            assert.match(body, /SUCCESS - Cloud fulfillment HTTP server is reachable/);
        });
    });

    describe('Local fulfillment HTTP Server', function () {
        it('/check should respond with "SUCCESS"', async function () {
            const url = 'http://localhost:3802/check';
            const res = await fetch(url);
            const body = await res.text();

            assert.equal(res.status, 200);
            assert.match(body, /SUCCESS - Local fulfillment HTTP server is reachable/);
        });
    });
});
