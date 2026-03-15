@echo off
title Vici Monitor - Dashboard Server

echo Starting Dashboard Data Server...

:: Check for node_modules and install if missing
if not exist node_modules (
    echo Installing dashboard server dependencies, please wait...
    call npm install
)

echo Dashboard server is running...
echo Providing data from the database to the web dashboard.

node server.js
