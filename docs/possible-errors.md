This is an **incomplete** list of possible errors and ideas on how to fix them:

**Log message: no user logged in**
- Not logged in with the app (or more technically, this module can't find access and refresh tokens).
- Can occur when the auth storage file becomes corrupted. Stop Node-RED, delete the file(s) named google-smarthome-auth-*.json from Node-RED's user directory (where your settings.js, flows.json etc. are located). Then restart Node-RED and relink your account by following the section "Setup Account linking" in the Readme.
- Maybe you really are not logged in. Link your account by following the section "Setup Account linking" in the Readme.

<br>

**Log message: redirect_uri ... invalid**
- JWT Key is wrong. Create a new key as described on [Step "Enable HomeGraph API" in the Readme](https://github.com/mikejac/node-red-contrib-google-smarthome#enable-homegraph-api). Check that the correct project is selected while creating the key.

<br>

**Log Message: HttpActions:requestSync(): error; {"error":{"code":403,"message":"The caller does not have permission","status":"PERMISSION_DENIED"}}`**
- Wait. Sometimes this error fixes itself after a few minutes.
- If waiting does not help, unlink and relink your account in Google Home app by following the section "Setup Account linking" in the Readme.

<br>

**Log message: clientId does not match!**
- Client ID defined in config and in Google Actions Console do not match.
- Client ID and secret with special characters (spaces, plus signs, etc.) can lead to problems. Try with alphanumeric (a-z, A-Z, 0-9) ID and secret.

<br>

**Log message: Error on loading auth storage: Error: EACCES: permission denied, open '...'**
- Auth storage file (`google-smarthome-auth-*.json in Node-RED's userDir) has invalid file permissions. The file must be readable and writable by the user as which Node-RED is running.

<br>

**Message "INVALID_ARGUMENT" or "Request contains an invalid argument" in Node-RED's debug panel**
- Happens when this module reports an invalid state value to Google. For example an out-of-range value (window opened to 120% where only 0-100% allowed) or an invalid field name.
- Fully expand the message in the debug panel. Check for obvious mistakes in the "data" object in the message (like an "open" parameter with value 120).
- If you don't see anything obvious, please create an issue on GitHub. Include the error message from Node-RED's debug panel, either as JSON or as screenshot with all branches expanded (so that we see the complete "data" object included in the message).

<br>

**Log message: HttpActions:requestSync(): error; {"error":{"code":403,"message":"The caller does not have permission","status":"PERMISSION_DENIED"}}**
- Reasons for this error are currently unknown [Help wanted].

<br>

**Login page in the Google Home app is empty**
- Check if the URLs in Google Actions Console are correct. Especially check for http**s**:// protocol, correct port and paths. Auth URL is https://example.com:3001/oauth, Token URL is https://example.com:3001/token, Fulfillment URL is https://example.com:3001/smarthome (assuming port 3001 and no special path configuration set in the configuration node). If you are unsure about your URL, open https://example.com:3001/check in your browser. If you see the "Google SmartHome test page", the URL is correct.

<br>

**Error "Missing SmartHome" on a device node in Node-RED's editor**
- The device has an invalid configuration selected. Check that all devices nodes and the management node have the same configuration selected.

<br>

**Log message: "skipped requested sync, account is not linked. (Re-)link your account in the app"**

This can happen if you move the smarthome node to a Node-RED system on a different host. Your devices will no longer appear in your Google Home app any more.

Repeat the steps from the [setup account linking](https://github.com/mikejac/node-red-contrib-google-smarthome/blob/master/docs/setup_instructions.md#setup-account-linking) tutorial.

Follow the next steps from the tutorial. If everything goes well, you will see a list of your devices:

![image](https://github.com/user-attachments/assets/b5f3363e-bf2c-4053-980a-aef8149a27f5)

After pressing *"Done"*, your devices should reappear in the Google Home app.
