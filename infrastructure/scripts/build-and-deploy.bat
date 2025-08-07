@echo off
echo Building TypeScript project for production...
echo.

echo [1/4] Type checking...
npm run type-check
if %errorlevel% neq 0 (
    echo Type checking failed!
    pause
    exit /b 1
)

echo [2/4] Linting...
npm run lint
if %errorlevel% neq 0 (
    echo Linting failed!
    pause
    exit /b 1
)

echo [3/4] Building production assets...
npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo [4/4] Build completed successfully!
echo.
echo Generated files:
dir asset\dist /b
echo.
echo Ready for deployment!
pause