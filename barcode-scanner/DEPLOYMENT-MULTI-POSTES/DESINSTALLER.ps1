# Script de désinstallation du service Scanner de QR Codes

param(
    [switch]$Force
)

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  Désinstallation du Scanner de Renouvellement d'Ordonnances" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier les droits administrateur
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERREUR] Ce script doit être exécuté en tant qu'administrateur" -ForegroundColor Red
    Write-Host ""
    Write-Host "Faites un clic-droit sur le fichier et sélectionnez" -ForegroundColor Yellow
    Write-Host "'Exécuter en tant qu'administrateur'" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host "[OK] Droits administrateur détectés" -ForegroundColor Green
Write-Host ""

$serviceName = "RenouvellementsScanner"

# Vérifier si le service existe
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($null -eq $service) {
    Write-Host "[INFO] Le service '$serviceName' n'est pas installé" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 0
}

Write-Host "[Etape 1/3] Arrêt du service..." -ForegroundColor Cyan
try {
    Stop-Service -Name $serviceName -Force -ErrorAction Stop
    Write-Host "[OK] Service arrêté" -ForegroundColor Green
} catch {
    Write-Host "[ATTENTION] Impossible d'arrêter le service: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "[Etape 2/3] Suppression du service..." -ForegroundColor Cyan
try {
    # Utiliser sc.exe pour supprimer le service
    $result = sc.exe delete $serviceName
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Service supprimé" -ForegroundColor Green
    } else {
        throw "Erreur lors de la suppression: $result"
    }
} catch {
    Write-Host "[ERREUR] Impossible de supprimer le service: $($_.Exception.Message)" -ForegroundColor Red
    pause
    exit 1
}
Write-Host ""

Write-Host "[Etape 3/3] Nettoyage..." -ForegroundColor Cyan
# Attendre que le service soit complètement supprimé
Start-Sleep -Seconds 2

# Vérifier la suppression
$serviceCheck = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($null -eq $serviceCheck) {
    Write-Host "[OK] Service complètement désinstallé" -ForegroundColor Green
} else {
    Write-Host "[ATTENTION] Le service existe toujours dans le système" -ForegroundColor Yellow
    Write-Host "Un redémarrage de l'ordinateur peut être nécessaire" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  Désinstallation terminée" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Le service '$serviceName' a été désinstallé." -ForegroundColor Green
Write-Host "Les fichiers de l'application sont toujours présents dans:" -ForegroundColor Yellow
Write-Host "  $PWD" -ForegroundColor Yellow
Write-Host ""
Write-Host "Vous pouvez maintenant supprimer ce dossier si vous le souhaitez." -ForegroundColor Yellow
Write-Host ""
pause
