@echo off
title Methodist-11 Website Manager
cd /d "C:\Users\yonat\ANTIGRAVITY\COMMON\project-sd-methodist-11"

echo ========================================================
echo        SD SWASTA METHODIST-11 MEDAN WEBSITE MANAGER
echo ========================================================
echo Memeriksa status dan menjalankan server website lokal (Port 8090)...

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\yonat\ANTIGRAVITY\COMMON\project-sd-methodist-11\start-website.ps1"

timeout /t 2 /nobreak >nul
echo Membuka website lokal di browser...
start http://localhost:8090
