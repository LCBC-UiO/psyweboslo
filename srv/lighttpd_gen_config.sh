#!/usr/bin/env bash

: ${PORT:=8080}
: ${LOGDIR:=/log/}

cat << EOI
var.basedir = var.CWD
server.document-root = basedir + "/www/"
server.port = ${PORT}
server.modules = (
       "mod_expire",
       "mod_access",
       "mod_accesslog",
       "mod_setenv",
       "mod_extforward",
       "mod_auth",
       "mod_cgi"
)
mimetype.assign = (
  ".html" => "text/html",
  ".txt" => "text/plain",
  ".jpg" => "image/jpeg",
  ".png" => "image/png",
  ".ico" => "image/x-icon",
  ".svg" => "image/svg+xml",
  ".mp3" => "audio/mpeg",
  ".css" => "text/css",
  ".js"  => "text/javascript",
  ".json" => "application/json"
)
# enable directoy listing without index.html
server.dir-listing = "disable"
dir-listing.activate = "disable"
server.follow-symlink = "enable"

#log 
server.breakagelog = basedir + "/srv/log/breakage.log"
server.errorlog    = basedir + "/srv/log/error.log"

cgi.assign = ( 
  ".cgi" => ""
)
index-file.names = ( "index.html" )
EOI
