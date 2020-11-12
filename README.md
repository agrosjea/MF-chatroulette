# Requirements

you must own a domain name to allow letsencrypt to generate a certificate.

# Install portainer

- `docker volume create portainer_data`
- `docker run -d -p 8000:8000 -p 9000:9000 --name=portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce`

# Install letsencrypt-nginx-sidecar

* Clone https://github.com/jwulf/letsencrypt-nginx-sidecar
* Follow the steps to install the sidecar only

# Start the app

* `docker-compose up -d --build --force-recreate`

You may need to adapt your domain name...

Have fun.

# Forked from 

(c) 2014 UChicago Roulette https://github.com/kz26/UChicagoRoulette
Thanks to them !
