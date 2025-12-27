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

import path from 'path';
import fs from 'fs';
import util from 'util';
import UidGenerator from 'uid-generator';
import { GoogleSmartHome } from './SmartHome';

/******************************************************************************************************************
 * Auth
 *
 */
export default class Auth {
    private _smarthome: GoogleSmartHome;


    /**
     * Constructor
     *
     * @param {GoogleSmartHome} smarthome
     */
    constructor(smarthome: GoogleSmartHome) {
        this._smarthome = smarthome;
        this._clientId       = "";
        this._clientSecret   = "";
        this._username       = "";
        this._password       = "";
        this._useGoogleClientAuth = false;
        this._googleClientId = "";
        this._emails         = [];
        this._authCode       = new Map();
        this._authStorage    = null;
        this._authFilename   = null;
        this._jwtkey         = null;
        this._accessTokenDuration = 60;
        this._tokenGen       = new UidGenerator(256, UidGenerator.BASE58);
        this._clearAllTokens();
    }

    /**
     * Loads the auth storage from file.
     *
     * @param {string} nodeId - ID of the config node
     * @param {string} userDir - Node-RED's user directory
     */
    loadAuthStorage(nodeId, userDir) {
        const me = this;

        try {
            me._authFilename = userDir + '/google-smarthome-auth-' + nodeId + '.json';

            let authFile = fs.readFileSync(
                me._authFilename,
                {
                    'encoding': 'utf8',
                    'flag': fs.constants.R_OK | fs.constants.W_OK | fs.constants.O_CREAT
                });

            if (authFile === '') {
                me._smarthome.debug('Auth:loadAuthStorage(): data not persisted, create new');
                me._clearAllTokens();
            } else {
                me._smarthome.debug('Auth:loadAuthStorage(): data already persisted');
                me._authStorage = JSON.parse(authFile);
                if (typeof me._authStorage !== 'object' || Array.isArray(me._authStorage)) {
                    me._clearAllTokens();
                }
                if (!me._authStorage.localAuthCode) {
                    me.generateLocalAccessToken();
                }
                if (!me._authStorage.nextLocalAuthCode) {
                    me._authStorage.nextLocalAuthCode = this._generateNewAccessToken();
                }
                me._smarthome.debug('Auth:loadAuthStorage(): me._authStorage = ' + JSON.stringify(me._authStorage));
            }
            me._persistAuthStorage();
        }
        catch (err) {
            me._smarthome.error('Error on loading auth storage: ' + err.toString());
            me._clearAllTokens();
        }
    }

    /**
     * Load the JWT key from a file.
     *
     * @param {string} jwtkeyFile - File name of the JWT key
     * @param {string} dir - Directory (if file name is not already given with path)
     */
    loadJwtKeyFile(jwtkeyFile, dir) {
        if (!jwtkeyFile.startsWith(path.sep)) {
            jwtkeyFile = path.join(dir, jwtkeyFile);
        }
        let jk       = fs.readFileSync(jwtkeyFile);
        this._jwtkey = JSON.parse(jk.toString());
    }

    /**
     * Sets client ID and secret.
     *
     * @param {string} clientid - Client ID
     * @param {string} clientsecret - Client secret
     */
    setClientIdSecret(clientid, clientsecret) {
        this._clientId     = clientid;
        this._clientSecret = clientsecret;
    }

    /**
     * Sets username and password for classic login.
     *
     * @param {string} username - Username
     * @param {string} password - Password
     */
    setUsernamePassword(username, password) {
        this._useGoogleClientAuth = false;
        this._username = username;
        this._password = password;
    }

    /**
     * Sets Client ID and authorized email addresses for Google client authentication (a.k.a. Google Login).
     *
     * @param {string} clientid - Google Client ID
     * @param {Array|string} emails - Authorized email addresses as array or string separated by ";"
     */
    setGoogleClientIdAndEmails(clientid, emails) {
        this._useGoogleClientAuth = true;
        this._googleClientId = clientid;
        if (typeof emails === "string") {
            this._emails = emails.split(";");
        } else {
            this._emails = emails;
        }
    }

    /**
     * Checks if Google client authentication (a.k.a. Google Login) is used.
     *
     * @returns {boolean} True if Google Client authentication is used, false otherwise
     */
    useGoogleClientAuth() {
        return this._useGoogleClientAuth;
    }

    /**
     * Retrieves the Client ID for Google Client authentication (a.k.a. Google Login).
     *
     * @returns {string} Google Client ID
     */
    getGoogleClientId() {
        return this._googleClientId;
    }

    /**
     * Retrieves the authorized email addresses for Google Client authentication (a.k.a. Google Login).
     *
     * @returns {string[]} Authorized email addresses
     */
    getGoogleClientEmails() {
        return this._emails;
    }

