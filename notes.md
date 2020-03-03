## upload results (`index.html`)

```
var xhr = new XMLHttpRequest();
xhr.onload = function(e) {
  console.log('success');
  window.location.href = '../../exp_list';
};
xhr.open("POST", "../../save", true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(JSON.stringify( { url: window.location.pathname, results: results }));
```

```
const form = document.createElement('form');
form.method = 'POST';
form.action = "../../save";
const hiddenFieldUrl = document.createElement('input');
hiddenFieldUrl.type = 'hidden';
hiddenFieldUrl.name = "url";
hiddenFieldUrl.value = window.location.pathname;
form.appendChild(hiddenFieldUrl);
const hiddenFieldResults = document.createElement('input');
hiddenFieldResults.type = 'hidden';
hiddenFieldResults.name = "results";
hiddenFieldResults.value = JSON.stringify(results);
form.appendChild(hiddenFieldResults);
document.body.appendChild(form);
form.submit();
```

## TODO
  * login / admin / dev accounts
  * flow - sequence of pages (list -> exp -> send -> list)
  * configuration 
    * https://nettskjema.no/user/form/submission/show-all.html?id=141929


## Server setup

```

#-----------------------

# install packages

sudo apt-get update && DEBIAN_FRONTEND=noninteractive sudo apt-get install -y \
  nodejs \
  npm \
  locales \
  nginx \
  certbot \
  git \
  bash-completion \
  netcat-traditional \
  python-certbot-nginx

# configure webserver

sudo tee /etc/nginx/sites-available/default << EOI
server {
	root /var/www/html;
  server_name psyweboslo.lolcat.no;
  location / {
    proxy_pass http://127.0.0.1:9080/;
  }
}
EOI
sudo service nginx restart

# configure SSL

sudo certbot --nginx -d psyweboslo.lolcat.no -m flo.krull@gmail.com

# install pm2

sudo npm install pm2 -g
# from "pm2 startup":
sudo env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u debian --hp /home/debian

# install psyweboslo

git clone https://github.com/f-krull/psyweboslo
cd psyweboslo/app
npm install
pm2 start psyweb.js
```
