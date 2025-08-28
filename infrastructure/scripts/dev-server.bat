@echo off
echo Starting Enhandiy Development Environment...
echo.

echo [1/2] Starting Vite dev server...
start "Vite Dev Server" cmd /k "npm run dev"

timeout /t 3

echo [2/2] Starting PHP development server...
start "PHP Dev Server" cmd /k "php -S localhost:2323"

echo.
echo Development servers started:
echo - Vite (Frontend): http://localhost:5173
echo - PHP (Backend):  http://localhost:2323
echo.
echo Press any key to continue...
pause > nul