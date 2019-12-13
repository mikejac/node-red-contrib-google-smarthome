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

const timeToCheckExpiredTokens = 30;

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

        setInterval(() => {
            /*const keys    = Object.keys(tokens);
            const expired = keys.reduce((accumulator, key) => {
                if (new Date() > tokens[key].expirationDate) {
                    const expiredToken = tokens[key];
                    delete tokens[key];
                    accumulator[key] = expiredToken;
                }
                return accumulator;
            }, Object.create(null));
            return Promise.resolve(expired);*/
        }, timeToCheckExpiredTokens * 1000);
    }
    //
    //
    //
    setJwtKey(jwtkey) {
        //try {
            let jk       = fs.readFileSync(jwtkey);
            this._jwtkey = JSON.parse(jk.toString());
        //} catch (err) {
        //    return err;
        //}

        //return true;
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
    getUid(accessToken) {
        if (this._auth.tokens[accessToken]) {
            this.debug('Auth:getUid(): valid accessToken');
            return this._auth.tokens[accessToken].uid;
        } else {
            this.debug('Auth:getUid(): invalid accessToken');
            return false;
        }
    }
    //
    //
    //
    getDefaultUid() {
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