    /**
     * Checks if the provided email address is valid for Google Client authentication (a.k.a. Google Login).
     *
     * @param {string} email - Email to check
     * @returns {boolean} True if the email is valid, false otherwise
     */
    isGoogleClientEmailValid(email) {
        if (this._useGoogleClientAuth) {
            return this._emails.includes(email);
        }
        return false;
    }

    /**
     * Sets the duration (in minutes) for which an access token is valid.
     *
     * @param {number} duration - The duration in minutes.
     */
    setAccessTokenDuration(duration) {
        this._accessTokenDuration = duration;
    }

    /**
     * Retrieves the duration (in minutes) for which an access token is valid.
     *
     * @returns {number} The duration in minutes.
     */
    getAccessTokenDuration() {
        return this._accessTokenDuration;
    }

    /**
     * Checks if the provided username and password are valid.
     *
     * @param {string} username - Username to check
     * @param {string} password - Password to check
     * @returns {boolean} True if the username and password are valid, false otherwise.
     */
    isValidUser(username, password) {
        if (this._username !== username) {
            this._smarthome.debug('Auth:isValidUser(): username does not match!');
            return false;
        }

        if (this._password !== password) {
            this._smarthome.debug('Auth:isValidUser(): password does not match!');
            return false;
        }

        return true;
    }
    //
    //
    //
    getLocalAuthCode() {
        return this._authStorage.nextLocalAuthCode;
    }

    /**
     * Generates a new auth code and saves it for exchanging the auth code into tokens later.
     *
     * @param {string} username - Username, for which the auth code should be generated
     * @returns {string} The newly generated auth code
     */
    generateAuthCode(username) {
        this.removeExpiredAuthCode();

        while (true) {
            let authCode = this.genRandomString();
            const authCodeInfo = this._authCode.get(authCode);
            if (typeof authCodeInfo === 'undefined') {
                this._authCode.set(authCode, {
                    user: username,
                    expiresAt: new Date(Date.now() + (10 * 60000)), // 10 minutes
                });

                return authCode;
            }
        }
    }

    /**
     * Removes all expired auth codes from auth code storage.
     */
    removeExpiredAuthCode() {
        const now = Date.now();
        let toDel = [];
        for (let authCode of this._authCode.keys()) {
            const authCodeInfo = this._authCode.get(authCode);
            const expirationDate = new Date(authCodeInfo.expiresAt);
            if (expirationDate < now) {
                toDel.push(authCode);
            }
        }
        for (let authCode of toDel) {
            this._authCode.delete(authCode);
        }
    }

    /**
     * Checks if the account is linked (that is, if we have refresh tokens).
     *
     * @returns {boolean} True if account is linked (we have refresh tokens), false otherwise.
     */
    isAccountLinked() {
        return Object.keys(this._authStorage.refreshTokens).length > 0;
    }

    /**
     * Checks if the provided client ID and secret are valid.
     *
     * @param {string} clientId - Client ID to check
     * @param {string} [clientSecret] - Client secret to check
     * @returns {boolean} True if the client ID and secret are valid, false otherwise
     */
    isValidClient(clientId, clientSecret = undefined) {
        if (this._clientId !== clientId) {
            this._smarthome._mgmtNode.error(util.format('Auth:isValidClient(): clientId does not match (expected "%s", got "%s")!', this._clientId, clientId));
            return false;
        }

        if (clientSecret !== undefined && this._clientSecret !== clientSecret) {
            this._smarthome._mgmtNode.error(util.format('Auth:isValidClient(): clientSecret does not match (expected "%s", got "%s")!', this._clientSecret, clientSecret));
            return false;
        }

        return true;
    }

