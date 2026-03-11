"""
AppliDeploy Agent — Agent Windows de gestion de parc informatique.

Ce service Windows se connecte au serveur AppliDeploy pour :
- Transmettre l'inventaire matériel et logiciel de la machine
- Récupérer et exécuter les actions planifiées
- Rapporter les erreurs au serveur

Configuration dans %ProgramData%\\AppliDeployAgent\\agent.conf (JSON) :
{
  "server_url": "http://localhost:3000",
  "agent_secret": "applideploy-agent-secret",
  "poll_interval": 300,
  "hostname_override": null
}
"""

import json
import logging
import logging.handlers
import os
import platform
import socket
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter

# ─── Windows-only imports ────────────────────────────────────────────────────
try:
    import win32event
    import win32service
    import win32serviceutil
    import servicemanager
    import wmi
    import psutil
    _WINDOWS = True
except ImportError:
    _WINDOWS = False

# ─── Constants ───────────────────────────────────────────────────────────────
DATA_DIR = Path(os.environ.get('ProgramData', '/var/lib'), 'AppliDeployAgent')
CONFIG_FILE = DATA_DIR / 'agent.conf'
LOG_FILE = DATA_DIR / 'agent.log'

DEFAULT_CONFIG = {
    'server_url': 'http://localhost:3000',
    'agent_secret': 'applideploy-agent-secret',
    'poll_interval': 300,
    'hostname_override': None,
}


# ─── Logging setup ───────────────────────────────────────────────────────────
def setup_logging():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    handler = logging.handlers.RotatingFileHandler(
        LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3, encoding='utf-8'
    )
    formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
    handler.setFormatter(formatter)

    logger = logging.getLogger('AppliDeployAgent')
    logger.setLevel(logging.INFO)
    logger.addHandler(handler)

    # Also log to stdout for debugging
    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setFormatter(formatter)
    logger.addHandler(stdout_handler)

    return logger


log = setup_logging()


# ─── Config ──────────────────────────────────────────────────────────────────
def load_config():
    cfg = dict(DEFAULT_CONFIG)
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, encoding='utf-8-sig') as f:
                cfg.update(json.load(f))
        except Exception as exc:
            log.warning('Impossible de lire la config : %s', exc)
    return cfg


# ─── HTTP client ─────────────────────────────────────────────────────────────
class ServerClient:
    # (connect_timeout, read_timeout) in seconds
    TIMEOUT = (10, 30)

    def __init__(self, server_url, agent_secret):
        self.base = server_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'X-Agent-Secret': agent_secret,
            'Content-Type': 'application/json',
        })
        # Disable automatic retries to prevent "Max retries exceeded" errors
        adapter = HTTPAdapter(max_retries=0)
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)

    def post(self, path, data):
        return self.session.post(f'{self.base}{path}', json=data, timeout=self.TIMEOUT)

    def get(self, path):
        return self.session.get(f'{self.base}{path}', timeout=self.TIMEOUT)

    def put(self, path, data):
        return self.session.put(f'{self.base}{path}', json=data, timeout=self.TIMEOUT)


# ─── Inventory collection ────────────────────────────────────────────────────
def collect_inventory(config):
    hostname = config.get('hostname_override') or socket.gethostname()
    inventory = {
        'hostname': hostname,
        'ip': _get_ip(),
        'domain': platform.node(),
        'os': {
            'name': platform.system(),
            'version': platform.version(),
            'build': platform.release(),
        },
        'software': [],
        'hardware': {},
        'compatibility': {},
        'group': 'default',
    }

    if _WINDOWS:
        inventory['software'] = _collect_software_wmi()
        inventory['hardware'] = _collect_hardware_wmi()
        inventory['compatibility'] = _check_win11_compatibility(inventory['hardware'])
    else:
        inventory['hardware'] = _collect_hardware_generic()

    return inventory


def _get_ip():
    try:
        # Connect to external host to determine the right local IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(('8.8.8.8', 80))
            return s.getsockname()[0]
    except Exception:
        return socket.gethostbyname(socket.gethostname())


def _collect_software_wmi():
    software = []
    try:
        c = wmi.WMI()
        for s in c.Win32_Product():
            software.append({
                'name': s.Name,
                'vendor': s.Vendor or '',
                'version': s.Version or '',
                'install_date': s.InstallDate or '',
            })
    except Exception as exc:
        log.warning('Erreur collecte logiciels WMI : %s', exc)
    return software


