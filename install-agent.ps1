<#
.SYNOPSIS
    Installe et configure l'agent AppliDeploy en tant que service Windows.

.DESCRIPTION
    Ce script automatise l'installation complète de l'agent AppliDeploy :
      - Vérifie les droits administrateur
      - Vérifie la présence de Python 3.10+ (et propose l'installation via winget)
      - Installe les dépendances Python requises (requests, pywin32, wmi, psutil)
      - Crée le dossier d'installation et copie l'agent
      - Crée le fichier de configuration
      - Installe et démarre le service Windows AppliDeployAgent

.PARAMETER ServerUrl
    URL du serveur AppliDeploy (ex. : http://192.168.1.10:3000).
    Obligatoire.

.PARAMETER AgentSecret
    Clé secrète partagée entre le serveur et les agents (valeur de AGENT_SECRET côté serveur).
    Obligatoire.

.PARAMETER PollInterval
    Intervalle d'interrogation du serveur en secondes.
    Défaut : 300.

.PARAMETER InstallDir
    Dossier d'installation de l'agent.
    Défaut : C:\Program Files\AppliDeployAgent

.PARAMETER HostnameOverride
    Forcer un nom de machine spécifique (laisser vide pour l'auto-détection).

.EXAMPLE
    .\install-agent.ps1 -ServerUrl "http://192.168.1.10:3000" -AgentSecret "MonSecretTresLong"

.EXAMPLE
    .\install-agent.ps1 -ServerUrl "https://applideploy.entreprise.fr" `
                        -AgentSecret "MonSecretTresLong" `
                        -PollInterval 120 `
                        -HostnameOverride "PC-COMPTA-01"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ServerUrl,

    [Parameter(Mandatory = $true)]
    [string]$AgentSecret,

    [Parameter(Mandatory = $false)]
    [int]$PollInterval = 300,

    [Parameter(Mandatory = $false)]
    [string]$InstallDir = "C:\Program Files\AppliDeployAgent",

    [Parameter(Mandatory = $false)]
    [string]$HostnameOverride = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─── Helpers ──────────────────────────────────────────────────────────────────

function Write-Step {
    param([string]$Message)
    Write-Host "`n▶  $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "   ✅  $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "   ⚠️   $Message" -ForegroundColor Yellow
}

function Write-Fail {
    param([string]$Message)
    Write-Host "   ❌  $Message" -ForegroundColor Red
}

# ─── 0. Droits administrateur ─────────────────────────────────────────────────

Write-Step "Vérification des droits administrateur"
$currentPrincipal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Fail "Ce script doit être exécuté en tant qu'administrateur."
    Write-Host "   Relancez PowerShell en tant qu'administrateur, puis réexécutez le script." -ForegroundColor Red
    exit 1
}
Write-Success "Droits administrateur confirmés."

# ─── 1. Vérification de Python ────────────────────────────────────────────────

Write-Step "Vérification de Python 3.10+"
$pythonCmd = $null

foreach ($candidate in @("python", "python3", "py")) {
    try {
        $ver = & $candidate --version 2>&1
        if ($ver -match "Python (\d+)\.(\d+)") {
            $major = [int]$Matches[1]
            $minor = [int]$Matches[2]
            if ($major -gt 3 -or ($major -eq 3 -and $minor -ge 10)) {
                $pythonCmd = $candidate
                Write-Success "Python $major.$minor détecté ($candidate)."
                break
            }
        }
    } catch {
        # not found or not executable
    }
}

if (-not $pythonCmd) {
    Write-Warn "Python 3.10+ introuvable."
    $install = Read-Host "   Installer Python via winget ? [O/n]"
    if ($install -ne "n" -and $install -ne "N") {
        Write-Step "Installation de Python via winget"
        try {
            winget install --id Python.Python.3.11 --source winget --silent --accept-package-agreements --accept-source-agreements
            # Refresh PATH
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                        [System.Environment]::GetEnvironmentVariable("Path", "User")
            $pythonCmd = "python"
            Write-Success "Python installé avec succès."
        } catch {
            Write-Fail "Impossible d'installer Python automatiquement."
            Write-Host "   Installez manuellement Python 3.10+ depuis https://www.python.org/downloads/" -ForegroundColor Red
            Write-Host "   Cochez 'Add Python to PATH' lors de l'installation, puis relancez ce script." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Fail "Python est requis. Installation annulée."
        exit 1
    }
}

# ─── 2. Installation des dépendances Python ───────────────────────────────────

Write-Step "Installation des dépendances Python (requests, pywin32, wmi, psutil)"
try {
    & $pythonCmd -m pip install --upgrade --quiet requests pywin32 wmi psutil
    Write-Success "Dépendances installées."
} catch {
    Write-Fail "Échec de l'installation des dépendances : $_"
    exit 1
}

# Post-install script for pywin32 (needed to register COM objects)
try {
    $pyScripts = & $pythonCmd -c "import sysconfig; print(sysconfig.get_path('scripts'))" 2>&1
    $postInstall = Join-Path $pyScripts "pywin32_postinstall.py"
    if (Test-Path $postInstall) {
        & $pythonCmd $postInstall -install 2>&1 | Out-Null
        Write-Success "Script post-installation pywin32 exécuté."
    }
} catch {
    Write-Warn "Impossible d'exécuter le script post-installation pywin32 (non bloquant)."
}

# ─── 3. Copie de l'agent ──────────────────────────────────────────────────────

Write-Step "Copie de l'agent dans $InstallDir"

$agentSource = Join-Path $PSScriptRoot "agent.py"
if (-not (Test-Path $agentSource)) {
    # Try looking in the current directory
    $agentSource = Join-Path (Get-Location) "agent.py"
}
if (-not (Test-Path $agentSource)) {
    Write-Fail "Fichier agent.py introuvable. Placez agent.py dans le même dossier que ce script."
    exit 1
}

if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
Copy-Item -Path $agentSource -Destination (Join-Path $InstallDir "agent.py") -Force
Write-Success "agent.py copié dans $InstallDir."

# ─── 4. Création du fichier de configuration ──────────────────────────────────

Write-Step "Création de la configuration de l'agent"

$dataDir = Join-Path $env:ProgramData "AppliDeployAgent"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
}

$hostnameValue = if ($HostnameOverride -ne "") { """$HostnameOverride""" } else { "null" }
$configContent = @"
{
  "server_url": "$ServerUrl",
  "agent_secret": "$AgentSecret",
  "poll_interval": $PollInterval,
  "hostname_override": $hostnameValue
}
"@

$configPath = Join-Path $dataDir "agent.conf"
Set-Content -Path $configPath -Value $configContent -Encoding UTF8
Write-Success "Configuration écrite dans $configPath."

# Restrict permissions on agent.conf to SYSTEM only
try {
    $acl = Get-Acl $configPath
    $acl.SetAccessRuleProtection($true, $false)
    $sysRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        "SYSTEM", "FullControl", "Allow")
    $admRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        "Administrators", "FullControl", "Allow")
    $acl.AddAccessRule($sysRule)
    $acl.AddAccessRule($admRule)
    Set-Acl $configPath $acl
    Write-Success "Permissions restrictives appliquées sur agent.conf."
} catch {
    Write-Warn "Impossible de restreindre les permissions sur agent.conf (non bloquant)."
}

