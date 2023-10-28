# Integrating Google Sign-In

If you followed the setup instructions, your project was created using username/password based authentication. You can
switch to authentication using Google Sign-In if you want. This makes relinking your project in the app a little easier
as you don't have to enter your username and password again. For regular users it is not necessary though.

1.  Navigate to the [GCP oAuth consent screen configuration](https://console.cloud.google.com/apis/credentials/consent).


2.  Check that your project is selected in the header bar.\
    <kbd>![](images/setup_instructions/homegraph_project.png)</kbd>


3.  If you haven't already configured the OAuth consent screen, you will be asked for the user type. Select "External"
    and click "Create".\
    <kbd>![](images/google_signin/googlesignin_type.png)</kbd>


4.  If you've already configured your consent screen earlier, there's a link "Edit App" next to the title which
    will reopen the configuration form.\
    <kbd>![](images/google_signin/googlesignin_editapp.png)</kbd>


5.  Enter a name for your project, select your email address from the list and at the bottom of the form enter your
    email again as developer contact. Add your domain "example.com" (without protocol and port) as an authorized domain.
    Then click "Save and continue".\
    <kbd>![](images/google_signin/googlesignin_consentform.png)</kbd>


6.  In the next two steps, "Scopes" and "Optional info", leave all fields blank and click "Save and continue".


7.  In the last step you'll see a summary of your settings. Check that it looks like the screenshot. In particular,
    check that your domain is added as an authorized domain.\
    <kbd>![](images/google_signin/googlesignin_consentform_summary.png)</kbd>


8.  Select "Credentials" from the left sidebar.\
    <kbd>![](images/google_signin/googlesignin_sidebar_credentials.png)</kbd>


9.  Click "Create credentials" and select "OAuth client ID".
    <kbd>![](images/google_signin/googlesignin_createcredentials.png)</kbd>


10. Select "Web application" as the application type. Enter a name for your project. As "Authorized JavaScript Origin"
    enter the URL of your service without a path (https://example.com:3001). As "Authorized redirect URI" add the URL of
    your service with the path "/oauth" (https://example.com:3001/oauth). Then click "Create".\
    <kbd>![](images/google_signin/googlesignin_createclientid.png)</kbd>


11. Copy the client ID. You will need it later.\
    <kbd>![](images/google_signin/googlesignin_copyclientid.png)</kbd>


12. If you return to this step later and need the client ID again, you can copy it from the table "OAuth 2.0 Client
    IDs". Make sure you copy from the correct row.\
    <kbd>![](images/google_signin/googlesignin_copyclientid_later.png)</kbd>


13. Open the configuration of the Google management node in Node-RED. Check "Use Google login" and enter the client ID
    you copied earlier. Add your email address (the one your Google account is registered with) as authorized email.
    Save and deploy your flows.\
    <kbd>![](images/google_signin/googlesignin_nodered.png)</kbd>


14. Re-link your account as described in the section [Setup Account Linking](setup_instructions.md#setup_account_linking).
    When you see the list of all services, click on your service and select "Reconnect account". On the next screen,
    select "Login with Google".\
    <kbd>![](images/google_signin/googlesignin_reconnect_phone.png)</kbd>\
    <kbd>![](images/google_signin/googlesignin_phone.png)</kbd>
