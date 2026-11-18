@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>&1
if errorlevel 1 (
  echo Python launcher 'py' was not found. Install Python 3.11+ first.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" py -m venv .venv
if errorlevel 1 (echo Virtual environment creation failed. & pause & exit /b 1)
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (echo Installation failed. Internet access is required on first run. & pause & exit /b 1)
".venv\Scripts\python.exe" -m streamlit run streamlit_app.py
pause
