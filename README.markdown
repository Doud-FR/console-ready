# AppliDeploy - Gestion de Parc Informatique

## Prérequis
1. **Node.js** : Téléchargez et installez depuis https://nodejs.org (version 18 ou supérieure).
2. **Python** : Téléchargez et installez depuis https://python.org (version 3.8 ou supérieure).
3. **Windows** : L'agent fonctionne uniquement sur Windows.

## Installation
1. Créez un dossier nommé `AppliDeployAllInOne` sur votre machine.
2. Placez les fichiers suivants dans ce dossier :
   - `server.js`
   - `agent.py`
   - `package.json`
   - `README.md`
3. Créez un sous-dossier nommé `public` dans `AppliDeployAllInOne`.
4. Placez le fichier `index.html` dans le dossier `public`.
5. Ouvrez un terminal dans le dossier `AppliDeployAllInOne`.
6. Installez les dépendances du serveur :
   ```bash
   npm install
   ```
7. Installez les dépendances Python pour l'agent :
   ```bash
   pip install wmi psutil requests pywin32
   ```

## Lancement du serveur
1. Dans le dossier `AppliDeployAllInOne`, lancez le serveur :
   ```bash
   npm start
   ```
2. Ouvrez votre navigateur à http://localhost:3000 pour accéder à la console web.

## Installation de l'agent
1. Créez le dossier `C:\ProgramData\AppliDeployAgent` (nécessite des droits admin).
2. Dans le dossier `AppliDeployAllInOne`, ouvrez un terminal avec droits admin.
3. Installez le service Windows :
   ```bash
   python agent.py install
   ```
4. Démarrez le service :
   ```bash
   python agent.py start
   ```

## Utilisation
- La console web affiche les machines inventoriées.
- Cliquez sur "Mettre à jour" pour déclencher une mise à jour Windows.
- Cliquez sur "Forcer Win11" pour tenter une mise à niveau vers Windows 11 (si compatible).
- Les logs de l'agent sont dans `C:\ProgramData\AppliDeployAgent\agent.log`.

## Notes
- Le serveur stocke les données dans `data.json` dans le dossier du projet.
- L'agent s'exécute toutes les 5 minutes pour envoyer l'inventaire et vérifier les actions.
- Assurez-vous que le serveur est accessible à `http://localhost:3000` depuis les machines clientes.