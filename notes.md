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
  * install server
    * nginx
    * certbot
    * freedns
  * local dev env
    * check uploded form (code shared with remote server)
  * upload zip?
  * login / admin / dev accounts



## 
 * flow - sequence of pages (list -> exp -> send -> list)