    /**
     * Check if the URI given as redirect_uri is a valid URI for redirecting back to Google after a successful login.
     *
     * Valid URIs are:
     * - https://oauth-redirect.googleusercontent.com/r/YOUR_PROJECT_ID
     * - https://oauth-redirect-sandbox.googleusercontent.com/r/YOUR_PROJECT_ID
     *
     * To check via the check page, our own domain (specified by my_uri, e.g. https://example.com:3001) is also allowed.
     *
     * @param {string} redirect_uri - URI to check
     * @param {string} my_uri - Own URL (e.g. https://example.com:3001)
     * @returns {boolean} true if the URI is valid, false otherwise
     */
    isValidRedirectUri(redirect_uri, my_uri) {
        if (my_uri) {
            // Remove port from URI to allow different ports (due to port forwarding or proxying)
            let my_uri_without_port = my_uri.replace(/:\d+/, '');
            let redirect_uri_without_port = redirect_uri.replace(/:\d+/, '');
            if(redirect_uri_without_port.startsWith(my_uri_without_port)) {
                return true;
            }
        }

        let project_id = this.getProjectId();
        if ('https://oauth-redirect.googleusercontent.com/r/' + project_id !== redirect_uri &&
            'https://oauth-redirect-sandbox.googleusercontent.com/r/' + project_id !== redirect_uri) {
            this._smarthome._mgmtNode.error('Auth:isValidRedirectUri(): invalid redirect uri!');
            return false;
        }

        return true;
    }
    //
    //
    //
    exchangeAuthCode(authCode, redirect_uri, my_uri) {
        let me = this;
        let authCodeInfo = this._authCode.get(authCode);

        if (typeof authCodeInfo === 'undefined') {
            throw 'invalid authCode ' + authCode;
        }

        const expirationDate = new Date(authCodeInfo.expiresAt);
        const user = authCodeInfo.user;
        if (expirationDate < Date.now()) {
            throw 'expired authCode; user = ' + user + 'expired at ' + expirationDate.toLocaleString() + ' authCode = ' + authCode;
        }

        this._smarthome.debug('Auth:exchangeAuthCode(): user = ' + user);

        if (!this.isValidRedirectUri(redirect_uri, my_uri)) {
            throw 'redirect_uri ' + redirect_uri + ' invalid';
        }

        this._authCode.delete(authCode);

        me._removeAllTokensForUser(user);

        let refreshToken = me._generateRefreshToken(user);
        let accessToken = me._generateAccessToken(user);

        me._persistAuthStorage();

        return {
            token_type: 'bearer',
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: 60 * this._accessTokenDuration,
        };
    }

    /**
     * Refreshes the access token used by Google to authenticate with our service.
     *
     * @param {string} refreshToken - Refresh token
     * @returns {object} Tokens
     */
    refreshAccessToken(refreshToken) {
        let me = this;
        if (!this.isValidRefreshToken(refreshToken)) {
            throw 'invalid refresh token ' + refreshToken;
        }

        const user = this._authStorage.refreshTokens[refreshToken];
        me._removeAllAccessTokensExpiredAndForUser(user);

        let accessToken = me._generateAccessToken(user);

        me._persistAuthStorage();

        return {
            token_type: 'bearer',
            access_token: accessToken,
            expires_in: 60 * this._accessTokenDuration,
        };
    }

    /**
     * Checks if the provided access token is valid.
     *
     * @param {string} accessToken - Access token to check
     * @returns {boolean} True if the access token is valid, false otherwise
     */
    isValidAccessToken(accessToken) {
        return this.getuserForAccessToken(accessToken) !== null;
    }

    /**
     * Checks if the provided access token for local fulfillment is valid.
     *
     * @param {string} accessToken - Local access token to check
     * @returns {boolean} True if the local access token is valid, false otherwise
     */
    isValidLocalAccessToken(accessToken) {
        if (accessToken === this._authStorage.nextLocalAuthCode) {
            this._authStorage.localAuthCode = this._authStorage.nextLocalAuthCode;
            this._authStorage.nextLocalAuthCode = this._generateNewAccessToken();
            this._persistAuthStorage();
            return true;
        }
        return accessToken === this._authStorage.localAuthCode;
    }

    /**
     * Retrieves the user for the provided access token.
     *
     * @param {string} accessToken - Access token
     * @returns {string|null} User or null if the access token is invalid
     */
    getuserForAccessToken(accessToken) {
        if (accessToken === this._authStorage.localAuthCode || accessToken === this._authStorage.nextLocalAuthCode) {
            return "local execution";
        }
        const accessTokenInfo = this._authStorage.accessTokens[accessToken];
        if (typeof accessTokenInfo === 'undefined') {
            this._smarthome.debug('Auth:isValidAccessToken(): accessToken = ' + JSON.stringify(accessToken) + ' not found.');
            return null;
        }
        const user = accessTokenInfo.user;
        const expiresAt = new Date(accessTokenInfo.expiresAt);
        if (expiresAt < new Date()) {
            this._smarthome.debug('Auth:isValidAccessToken(): accessToken = ' + JSON.stringify(accessToken));
            this._smarthome.debug('Auth:isValidAccessToken(): user = ' + user);
            this._smarthome.debug('Auth:isValidAccessToken(): expiresAt = ' + expiresAt.toLocaleString());
            this._smarthome.debug('Auth:isValidAccessToken(): accessToken expired');
            return null;
        }
        return user;
    }

    /**
     * Checks if the provided refresh token is valid.
     *
     * @param {string} refreshToken - Refresh token to check
     * @returns {boolean} True if the refresh token is valid, false otherwise
     */
    isValidRefreshToken(refreshToken) {
        const refreshTokenInfo = this._authStorage.refreshTokens[refreshToken];
        if (typeof refreshTokenInfo === 'undefined') {
            this._smarthome._mgmtNode.error('Auth:isValidRefreshToken(): refreshToken not found ' + JSON.stringify(refreshToken));
            return false;
        }
        this._smarthome.debug('Auth:isValidRefreshToken(): valid refreshToken ' + JSON.stringify(refreshToken) + " for user " + refreshTokenInfo);
        return true;
    }

