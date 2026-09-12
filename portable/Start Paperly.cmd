@echo off
title Paperly Offline PDF Editor
cd /d "%~dp0"
node.exe server.cjs
if errorlevel 1 pause
