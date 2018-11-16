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

'use strict';

const storage        = require('node-persist');
const fs             = require('fs');
const TokenGenerator = require('uuid-token-generator');

// from time to time we need to clean up any expired tokens in the database
//setInterval(() => {
//    db.accessTokens.removeExpired()
//    .catch(err => console.error('Error trying to remove expired tokens:', err.stack));
//}, config.db.timeToCheckExpiredTokens * 1000);

/******************************************************************************************************************
 * Auth
 *
 */
class Auth {
    constructor() {
        this._clientId     = "";
        this._clientSecret = "";
        this._auth         = storage.getItem('auth_auth');
        this._tokenGen     = new TokenGenerator(256, TokenGenerator.BASE58);
    }
    //
    //
    //
    setJwtKey(jwtkey) {
        let jk       = fs.readFileSync(jwtkey);
        this._jwtkey = JSON.parse(jk.toString());
    }
    //
    //
    //
    setClientIdSecret(clientid, clientsecret) {
        this._clientId     = clientid;
        this._clientSecret = clientsecret;
    }
    //
    //
    //
    setUsernamePassword(username, password) {
        let me = this;

        this._auth.then(function(result) {
            if (typeof result === 'undefined') {
                me.debug('Auth:setUsernamePassword(): data not persisted, create new');

                me._auth = {
                    clients: {},
                    tokens: {},
                    users: {},
                    usernames: {},
                    authcodes: {}
                };

                me._addUser(username, password);
                me._persistAuth();
            } else {
                me.debug('Auth:setUsernamePassword(): data already persisted');
                me._auth = result;
                me.debug('Auth:setUsernamePassword(): me._auth = ' + JSON.stringify(me._auth));
            }
        }, function(err) {
            process.nextTick(() => {
                me.emit('auth', 'error', err);
            });
        });
    }
    //
    //
    //
    getUser(username, password) {
        this.debug('Auth:getUser(): username = ' + username);
        this.debug('Auth:getUser(): this._auth = ' + JSON.stringify(this._auth));

        let userId = this._auth.usernames[username];
        if (!userId) {
            this.debug('Auth:getUser(): username does not exist');
            return false;
        }
      
        let user = this._auth.users[userId];
        if (!user) {
            this.debug('Auth:getUser(): userId does not exist');
            return false;
        }

        if (user.password != password) {
            this.debug('Auth:getUser(): passwords do not match!');
            return false;
        }
      
        return user;
    }
    //
    //
    //
    getUid() {
        let keys = Object.keys(this._auth.usernames);

        return this._auth.usernames[keys[0]];
    }
    //
    //
    //
    generateAuthCode(uid, clientId) {
        let authCode = this.genRandomString();
      
        this._auth.authcodes[authCode] = {
            type: 'AUTH_CODE',
            uid: uid,
            clientId: clientId,
            expiresAt: new Date(Date.now() + (60 * 10000)),
        };

        return authCode;
    };
    //
    //
    //
    getAuthCode(code) {
        return this._auth.authcodes[code];
    }
    //
    //
    //
    isValidClient(clientId) {
        if (this._clientId === clientId) {
            return true;
        } else {
            return false;
        }
    }
    //
    //
    //
    getClient(clientId, clientSecret) {
        if (this._clientId !== clientId) {
            return false;
        }
        if (this._clientSecret !== clientSecret) {
            return false;
        }

        let client = {
            clientId: clientId,
            clientSecret: clientSecret
        }

        return client;
    }
    //
    //
    //
    getAccessToken(code) {
        let authCode = this._auth.authcodes[code];
      
        if (!authCode) {
            this.debug('Auth:getAccessToken(): invalid code; code = ' + code);
            return false;
        }

        if (new Date(authCode.expiresAt) < Date.now()) {
            this.debug('Auth:getAccessToken(): expired code; authCode = ' + JSON.stringify(authCode));
            return false;
        }
      
        let user = this._auth.users[authCode.uid];
        if (!user) {
            this.debug('Auth:getAccessToken(): could not find user; authCode = ' + JSON.stringify(authCode));
            return false;
        }

        let accessToken = this._auth.tokens[user.tokens[0]];
        this.debug('Auth:getAccessToken(): accessToken = ' + JSON.stringify(accessToken));

        if (!accessToken || !accessToken.uid) {
            this.debug('Auth:getAccessToken(): could not find accessToken');
            return false;
        }
      
        let returnToken = {
            token_type: 'bearer',
            access_token: accessToken.accessToken,
            refresh_token: accessToken.refreshToken,
        };
      
        this.debug('Auth:getAccessToken(): returnToken = ' + JSON.stringify(returnToken));

        return returnToken;
    }
    //
    //
    //
    isValidAccessToken(accessToken) {
        this.debug('Auth:isValidAccessToken(): accessToken = ' + JSON.stringify(accessToken));
        this.debug('Auth:isValidAccessToken(): this._auth = ' + JSON.stringify(this._auth));

        if (this._auth.tokens[accessToken]) {
            this.debug('Auth:isValidAccessToken(): valid accessToken');
            return true;
        } else {
            this.debug('Auth:isValidAccessToken(): invalid accessToken');
            return false;
        }
    }
    //
    //
    //
    getJwtClientEmail() {
        return this._jwtkey.client_email;
    }
    //
    //
    //
    getJwtPrivateKey() {
        return this._jwtkey.private_key;
    }
    //
    //
    //
    genRandomString() {
        return this._tokenGen.generate();
        //return Math.floor(Math.random() * 10000000000000000000000000000000000000000).toString(36);
    }
    /******************************************************************************************************************
     * private methods
     *
     */
    async _persistAuth() {
        await storage.setItem('auth_auth', this._auth);
    }
    //
    _addUser(username, password) {
        let uid   = this._genUid();
        let token = this.genRandomString();
        this.debug('Auth:_addUser(): uid = ' + uid);
        this.debug('Auth:_addUser(): token = ' + token);

        this._auth.usernames[username] = uid;

        this._auth.users[uid] = {
          uid: uid,
          name: username,
          password: password,
          tokens: [token],
        };

        this._auth.tokens[token] = {
          uid: uid,
          accessToken: token,
          refreshToken: token,
        };
    }
    //
    _genUid() {
        let uid = Math.floor(Math.random() * 1000).toString();

        while (this._auth.users[uid]) {
            uid = this._genUid();
        }

        return uid;
    }
      
}

