/**
 * node-red-contrib-google-smarthome
 * Copyright (C) 2024 Michael Jacobsen and others.
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

const path    = require('path');
const util    = require('util');
const fs      = require('fs');

/******************************************************************************************************************
 * HttpAuth
 *
 */
class HttpAuth {
    /**
     * Constructor
     *
     * @param {GoogleSmartHome} smarthome
     */
    constructor(smarthome) {
        this._smarthome = smarthome;
    }
    //
    //
    //
    httpAuthRegister(httpRoot, appHttp) {
        let me = this;
        let use_decode = false;
        if (typeof appHttp === 'undefined') {
            appHttp = this._smarthome.app;
            use_decode = true;
        }

        /**
         * expecting something like the following:
         *
         * GET https://myservice.example.com/auth? \
         *   client_id=GOOGLE_CLIENT_ID
         *      - The Google client ID you registered with Google.
         *   &redirect_uri=REDIRECT_URI
         *      - The URL to which to send the response to this request
         *   &state=STATE_STRING
         *      - A bookkeeping value that is passed back to Google unchanged
         *          in the result
         *   &response_type=code
         *      - The string code
         */
        appHttp.get(me._smarthome.Path_join(httpRoot, 'oauth'), function(req, res) {
            me._smarthome.debug('HttpAuth:httpAuthRegister(GET /oauth) query ' + JSON.stringify(req.query));

            if (req.query.response_type !== 'code') {
                me._smarthome.error('HttpAuth:httpAuthRegister(GET /oauth): response_type ' + req.query.response_type + ' must equal "code"');
                return res.status(500)
                    .send('response_type ' + req.query.response_type + ' must equal "code"');
            }

            if (!me._smarthome.auth.isValidClient(req.query.client_id)) {
                me._smarthome.error('HttpAuth:httpAuthRegister(GET /oauth): client_id ' + req.query.client_id + ' invalid');
                return res.status(500).send('client_id ' + req.query.client_id + ' invalid');
            }

            const useGoogleClientAuth = me._smarthome.auth.useGoogleClientAuth();
            const googleClientId = useGoogleClientAuth ? me._smarthome.auth.getGoogleClientId() : '';
            // User is not logged in. Show login page.
            me._smarthome.debug('HttpAuth:httpAuthRegister(GET /oauth) User is not logged in, showing login page');
            fs.readFile(path.join(__dirname, 'frontend/login.html'), 'utf8', function (err, data) {
                if (err) {
                    res.end();
                    throw(err);
                }
                res
                    .set("Content-Security-Policy", "default-src 'self' 'unsafe-inline' *.google.com")
                    .send(data.replace(/GOOGLE_CLIENT_ID/g, googleClientId).replace(/USE_GOOGLE_LOGIN/g, '' + useGoogleClientAuth));
            });
        });
        //
        //
        //
        appHttp.post(me._smarthome.Path_join(httpRoot, 'oauth'), function(req, res) {
            me._smarthome.debug('HttpAuth:httpAuthRegister(POST /oauth): body = ' + JSON.stringify(req.body));
            const my_uri = req.protocol + '://' + req.get('Host') + me._smarthome.Path_join(httpRoot, 'oauth');

            // client_id in POST date is not decoded automatically by bodyParser and needs to be decoded manually
            let client_id = use_decode ? decodeURIComponent(req.body.client_id) : req.body.client_id;
            if (!me._smarthome.auth.isValidClient(client_id)) {
                me._smarthome.error('HttpAuth:httpAuthRegister(POST /oauth): client_id ' + client_id + ' invalid');
                return res.status(500).send('client_id ' + client_id + ' invalid');
            }

            if (!me._smarthome.auth.isValidRedirectUri(req.body.redirect_uri || '', me._smarthome._debug ? my_uri : '')) {
                me._smarthome.error('HttpAuth:httpAuthRegister(POST /oauth): redirect_uri ' + req.body.redirect_uri + ' invalid');
                return res.status(500).send('redirect_uri ' + req.body.redirect_uri + ' invalid');
            }

            if (me._smarthome.auth.useGoogleClientAuth()) {
                me._smarthome.debug('HttpAuth:httpAuthRegister(POST /oauth): Google login');
                if (req.body.id_token) {
                    const {OAuth2Client} = require('google-auth-library');
                    const googleClientId = me._smarthome.auth.getGoogleClientId();
                    const client = new OAuth2Client(googleClientId);
                    client
                        .verifyIdToken({
                            idToken: req.body.id_token,
                            audience: googleClientId,
                        })
                        .then(function(ticket) {
                            const payload = ticket.getPayload();
                            // const userid = payload['sub'];
                            const email = payload['email'];
                            const isValidUser = me._smarthome.auth.isGoogleClientEmailValid(email);
                            me._smarthome.debug('HttpAuth:httpAuthRegister(POST /oauth): email ' + email + " valid: " + isValidUser);
                            me.handleUserAuth(req, res, email, '', isValidUser, httpRoot);
                        })
                        .catch(function(err) {
                            me._smarthome.error('HttpAuth:httpAuthRegister(POST /oauth): verifyIdToken error ' + err);
                            me.handleUserAuth(req, res, 'google', '', false, httpRoot);
                        });
                } else {
                    me.handleUserAuth(req, res, 'google', '', false, httpRoot);
                }
            } else {
                me._smarthome.debug('HttpAuth:httpAuthRegister(POST /oauth): Local login');
                let isValidUser = me._smarthome.auth.isValidUser(req.body.username, req.body.password);
                me.handleUserAuth(req, res, req.body.username, req.body.password, isValidUser, httpRoot);
            }
        });

        /**
         * client_id=GOOGLE_CLIENT_ID
         * &client_secret=GOOGLE_CLIENT_SECRET
         * &response_type=token
         * &grant_type=authorization_code
         * &code=AUTHORIZATION_CODE
         *
         * OR
         *
         *
         * client_id=GOOGLE_CLIENT_ID
         * &client_secret=GOOGLE_CLIENT_SECRET
         * &response_type=token
         * &grant_type=refresh_token
         * &refresh_token=REFRESH_TOKEN
         */
        appHttp.all(me._smarthome.Path_join(httpRoot, 'token'), function(req, res) {
            me._smarthome.debug('HttpAuth:httpAuthRegister(/token): query = ' + JSON.stringify(req.query));
            me._smarthome.debug('HttpAuth:httpAuthRegister(/token): body = ' + JSON.stringify(req.body));
            const my_uri = req.protocol + '://' + req.get('Host') + me._smarthome.Path_join(httpRoot, 'oauth');

            let clientId     = req.query.client_id     ? req.query.client_id     : req.body.client_id;
            let clientSecret = req.query.client_secret ? req.query.client_secret : req.body.client_secret;
            let grantType    = req.query.grant_type    ? req.query.grant_type    : req.body.grant_type;

            if (!me._smarthome.auth.isValidClient(clientId, clientSecret)) {
                me._smarthome.error('HttpAuth:httpAuthRegister(/token): invalid client id or secret');
                return res.status(400).send('invalid client id or secret');
            }

            if (grantType === 'authorization_code') {
                return me.handleAuthCode(req, res, me._smarthome._debug ? my_uri : '');
            } else if (grantType === 'refresh_token') {
                return me.handleRefreshToken(req, res);
            } else {
                me._smarthome.error('HttpAuth:httpAuthRegister(/token): grant_type ' + grantType + ' is not supported');
                let error_result = {"error": "invalid_grant"};
                return res.status(400).send(error_result);
            }
        });
    }
    /******************************************************************************************************************
     * private methods
     *
     */

