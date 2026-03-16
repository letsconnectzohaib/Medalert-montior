@echo off
title Vici Monitor - Data Collector

echo Starting Data Collector Service...

:: Check for node_modules and install if missing
if not exist node_modules (
    echo Installing backend dependencies, please wait...
    call npm install
)

echo Backend server is running...
echo Listening for data from the browser extension and saving to the database.
echo.
echo Use 'npm run verbose' for detailed logging if needed.
echo.

node server.js
