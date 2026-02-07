/**
 * node-red-contrib-google-smarthome
 * Copyright (C) 2025 Michael Jacobsen and others.
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

import express from 'express';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { OAuth2Client } from 'google-auth-library';
import { Request, Response } from 'express';

import { GoogleSmartHome } from './SmartHome';

/******************************************************************************************************************
 * HttpAuth
 *
 */
export default class HttpAuth {
    private _smarthome: GoogleSmartHome;


    /**
     * Constructor
     *
     * @param {GoogleSmartHome} smarthome
     */
    constructor(smarthome: GoogleSmartHome) {
        this._smarthome = smarthome;
    }

    /**
     * Register HTTP endpoints for authentication.
     *
     * @param httpRoot - URL prefix for HTTP endpoints.
     * @param appHttp - Express application instance.
     */
    httpAuthRegister(httpRoot: string, appHttp: express.Express | undefined): void {
        let use_decode = false;
        if (typeof appHttp === 'undefined') {
            appHttp = this._smarthome.app;
            use_decode = true;
        }

        // GET /oauth
        appHttp.get(this._smarthome.Path_join(httpRoot, 'oauth'), (request, response) => this._handleGetOauth(request, response));

        // POST /oauth
        appHttp.post(this._smarthome.Path_join(httpRoot, 'oauth'), (request, response) => this._handlePostOauth(request, response, httpRoot, use_decode));

        // ALL /token
        appHttp.all(this._smarthome.Path_join(httpRoot, 'token'), (request, response) => this._handleAllToken(request, response, httpRoot));
    }

    /**
     * Handle GET requests to the /oauth endpoint.
     * This is called by the Google Home app to start the login process.
     * It shows the login page to the user.
     *
     * Expects something like this:
     *
     * GET https://myservice.example.com/auth? \
     *   client_id=GOOGLE_CLIENT_ID
     *      - The Google client ID you registered with Google.
     *   &redirect_uri=REDIRECT_URI
     *      - The URL to which to send the response to this request
     *   &state=STATE_STRING
     *      - A bookkeeping value that is passed back to Google unchanged in the result
     *   &response_type=code
     *      - The oAuth response type. Must be "code".
     * 
     * @param request - The HTTP request object.
     * @param response - The HTTP response object.
     */
    private _handleGetOauth(request: Request, response: Response): void {
        this._smarthome.debug('HttpAuth:_handleGetOauth() query ' + JSON.stringify(request.query));

        if (request.query.response_type !== 'code') {
            this._smarthome.error('HttpAuth:_handleGetOauth(): response_type ' + request.query.response_type + ' must equal "code"');
            response.status(500).send('response_type ' + request.query.response_type + ' must equal "code"');
        }

        if (!this._smarthome.auth.isValidClient(request.query.client_id)) {
            this._smarthome.error('HttpAuth:_handleGetOauth(): client_id ' + request.query.client_id + ' invalid');
            response.status(500).send('client_id ' + request.query.client_id + ' invalid');
        }

        const useGoogleClientAuth = this._smarthome.auth.useGoogleClientAuth();
        const googleClientId = useGoogleClientAuth ? this._smarthome.auth.getGoogleClientId() : '';

        // User is not logged in. Show login page.
        this._smarthome.debug('HttpAuth:_handleGetOauth() User is not logged in, showing login page');
        fs.readFile(path.join(__dirname, 'frontend/login.html'), 'utf8', function (err, data) {
            if (err) {
                response.end();
                throw(err);
            }
            response
                .set("Content-Security-Policy", "default-src 'self' 'unsafe-inline' *.google.com")
                .send(data.replace(/GOOGLE_CLIENT_ID/g, googleClientId).replace(/USE_GOOGLE_LOGIN/g, '' + useGoogleClientAuth));
        });
    }

