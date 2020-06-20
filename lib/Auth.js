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

/******************************************************************************************************************
 * Auth
 *
 */
class Auth {
    constructor() {
        this._clientId     = "";
        this._clientSecret = "";
        this._username     = "";
        this._password     = "";
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

        this._username = username;
        this._password = password;

        this._auth.then(function(result) {
            if (typeof result === 'undefined') {
                me.debug('Auth:setUsernamePassword(): data not persisted, create new');

                me._auth = {
                    tokens: {},
                    authcodes: {}
                };

                me._addToken();
                me._persistAuth();
            } else {
                me.debug('Auth:setUsernamePassword(): data already persisted');
                me._auth = result;
                me.debug('Auth:setUsernamePassword(): me._auth = ' + JSON.stringify(me._auth));
            }
        }, function(err) {
            process.nextTick(() => {
                me.emitter.emit('auth', 'error', err);
            });
        });
    }
    //
    //
    //
    isValidUser(username, password) {
        if (this._username !== username) {
            this.debug('Auth:isValidUser(): username does not match!');
            return false;
        }

        if (this._password !== password) {
            this.debug('Auth:isValidUser(): password does not match!');
            return false;
        }

        return true;
    }
    //
    //
    //
    generateAuthCode() {
        let authCode = this.genRandomString();

        this._auth.authcodes[authCode] = {
            expiresAt: new Date(Date.now() + (60 * 10000)),
        };

        return authCode;
    }
    //
    //
    //
    getAuthCode(code) {
        return this._auth.authcodes[code];
    }
    //
    //
    //
    isValidClient(clientId, clientSecret) {
        if (this._clientId !== clientId) {
            this.debug('Auth:isValidClient(): clientId does not match!');
            return false;
        }

        if (arguments.length == 2 && this._clientSecret !== clientSecret) {
            this.debug('Auth:isValidClient(): clientSecret does not match!');
            return false;
        }

        return true;
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

        let accessToken = this._auth.tokens[Object.keys(this._auth.tokens)[0]];
        this.debug('Auth:getAccessToken(): accessToken = ' + JSON.stringify(accessToken));

        if (!accessToken) {
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
    }
    /******************************************************************************************************************
     * private methods
     *
     */
    async _persistAuth() {
        await storage.setItem('auth_auth', this._auth);
    }
    //
    _addToken() {
        let token = this.genRandomString();
        this.debug('Auth:_addToken(): token = ' + token);

        this._auth.tokens[token] = {
          accessToken: token,
          refreshToken: token,
        };
    }
}

module.exports = Auth;