def _collect_hardware_wmi():
    hw = {}
    try:
        c = wmi.WMI()
        for comp in c.Win32_ComputerSystem():
            hw['model'] = comp.Model
            hw['ram'] = int(int(comp.TotalPhysicalMemory or 0) / 1024 ** 3)
        for proc in c.Win32_Processor():
            hw['cpu'] = proc.Name
            hw['cpu_cores'] = proc.NumberOfCores
        for disk in c.Win32_LogicalDisk(DriveType=3):
            hw.setdefault('disks', []).append({
                'drive': disk.DeviceID,
                'size_gb': int(int(disk.Size or 0) / 1024 ** 3),
                'free_gb': int(int(disk.FreeSpace or 0) / 1024 ** 3),
            })
    except Exception as exc:
        log.warning('Erreur collecte matériel WMI : %s', exc)
    return hw


def _collect_hardware_generic():
    hw = {}
    try:
        import psutil as pu
        hw['ram'] = int(pu.virtual_memory().total / 1024 ** 3)
        hw['cpu_cores'] = pu.cpu_count(logical=False)
        hw['disks'] = []
        for part in pu.disk_partitions():
            try:
                usage = pu.disk_usage(part.mountpoint)
                hw['disks'].append({
                    'drive': part.mountpoint,
                    'size_gb': int(usage.total / 1024 ** 3),
                    'free_gb': int(usage.free / 1024 ** 3),
                })
            except Exception:
                pass
    except ImportError:
        pass
    return hw


def _check_win11_compatibility(hw):
    tpm_ok = False
    secure_boot_ok = False
    try:
        tpm_result = subprocess.run(
            ['powershell', '-NoProfile', '-Command', 'Get-Tpm | Select-Object TpmPresent | ConvertTo-Json'],
            capture_output=True, text=True, timeout=15
        )
        tpm_ok = 'true' in tpm_result.stdout.lower()
    except Exception:
        pass

    try:
        sb_result = subprocess.run(
            ['powershell', '-NoProfile', '-Command', 'Confirm-SecureBootUEFI'],
            capture_output=True, text=True, timeout=15
        )
        secure_boot_ok = 'True' in sb_result.stdout
    except Exception:
        pass

    ram_ok = hw.get('ram', 0) >= 4
    compatible = tpm_ok and secure_boot_ok and ram_ok

    return {'tpm': tpm_ok, 'secure_boot': secure_boot_ok, 'ram': ram_ok, 'compatible': compatible}


# ─── Action execution ─────────────────────────────────────────────────────────
def execute_action(client, action):
    action_id = action['id']
    action_type = action['action']
    params = action.get('params', {})
    hostname = action['hostname']

    log.info('Exécution de l\'action %s (%s) pour %s', action_type, action_id, hostname)
    result = None
    status = 'success'

    try:
        if action_type == 'update_windows':
            _run_powershell(
                '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; '
                'if (-not (Get-PackageProvider -Name NuGet -ListAvailable -ErrorAction SilentlyContinue)) { '
                '    Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force -Confirm:$false '
                '} '
                'if (-not (Get-Module -ListAvailable -Name PSWindowsUpdate)) { '
                '    Install-Module -Name PSWindowsUpdate -Force -Confirm:$false -Scope AllUsers '
                '} '
                'Import-Module PSWindowsUpdate -Force; '
                'Install-WindowsUpdate -AcceptAll -AutoReboot -IgnoreReboot'
            )

        elif action_type == 'upgrade_windows11':
            inventory = collect_inventory(load_config())
            if not inventory['compatibility'].get('compatible'):
                raise RuntimeError('Machine non compatible avec Windows 11')
            _run_powershell(
                'Start-Process -FilePath "setup.exe" '
                '-ArgumentList "/product server /quiet /noreboot" -Wait'
            )

        elif action_type == 'install_package':
            pkg_id = params.get('package_id')
            if not pkg_id:
                raise ValueError('package_id manquant dans les paramètres')
            # The install command is expected to be in params or fetched from server
            install_cmd = params.get('install_cmd', '')
            if install_cmd:
                _run_command(install_cmd)
            else:
                raise ValueError(f'Aucune commande d\'installation pour le paquet {pkg_id}')

        elif action_type == 'run_script':
            script = params.get('script', '')
            if not script:
                raise ValueError('script manquant dans les paramètres')
            # SECURITY NOTE: This executes arbitrary PowerShell sent by the server.
            # Ensure server-to-agent communication is secured (HTTPS + mutual TLS in production)
            # and that the server has proper access controls to prevent unauthorized script execution.
            _run_powershell(script)

        elif action_type == 'send_message':
            message = params.get('message', '')
            title = params.get('title', 'AppliDeploy')
            if message:
                # Escape quotes to prevent injection via message text
                safe_message = message.replace('"', '`"').replace("'", "`'")
                safe_title = title.replace('"', '`"').replace("'", "`'")
                _run_powershell(
                    f'Add-Type -AssemblyName System.Windows.Forms; '
                    f'[System.Windows.Forms.MessageBox]::Show("{safe_message}", "{safe_title}")'
                )

        elif action_type == 'restart':
            _run_command('shutdown /r /t 60 /c "Redémarrage planifié par AppliDeploy"')

        elif action_type == 'shutdown':
            _run_command('shutdown /s /t 60 /c "Arrêt planifié par AppliDeploy"')

        else:
            log.warning('Action inconnue : %s', action_type)
            status = 'failed'
            result = f'Action inconnue : {action_type}'

    except Exception as exc:
        log.error('Erreur lors de l\'action %s : %s', action_type, exc)
        status = 'failed'
        result = str(exc)

    # Report result back to server
    try:
        client.put(f'/api/actions/{action_id}/status', {'status': status, 'result': result})
        log.info('Statut de l\'action %s mis à jour : %s', action_id, status)
    except Exception as exc:
        log.error('Impossible de mettre à jour le statut de l\'action : %s', exc)


