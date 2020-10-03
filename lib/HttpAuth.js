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

const path    = require('path');
const util    = require('util');

/******************************************************************************************************************
 * HttpAuth
 *
 */
class HttpAuth {
    constructor() {

    }
    //
    //
    //
    httpAuthRegister(httpRoot, appHttp) {
        let me = this;
        if (typeof appHttp === 'undefined') {
            appHttp = this.app;
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
        appHttp.get(path.join(httpRoot, 'oauth'), function(req, res) {
            me.debug('HttpAuth:httpAuthRegister(GET /oauth)');

            if (req.query.response_type !== 'code') {
                me.debug('HttpAuth:httpAuthRegister(GET /oauth): response_type ' + req.query.response_type + ' must equal "code"');
                return res.status(500)
                    .send('response_type ' + req.query.response_type + ' must equal "code"');
            }

            if (!me.isValidClient(req.query.client_id)) {
                me.debug('HttpAuth:httpAuthRegister(GET /oauth): client_id ' + req.query.client_id + ' invalid');
                return res.status(500).send('client_id ' + req.query.client_id + ' invalid');
            }

            // User is not logged in. Show login page.
            res.sendFile('login.html', {root: path.join(__dirname, 'frontend')}, (err) => {
                res.end();
                if (err) throw(err);
            });
        });
        //
        //
        //
        appHttp.post(path.join(httpRoot, 'oauth'), function(req, res) {
            me.debug('HttpAuth:httpAuthRegister(POST /oauth): body = ' + JSON.stringify(req.body));

            let response_type = req.query.response_type ? req.query.response_type : req.body.response_type;

            if (response_type !== 'code') {
                me.debug('HttpAuth:httpAuthRegister(POST /oauth): response_type ' + response_type + ' must equal "code"');
                return res.status(500)
                    .send('response_type ' + response_type + ' must equal "code"');
            }

            if (!me.isValidClient(req.body.client_id)) {
                me.debug('HttpAuth:httpAuthRegister(POST /oauth): client_id ' + req.body.client_id + ' invalid');
                return res.status(500).send('client_id ' + req.body.client_id + ' invalid');
            }

            if (!me.isValidRedirectUri(req.body.redirect_uri)) {
                me.debug('HttpAuth:httpAuthRegister(POST /oauth): redirect_uri ' + req.body.redirect_uri + ' invalid');
                return res.status(500).send('redirect_uri ' + req.body.redirect_uri + ' invalid');
            }

            let isValidUser = me.isValidUser(req.body.username, req.body.password);
            if (!isValidUser) {
                process.nextTick(() => {
                    me.emitter.emit('/oauth', 'invalid user', req.body.username, req.body.password);
                });

                me.debug('HttpAuth:httpAuthRegister(POST /oauth): invalid user');
                return res.redirect(util.format(
                    '%s?client_id=%s&redirect_uri=%s&state=%s&response_type=code&error=invalid_user',
                    '/oauth', req.body.client_id, encodeURIComponent(req.body.redirect_uri), req.body.state));
            }

            me.debug('HttpAuth:httpAuthRegister(POST /oauth): login successful');

            let authCode = me.generateAuthCode();

            if (authCode) {
                process.nextTick(() => {
                    me.emitter.emit('/oauh', 'authCode successful', req.body.username, req.body.password);
                });

                me.debug('HttpAuth:httpAuthRegister(POST /oauth): authCode successful; authCode = ' + authCode);
                return res.redirect(util.format('%s?code=%s&state=%s',
                    req.body.redirect_uri, authCode, req.body.state));
            } else {
                process.nextTick(() => {
                    me.emitter.emit('/oauth', 'authCode failed', req.body.username, req.body.password);
                });

                me.debug('HttpAuth:httpAuthRegister(POST /oauth): authCode failed');
                return res.redirect(util.format(
                    '%s?client_id=%s&redirect_uri=%s&state=%s&response_type=code',
                    '/oauth', req.body.client_id, encodeURIComponent(req.body.redirect_uri), req.body.state));
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
        appHttp.all(path.join(httpRoot, 'token'), function(req, res) {
            me.debug('HttpAuth:httpAuthRegister(/token): query = ' + JSON.stringify(req.query));
            me.debug('HttpAuth:httpAuthRegister(/token): body = ' + JSON.stringify(req.body));

            let clientId     = req.query.client_id     ? req.query.client_id     : req.body.client_id;
            let clientSecret = req.query.client_secret ? req.query.client_secret : req.body.client_secret;
            let grantType    = req.query.grant_type    ? req.query.grant_type    : req.body.grant_type;

            if (!me.isValidClient(clientId, clientSecret)) {
                me.debug('HttpAuth:httpAuthRegister(/token): invalid client id; clientId = ' + clientId);
                return res.status(400).send('invalid client id or secret');
            }

            if ('authorization_code' == grantType) {
                return me.handleAuthCode(req, res);
            } else if ('refresh_token' == grantType) {
                return me.handleRefreshToken(req, res);
            } else {
                me.debug('HttpAuth:httpAuthRegister(/token): grant_type ' + grantType + ' is not supported');
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
     * @return {{}}
     * {
     *   token_type: "bearer",
     *   access_token: "ACCESS_TOKEN",
     *   refresh_token: "REFRESH_TOKEN"
     *   expires_in: "EXPIRATION_SECONDS",
     * }
     */
    handleAuthCode(req, res) {
        let code         = req.query.code          ? req.query.code          : req.body.code;
        let redirect_uri = req.query.redirect_uri  ? req.query.redirect_uri  : req.body.redirect_uri;

        try {
            let token = this.exchangeAuthCode(code, redirect_uri);

            this.debug('HttpAuth:handleAuthCode(): respond success; token = ' + JSON.stringify(token));
            return res.status(200).json(token);
        }
        catch (err) {
            this.debug('HttpAuth:handleAuthCode(): ' + err);
            let error_result = {"error": "invalid_grant"};
            return res.status(400).send(error_result);
        }
    }
    /**
     * @return {{}}
     * {
     *   token_type: "bearer",
     *   access_token: "ACCESS_TOKEN",
     *   expires_in: "EXPIRATION_SECONDS",
     * }
     */
    handleRefreshToken(req, res) {
        let refreshToken = req.query.refresh_token ? req.query.refresh_token : req.body.refresh_token;

        try {
            let token = this.refreshAccessToken(refreshToken);

            this.debug('HttpAuth:handleRefreshToken(): respond success; token = ' + JSON.stringify(token));
            return res.status(200).json(token);
        }
        catch (err) {
            this.debug('HttpAuth:handleRefreshToken(): ' + err);
            let error_result = {"error": "invalid_grant"};
            return res.status(400).send(error_result);
        }
    }
}

module.exports = HttpAuth;
