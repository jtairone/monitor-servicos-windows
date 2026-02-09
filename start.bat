@echo off
taskkill /F /IM node.exe 2>nul
timeout /t 2
cd /d "c:\Users\REDUX-TAIRONE\Documents\Projetos\monitor-servicos"
node app.js
pause
