@echo off
pushd %~dp0
npm install
title PsyWeb Oslo
node psyweb_dev.js %*
popd
pause
