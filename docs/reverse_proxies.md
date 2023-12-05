# Using a reverse proxy

You can use a reverse proxy in front of your smarthome service. This way, SSL certificates from Let's Encrypt are
automatically managed and renewed by the proxy, without having to install a certificate client like Certbot or acme.sh.


## Prerequisites

- Ports 80 and 443 must be free. Caddy needs these ports to obtain the certificates. You can reverse proxy other
  services (like your Smart Home UI) on these ports later.
- Your domain must have been set up and the DNS record of your domain must be pointing to your host.

## Caddy as reverse proxy

This is an example of using Caddy (see [caddyserver.com](https://caddyserver.com/)) as a reverse proxy.

This guide assumes that your domain is example.com and you want to run the smarthome service on port 3001. Replace
domain and ports accordingly.

1. If you previously used a certicate client like Certbot or acme.sh, uninstall it now.
2. On your home router, forward ports 80, 443 and 3001 to your host.
3. Install Caddy. On Ubuntu it's `apt-get install caddy`.
4. Edit Caddy's config file. On Ubuntu it is located in `/etc/caddy/Caddyfile`.
5. Remove all existing content and add the following lines:

   ```
   {
       # Email used by Let's Encrypt to contact you in case of problems. Replace with your email address.
       email info@example.com
   }
   
   # Replace domain and port accordingly
   https://example.com:3001 {
       # We start with a simple Hello World message. We will replace it with the actual proxy directive later. 
       respond "Hello World"
   }
   ```
6. Restart Caddy. On Ubuntu it's `systemctl restart caddy`.
7. Wait a minute. Certificate creation may take a while.
8. Go to https://example.com:3001/ in your browser. You should see the message "Hello World".
   There should not be any certicate warnings. Click on the lock icon in the address bar to check if your certificate is
   valid.
9. If you have any problems, check Caddy's log output. On Ubuntu it's `systemctl status -ln100 caddy`.

If you already set up the Google smart home service, you can now replace the Hello world message with the actual reverse
proxy directive.
   
1. In Node-RED, open the management node config and set the port to 13001 or any other port of your choice. This port
   must not be port 3001 or whatever port you chose as your externally reachable port.
2. Also enable the checkbox "Use external SSL offload". Save and deploy.
3. Open Caddy's configuration file again. Replace the line `respond "Hello World"` with:
   ```
   reverse_proxy localhost:13001
   ```
4. Restart Caddy. On Ubuntu it's `systemctl restart caddy`.
5. Go to https://example.com:3001/check in your browser. You should see your Google smart home service respondig with a
   success message. 
6. Done!

**Optional:** If you want, you can also use Caddy to make your Node-RED admin interface or other services avaiable on
the Internal. Open Caddy's configuration file again and add this at the end the file, then restart Caddy:

```
# Replace example.com with your domain
example.com { 
    # To make Node-RED work with Caddy, open settings.js and comment out the sections "https" and "requireHttps".
    route /* {
        reverse_proxy localhost:1880
    }

    # Protect Node-RED!!! Set up authentication in settings.js or uncomment this block to use HTTP basic auth.
    # You can encrypt passwords by running `caddy hash-password`.
    basicauth * {
        myusername JDJhJDEwJEh6YW5CNU5zM28zbnF1OHVEWjNySHVGTFRHVVpSY2RyNDJZdUR4TnIvbzhTTWFzZTdmV2Zp
    }
}
```


# Nginx proxy Manager as reverse proxy

Another option is [Nginx Proxy Manager](https://nginxproxymanager.com/). This guide was written by @RichardUUU on how to
use Nginx Proxy Manager when running Node-RED as a Home Assitant add-on:

Go into your domain DNS and create a subdomain: e.g. nr.example.com. Point that to your home IP.

In NGINX Reverse Proxy, create a new Proxy Host that sends nr.example.com to your HASSIO machine IP with a port of your choosing e.g. 192.168.1.101:1234 This should not expose your whole NodeRed, just the SmartHome server.

NGINX can request a new SSL certificate for you, or use a wildcard if you have one.

When installing google actions, account linking, service account, credentials etc. there is no need to list any ports. Just use nr.example.com

In Node Red, set the Google SmartHome configuration node to your chosen port: e.g. 1234

Now test: https://nr.example.com/check
