# Script d'installation du service Windows pour l'application compilée
# À exécuter en tant qu'administrateur

$ErrorActionPreference = "Stop"

# Vérifier les privilèges administrateur
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERREUR: Ce script nécessite les droits administrateur." -ForegroundColor Red
    Write-Host "Veuillez exécuter PowerShell en tant qu'administrateur." -ForegroundColor Yellow
    pause
    exit 1
}

$serviceName = "RenouvellementQRScanner"
$serviceDisplayName = "Scanner de QR Codes - Renouvellements"
$serviceDescription = "Scanner de QR codes en arrière-plan pour les renouvellements d'ordonnances"
$exePath = Join-Path $PSScriptRoot "renouvellement-scanner.exe"

# Vérifier que l'exe existe
if (-not (Test-Path $exePath)) {
    Write-Host "ERREUR: renouvellement-scanner.exe introuvable dans $PSScriptRoot" -ForegroundColor Red
    Write-Host "Assurez-vous que vous êtes dans le bon dossier." -ForegroundColor Yellow
    pause
    exit 1
}

# Vérifier que config.json existe
$configPath = Join-Path $PSScriptRoot "config.json"
if (-not (Test-Path $configPath)) {
    Write-Host "⚠️  Fichier config.json introuvable" -ForegroundColor Yellow
    Write-Host "Création d'un fichier config.json par défaut..." -ForegroundColor Yellow
    
    $apiUrl = Read-Host "Entrez l'URL de l'API (ex: https://renouvellement-ordonnance.vercel.app)"
    $apiToken = Read-Host "Entrez le token API (ou laissez vide)"
    
    $configContent = @{
        API_URL = $apiUrl
        SCANNER_API_TOKEN = $apiToken
        SCAN_INTERVAL = 100
        MIN_LENGTH = 20
    } | ConvertTo-Json
    
    Set-Content -Path $configPath -Value $configContent
    Write-Host "✅ Fichier config.json créé" -ForegroundColor Green
}

# Arrêter le service s'il existe déjà
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Arrêt du service existant..." -ForegroundColor Yellow
    if ($existingService.Status -eq 'Running') {
        Stop-Service -Name $serviceName -Force
    }
    sc.exe delete $serviceName | Out-Null
    Start-Sleep -Seconds 2
}

# Créer le service
Write-Host "Installation du service Windows..." -ForegroundColor Green
$service = New-Service -Name $serviceName `
    -DisplayName $serviceDisplayName `
    -Description $serviceDescription `
    -BinaryPathName "`"$exePath`"" `
    -StartupType Automatic `
    -ErrorAction Stop

# Configurer le service pour qu'il redémarre automatiquement en cas d'erreur
sc.exe failure $serviceName reset= 86400 actions= restart/5000/restart/10000/restart/20000

# Démarrer le service
Write-Host "Démarrage du service..." -ForegroundColor Green
Start-Service -Name $serviceName

# Vérifier le statut
Start-Sleep -Seconds 2
$service = Get-Service -Name $serviceName
if ($service.Status -eq 'Running') {
    Write-Host "✅ Service installé et démarré avec succès !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Le scanner est maintenant actif et se lancera automatiquement au démarrage." -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Service installé mais non démarré. Statut: $($service.Status)" -ForegroundColor Yellow
    Write-Host "Vous pouvez le démarrer manuellement avec: net start $serviceName" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Commandes utiles:" -ForegroundColor Cyan
Write-Host "  Démarrer:   net start $serviceName"
Write-Host "  Arrêter:    net stop $serviceName"
Write-Host "  Statut:     sc query $serviceName"
Write-Host ""

pause

