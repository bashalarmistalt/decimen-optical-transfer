@echo off
cd /d "%~dp0"
where npm >nul 2>nul || (echo npm is required. Install Node.js LTS & exit /b 1)
call npm install
echo frontend dependencies installed
