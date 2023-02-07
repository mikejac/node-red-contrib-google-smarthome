# Setup Instructions

## Prerequisites

- You need your own domain. You can use a free domain from any DynDNS provider. The DNS record for this domain must
  point to your host.
- You need a 'real' SSL certificate, e.g. from [Let's Encrypt](https://letsencrypt.org/). You must have either the
  certificate files  (e.g. from Certbot). Or you can use a reverse proxy with automatic certificate management, such as
  Caddy or Traefik. Tip: There's a guide on [how to use Caddy]((docs/caddy.md).
- You need to be able to forward incoming traffic from the internet to a specific port on your host. This may be
  difficult if your ISP uses carrier-grade NAT, or if you can't configure port forwarding on your router.
- This package requires at least NodeJS 10.0.0.

This tutorial assumes your domain is `example.com` and you want to use port `3001`. Replace domain and port in the
instructions accordingly.

---

## Create project in Actions Console

First we will register a new Smart Home project in the Actions Console.

1.  Go to [Actions on Google Console](https://console.actions.google.com).


2.  Click on *New project*.\
    <kbd>![](images/setup_instructions/actionsconsole_new_project.png)</kbd>


3.  Enter a name and select the language and country for your project. Then click *Create Project*.\
    <kbd>![](images/setup_instructions/actionsconsole_new_project_form.png)</kbd>


4.  Select the type *Smart Home*, then click *Start Building*.\
    <kbd>![](images/setup_instructions/actionsconsole_choose_type.png)</kbd>


5.  Make sure your project is selected in the header bar.\
    <kbd>![](images/setup_instructions/actionsconsole_check_project.png)</kbd>


6.  Switch to the *Develop* tab and select *Invocation* from the sidebar.\
    <kbd>![](images/setup_instructions/actionsconsole_tab_invocation.png)</kbd>


7.  Enter a name for your project. Click *Save*.\
    <kbd>![](images/setup_instructions/actionsconsole_project_name.png)</kbd>


8.  While still on the *Develop* tab, select *Actions* from the sidebar.\
    <kbd>![](images/setup_instructions/actionsconsole_tab_actions.png)</kbd>


9.  Enter the fulfillment URL. This is the URL of your service, followed by "/smarthome", for example
    https://example.com:3001/smarthome. Set the log level to "All". Leave all other fields blank. Then click *Save*.\
    <kbd>![](images/setup_instructions/actionsconsole_tab_actions_form.png)</kbd>


10. While still on the *Develop* tab, select *Account linking* from the sidebar.\
    <kbd>![](images/setup_instructions/actionsconsole_tab_accountlinking.png)</kbd>


11. Fill in the fields as follows:
    * Client ID and secret: Credentials that Google will use to authenticate against your service. Use a password
      generator such as https://passwordsgenerator.net/ to generate two strings of reasonable length (e.g. 32 chars).
      It's recommended not to use special characters as they can cause problems. Copy both strings, you'll need them later.
    * Authorization URL: This is the URL of your service, followed by '/oauth', for example https://example.com:3001/oauth.
    * Token URL: This is the URL of your service, followed by '/token', e.g. https://example.com:3001/token.
    * Leave all other fields at their default values.\
   <kbd>![](images/setup_instructions/actionsconsole_tab_accountlinking_form.png)</kbd>


12. Click *Save*.\
    <kbd>![](images/setup_instructions/actionsconsole_tab_accountlinking_save.png)</kbd>


13. You don't need to fill in anything on the other tabs.


**Note:** You can't test your project in the Action Console's simulator. It only works on real devices.


## Enable HomeGraph API

Next we will enable the HomeGraph API and download the credentials. This API is used to report the state of your devices
to Google and to notify Google about new or updated devices.

1.  Go to the [Google HomeGraph API page](https://console.cloud.google.com/apis/library/homegraph.googleapis.com).


2.  Make sure your project is selected in the header bar.\
    <kbd>![](images/setup_instructions/homegraph_project.png)</kbd>


3.  If you had to switch projects and were redirected away from the HomeGraph API page, open the
    [Google HomeGraph API page](https://console.cloud.google.com/apis/library/homegraph.googleapis.com) again.


4.  Click *Enable*.\
    <kbd>![](images/setup_instructions/homegraph_enable.png)</kbd>


5.  Select *Credentials* from the left sidebar (or go to the
    [API credentials page](https://console.cloud.google.com/apis/api/homegraph.googleapis.com/credentials)).\
    <kbd>![](images/setup_instructions/homegraph_sidebar_credentials.png)</kbd>
    

6.  Click *Create Credentials* and select *Service account*.\
    <kbd>![](images/setup_instructions/homegraph_create_credentials.png)</kbd>


7.  Enter a name for your service account. A service account ID should be generated automatically.\
    <kbd>![](images/setup_instructions/homegraph_credentials_form1.png)</kbd>


8.  Leave steps 2 and 3 empty, just skip them with *Continue* and *Done* buttons.\
    <kbd>![](images/setup_instructions/homegraph_credentials_form2.png)</kbd>
    <kbd>![](images/setup_instructions/homegraph_credentials_form3.png)</kbd>


9.  Find your newly created service account in the list and click the Edit button.\
    <kbd>![](images/setup_instructions/homegraph_serviceaccount_list.png)</kbd>


10. Switch to the tab *Key*.\
    <kbd>![](images/setup_instructions/homegraph_serviceaccount_tab_key.png)</kbd>


11. Click on *Add Key*, then *Create Key*.\
    <kbd>![](images/setup_instructions/homegraph_serviceaccount_key_create.png)</kbd>


12. Choose type *JSON* and click *Create*.\
    <kbd>![](images/setup_instructions/homegraph_serviceaccount_key_json.png)</kbd>


13. A JSON file containing the JWT key will be downloaded to your computer. Copy it to your Node-RED server, in a
    location where the Node-RED service can read it.


## Install and configure Node-RED module

Now we will install and configure the module in Node-RED.

1. Install `node-red-contrib-google-smarthome` from the Node-RED palette and restart Node-RED.\
   <kbd>![](images/setup_instructions/nodered_install.png)</kbd>


2. Place the Management node from the section "Google Smart Home" on a flow.\
    <kbd>![](images/setup_instructions/nodered_management.png)</kbd>


3. Edit the management node and open its config. Fill in the fields as follows:
    * Name: A name for your config node.
    * Enable Node Debug: Check this box if you want to see debug messages from the node. Enable it for now.
    * Default Language: The language of your project.
    * Use Google login: Check this box if you want to use Google Sign-In authentication. This tutorial uses the simpler
      password based authentication, so uncheck this box.
    * Username/Password: Username and password of your choice. You will use this to log in in the Google Home App later.
    * Client ID and Client Secret: The client ID and secret you previously entered in the Google Actions Console.
    * Jwt Key: Path to the JSON file you downloaded when you enabled the HomeGraph API. Can be an absolute path or a
      path relative to Node-RED's user dir (where your settings.js, flows.json etc. are stored).
    * Port: The port on which to run the service. If left empty, the service will run on the same port as Node-RED.
      This port must be reachable from the internet (but be careful to protect your Node-RED from external access if
      you expose this port to the internet).\
      This tutorial assumes port 3001, so set it to 3001.
    * URL subpath: URL subpath to add to the URL. If set, the URL will change from `https://example.com:3001/check` to
      `https://example.com:3001/<subpath>/check` (resp. `/<subpath>/smarthome`, `/<subpath>/oauth`, `/<subpath>/token`).
      This tutorial doesn't use subpaths, so leave it empty.
    * Use http Node-RED root path: If enabled, the service will respect the setting "httpNodeRoot" in Node-RED's
      settings.js. If set, the service will use https://example.com:3001/<httpNodeRoot>/smarthome. If there is also a
      path set in the Path field, the service will use https://example.com:3001/<httpNodeRoot>/<yourpath>/smarthome.
      This tutorial assumes a simple path setup, so leave it empty.
    * Use external SSL offload: If enabled, the smarthome service will use HTTP instead of HTTPS. This allows you to use
      a reverse proxy such as Caddy or Traefik to manage SSL certificates.
    * Scan Type: Specifies how your smart speaker will search for Node-RED instances on your local network to use for
      local fulfillment. You can set up local fulfillment later, so set it to "Disabled" for now.
    * Access Token Duration, Report Interval, Request sync delay, set_state message delay: Usually you don't need to
      change these values. Leave them at their default values.\
    <kbd>![](images/setup_instructions/nodered_configuration.png)</kbd>
    

4. Deploy the flow.\
   <kbd>![](images/setup_instructions/nodered_deploy.png)</kbd>


5. Verify that your service is reachable. Open https://example.com:3001/check in your browser. You should see the
   "Google SmartHome test page". You don't have to enter anything here, if you see the page, you're good to go.\
   <kbd>![](images/setup_instructions/nodered_check.png)</kbd>


6. Also check that the page is reachable from the internet. Use a tool such as https://reqbin.com to send a GET request
   to https://example.com:3001/check (using your domain name and port). It should respond with status 200 and the
   message "SUCCESS: Smart Home service is reachable!".\
   <kbd>![](images/setup_instructions/nodered_reqbin.png)</kbd>


## Setup Account linking

Finally, we will link the Google Home App to the Node-RED service.

1. Open the Google Home App on a device that is logged in to the same Google account that you used to create the project
   in the Actions Console.


2. Click the '+' sign to add a device.\
   <kbd>![](images/setup_instructions/phone_plus.png)</kbd>
   

3. Click *Set up device*.\
   <kbd>![](images/setup_instructions/phone_setupdevice.png)</kbd>


4. Click *Have something already set up*.\
   <kbd>![](images/setup_instructions/phone_existingdevice.png)</kbd>


5. Select your service from the list of all providers. Your service will be prefixed with `[test]`.
   <kbd>![](images/setup_instructions/phone_project.png)</kbd>


6. Log in to your service. The username and password are the ones you specified in the configuration node.\
   <kbd>![](images/setup_instructions/phone_login.png)</kbd>


8. Say "Hey Google, sync my devices". Google should respond that your project has been successfully synced.


9. Congratulations! Your project has been successfully set up. You are now ready to add devices.

---

## Further information

- You can enable [local fulfillment](local_fulfillment.md) for faster response times.
- You can [switch to Google Sign-In](google_signin.md) to make logging in a bit easier.
