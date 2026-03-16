@echo off
title Vici Monitor - Data Collector (Verbose Mode)

echo Starting Data Collector Service in VERBOSE mode...

:: Check for node_modules and install if missing
if not exist node_modules (
    echo Installing backend dependencies, please wait...
    call npm install
)

echo Backend server is running in VERBOSE mode...
echo Detailed logging will be shown for all incoming data.
echo.

node server.js --verbose