    /**
     * Handle POST requests to the /oauth endpoint.
     * This is called when the user submits the login form.
     * 
     * @param request - The HTTP request object.
     * @param response - The HTTP response object.
     * @param httpRoot - URL prefix for HTTP endpoints.
     * @param use_decode - Whether to decode the client_id from the request body.
     */
    private _handlePostOauth(request: Request, response: Response, httpRoot: string, use_decode: boolean) {
        this._smarthome.debug('HttpAuth:_handlePostOauth(): body = ' + JSON.stringify(request.body));
        const my_uri = request.protocol + '://' + request.get('Host') + this._smarthome.Path_join(httpRoot, 'oauth');

        // client_id in POST date is not decoded automatically by bodyParser and needs to be decoded manually
        let client_id = use_decode ? decodeURIComponent(request.body.client_id) : request.body.client_id;
        if (!this._smarthome.auth.isValidClient(client_id)) {
            this._smarthome.error('HttpAuth:_handlePostOauth(): client_id ' + client_id + ' invalid');
            response.status(500).send('client_id ' + client_id + ' invalid');
            return;
        }

        if (!this._smarthome.auth.isValidRedirectUri(request.body.redirect_uri || '', this._smarthome._debug ? my_uri : '')) {
            this._smarthome.error('HttpAuth:_handlePostOauth(): redirect_uri ' + request.body.redirect_uri + ' invalid');
            response.status(500).send('redirect_uri ' + request.body.redirect_uri + ' invalid');
            return;
        }

        if (this._smarthome.auth.useGoogleClientAuth()) {
            this._smarthome.debug('HttpAuth:_handlePostOauth(): Google login');
            if (request.body.id_token) {
                const googleClientId = this._smarthome.auth.getGoogleClientId();
                const client = new OAuth2Client(googleClientId);
                client
                    .verifyIdToken({
                        idToken: request.body.id_token,
                        audience: googleClientId,
                    })
                    .then((ticket) => {
                        const payload = ticket.getPayload();
                        // const userid = payload['sub'];
                        const email = payload['email'];
                        const isValidUser = this._smarthome.auth.isGoogleClientEmailValid(email);
                        this._smarthome.debug('HttpAuth:_handlePostOauth(): email ' + email + " valid: " + isValidUser);
                        this._handleUserAuth(request, response, email, '', isValidUser, httpRoot);
                    })
                    .catch((err) => {
                        this._smarthome.error('HttpAuth:_handlePostOauth(): verifyIdToken error ' + err);
                        this._handleUserAuth(request, response, 'google', '', false, httpRoot);
                    });
            } else {
                this._handleUserAuth(request, response, 'google', '', false, httpRoot);
            }
        } else {
            this._smarthome.debug('HttpAuth:_handlePostOauth(): Local login');
            let isValidUser = this._smarthome.auth.isValidUser(request.body.username, request.body.password);
            this._handleUserAuth(request, response, request.body.username, request.body.password, isValidUser, httpRoot);
        }
    }

    /**
     * Handle GET and POST requests to the /token endpoint.
     * 
     * This is called by Google servers to exchange an authorization code for an access token
     * or to refresh an access token.
     * 
     * 
     * This endpoint expects either:
     *
     * client_id=GOOGLE_CLIENT_ID
     * &client_secret=GOOGLE_CLIENT_SECRET
     * &response_type=token
     * &grant_type=authorization_code
     * &code=AUTHORIZATION_CODE
     *
     * OR
     *
     * client_id=GOOGLE_CLIENT_ID
     * &client_secret=GOOGLE_CLIENT_SECRET
     * &response_type=token
     * &grant_type=refresh_token
     * &refresh_token=REFRESH_TOKEN
     * 
     * @param request - The HTTP request object.
     * @param response - The HTTP response object.
     * @param httpRoot - URL prefix for HTTP endpoints.
     */
    private _handleAllToken(request: Request, response: Response, httpRoot: string): void {
        this._smarthome.debug('HttpAuth:_handleAllToken(): query = ' + JSON.stringify(request.query));
        this._smarthome.debug('HttpAuth:_handleAllToken(): body = ' + JSON.stringify(request.body));
        const my_uri = request.protocol + '://' + request.get('Host') + this._smarthome.Path_join(httpRoot, 'oauth');

        const clientId = (request.query?.client_id as string | undefined) ?? (request.body?.client_id as string | undefined);
        const clientSecret = (request.query?.client_secret as string | undefined) ?? (request.body?.client_secret as string | undefined);
        const grantType = (request.query?.grant_type as string | undefined) ?? (request.body?.grant_type as string | undefined);

        if (!this._smarthome.auth.isValidClient(clientId, clientSecret)) {
            this._smarthome.error('HttpAuth:_handleAllToken(): invalid client id or secret');
            response.status(400).send('invalid client id or secret');
            return;
        }

        if (grantType === 'authorization_code') {
            this._handleAuthCode(request, response, this._smarthome._debug ? my_uri : '');
            return;
        } else if (grantType === 'refresh_token') {
            this._handleRefreshToken(request, response);
            return;
        } else {
            this._smarthome.error('HttpAuth:_handleAllToken(): grant_type ' + grantType + ' is not supported');
            let error_result = {"error": "invalid_grant"};
            response.status(400).send(error_result);
            return;
        }
    }