    /**
     * @returns {{}}
     * {
     * }
     */
    handleUserAuth(req, res, username, password, isValidUser, httpRoot) {
        if (!isValidUser) {
            let redirectUrl = util.format('%s?client_id=%s&redirect_uri=%s&state=%s&response_type=code&error=invalid_user',
                this._smarthome.Path_join(httpRoot, 'oauth'), req.body.client_id, encodeURIComponent(req.body.redirect_uri), req.body.state);
            this._smarthome._mgmtNode.error('HttpAuth:handleUserAuth(): invalid user');
            this._smarthome.debug('HttpAuth:handleUserAuth(): invalid user, redirecting to login form at ' + redirectUrl);
            return res.redirect(redirectUrl);
        }

        this._smarthome.debug('HttpAuth:handleUserAuth(): login successful');

        let authCode = this._smarthome.auth.generateAuthCode(username);

        if (authCode) {
            let redirectUrl = util.format('%s?code=%s&state=%s', req.body.redirect_uri, authCode, req.body.state)
            this._smarthome.debug('HttpAuth:handleUserAuth(): authCode generated successfully (authCode = ' + authCode + ')');
            this._smarthome.debug('HttpAuth:handleUserAuth(): redirecting to Google at ' + redirectUrl);
            return res.redirect(redirectUrl);
        } else {
            let redirectUrl = util.format('%s?client_id=%s&redirect_uri=%s&state=%s&response_type=code',
                this._smarthome.Path_join(httpRoot, 'oauth'), req.body.client_id, encodeURIComponent(req.body.redirect_uri), req.body.state);
            this._smarthome._mgmtNode.error('HttpAuth:handleUserAuth(): generating authCode failed');
            this._smarthome.debug('HttpAuth:handleUserAuth(): generating authCode failed, redirecting to Google at ' + redirectUrl);
            return res.redirect(redirectUrl);
        }
    }
    /**
     * @returns {{}}
     * {
     *   token_type: "bearer",
     *   access_token: "ACCESS_TOKEN",
     *   refresh_token: "REFRESH_TOKEN"
     *   expires_in: "EXPIRATION_SECONDS",
     * }
     */
    handleAuthCode(req, res, my_uri) {
        let code         = req.query.code          ? req.query.code          : req.body.code;
        let redirect_uri = req.query.redirect_uri  ? req.query.redirect_uri  : req.body.redirect_uri;

        try {
            let token = this._smarthome.auth.exchangeAuthCode(code, redirect_uri, my_uri);

            this._smarthome.debug('HttpAuth:handleAuthCode(): respond success; token = ' + JSON.stringify(token));
            return res.status(200).json(token);
        }
        catch (err) {
            this._smarthome._mgmtNode.error('HttpAuth:handleAuthCode(): ' + err);
            let error_result = {"error": "invalid_grant"};
            return res.status(400).send(error_result);
        }
    }
    /**
     * @returns {{}}
     * {
     *   token_type: "bearer",
     *   access_token: "ACCESS_TOKEN",
     *   expires_in: "EXPIRATION_SECONDS",
     * }
     */
    handleRefreshToken(req, res) {
        let refreshToken = req.query.refresh_token ? req.query.refresh_token : req.body.refresh_token;

        try {
            let token = this._smarthome.auth.refreshAccessToken(refreshToken);

            this._smarthome.debug('HttpAuth:handleRefreshToken(): respond success; token = ' + JSON.stringify(token));
            return res.status(200).json(token);
        }
        catch (err) {
            this._smarthome._mgmtNode.error('HttpAuth:handleRefreshToken(): ' + err);
            let error_result = {"error": "invalid_grant"};
            return res.status(400).send(error_result);
        }
    }
}

module.exports = HttpAuth;