    /**
     * Removes all tokens for the provided user.
     *
     * @param {string} user - User whose tokens should be removed
     */
    removeAllTokensForUser(user) {
        this._removeAllTokensForUser(user);
        this._persistAuthStorage();
    }

    /**
     * Retrieves the client email from the JWT file.
     *
     * @returns {string} JWT client email
     */
    getJwtClientEmail() {
        return this._jwtkey.client_email;
    }

    /**
     * Retrieves the private key from the JWT file.
     *
     * @returns {string} JWT private key
     */
    getJwtPrivateKey() {
        return this._jwtkey.private_key;
    }

    /**
     * Retrieves the project ID from the JWT file.
     *
     * @returns {string} JWT Project ID
     */
    getProjectId() {
        return this._jwtkey.project_id;
    }

    /**
     * Generates a random string.
     *
     * @returns {string} Random string
     */
    genRandomString() {
        return this._tokenGen.generateSync();
    }

    /**
     * Retrieves the auth storage object.
     *
     * @returns {object} Auth storage
     */
    getAuthStorage() {
        return this._authStorage;
    }
    //
    //
    //
    generateLocalAccessToken() {
        this._authStorage.localAuthCode = this._generateNewAccessToken();
        if (!this._authStorage.nextLocalAuthCode) {
            this._authStorage.nextLocalAuthCode = this._generateNewAccessToken();
        }
        return this._authStorage.localAuthCode;
    }

    /**
     * Generates a new access token.
     *
     * @returns {string} New access token
     * @private
     */
    _generateNewAccessToken() {
        while (true) {
            let accessToken = this.genRandomString();
            if (accessToken !== this._authStorage.localAuthCode && accessToken !== this._authStorage.nextLocalAuthCode && typeof this._authStorage.accessTokens[accessToken] == 'undefined') {
                return accessToken;
            }
        }
    }

    /**
     * Generates an access token for the given user.
     *
     * @param {string} user - User for whom the access token should be generated
     * @returns {string} Access token
     * @private
     */
    _generateAccessToken(user) {
        let accessToken = this._generateNewAccessToken();
        this._authStorage.accessTokens[accessToken] = {
            user: user,
            expiresAt: Date.now() + (this._accessTokenDuration * 60000),
        };
        return accessToken;
    }

    /**
     * Generates a refresh token for the given user.
     *
     * @param {string} user - User for whom the refresh token should be generated
     * @returns {string} Refresh token
     * @private
     */
    _generateRefreshToken(user) {
        while (true) {
            let refreshToken = this.genRandomString();
            if (typeof this._authStorage.refreshTokens[refreshToken] == 'undefined') {
                this._authStorage.refreshTokens[refreshToken] = user;
                return refreshToken;
            }
        }
    }

    /**
     * Removes all access tokens for a specific user and all expired tokens.
     *
     * @param {string} user - Username of the user whose access tokens should be removed
     * @private
     */
    _removeAllAccessTokensExpiredAndForUser(user) {
        for (let token in this._authStorage.accessTokens) {
            let tokenInfo = this._authStorage.accessTokens[token];
            let expiresAt = tokenInfo.expiresAt;
            let tokenUser = tokenInfo.user;
            if ((tokenUser === user) || (new Date(expiresAt) < new Date())) {
                delete this._authStorage.accessTokens[token];
            }
        }
    }

    /**
     * Removes all access and refresh tokens for a specific user and all expired tokens.
     *
     * @param {string} user - Username of the user whose tokens should be removed
     * @private
     */
    _removeAllTokensForUser(user) {
        this._removeAllAccessTokensExpiredAndForUser(user);
        for (let token in this._authStorage.refreshTokens) {
            let tokenUser = this._authStorage.refreshTokens[token];
            if (tokenUser === user) {
                delete this._authStorage.refreshTokens[token];
            }
        }
    }

    /**
     * Persists the auth storage to file.
     *
     * @private
     */
    _persistAuthStorage() {
        try {
            fs.writeFileSync(this._authFilename, JSON.stringify(this._authStorage))
        }
        catch (err) {
            this._smarthome._mgmtNode.error('Auth:_persistAuthStorage(): Failed to write auth file: ' + err);
        }
    }

    /**
     * Clear all tokens from the auth storage.
     *
     * @private
     */
    _clearAllTokens() {
        this._authStorage = {
            "accessTokens" : {},
            "refreshTokens" : {},
            "localAuthCode": '',
            "nextLocalAuthCode": ''
        };
        this.generateLocalAccessToken();
    }
}
