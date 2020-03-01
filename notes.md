var xhr = new XMLHttpRequest();
        xhr.onload = function(e) {
          console.log('success');
          window.location.href = '../index.html';
        };
        xhr.open("POST", "../save.cgi", true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(results));




# 3rdparty/busybox/usr/bin/tcpsvd -vE 0.0.0.0 8021 $(pwd)/3rdparty/busybox/usr/sbin/ftpd -A /tmp/bb/