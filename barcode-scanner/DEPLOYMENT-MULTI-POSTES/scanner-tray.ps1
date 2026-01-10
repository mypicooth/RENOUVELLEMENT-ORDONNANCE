# Scanner QR - System Tray Icon
# Lance le scanner avec une icône dans la barre des tâches

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Chemins
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exePath = Join-Path $scriptDir "renouvellement-scanner.exe"
$logDir = Join-Path $scriptDir "logs"

# Vérifier que l'exe existe
if (-not (Test-Path $exePath)) {
    [System.Windows.Forms.MessageBox]::Show("renouvellement-scanner.exe introuvable", "Erreur", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
    exit 1
}

# Variable globale pour le processus
$global:scannerProcess = $null

# Fonction pour démarrer le scanner
function Start-Scanner {
    if ($global:scannerProcess -ne $null -and -not $global:scannerProcess.HasExited) {
        return
    }
    
    try {
        $global:scannerProcess = Start-Process -FilePath $exePath -WorkingDirectory $scriptDir -WindowStyle Hidden -PassThru
        $notifyIcon.ShowBalloonTip(3000, "Scanner QR", "Scanner démarré avec succès", [System.Windows.Forms.ToolTipIcon]::Info)
    } catch {
        [System.Windows.Forms.MessageBox]::Show("Erreur au démarrage: $_", "Erreur", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
    }
}

# Fonction pour arrêter le scanner
function Stop-Scanner {
    if ($global:scannerProcess -ne $null -and -not $global:scannerProcess.HasExited) {
        try {
            $global:scannerProcess.Kill()
            $global:scannerProcess = $null
            $notifyIcon.ShowBalloonTip(2000, "Scanner QR", "Scanner arrêté", [System.Windows.Forms.ToolTipIcon]::Warning)
        } catch {
            [System.Windows.Forms.MessageBox]::Show("Erreur à l'arrêt: $_", "Erreur", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        }
    }
}

# Fonction pour redémarrer
function Restart-Scanner {
    Stop-Scanner
    Start-Sleep -Milliseconds 500
    Start-Scanner
}

# Fonction pour ouvrir les logs
function Open-Logs {
    if (Test-Path $logDir) {
        Start-Process explorer.exe -ArgumentList $logDir
    } else {
        [System.Windows.Forms.MessageBox]::Show("Dossier logs introuvable", "Information", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
    }
}

# Créer l'icône pour le tray (icône verte simple)
$iconBase64 = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAIJSURBVFiF7ZfPS1RRFMc/5705M2NqOqhJRZFEEEVBBEVEixYtWrRo0aJFixYtWrRoUdCiRdCiICKIICKIIIiIIIKIIIiIIIiIIKKIKKKI+pHz5s2be1q8N+O8eTNvRnHRH77c+z7n3vM9P+69514xxmCMMXbsCaAOqAdqgRqgGqgCKoFyoAwoAcqBUqAEKAaKgCKgECgA8oE8IBfIAXKAbCALyASygAwgHUgD0oAUIAVIBpKBJCAJSAQSgAQgHogD4oAYIBaIAaKBaCASiAAigHAgHAgDwoAQEAyCgiBBIBgEBUFQEBQEQUGQvxSIBXKBLCAD+P0O+AF/AFwGTgFHgUPAPmAP0AP0AH1AH9AH9AO9wGVgEBgEBoARYBAYAkaAUeAy8A4YA8aBSWAS+AxMAdPAZ+ALMAPMALPAHDAHzAMLwDywACwCi8ASsAQsAyvACrAKrAJrwBqwDqwD68AGsAFsApvAFrAFbAPbwA6wA+wCu8AesAfsA/vAPnAIHAKHwBFwBBwDx8AJcAKcAqfAGXAGnAPnwAVwAVwCl8AVcAVcA9fADXAD3AK3wB1wB9wD98ADcA88Ao/AI/AEPAHPwDPwAjwDL8Er8Aq8Bq/Ba/AGvAFvwVvwDrwD78EH8AF8BB/BJ/AJfAZfwBfwFXwF38B38B38AH+AX+Av+Af+Aw=="
$iconBytes = [Convert]::FromBase64String($iconBase64)
$iconStream = New-Object System.IO.MemoryStream($iconBytes, 0, $iconBytes.Length)
$icon = [System.Drawing.Icon]::FromHandle(([System.Drawing.Bitmap]::new($iconStream).GetHicon()))

# Créer le NotifyIcon
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = $icon
$notifyIcon.Text = "Scanner QR - Renouvellements"
$notifyIcon.Visible = $true

# Créer le menu contextuel
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

# Menu - Démarrer
$menuStart = New-Object System.Windows.Forms.ToolStripMenuItem
$menuStart.Text = "Démarrer"
$menuStart.Add_Click({ Start-Scanner })
$contextMenu.Items.Add($menuStart)

# Menu - Arrêter
$menuStop = New-Object System.Windows.Forms.ToolStripMenuItem
$menuStop.Text = "Arrêter"
$menuStop.Add_Click({ Stop-Scanner })
$contextMenu.Items.Add($menuStop)

# Menu - Redémarrer
$menuRestart = New-Object System.Windows.Forms.ToolStripMenuItem
$menuRestart.Text = "Redémarrer"
$menuRestart.Add_Click({ Restart-Scanner })
$contextMenu.Items.Add($menuRestart)

# Séparateur
$contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))

# Menu - Voir les logs
$menuLogs = New-Object System.Windows.Forms.ToolStripMenuItem
$menuLogs.Text = "Voir les logs"
$menuLogs.Add_Click({ Open-Logs })
$contextMenu.Items.Add($menuLogs)

# Séparateur
$contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))

# Menu - Quitter
$menuExit = New-Object System.Windows.Forms.ToolStripMenuItem
$menuExit.Text = "Quitter"
$menuExit.Add_Click({ 
    Stop-Scanner
    $notifyIcon.Visible = $false
    [System.Windows.Forms.Application]::Exit()
})
$contextMenu.Items.Add($menuExit)

$notifyIcon.ContextMenuStrip = $contextMenu

# Double-clic pour redémarrer
$notifyIcon.Add_DoubleClick({ Restart-Scanner })

# Démarrer le scanner au lancement
Start-Scanner

# Boucle d'événements
$appContext = New-Object System.Windows.Forms.ApplicationContext
[System.Windows.Forms.Application]::Run($appContext)

# Nettoyage
Stop-Scanner
$notifyIcon.Dispose()
