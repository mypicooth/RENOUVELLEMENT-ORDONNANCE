# Script de copie pour le déploiement
$source = "c:\Users\abbas\Desktop\RENOUVELLEMENT-ORDONNANCE\barcode-scanner\dist"
$dest = "c:\Users\abbas\Desktop\RENOUVELLEMENT-ORDONNANCE\barcode-scanner\DEPLOYMENT-MULTI-POSTES"

Write-Host "Copie des fichiers vers DEPLOYMENT-MULTI-POSTES..." -ForegroundColor Cyan

# Copier les fichiers essentiels
Copy-Item "$source\renouvellement-scanner.exe" -Destination $dest -Force
Copy-Item "$source\keyboard-hook.ps1" -Destination $dest -Force
Copy-Item "$source\scan-confirm.py" -Destination $dest -Force
Copy-Item "$source\config.json" -Destination $dest -Force
Copy-Item "$source\scan-window.html" -Destination $dest -Force
Copy-Item "$source\install-service.bat" -Destination $dest -Force
Copy-Item "$source\install-service.ps1" -Destination $dest -Force
Copy-Item "$source\README-INSTALLATION.txt" -Destination $dest -Force

Write-Host "✅ Tous les fichiers ont été copiés!" -ForegroundColor Green
Write-Host ""
Write-Host "Contenu du dossier:" -ForegroundColor Yellow
Get-ChildItem $dest | Select-Object Name, Length | Format-Table -AutoSize
