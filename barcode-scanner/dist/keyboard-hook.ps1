# Hook clavier global Windows pour capturer les événements même si l'application est minimisée
# Utilise SetWindowsHookEx avec WH_KEYBOARD_LL pour capturer au niveau système

$ErrorActionPreference = 'Continue'

# Écrire sur stderr pour que Node.js puisse capturer les erreurs
function Write-DebugError {
    param([string]$Message)
    [Console]::Error.WriteLine("[keyboard-hook] $Message")
}

Write-DebugError "Démarrage du hook clavier global..."

try {
    # Charger System.Windows.Forms
    Write-DebugError "Chargement de System.Windows.Forms..."
    Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
    Write-DebugError "System.Windows.Forms chargé avec succès"
    
    # Compiler le code C# pour le hook clavier global
    Write-DebugError "Compilation du code C#..."
    $typeDefinition = @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class GlobalKeyboardHook : IDisposable
{
    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_SYSKEYDOWN = 0x0104;
    
    private LowLevelKeyboardProc _proc;
    private IntPtr _hookID = IntPtr.Zero;
    
    public event EventHandler<KeyPressedEventArgs> KeyPressed;
    
    public GlobalKeyboardHook()
    {
        _proc = HookCallback;
        _hookID = SetHook(_proc);
        if (_hookID == IntPtr.Zero)
        {
            throw new InvalidOperationException("Impossible d'installer le hook clavier global");
        }
    }
    
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);
    
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);
    
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);
    
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);
    
    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);
    
    [DllImport("user32.dll")]
    private static extern int MapVirtualKey(uint uCode, uint uMapType);
    
    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);
    
    [StructLayout(LayoutKind.Sequential)]
    private struct KBDLLHOOKSTRUCT
    {
        public uint vkCode;
        public uint scanCode;
        public uint flags;
        public uint time;
        public IntPtr dwExtraInfo;
    }
    
    private IntPtr SetHook(LowLevelKeyboardProc proc)
    {
        // Pour un hook global (WH_KEYBOARD_LL), on doit utiliser GetModuleHandle(null)
        // pour obtenir le handle du module exécutable actuel
        IntPtr hMod = GetModuleHandle(null);
        if (hMod == IntPtr.Zero)
        {
            // Fallback: utiliser le module du processus actuel
            using (var curProcess = System.Diagnostics.Process.GetCurrentProcess())
            using (var curModule = curProcess.MainModule)
            {
                hMod = GetModuleHandle(curModule.ModuleName);
            }
        }
        IntPtr hookId = SetWindowsHookEx(WH_KEYBOARD_LL, proc, hMod, 0);
        if (hookId == IntPtr.Zero)
        {
            throw new System.ComponentModel.Win32Exception(System.Runtime.InteropServices.Marshal.GetLastWin32Error());
        }
        return hookId;
    }
    
    private IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        // Toujours appeler CallNextHookEx pour ne pas bloquer les autres hooks
        IntPtr hookResult = CallNextHookEx(_hookID, nCode, wParam, lParam);
        
        if (nCode >= 0 && (wParam == (IntPtr)WM_KEYDOWN || wParam == (IntPtr)WM_SYSKEYDOWN))
        {
            KBDLLHOOKSTRUCT hookStruct = (KBDLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(KBDLLHOOKSTRUCT));
            uint vkCode = hookStruct.vkCode;
            
            // Ignorer les touches de modification
            if (vkCode != 160 && vkCode != 161 && // Shift
                vkCode != 162 && vkCode != 163 && // Ctrl
                vkCode != 164 && vkCode != 165 && // Alt
                vkCode != 91 && vkCode != 92 &&   // Windows
                vkCode != 20 &&                   // Caps Lock
                vkCode != 9 &&                    // Tab
                vkCode != 27 &&                   // Escape
                vkCode != 8 &&                    // Backspace
                vkCode != 46 &&                   // Delete
                vkCode != 45)                     // Insert
            {
                // Gérer Enter séparément (ne pas l'ajouter au buffer)
                if (vkCode == 13)
                {
                    if (KeyPressed != null)
                    {
                            try {
                                KeyPressed.Invoke(this, new KeyPressedEventArgs('\0', true));
                            } catch {
                                // Ignorer les erreurs silencieusement pour ne pas planter le hook
                            }
                    }
                }
                else
                {
                    // Utiliser uniquement la méthode manuelle (plus sûre dans un hook global)
                    // ToUnicodeEx peut causer des AccessViolationException dans un hook
                    // Détecter l'état de Shift depuis GetAsyncKeyState (plus fiable que les flags)
                    // Vérifier les deux Shift (gauche et droite)
                    bool shiftLeft = (GetAsyncKeyState(0xA0) & 0x8000) != 0;
                    bool shiftRight = (GetAsyncKeyState(0xA1) & 0x8000) != 0;
                    bool shiftPressed = shiftLeft || shiftRight || ((GetAsyncKeyState(0x10) & 0x8000) != 0);
                    bool capsLock = (GetAsyncKeyState(0x14) & 0x0001) != 0;
                    
                    char? ch = VkCodeToChar(vkCode, shiftPressed, capsLock);
                    
                    if (ch.HasValue && ch.Value != '\0')
                    {
                        if (KeyPressed != null)
                        {
                            try {
                                KeyPressed.Invoke(this, new KeyPressedEventArgs(ch.Value, false));
                            } catch {
                                // Ignorer les erreurs silencieusement pour ne pas planter le hook
                            }
                        }
                    }
                }
            }
        }
        
        return hookResult;
    }
    
    private char? VkCodeToChar(uint vkCode, bool shift, bool capsLock)
    {
        // Espace
        if (vkCode == 32) return ' ';
        
        // Lettres A-Z (avec gestion de Shift et Caps Lock)
        if (vkCode >= 65 && vkCode <= 90) {
            bool shouldBeUpper = shift ^ capsLock; // XOR: majuscule si Shift OU Caps Lock (mais pas les deux)
            return (char)(shouldBeUpper ? vkCode : vkCode + 32);
        }
        
        // MAPPING SPECIAL POUR SCANNERS: ils envoient VK codes selon layout AZERTY français
        // Sur AZERTY français:
        // 1=& 2=é 3=" 4=' 5=( 6=- 7=è 8=_ 9=ç 0=à
        // avec Shift: 1 2 3 4 5 6 7 8 9 0
        
        // Chiffres et symboles (VK 48-57)
        if (vkCode == 48) { // Touche 0/à
            if (shift) return '0';
            return ((char)224); // à
        }
        if (vkCode == 49) { // Touche 1/&
            if (shift) return '1';
            return '&';
        }
        if (vkCode == 50) { // Touche 2/é  
            if (shift) return '2';
            return ((char)233); // é
        }
        if (vkCode == 51) { // Touche 3/"
            if (shift) return '3';
            return '"';
        }
        if (vkCode == 52) { // Touche 4/'
            if (shift) return '4';
            return ((char)39); // '
        }
        if (vkCode == 53) { // Touche 5/(
            if (shift) return '5';
            return '(';
        }
        if (vkCode == 54) { // Touche 6/-
            if (shift) return '6';
            return '-';
        }
        if (vkCode == 55) { // Touche 7/è
            if (shift) return '7';
            return ((char)232); // è
        }
        if (vkCode == 56) { // Touche 8/_
            if (shift) return '8';
            return '_';
        }
        if (vkCode == 57) { // Touche 9/ç
            if (shift) return '9';
            return ((char)231); // ç
        }
        
        // Numpad 0-9
        if (vkCode >= 96 && vkCode <= 105) {
            return (char)(vkCode - 48);
        }
        
        // Caractères spéciaux AZERTY français
        // Sur AZERTY: { est sur = avec AltGr ou Shift, } aussi
        if (vkCode == 219) return shift ? '{' : '}';  // VK_OEM_4 - {} pour les scanners
        if (vkCode == 221) return shift ? '}' : ']';  // VK_OEM_6
        if (vkCode == 220) return shift ? '|' : ((char)92);  // VK_OEM_5 (\)
        if (vkCode == 186) return shift ? ':' : ';';  // VK_OEM_1
        if (vkCode == 222) return shift ? '"' : ((char)39);  // VK_OEM_7
        if (vkCode == 188) return shift ? '?' : ',';  // VK_OEM_COMMA - Sur AZERTY , et ? avec Shift
        if (vkCode == 190) return shift ? '.' : ';';  // VK_OEM_PERIOD - Sur AZERTY ; et . avec Shift  
        if (vkCode == 191) return shift ? '/' : ':';  // VK_OEM_2 - Sur AZERTY : et / avec Shift (INVERSÉ!)
        if (vkCode == 192) return shift ? '~' : ((char)96);  // VK_OEM_3 (`)
        if (vkCode == 189) return shift ? '_' : '-';  // VK_OEM_MINUS
        if (vkCode == 187) return shift ? '+' : '=';  // VK_OEM_PLUS - Sur AZERTY = et + avec Shift
        
        return null;
    }
    
    public void Dispose()
    {
        UnhookWindowsHookEx(_hookID);
    }
}