# ─── 5. Installation du service Windows ───────────────────────────────────────

Write-Step "Installation du service Windows AppliDeployAgent"

$agentScript = Join-Path $InstallDir "agent.py"

# Stop and remove existing service if present
$existingService = Get-Service -Name "AppliDeployAgent" -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Warn "Un service AppliDeployAgent existant a été détecté. Arrêt et suppression..."
    if ($existingService.Status -eq "Running") {
        Stop-Service -Name "AppliDeployAgent" -Force
    }
    & $pythonCmd $agentScript remove 2>&1 | Out-Null
    Start-Sleep -Seconds 2
}

try {
    & $pythonCmd $agentScript install
    Write-Success "Service AppliDeployAgent installé."
} catch {
    Write-Fail "Échec de l'installation du service : $_"
    exit 1
}

# ─── 6. Démarrage du service ──────────────────────────────────────────────────

Write-Step "Démarrage du service AppliDeployAgent"
try {
    Start-Service -Name "AppliDeployAgent"
    Start-Sleep -Seconds 3
    $svc = Get-Service -Name "AppliDeployAgent"
    if ($svc.Status -eq "Running") {
        Write-Success "Service démarré avec succès (statut : $($svc.Status))."
    } else {
        Write-Warn "Le service ne semble pas actif (statut : $($svc.Status)). Consultez les journaux."
    }
} catch {
    Write-Fail "Impossible de démarrer le service : $_"
    Write-Host "   Consultez les journaux : $dataDir\agent.log" -ForegroundColor Red
    exit 1
}

# ─── Récapitulatif ────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅  Installation de l'agent AppliDeploy terminée !" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Dossier d'installation : $InstallDir"
Write-Host "  Configuration          : $configPath"
Write-Host "  Journaux               : $dataDir\agent.log"
Write-Host ""
Write-Host "  Commandes utiles :"
Write-Host "    Arrêter  : Stop-Service AppliDeployAgent"
Write-Host "    Démarrer : Start-Service AppliDeployAgent"
Write-Host "    Statut   : Get-Service AppliDeployAgent"
Write-Host ""
