@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   DeepSeek Harness 控制台
echo   正在启动本地服务...
echo.
start "" cmd /c "timeout /t 2 >nul & start http://127.0.0.1:4180"
node server.js
pause
