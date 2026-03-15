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
echo  Starting Professional Dashboard...
echo  ╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
echo  ║  � Features:                                                                                                       ║  
echo  ║  • Fixed Terminal Layout (120x40)                                                                              ║
echo  ║  • Real-time Data Streaming                                                                                    ║
echo  ║  • Professional Status Indicators                                                                              ║
echo  ║  • 3-Row Info System (5 items per row)                                                                        ║
echo  ║  • Live Extension Data Monitoring                                                                              ║
echo  ╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
echo.

node src/cli dashboard

echo.
echo ╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
echo ║                                    Vici Monitor Stopped Gracefully                                            ║
echo ║                                    Medalert axcl2s System                                                  ║
echo ╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
echo.
pause
