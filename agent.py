import wmi
import psutil
import platform
import requests
import json
import time
import logging
import win32serviceutil
import win32service
import win32event
import servicemanager
import socket
import sys
import subprocess
from datetime import datetime

# Configuration du logging
logging.basicConfig(filename='C:\\ProgramData\\AppliDeployAgent\\agent.log', level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

class AppliDeployAgent(win32serviceutil.ServiceFramework):
    _svc_name_ = 'AppliDeployAgent'
    _svc_display_name_ = 'AppliDeploy Agent'
    _svc_description_ = 'Agent pour la gestion du parc informatique'

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        self.running = True

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.hWaitStop)
        self.running = False

    def SvcDoRun(self):
        servicemanager.LogMsg(servicemanager.EVENTLOG_INFORMATION_TYPE,
                              servicemanager.PYS_SERVICE_STARTED,
                              (self._svc_name_, ''))
        self.main()

    def collect_inventory(self):
        c = wmi.WMI()
        inventory = {
            'hostname': socket.gethostname(),
            'ip': socket.gethostbyname(socket.gethostname()),
            'domain': platform.node(),
            'os': {
                'name': platform.system(),
                'version': platform.version(),
                'build': platform.release()
            },
            'software': [],
            'hardware': {},
            'compatibility': {}
        }

        # Collecte des logiciels installés
        for software in c.Win32_Product():
            inventory['software'].append({
                'name': software.Name,
                'vendor': software.Vendor,
                'version': software.Version,
                'install_date': software.InstallDate
            })

        # Collecte des informations matérielles
        for computer in c.Win32_ComputerSystem():
            inventory['hardware']['model'] = computer.Model
            inventory['hardware']['ram'] = int(computer.TotalPhysicalMemory / 1024**3)  # En Go

        # Vérification de la compatibilité Windows 11
        tpm = subprocess.run(['powershell', 'Get-Tpm'], capture_output=True, text=True).stdout
        secure_boot = subprocess.run(['powershell', 'Confirm-SecureBootUEFI'], capture_output=True, text=True).stdout
        inventory['compatibility'] = {
            'tpm': 'Present' in tpm,
            'secure_boot': 'True' in secure_boot,
            'ram': inventory['hardware']['ram'] >= 4,
            'compatible': all(['Present' in tpm, 'True' in secure_boot, inventory['hardware']['ram'] >= 4])
        }

        return inventory

    def send_inventory(self, inventory):
        try:
            response = requests.post('http://localhost:3000/api/inventory', json=inventory)
            if response.status_code == 200:
                logging.info('Inventaire envoyé avec succès')
            else:
                logging.error(f'Échec de l\'envoi de l\'inventaire: {response.text}')
        except Exception as e:
            logging.error(f'Erreur lors de l\'envoi de l\'inventaire: {str(e)}')

    def check_actions(self):
        try:
            response = requests.get(f'http://localhost:3000/api/actions/{socket.gethostname()}')
            actions = response.json()
            for action in actions:
                self.execute_action(action)
        except Exception as e:
            logging.error(f'Erreur lors de la vérification des actions: {str(e)}')

    def execute_action(self, action):
        try:
            if action['action'] == 'update_windows':
                subprocess.run(['powershell', 'Install-WindowsUpdate -AcceptAll'])
                logging.info('Mise à jour Windows exécutée')
            elif action['action'] == 'upgrade_windows11' and action['force']:
                inventory = self.collect_inventory()
                if inventory['compatibility']['compatible']:
                    subprocess.run(['powershell', 'Start-Process -FilePath "setup.exe" -ArgumentList "/product server /quiet"'])
                    logging.info('Mise à niveau vers Windows 11 déclenchée')
                else:
                    self.report_error('Mise à niveau impossible: machine non compatible')
        except Exception as e:
            self.report_error(f'Erreur lors de l\'exécution de l\'action {action["action"]}: {str(e)}')

    def report_error(self, error):
        try:
            requests.post('http://localhost:3000/api/error', json={
                'hostname': socket.gethostname(),
                'error': error
            })
            logging.error(f'Erreur rapportée: {error}')
        except Exception as e:
            logging.error(f'Erreur lors du rapport d\'erreur: {str(e)}')

    def main(self):
        while self.running:
            inventory = self.collect_inventory()
            self.send_inventory(inventory)
            self.check_actions()
            time.sleep(300)  # Attendre 5 minutes

if __name__ == '__main__':
    if len(sys.argv) == 1:
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(AppliDeployAgent)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(AppliDeployAgent)