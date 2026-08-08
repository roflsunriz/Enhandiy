@echo off
setlocal

for %%I in ("%~dp0.") do set "SCRIPT_DIR=%%~fI"
set "BUILD_DIR=%SCRIPT_DIR%\.build"

where javac.exe >nul 2>nul
if errorlevel 1 (
  echo Java JDK 11 or later is required.
  pause
  exit /b 1
)

where javaw.exe >nul 2>nul
if errorlevel 1 (
  echo javaw.exe was not found.
  pause
  exit /b 1
)

if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"

javac.exe --release 11 -encoding UTF-8 -d "%BUILD_DIR%" ^
  "%SCRIPT_DIR%\DockerController.java" "%SCRIPT_DIR%\DockerManager.java"
if errorlevel 1 (
  echo Failed to build Docker Manager.
  pause
  exit /b 1
)

if /i "%~1"=="--self-test" (
  java.exe "-Denhandiy.repoRoot=%SCRIPT_DIR%\.." -cp "%BUILD_DIR%;%SCRIPT_DIR%" DockerManager --self-test
  exit /b
)

start "" javaw.exe "-Denhandiy.repoRoot=%SCRIPT_DIR%\.." -cp "%BUILD_DIR%;%SCRIPT_DIR%" DockerManager
exit /b 0
