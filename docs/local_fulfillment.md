# Local fulfillment

Local fulfillment establishes direct communication between your smart speaker and Node-RED. This reduces latencies
and makes your devices respond faster. It is not required though. If local fulfillment is not setup or is not available,
Google will fall back to the "normal" mode.

This tutorial assumes your service is already set up and working.

---

## Enable Local Fulfillment


1. Open the [Actions on Google Console](https://console.actions.google.com/) and select your project.\
   <kbd>![](images/setup_instructions/actionsconsole_check_project.png)</kbd>


2. Click `Develop` on the top of the page, then click `Actions` located in the hamburger menu on the top left.\
   <kbd>![](images/setup_instructions/actionsconsole_tab_actions.png)</kbd>


3. Click the button `Upload JavaScript files`.\
   <kbd>![](images/local_fulfillment/localexecution_upload.png)</kbd>


4. Upload [this JavaScript file](https://raw.githubusercontent.com/mikejac/node-red-contrib-google-smarthome/master/local-execution/app.js)
   for both Node and Chrome.\
   <kbd>![](images/local_fulfillment/localexecution_upload_files.png)</kbd>


5. Tick the `Support local query` checkbox.\
   <kbd>![](images/local_fulfillment/localexecution_localquery.png)</kbd>


6. Add device scan configuration:
    1. Click `+ New scan config`
    2. Select `MDNS`
    3. set mDNS service name to `_nodered-google._tcp.local`


7. The complete local fulfillment form should look like this.\
   <kbd>![](images/local_fulfillment/localexecution_form.png)</kbd>


8. `Save` your changes.


9. Restart your smart speaker and Node-RED.


10. Now control your device. If local fulfillment is working, you will see a ring icon instead of the usual filled
    circle.\
    <kbd>![](images/local_fulfillment/localexecution_ring.png)</kbd>
    

Local fulfillment can be tricky to set up. If you have problems, look at the troubleshooting section in the readme.
