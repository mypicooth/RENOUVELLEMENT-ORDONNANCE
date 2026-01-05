# Test direct d'Electron avec capture des erreurs
$ErrorActionPreference = "Continue"

Write-Host "Test direct d'Electron..." -ForegroundColor Cyan
Write-Host ""

$electronExe = ".\node_modules\electron\dist\electron.exe"
$electronApp = ".\electron-app.js"

if (-not (Test-Path $electronExe)) {
    Write-Host "❌ Electron.exe introuvable" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $electronApp)) {
    Write-Host "❌ electron-app.js introuvable" -ForegroundColor Red
    exit 1
}

Write-Host "Lancement d'Electron..." -ForegroundColor Yellow
Write-Host "Commande: $electronExe $electronApp test123 RENEWAL https://renouvellement-ordonnance.vercel.app testtoken"
Write-Host ""

# Lancer Electron et capturer toutes les sorties
$process = Start-Process -FilePath $electronExe -ArgumentList @($electronApp, "test123", "RENEWAL", "https://renouvellement-ordonnance.vercel.app", "testtoken") -NoNewWindow -PassThru -RedirectStandardOutput "electron-output.txt" -RedirectStandardError "electron-error.txt" -Wait

Write-Host ""
Write-Host "Code de sortie: $($process.ExitCode)" -ForegroundColor $(if ($process.ExitCode -eq 0) { "Green" } else { "Red" })
Write-Host ""

if (Test-Path "electron-output.txt") {
    Write-Host "=== STDOUT ===" -ForegroundColor Cyan
    Get-Content "electron-output.txt"
    Write-Host ""
}

if (Test-Path "electron-error.txt") {
    Write-Host "=== STDERR ===" -ForegroundColor Red
    Get-Content "electron-error.txt"
    Write-Host ""
}


