# Script PowerShell pour surveiller le presse-papiers et détecter les scans
# Ce script fonctionne même si l'application est minimisée

Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public class ClipboardWatcher : Form
{
    private const int WM_CLIPBOARDUPDATE = 0x031D;
    private static IntPtr HWND_MESSAGE = new IntPtr(-3);
    
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool AddClipboardFormatListener(IntPtr hwnd);
    
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool RemoveClipboardFormatListener(IntPtr hwnd);
    
    public event EventHandler ClipboardChanged;
    
    public ClipboardWatcher()
    {
        this.WindowState = FormWindowState.Minimized;
        this.ShowInTaskbar = false;
        this.Visible = false;
        AddClipboardFormatListener(this.Handle);
    }
    
    protected override void WndProc(ref Message m)
    {
        if (m.Msg == WM_CLIPBOARDUPDATE)
        {
            ClipboardChanged?.Invoke(this, EventArgs.Empty);
        }
        base.WndProc(ref m);
    }
    
    protected override void Dispose(bool disposing)
    {
        RemoveClipboardFormatListener(this.Handle);
        base.Dispose(disposing);
    }
}
"@

$watcher = New-Object ClipboardWatcher
$lastContent = ""

$watcher.add_ClipboardChanged({
    try {
        $currentContent = [System.Windows.Forms.Clipboard]::GetText()
        if ($currentContent -ne $null -and $currentContent -ne $lastContent -and $currentContent.Length -ge 20) {
            # Filtrer les logs (commencent par [timestamp])
            if (-not $currentContent -match '^\[\d{4}-\d{2}-\d{2}T') {
                # Vérifier si c'est du JSON valide
                $trimmed = $currentContent.Trim()
                if ($trimmed.StartsWith('{') -or $trimmed.Contains('"renewalId"') -or $trimmed.Contains('"renewal"')) {
                    Write-Output $trimmed
                }
            }
            $lastContent = $currentContent
        }
    } catch {
        # Ignorer les erreurs
    }
})

[System.Windows.Forms.Application]::Run($watcher)


