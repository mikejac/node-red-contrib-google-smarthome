# Local fulfillment

Local fulfillment establishes direct communication between your smart speaker and Node-RED. This reduces latencies
and makes your devices respond faster. It is not required though. If local fulfillment is not setup or is not available,
Google will fall back to the "normal" mode.

This tutorial assumes your service is already set up and working.

---

## Enable Local Fulfillment

1. Open the configuration of your management node in Node-RED.


2. Scroll to section `Local Fulfillment`. Fill in as follows:
    * Scan Type: Choose between MDNS and UDP scanning. Which one works better depends on your network configuration. You
      might have to try both.
    * Discovery port: Node-RED will listen on this port for discovery messages from your smart speaker. Enter any port
      you want. You don't need to create an external port forwarding for this port on your home router.
    * HTTP port: Node-RED will listen on this port for control messages from your smart speaker. Enter any port you
      want. You don't need to create an external port forwarding for on your home router.

    Remember the discovery port. You will need to enter it in the Actions on Google Console later.


3. Save and deploy.


4. Open the [Actions on Google Console](https://console.actions.google.com/) and select your project.\
   <kbd>![](images/setup_instructions/actionsconsole_check_project.png)</kbd>


5. Click `Develop` on the top of the page, then click `Actions` located in the hamburger menu on the top left.\
   <kbd>![](images/setup_instructions/actionsconsole_tab_actions.png)</kbd>


6. Click the button `Upload JavaScript files`.\
   <kbd>![](images/local_fulfillment/localexecution_upload.png)</kbd>


7. Upload [this JavaScript file](https://raw.githubusercontent.com/mikejac/node-red-contrib-google-smarthome/master/local-execution/app.js)
   for both Node and Chrome.\
   <kbd>![](images/local_fulfillment/localexecution_upload_files.png)</kbd>


8. Tick the `Support local query` checkbox.\
   <kbd>![](images/local_fulfillment/localexecution_localquery.png)</kbd>


9. Click `+ New scan config` button if you don't have a scan configuration yet.


10. Select MDNS or UDP identical to what you selected in the configuration of your management node.


11. For MDNS, fill out the fields as follows.<br>
    MDNS service name: Set to `_nodered-google._tcp.local`.
    <br><br>
    For UDP, fill out the fields as follows,<br>
    Broadcast address: The IP range of your local network, e.g. `192.168.178.255`.
    Discovery packet: Set to `6e6f64652d7265642d636f6e747269622d676f6f676c652d736d617274686f6d65`.
    Listen port: Set the same port you set as "Discovery Port" in the configuration of your management node.
    Broadcast port: Set the same port you set as "Discovery Port" in the configuration of your management node.


13. The complete local fulfillment form for mDNS Scan Type should look like this.\
   <kbd>![](images/local_fulfillment/localexecution_form_mDNS.png)</kbd>

   The complete local fulfillment form for UDP Scan Type should look like this.\
   <kbd>![](images/local_fulfillment/localexecution_form_UDP.png)</kbd>


14. `Save` your changes.


15. Restart your smart speaker and Node-RED.


16. Now control your device. If local fulfillment is working, you will see a ring icon instead of the usual filled
    circle.\
    <kbd>![](images/local_fulfillment/localexecution_ring.png)</kbd>
    

Local fulfillment can be tricky to set up. If you have problems, look at the troubleshooting section in the readme.
