@echo off
REM =========================================================
REM  PYC Viewer - Build and Install Script for Windows
REM =========================================================
echo.
echo === PYC Viewer Build Script ===
echo.

cd /d "%~dp0"

echo [1/4] Checking Node.js and npm...
where node >nul 2>&1 || (echo ERROR: Node.js not found. Install from https://nodejs.org & exit /b 1)
node --version
npm --version

echo.
echo [2/4] Installing build dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 (echo ERROR: npm install failed & exit /b 1)

echo.
echo [3/4] Packaging extension as .vsix...
call npx @vscode/vsce package --no-dependencies
if errorlevel 1 (echo ERROR: vsce package failed & exit /b 1)

echo.
echo [4/4] Installing extension into VS Code...
for %%f in (*.vsix) do (
    echo Installing %%f ...
    call code --install-extension "%%f" --force
    if errorlevel 1 (echo WARNING: VS Code install failed. Try running manually: code --install-extension %%f)
)

echo.
echo === Done! ===
echo Reload VS Code (Ctrl+Shift+P ^> "Developer: Reload Window") and click any .pyc file.
echo.
pause
