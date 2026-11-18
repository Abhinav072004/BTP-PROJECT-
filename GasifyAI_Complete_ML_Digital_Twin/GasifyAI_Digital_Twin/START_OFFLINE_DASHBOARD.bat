@echo off
setlocal
if not exist "%~dp0offline_dashboard\index.html" (
  echo Could not locate offline_dashboard\index.html. Extract the ZIP fully before opening.
  pause
  exit /b 1
)
start "GasifyAI Offline Dashboard" "%~dp0offline_dashboard\index.html"
