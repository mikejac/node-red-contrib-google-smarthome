# Generating SSL certificates

## Requirements

- You have registered your domain and its DNS record points to your IP address, as explained in the
  [setup instructions](setup_instructions.md#Prerequisites).
- Port 80 or 443 on your host must be free. This port must remain unused in the future, as it will be used to renew
  the certificate every 60 days. If you want to use the port for something else, it may be better to use a
  [reverse proxy](docs/reverse_proxies.md) for certificate generation.

## Getting your certificate

1. Install acme.sh:
   ```bash
   curl https://get.acme.sh | sh -s email=my@example.com
   ```
   The email address will be used to automatically register your account at the SSL provider. 

2. Install `socat`. This is a dependency of the acme.sh script. On Debian/Ubuntu, it's `apt-get install socat`.

4. On your home router, forward port 80 or port 443 to your host.

4. Run acme.sh. If you forwarded port 80, it's:
   ```bash
   acme.sh --issue --standalone -d yourdomain.com
   ```
   If you forwarded port 443, it's:
   ```bash
   acme.sh --issue --alpn -d yourdomain.com
   ```
   
5. Wait for the script to finish. If all went well, you will see some messages, ending with the paths to your newly
   generated SSL certificate:
   ```
   [...] Your cert is in: /root/.acme.sh/yourdomain.com_ecc/yourdomain.com.cer
   [...] Your cert key is in: /root/.acme.sh/yourdomain.com_ecc/yourdomain.com.key
   [...] The intermediate CA cert is in: /root/.acme.sh/yourdomain.com_ecc/ca.cer
   [...] And the full chain certs is there: /root/.acme.sh/yourdomain.com_ecc/fullchain.cer
   ```
   
6. Copy the paths to your cert key (yourdomain.com.key) and the full chain cert (fullchain.cer). You will need these
   later. Don't copy the certificate files themselves. The acme.sh will renew the certificate every 60 days. If you copied
   the files somewhere else, your copies will obviously not be renewed.

7. acme.sh has created a cronjob to renew the certificate every 60 days. This means that port 80 or 443 must remain free.

## Alternatives

- acme.sh supports some other ways to generate your certificate. Read more
  [here](https://github.com/acmesh-official/acme.sh/wiki/How-to-issue-a-cert).
- You can also use [Certbot](https://certbot.eff.org/).
- Instead of generating your certificate files manually, you can also use a reverse proxy with automated certificate
  management, such as Caddy, Nginx Proxy Manager or Traefik. Read our [guide]((docs/reverse_proxies.md)).
