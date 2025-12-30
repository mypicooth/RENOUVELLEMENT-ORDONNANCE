# Script PowerShell pour installer le scanner comme service Windows
# Usage: .\install-service.ps1
# Nécessite d'être exécuté en tant qu'administrateur

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Installation du service Windows pour le scanner QR" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier les droits administrateur
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ Erreur: Ce script doit être exécuté en tant qu'administrateur" -ForegroundColor Red
    Write-Host "   Clic droit sur PowerShell > Exécuter en tant qu'administrateur" -ForegroundColor Yellow
    pause
    exit 1
}

# Vérifier que node-windows est installé
Write-Host "Vérification de node-windows..." -ForegroundColor Yellow
try {
    $null = npm list -g node-windows 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "node-windows not found"
    }
    Write-Host "✅ node-windows est déjà installé" -ForegroundColor Green
} catch {
    Write-Host "Installation de node-windows..." -ForegroundColor Yellow
    npm install -g node-windows
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation de node-windows" -ForegroundColor Red
        Write-Host "   Essayez manuellement: npm install -g node-windows" -ForegroundColor Yellow
        pause
        exit 1
    }
    Write-Host "✅ node-windows installé avec succès" -ForegroundColor Green
}

# Vérifier que le fichier .env existe
$envPath = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "⚠️  Fichier .env non trouvé" -ForegroundColor Yellow
    Write-Host "   Création d'un fichier .env exemple..." -ForegroundColor Yellow
    
    $apiUrl = Read-Host "Entrez l'URL de l'API (ex: http://localhost:3000 ou https://votre-domaine.com)"
    $apiToken = Read-Host "Entrez le token API (ou laissez vide si non configuré)"
    
    $envContent = @"
API_URL=$apiUrl
SCANNER_API_TOKEN=$apiToken
"@
    
    Set-Content -Path $envPath -Value $envContent
    Write-Host "✅ Fichier .env créé" -ForegroundColor Green
}

# Installer node-windows localement si nécessaire
Write-Host "Vérification de node-windows local..." -ForegroundColor Yellow
if (-not (Test-Path (Join-Path $PSScriptRoot "node_modules\node-windows"))) {
    Write-Host "Installation de node-windows localement..." -ForegroundColor Yellow
    Set-Location $PSScriptRoot
    npm install node-windows --save-dev
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation locale de node-windows" -ForegroundColor Red
        pause
        exit 1
    }
}

# Installer le service
Write-Host ""
Write-Host "Installation du service..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
node install-service.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Installation terminée avec succès !" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Erreur lors de l'installation" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "Le service est maintenant installé et démarré." -ForegroundColor Green
Write-Host "Il démarrera automatiquement au démarrage de Windows." -ForegroundColor Green
Write-Host ""
pause