module.exports = Auth;

/*

HttpAuth:httpAuthRegister(/login): body = {"redirect":"","client_id":"my_client_id_01","redirect_uri":"https%3A%2F%2Foauth-redirect.googleusercontent.com%2Fr%2Ftest-02-ea18c","state":"CsQCQU53WnNxOXBPUzh1TERlRGdFNVlOQ01XUW1vOXBjVDY2Zi1jRGZXRVFtdm4xNklwSGtYUFAyeXJ5NFdqVVpsblZQY2FmZ3BIUlhaeEU5c1RNQ0FGWGl4N19GSFh0c3ZzOUl4YWlleURJM1E4Y01wVElQX0J5cS04cGlfTGpldlNlQmw2MExfdk82RXVqNXJmNXFsdWVDeGtYMkk4ZWZhVEpURWU4cWd1dEkzeDkyOXZGSjc0WFlOamNKTnQxbzhhX1BaXzZodFNwTWVlYkVlMlJjT2NpZWFvR2pFV1ZZY1FULTBmTUo3bW1hTFVNOUxhSW1mWUpWWEFZVXg4RzBrV2RBZmZpb29SSTlweHg4TnJhbE9oNThON0FNVVhHZEFjR1hJTW1BTmY1OFhPUTJiaTRjbXM5NkVqRzQ5Qmh5Um9jbHNOEh1jaHJvbWVjYXN0Oi8vc2V0dGluZ3MvaGFuZG9mZiI8aHR0cHM6Ly9vYXV0aC1yZWRpcmVjdC5nb29nbGV1c2VyY29udGVudC5jb20vci90ZXN0LTAyLWVhMThjKhhtaWNoYWVsQHZpc2J5amFjb2JzZW4uZGsyEXRlc3QtMDItZWExOGNfZGV2","username":"bob","password":"secret"}
Auth:getUser(): username = bob
Auth:getUser(): this._auth = {"clients":{},"tokens":{"9fhnb0w6e1c000000000000000":{"uid":"719","accessToken":"9fhnb0w6e1c000000000000000","refreshToken":"9fhnb0w6e1c000000000000000"}},"users":{"719":{"uid":"719","name":"bob","password":"secret","tokens":["9fhnb0w6e1c000000000000000"]}},"usernames":{"bob":"719"},"authcodes":{}}
HttpAuth:httpAuthRegister(/login): logging in; user = {"uid":"719","name":"bob","password":"secret","tokens":["9fhnb0w6e1c000000000000000"]}
HttpAuth:httpAuthRegister(/login): login successful; user = bob
HttpAuth:httpAuthRegister(/login): authCode successful; authCode = 7ml3lkx3i3s000000000000000
14 Nov 14:49:03 - [debug] GoogleSmartHomeNode(on-login): msg      = authCode successful
14 Nov 14:49:03 - [debug] GoogleSmartHomeNode(on-login): username = bob
14 Nov 14:49:03 - [debug] GoogleSmartHomeNode(on-login): password = secret
POST /login 302 12.279 ms - 1490
HttpAuth:httpAuthRegister(/token): query = {}
HttpAuth:httpAuthRegister(/token): body = {"grant_type":"authorization_code","code":"7ml3lkx3i3s000000000000000","redirect_uri":"https://oauth-redirect.googleusercontent.com/r/test-02-ea18c","client_id":"my_client_id_01","client_secret":"very_secret"}
HttpAuth:httpAuthRegister(/token): client = {"clientId":"my_client_id_01","clientSecret":"very_secret"}
HttpAuth:handleAuthCode(): req.query = {}
Auth:getAccessToken(): accessToken = {"uid":"719","accessToken":"9fhnb0w6e1c000000000000000","refreshToken":"9fhnb0w6e1c000000000000000"}
Auth:getAccessToken(): returnToken = {"token_type":"bearer","access_token":"9fhnb0w6e1c000000000000000","refresh_token":"9fhnb0w6e1c000000000000000"}
HttpAuth:handleAuthCode(): respond success; token = {"token_type":"bearer","access_token":"9fhnb0w6e1c000000000000000","refresh_token":"9fhnb0w6e1c000000000000000"}
POST /token 200 4.046 ms - 112
GET /service-worker.js 304 0.983 ms - -
HttpActions:httpActionsRegister(/smarthome): request.headers = {
    "content-type":"application/json;charset=UTF-8",
    "google-assistant-api-version":"v1",
    "authorization":"Bearer 9fhnb0w6e1c000000000000000",
    "host":"hjem.visbyjacobsen.dk:3001",
    "content-length":"78",
    "connection":"keep-alive",
    "user-agent":"Mozilla/5.0 (compatible; Google-Cloud-Functions/2.1; +http://www.google.com/bot.html)","accept-encoding":"gzip,deflate,br"}




HttpActions:httpActionsRegister(/smarthome): reqdata = {"inputs":[{"intent":"action.devices.SYNC"}],"requestId":"412111430172383752"}
Auth:getAccessToken(): invalid code; code = [object Object]
HttpActions:httpActionsRegister(/smarthome): SYNC
HttpActions:_sync()
Device:getProperties(): properties = {"cce69f06.e0866":{"type":"action.devices.types.LIGHT","traits":["action.devices.traits.OnOff"],"name":{"defaultNames":["Node-RED On/off Lamp"],"name":"Kontor"},"willReportState":true,"attributes":{},"deviceInfo":{"manufacturer":"Node-RED","model":"nr-light-onoff-v1","swVersion":"1.0","hwVersion":"1.0"},"customData":{"nodeid":"cce69f06.e0866","type":"light-onoff"}}}
Getting device information for id 'cce69f06.e0866'
HttpActions:_sync(): deviceProps = {"requestId":"412111430172383752","payload":{"devices":[{"type":"action.devices.types.LIGHT","traits":["action.devices.traits.OnOff"],"name":{"defaultNames":["Node-RED On/off Lamp"],"name":"Kontor"},"willReportState":true,"attributes":{},"deviceInfo":{"manufacturer":"Node-RED","model":"nr-light-onoff-v1","swVersion":"1.0","hwVersion":"1.0"},"customData":{"nodeid":"cce69f06.e0866","type":"light-onoff"},"id":"cce69f06.e0866"}]}}
POST /smarthome 200 3.158 ms - 430

*/