    /**
     * @returns {{}}
     * {
     * }
     */
    private _handleUserAuth(req: Request, res: Response, username, password, isValidUser, httpRoot) {
        if (!isValidUser) {
            let redirectUrl = util.format('%s?client_id=%s&redirect_uri=%s&state=%s&response_type=code&error=invalid_user',
                this._smarthome.Path_join(httpRoot, 'oauth'), req.body.client_id, encodeURIComponent(req.body.redirect_uri), req.body.state);
            this._smarthome.configNode.error('HttpAuth:_handleUserAuth(): invalid user');
            this._smarthome.debug('HttpAuth:_handleUserAuth(): invalid user, redirecting to login form at ' + redirectUrl);
            res.redirect(redirectUrl);
            return;
        }

        this._smarthome.debug('HttpAuth:_handleUserAuth(): login successful');

        let authCode = this._smarthome.auth.generateAuthCode(username);

        if (authCode) {
            let redirectUrl = util.format('%s?code=%s&state=%s', req.body.redirect_uri, authCode, req.body.state)
            this._smarthome.debug('HttpAuth:_handleUserAuth(): authCode generated successfully (authCode = ' + authCode + ')');
            this._smarthome.debug('HttpAuth:_handleUserAuth(): redirecting to Google at ' + redirectUrl);
            res.redirect(redirectUrl);
        } else {
            let redirectUrl = util.format('%s?client_id=%s&redirect_uri=%s&state=%s&response_type=code',
                this._smarthome.Path_join(httpRoot, 'oauth'), req.body.client_id, encodeURIComponent(req.body.redirect_uri), req.body.state);
            this._smarthome.configNode.error('HttpAuth:_handleUserAuth(): generating authCode failed');
            this._smarthome.debug('HttpAuth:_handleUserAuth(): generating authCode failed, redirecting to Google at ' + redirectUrl);
            res.redirect(redirectUrl);
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
    private _handleAuthCode(req: Request, res: Response, my_uri) {
        let code         = req.query.code          ? req.query.code          : req.body.code;
        let redirect_uri = req.query.redirect_uri  ? req.query.redirect_uri  : req.body.redirect_uri;

        try {
            let token = this._smarthome.auth.exchangeAuthCode(code, redirect_uri, my_uri);

            this._smarthome.debug('HttpAuth:_handleAuthCode(): respond success; token = ' + JSON.stringify(token));
            res.status(200).json(token);
        }
        catch (err) {
            this._smarthome.configNode.error('HttpAuth:_handleAuthCode(): ' + err);
            let error_result = {"error": "invalid_grant"};
            res.status(400).send(error_result);
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
    private _handleRefreshToken(req: Request, res: Response) {
        let refreshToken = req.query.refresh_token ? req.query.refresh_token : req.body.refresh_token;

        try {
            let token = this._smarthome.auth.refreshAccessToken(refreshToken);

            this._smarthome.debug('HttpAuth:_handleRefreshToken(): respond success; token = ' + JSON.stringify(token));
            res.status(200).json(token);
        }
        catch (err) {
            this._smarthome.configNode.error('HttpAuth:_handleRefreshToken(): ' + err);
            let error_result = {"error": "invalid_grant"};
            res.status(400).send(error_result);
        }
    }
}