def _run_powershell(script):
    result = subprocess.run(
        ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
        capture_output=True, text=True, timeout=300
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr or result.stdout)
    return result.stdout


def _run_command(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise RuntimeError(result.stderr or result.stdout)
    return result.stdout


# ─── Main agent loop ─────────────────────────────────────────────────────────
def agent_loop(config, stop_event=None):
    client = ServerClient(config['server_url'], config['agent_secret'])
    poll_interval = int(config.get('poll_interval', 300))
    hostname = config.get('hostname_override') or socket.gethostname()

    log.info('Agent démarré — serveur : %s, intervalle : %ds', config['server_url'], poll_interval)

    while True:
        # Send inventory
        try:
            inv = collect_inventory(config)
            resp = client.post('/api/inventory', inv)
            if resp.status_code == 200:
                log.info('Inventaire envoyé avec succès')
            else:
                log.error('Erreur lors de l\'envoi de l\'inventaire : %s', resp.text)
        except Exception as exc:
            log.error('Erreur inventaire : %s', exc)

        # Poll for actions
        try:
            resp = client.get(f'/api/actions/pending/{hostname}')
            if resp.status_code == 200:
                actions = resp.json()
                for action in actions:
                    execute_action(client, action)
        except Exception as exc:
            log.error('Erreur lors de la récupération des actions : %s', exc)

        # Check stop event (Windows service)
        if stop_event is not None:
            if stop_event.wait(timeout=poll_interval):
                break
        else:
            time.sleep(poll_interval)

    log.info('Agent arrêté')


# ─── Windows Service ─────────────────────────────────────────────────────────
if _WINDOWS:
    class AppliDeployAgent(win32serviceutil.ServiceFramework):
        _svc_name_ = 'AppliDeployAgent'
        _svc_display_name_ = 'AppliDeploy Agent'
        _svc_description_ = 'Agent de gestion de parc informatique AppliDeploy'

        def __init__(self, args):
            win32serviceutil.ServiceFramework.__init__(self, args)
            self._stop_event = win32event.CreateEvent(None, 0, 0, None)
            self._running = True

        def SvcStop(self):
            self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
            win32event.SetEvent(self._stop_event)
            self._running = False

        def SvcDoRun(self):
            servicemanager.LogMsg(
                servicemanager.EVENTLOG_INFORMATION_TYPE,
                servicemanager.PYS_SERVICE_STARTED,
                (self._svc_name_, '')
            )
            config = load_config()

            class WinStopEvent:
                def __init__(self, handle, running_ref):
                    self._handle = handle
                    self._ref = running_ref

                def wait(self, timeout=0):
                    ms = int(timeout * 1000)
                    result = win32event.WaitForSingleObject(self._handle, ms)
                    return result == win32event.WAIT_OBJECT_0

            agent_loop(config, stop_event=WinStopEvent(self._stop_event, self))


# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    if _WINDOWS and len(sys.argv) > 1:
        win32serviceutil.HandleCommandLine(AppliDeployAgent)
    else:
        # Run in foreground (Linux / debug mode)
        config = load_config()
        agent_loop(config)
