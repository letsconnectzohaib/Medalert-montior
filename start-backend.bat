@echo off
title Vici Monitor - Backend Server

echo Starting Vicidial Monitor Backend...
cd vicidial-backend

if not exist node_modules (
    echo Installing dependencies, please wait...
    call npm install
)

echo Backend server is running...
echo Listening for data from the browser extension.
node server.js