public class KeyPressedEventArgs : EventArgs
{
    private char _key;
    private bool _isEnter;
    
    public char Key { get { return _key; } }
    public bool IsEnter { get { return _isEnter; } }
    
    public KeyPressedEventArgs(char key, bool isEnter)
    {
        _key = key;
        _isEnter = isEnter;
    }
}
"@
    
    # Compiler le type avec les références nécessaires
    Write-DebugError "Ajout du type avec références..."
    Add-Type -ReferencedAssemblies @('System.Windows.Forms', 'System') -TypeDefinition $typeDefinition -ErrorAction Stop
    Write-DebugError "Code C# compilé avec succès"
    
    # Créer l'instance du hook
    Write-DebugError "Création de l'instance GlobalKeyboardHook..."
    try {
        $hook = New-Object GlobalKeyboardHook
        if ($hook -eq $null) {
            throw "L'instance du hook est null"
        }
        Write-DebugError "Instance GlobalKeyboardHook créée avec succès"
        Write-DebugError "Hook ID: $($hook.GetType().GetField('_hookID', [System.Reflection.BindingFlags]::NonPublic -bor [System.Reflection.BindingFlags]::Instance).GetValue($hook))"
    } catch {
        Write-DebugError "ERREUR création hook: $($_.Exception.Message)"
        Write-DebugError "Type: $($_.Exception.GetType().FullName)"
        throw
    }
    $script:buffer = ""
    
    # Configurer l'événement KeyPressed
    $hook.add_KeyPressed({
        param($sender, $e)
        
        # Log chaque événement reçu (sur stderr pour débogage)
        if ($e.IsEnter) {
            Write-DebugError "Enter détecté, buffer actuel: $($script:buffer.Length) caractères"
        } else {
            # Log périodique seulement pour éviter trop de logs
            if ($script:buffer.Length -eq 0 -or ($script:buffer.Length % 30 -eq 0)) {
                Write-DebugError "Caractère reçu: '$($e.Key)' (buffer: $($script:buffer.Length) caractères)"
            }
        }
        
        if ($e.IsEnter) {
            if ($script:buffer.Length -ge 20) {
                $trimmed = $script:buffer.Trim()
                # Log de débogage (sur stderr pour ne pas interférer avec stdout)
                Write-DebugError "Buffer complet reçu ($($script:buffer.Length) caractères): $($script:buffer.Substring(0, [Math]::Min(100, $script:buffer.Length)))..."
                # Vérifier si c'est un JSON de renouvellement
                if ($trimmed.Contains('"renewalId"') -or $trimmed.Contains('"renewal"')) {
                    Write-DebugError "QR code de renouvellement détecté, envoi à Node.js..."
                    # Écrire sur stdout pour que Node.js puisse le capturer
                    [Console]::Out.WriteLine($trimmed)
                    [Console]::Out.Flush()
                } else {
                    Write-DebugError "Contenu ignoré (pas un JSON de renouvellement valide): $($trimmed.Substring(0, [Math]::Min(50, $trimmed.Length)))..."
                }
            } else {
                if ($script:buffer.Length -gt 0) {
                    Write-DebugError "Buffer trop court ($($script:buffer.Length) caractères), ignoré: $($script:buffer.Substring(0, [Math]::Min(50, $script:buffer.Length)))..."
                }
            }
            $script:buffer = ""
        } else {
            # Ignorer les caractères null
            if ($e.Key -ne [char]0) {
                $script:buffer += $e.Key
                # Log périodique pour voir que des caractères sont capturés
                if ($script:buffer.Length % 20 -eq 0) {
                    Write-DebugError "Buffer: $($script:buffer.Length) caractères capturés (derniers: $($script:buffer.Substring([Math]::Max(0, $script:buffer.Length - 20))))"
                }
            }
        }
    })
    
    # Créer une application Windows invisible pour maintenir le hook actif
    # IMPORTANT: Le hook global nécessite une message loop Windows active
    Write-DebugError "Création du formulaire Windows invisible..."
    $form = New-Object System.Windows.Forms.Form
    $form.WindowState = [System.Windows.Forms.FormWindowState]::Minimized
    $form.ShowInTaskbar = $false
    $form.Visible = $false
    $form.WindowState = [System.Windows.Forms.FormWindowState]::Minimized
    # S'assurer que le formulaire reste minimisé même si on essaie de le montrer
    $form.add_Load({
        $form.WindowState = [System.Windows.Forms.FormWindowState]::Minimized
        $form.Hide()
    })
    Write-DebugError "Formulaire créé avec succès"
    
    Write-DebugError "Hook clavier global activé et en écoute..."
    Write-DebugError "Le hook devrait maintenant capturer tous les événements clavier système"
    # Lancer l'application (bloque jusqu'à la fermeture)
    # Cette boucle de messages est CRITIQUE pour que le hook fonctionne
    [System.Windows.Forms.Application]::Run($form)
    
} catch {
    # En cas d'erreur, écrire sur stderr pour que Node.js puisse le capturer
    Write-DebugError "ERREUR: $($_.Exception.Message)"
    Write-DebugError "Type d'erreur: $($_.Exception.GetType().FullName)"
    Write-DebugError "Stack: $($_.ScriptStackTrace)"
    if ($_.Exception.InnerException) {
        Write-DebugError "Erreur interne: $($_.Exception.InnerException.Message)"
    }
    exit 1
} finally {
    # Nettoyer le hook si il existe
    if ($hook) {
        try {
            $hook.Dispose()
        } catch {
            # Ignorer les erreurs de nettoyage
        }
    }
}

