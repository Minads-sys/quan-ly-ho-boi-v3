@echo off
color 0B
echo =========================================
echo DANG CHAY SCRIPT AUTO DEPLOY GITHUB
echo =========================================
echo.

REM Chạy file PowerShell bỏ qua các rào cản phân quyền của Windows
PowerShell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0deploy.ps1'"

echo.
pause
