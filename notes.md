# Notes
  * configuration:
    * https://nettskjema.no/user/form/submission/show-all.html?id=144664

## Server setup

Starting from a Debian 10 base

```

server_name=psyweboslo.lolcat.no

#------------------------------------------------------------------------------

# install packages

sudo apt-get update && DEBIAN_FRONTEND=noninteractive sudo apt-get install -y \
  bash-completion \
  git \
  netcat-traditional \
  locales \
  nodejs \
  npm \
  nginx \
  certbot \
  python-certbot-nginx

#------------------------------------------------------------------------------

# configure webserver

sudo tee /etc/nginx/sites-available/default << EOI
server {
  root /var/www/html;
  server_name ${server_name};
  location / {
    proxy_pass http://127.0.0.1:9080/;
  }
}
EOI

# set "client_max_body_size 100M;" in http section of /etc/nginx/nginx.conf

sudo service nginx restart



#------------------------------------------------------------------------------

# configure SSL

sudo certbot --nginx -d ${server_name} -m flo.krull@gmail.com

#------------------------------------------------------------------------------

# install pm2

sudo npm install pm2 -g
# from "pm2 startup":
sudo env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u debian --hp /home/debian

#------------------------------------------------------------------------------

# install psyweboslo

git clone https://github.com/f-krull/psyweboslo
cd psyweboslo/app
make install
npm install
pm2 delete all || true
pm2 start psyweb.js
pm2 cleardump
pm2 save
```
