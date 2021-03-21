/**
 * NodeRED Google SmartHome
 * Copyright (C) 2021 Claudio Chimera.
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

const should = require('should');
const helper = require('node-red-node-test-helper');
const multi = require('../devices/multi.js');
const google_smarthome = require('../google-smarthome.js');

helper.init(require.resolve('node-red'));

describe('Multi Node', function() {
  beforeEach(function(done) {
    helper.startServer(done);
  });

  afterEach(function(done) {
    helper.unload();
    helper.stopServer(done);
  });

  it('Smart Home should be loaded with correct default params', function(done) {
    this.timeout(10000);
    const flow = [{"id":"358d3ccc.966434","type":"google-mgmt","z":"2ff30f68.b93d4","client":"85fa874.600d378","name":"","x":130,"y":40,"wires":[["c316494d.196f68"]]},{"id":"c316494d.196f68","type":"helper","z":"2ff30f68.b93d4","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"false","statusVal":"","statusType":"auto","x":330,"y":40,"wires":[]},{"id":"c364cd6a.42b7a","type":"google-device","z":"2ff30f68.b93d4","client":"85fa874.600d378","name":"Cucina","topic":"cucina","passthru":false,"device_type":"onoff","x":110,"y":100,"wires":[["fdcae51d.8ca528"]]},{"id":"fdcae51d.8ca528","type":"helper","z":"2ff30f68.b93d4","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"false","statusVal":"","statusType":"auto","x":330,"y":100,"wires":[]},{"id":"85fa874.600d378","type":"googlesmarthome-client","name":"","enabledebug":true,"usegooglelogin":false,"loginclientid":"","emails":"","username":"userrname","password":"password","usehttpnoderoot":true,"port":"","httppath":"smarthome","ssloffload":true,"publickey":"6","privatekey":"7","jwtkey":"google-home.json","accesstokenduration":"60","reportinterval":"60","clientid":"client_id","clientsecret":"client_secred"}];
    helper.load([multi, google_smarthome], flow, function() {
      try {
        const n1 = helper.getNode("c364cd6a.42b7a");
        n1.should.have.property('type', 'google-device');
        n1.should.have.property('client');
        n1.should.have.property('clientConn');
        const clnt = helper.getNode(n1.client);
        clnt.should.have.property('type', 'googlesmarthome-client');
        const mgmt = helper.getNode("358d3ccc.966434");
        mgmt.should.have.property('type', 'google-mgmt');
        /*
        n1.should.have.property('device_type', 'onoff');
        n1.should.have.property('is_dimmable', false);
        n1.should.have.property('has_temp', false);
        n1.should.have.property('is_rgb', false);
        n1.should.have.property('is_hsv', false);*/
        done();
      } catch (err) {
        done(err);
      }
    });
  });
});
