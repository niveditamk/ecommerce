# =========================================================
#  PYC Viewer — Build and Install Script (PowerShell)
# =========================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== PYC Viewer Build Script ===" -ForegroundColor Cyan
Write-Host ""

# Navigate to extension directory
Set-Location $PSScriptRoot

# Step 1: Check prerequisites
Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow
$nodeVersion = & node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "  Node.js: $nodeVersion"
Write-Host "  npm: $(npm --version)"

# Check Python + pycrefine
$pythonPath = "$env:LOCALAPPDATA\Programs\Python\Python314\python.exe"
if (Test-Path $pythonPath) {
    $pyVer = & $pythonPath -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')" 2>$null
    Write-Host "  Python: $pyVer ($pythonPath)"
    $pycrefineVer = & $pythonPath -c "import pycrefine; print(pycrefine.__version__)" 2>$null
    if ($pycrefineVer) {
        Write-Host "  pycrefine: $pycrefineVer"
    } else {
        Write-Host "  WARNING: pycrefine not found. Install with: pip install pycrefine" -ForegroundColor Yellow
    }
} else {
    Write-Host "  WARNING: Python 3.14 not found at $pythonPath" -ForegroundColor Yellow
}

# Step 2: Install npm dependencies
Write-Host ""
Write-Host "[2/5] Installing build dependencies..." -ForegroundColor Yellow
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

# Step 3: Package extension
Write-Host ""
Write-Host "[3/5] Packaging extension as .vsix..." -ForegroundColor Yellow
npx @vscode/vsce package --no-dependencies
if ($LASTEXITCODE -ne 0) { throw "vsce package failed" }

# Step 4: Find and install the .vsix
Write-Host ""
Write-Host "[4/5] Installing extension into VS Code..." -ForegroundColor Yellow
$vsixFile = Get-ChildItem -Filter "*.vsix" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($vsixFile) {
    Write-Host "  Installing $($vsixFile.Name)..."
    code --install-extension $vsixFile.FullName --force
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  WARNING: Auto-install failed. Run manually:" -ForegroundColor Yellow
        Write-Host "  code --install-extension $($vsixFile.FullName)" -ForegroundColor White
    }
} else {
    Write-Host "  ERROR: No .vsix file found!" -ForegroundColor Red
    exit 1
}

# Step 5: Done
Write-Host ""
Write-Host "[5/5] Done!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host '  1. Reload VS Code: Ctrl+Shift+P > "Developer: Reload Window"'
Write-Host '  2. Click any .pyc file in the Explorer sidebar.'
Write-Host '  3. You should see reconstructed Python source code!'
Write-Host ""
