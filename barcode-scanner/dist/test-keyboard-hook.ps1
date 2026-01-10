# Script de test pour le hook clavier
$ErrorActionPreference = 'Continue'

Write-Host "=== Test du hook clavier global ===" -ForegroundColor Cyan

# Test 1: Charger System.Windows.Forms
Write-Host "`n[1/3] Test chargement System.Windows.Forms..." -ForegroundColor Yellow
try {
    Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
    Write-Host "  ✓ System.Windows.Forms chargé" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Erreur: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Compiler le code C#
Write-Host "`n[2/3] Test compilation code C#..." -ForegroundColor Yellow
try {
    $typeDef = Get-Content "keyboard-hook.ps1" -Raw
    # Extraire juste la partie C#
    $csharpCode = ($typeDef -split '@"')[1] -split '"@' | Select-Object -First 1
    
    Add-Type -ReferencedAssemblies System.Windows.Forms -TypeDefinition $csharpCode -ErrorAction Stop
    Write-Host "  ✓ Code C# compilé avec succès" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Erreur compilation: $_" -ForegroundColor Red
    Write-Host "  Détails: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Créer une instance
Write-Host "`n[3/3] Test création instance..." -ForegroundColor Yellow
try {
    $hook = New-Object GlobalKeyboardHook
    Write-Host "  ✓ Instance créée avec succès" -ForegroundColor Green
    Write-Host "`n✓ Tous les tests réussis!" -ForegroundColor Green
    $hook.Dispose()
} catch {
    Write-Host "  ✗ Erreur création instance: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Fin du test ===" -ForegroundColor Cyan


