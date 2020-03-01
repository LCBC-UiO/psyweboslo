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

## TODO

 * support nettskjema
 * OK page
 * install server
   * nginx
   * certbot
   * freedns
 * local dev env
 * upload zip?
 * login / admin / dev accounts

