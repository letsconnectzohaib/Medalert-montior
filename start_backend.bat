@echo off
echo Starting Vicidial Monitor Backend...
cd vicidial-backend
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)
echo Server running on http://localhost:3000
node server.js
pause