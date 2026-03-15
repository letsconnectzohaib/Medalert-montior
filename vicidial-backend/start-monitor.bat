@echo off
title Vici Monitor - Professional Dashboard
mode con: cols=120 lines=40
color 0A

:: Set font and make non-resizable
powershell -Command "& {$Host.UI.RawUI.WindowTitle = 'Vici Monitor - Professional Dashboard'; $Host.UI.RawUI.ForegroundColor = 'Green'; $Host.UI.RawUI.BackgroundColor = 'Black'}"

echo.
echo ╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
echo ║                            Vici Monitor - Professional Dashboard                                           ║
echo ║                                    Medalert axcl2s System                                                  ║
echo ╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
echo.

echo Starting Vici-Monitor...
node src/cli/index.js dashboard

echo.
echo Press any key to continue . . .
pause > nul
