# AppliDeploy

Solution open source de gestion de parc informatique et de déploiement logiciel.

## Sommaire

- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation du serveur](#installation-du-serveur)
- [Lancer le serveur en tant que service (Linux / systemd)](#lancer-le-serveur-en-tant-que-service-linux--systemd)
- [Build de la console web](#build-de-la-console-web)
- [Variables d'environnement](#variables-denvironnement)
- [Premier démarrage](#premier-démarrage)
- [Installation de l'agent Windows (script automatique)](#installation-de-lagent-windows-script-automatique)
- [Installation de l'agent Windows (manuel)](#installation-de-lagent-windows-manuel)
- [Configuration de l'agent](#configuration-de-lagent)
- [Gestion des groupes](#gestion-des-groupes)
- [Déploiement d'une application](#déploiement-dune-application)
- [Rôles utilisateurs](#rôles-utilisateurs)
- [Sécurité en production](#sécurité-en-production)

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Serveur AppliDeploy                    │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │  Backend     │  │  Console Web    │  │
│  │  Node.js /   │  │  React + Vite   │  │
│  │  Express     │  │  (servi en      │  │
│  │  (port 3000) │  │   statique)     │  │
│  └──────────────┘  └─────────────────┘  │
│         ▲  API REST + JWT               │
└─────────┼───────────────────────────────┘
          │  HTTP(S)  X-Agent-Secret
┌─────────┴───────────────────────────────┐
│  Postes clients Windows 10/11           │
│  AppliDeployAgent (service Python)      │
└─────────────────────────────────────────┘
```

- **Backend** : Node.js / Express — API REST, authentification JWT, stockage JSON
- **Console web** : React 19 + Vite + Tailwind CSS 4, servie en statique par le backend
- **Agent** : service Windows Python, interroge le serveur toutes les N secondes

---

## Prérequis

### Serveur

| Composant | Version minimale |
|-----------|-----------------|
| Node.js   | 20.x LTS        |
| npm       | 9               |
| OS        | Linux, macOS ou Windows Server |

> **Remarque** : Aucune base de données externe n'est requise. Les données sont stockées dans `data.json` à la racine du projet.

### Agent (postes clients)

| Composant  | Version minimale |
|------------|-----------------|
| Windows    | 10 / 11 (64 bit) |
| Python     | 3.10            |
| pip        | 22              |

---

## Installation du serveur

### 1. Récupérer les sources

```bash
git clone https://github.com/Doud-FR/console-ready.git
cd console-ready
```

### 2. Installer les dépendances du backend

```bash
npm install
```

### 3. Construire la console web

```bash
cd console
npm install
npm run build   # génère les fichiers statiques dans ../public/
cd ..
```

### 4. Configurer les variables d'environnement

Copier le fichier d'exemple et renseigner les valeurs :

```bash
cp .env.example .env
```

Éditer `.env` à la racine du projet :

```dotenv
# Obligatoire en production
JWT_SECRET=<chaine-aleatoire-longue>
AGENT_SECRET=<chaine-aleatoire-longue>

# Optionnel
PORT=3000
ADMIN_PASSWORD=<mot-de-passe-initial-admin>
```

> ✅ Le fichier `.env` est chargé automatiquement au démarrage du serveur.
>
> ⚠️ Sans `JWT_SECRET` ni `AGENT_SECRET`, le serveur démarre avec des valeurs par défaut **non sécurisées** et affiche un avertissement. Ne pas utiliser les valeurs par défaut en production.

### 5. Démarrer le serveur

```bash
npm start
```

Le serveur écoute sur `http://0.0.0.0:3000` (ou sur le port défini par `PORT`).

---

## Lancer le serveur en tant que service (Linux / systemd)

Pour que le serveur démarre automatiquement au boot et redémarre en cas d'erreur, utilisez le fichier de service systemd fourni (`applideploy.service`).

### 1. Créer un utilisateur dédié

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin applideploy
```

### 2. Déployer les fichiers

`/opt/applideploy` sert de répertoire de travail du serveur (stockage de `data.json`, lecture de `.env`). L'utilisateur `applideploy` doit avoir les droits d'écriture sur ce dossier.

```bash
sudo mkdir -p /opt/applideploy
sudo cp -r . /opt/applideploy/
sudo chown -R applideploy:applideploy /opt/applideploy
# Restreindre les permissions du fichier .env (contient les secrets)
sudo chmod 600 /opt/applideploy/.env
```

### 3. Copier le fichier de service

```bash
sudo cp /opt/applideploy/applideploy.service /etc/systemd/system/
```

> Le fichier `applideploy.service` pointe par défaut vers `/opt/applideploy`. Si vous utilisez un autre chemin, modifiez les champs `WorkingDirectory` et `EnvironmentFile` dans le fichier.

### 4. Activer et démarrer le service

```bash
sudo systemctl daemon-reload
sudo systemctl enable applideploy   # démarrage automatique au boot
sudo systemctl start applideploy
```

### 5. Vérifier le statut

```bash
sudo systemctl status applideploy
```

### Commandes de gestion

```bash
sudo systemctl start applideploy    # Démarrer
sudo systemctl stop applideploy     # Arrêter
sudo systemctl restart applideploy  # Redémarrer
sudo journalctl -u applideploy -f   # Suivre les journaux en temps réel
```

---

## Variables d'environnement

| Variable         | Défaut                                  | Description |
|------------------|-----------------------------------------|-------------|
| `PORT`           | `3000`                                  | Port d'écoute HTTP |
| `JWT_SECRET`     | *(valeur insécurisée par défaut)*       | Secret de signature des tokens JWT |
| `AGENT_SECRET`   | `applideploy-agent-secret`              | Clé partagée entre le serveur et les agents |
| `ADMIN_PASSWORD` | *(mot de passe aléatoire au démarrage)* | Mot de passe du compte `admin` créé au premier démarrage |

---

## Premier démarrage

Au premier lancement, si aucun utilisateur `admin` n'existe dans `data.json`, le serveur crée automatiquement le compte administrateur :

- **Identifiant** : `admin`
- **Mot de passe** : affiché dans les logs au démarrage (ou valeur de `ADMIN_PASSWORD`)

```
✅ Compte admin créé.
   Identifiants : admin / <mot-de-passe>
   ⚠️  Notez ce mot de passe, il ne sera plus affiché.
```

Ouvrir la console web dans un navigateur : `http://<adresse-serveur>:3000`

---

## Installation de l'agent Windows (script automatique)

Le script PowerShell `install-agent.ps1` installe automatiquement l'agent et toutes ses dépendances en une seule commande.

### Prérequis

- Windows 10 / 11 (64 bit)
- PowerShell 5.1+ (inclus dans Windows 10/11)
- Session PowerShell **en tant qu'administrateur**

### Utilisation

Copier `agent.py` et `install-agent.ps1` sur le poste client (dans le même dossier), puis ouvrir PowerShell **en tant qu'administrateur** et exécuter :

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
.\install-agent.ps1 -ServerUrl "http://<adresse-serveur>:3000" -AgentSecret "<valeur-de-AGENT_SECRET>"
```

Le script :
1. Vérifie les droits administrateur
2. Détecte Python 3.10+ (et propose l'installation via `winget` si absent)
3. Installe les dépendances Python (`requests`, `pywin32`, `wmi`, `psutil`)
4. Copie `agent.py` dans `C:\Program Files\AppliDeployAgent\`
5. Crée le fichier de configuration dans `%ProgramData%\AppliDeployAgent\agent.conf`
6. Installe et démarre le service Windows **AppliDeployAgent** (démarrage automatique)

### Paramètres disponibles

| Paramètre | Obligatoire | Défaut | Description |
|-----------|-------------|--------|-------------|
| `-ServerUrl` | ✅ | — | URL du serveur AppliDeploy |
| `-AgentSecret` | ✅ | — | Valeur de `AGENT_SECRET` côté serveur |
| `-PollInterval` | ❌ | `300` | Intervalle d'interrogation en secondes |
| `-InstallDir` | ❌ | `C:\Program Files\AppliDeployAgent` | Dossier d'installation |
| `-HostnameOverride` | ❌ | *(auto)* | Forcer un nom de machine spécifique |

### Exemple avec tous les paramètres

```powershell
.\install-agent.ps1 `
    -ServerUrl "https://applideploy.entreprise.fr" `
    -AgentSecret "MonSecretTresLong1234" `
    -PollInterval 120 `
    -HostnameOverride "PC-COMPTA-01"
```

---

## Installation de l'agent Windows (manuel)

> ℹ️ Utilisez cette méthode uniquement si vous ne pouvez pas utiliser le script automatique ci-dessus.

### 1. Prérequis Python

Sur le poste client Windows, installer Python 3.10+ depuis [python.org](https://www.python.org/downloads/).
Cocher **« Add Python to PATH »** lors de l'installation.

### 2. Installer les dépendances Python

Ouvrir une invite de commande **en tant qu'administrateur** :

```powershell
pip install requests pywin32 wmi psutil
```

> `wmi` et `pywin32` sont nécessaires pour la collecte de l'inventaire matériel/logiciel via WMI.
> Sur une machine hors-Windows (test/dev), l'agent fonctionne en mode dégradé sans ces modules.

### 3. Copier l'agent

Copier le fichier `agent.py` sur le poste client, par exemple dans :

```
C:\Program Files\AppliDeployAgent\agent.py
```

### 4. Créer le fichier de configuration

Créer le dossier de données et le fichier de configuration :

```powershell
mkdir "$env:ProgramData\AppliDeployAgent"
```

Créer le fichier `%ProgramData%\AppliDeployAgent\agent.conf` avec le contenu suivant :

```json
{
  "server_url": "http://<adresse-serveur>:3000",
  "agent_secret": "<valeur-de-AGENT_SECRET>",
  "poll_interval": 300,
  "hostname_override": null
}
```

### 5. Installer le service Windows

Depuis une invite de commande **en tant qu'administrateur**, dans le dossier contenant `agent.py` :

```powershell
python agent.py install
python agent.py start
```

Vérifier que le service est actif :

```powershell
Get-Service AppliDeployAgent
```

### 6. Commandes de gestion du service

```powershell
python agent.py start    # Démarrer le service
python agent.py stop     # Arrêter le service
python agent.py restart  # Redémarrer le service
python agent.py remove   # Désinstaller le service
```

Pour lancer l'agent en **mode console** (sans service, utile pour le débogage) :

```powershell
python agent.py
```

### 7. Journaux

Les journaux de l'agent sont écrits dans :

```
%ProgramData%\AppliDeployAgent\agent.log
```

La rotation automatique est configurée à 5 Mo par fichier, avec 3 fichiers de sauvegarde.

---

## Configuration de l'agent

Le fichier `%ProgramData%\AppliDeployAgent\agent.conf` est un JSON avec les paramètres suivants :

| Paramètre           | Défaut                       | Description |
|---------------------|------------------------------|-------------|
| `server_url`        | `http://localhost:3000`      | URL du serveur AppliDeploy |
| `agent_secret`      | `applideploy-agent-secret`   | Doit correspondre à `AGENT_SECRET` côté serveur |
| `poll_interval`     | `300`                        | Intervalle d'interrogation du serveur en secondes |
| `hostname_override` | `null`                       | Forcer un nom de machine spécifique (null = auto-détection) |

Exemple complet :

```json
{
  "server_url": "https://applideploy.entreprise.fr",
  "agent_secret": "MonSecretTresLong1234",
  "poll_interval": 120,
  "hostname_override": null
}
```

Après toute modification du fichier de configuration, redémarrer le service :

```powershell
python agent.py restart
```

---

## Déploiement d'une application

Cette section explique comment créer un **paquet de déploiement** dans la console AppliDeploy et le pousser vers les postes clients. L'exemple complet utilise **7-Zip** (installeur `.exe` en mode silencieux).

### Vue d'ensemble du processus

```
Console Web            Serveur              Agent Windows
     │                    │                      │
     │  Créer un paquet   │                      │
     │ ──────────────────>│                      │
     │                    │  Commande en attente  │
     │  Assigner machines │ ─────────────────────>│
     │ ──────────────────>│                      │
     │                    │  Exécution commande   │
     │                    │ <─────────────────────│
     │   Résultat (log)   │                      │
     │ <──────────────────│                      │
```

### Étape 1 — Créer le paquet dans la console

Dans la console web, aller dans **Paquets → Nouveau paquet**.

Le formulaire de création comporte les champs suivants :

| Champ | Description |
|-------|-------------|
| **Nom** *(obligatoire)* | Nom affiché dans la console |
| **Version** | Version du logiciel |
| **Éditeur** | Nom de l'éditeur / fabricant |
| **Type** | Type d'installeur : `exe`, `msi`, `script`, `zip`, `other` |
| **Description** | Description libre du paquet |
| **Commande d'installation** | Commande exécutée sur les postes pour installer le logiciel |
| **Commande de désinstallation** | Commande exécutée pour désinstaller le logiciel |

> ⚠️ Les commandes d'installation et de désinstallation sont exécutées **avec les droits du service Windows** (`SYSTEM` par défaut). L'installeur doit être accessible depuis le poste client (partage réseau, chemin UNC, etc.).

---

### Exemple complet : 7-Zip

7-Zip est un archiveur open source dont l'installeur `.exe` accepte le commutateur `/S` pour une installation **silencieuse** (sans interface graphique ni confirmation utilisateur).

#### Champs à remplir

| Champ | Valeur à saisir |
|-------|----------------|
| **Nom** | `7-Zip` |
| **Version** | `24.09` *(adapter à la version téléchargée)* |
| **Éditeur** | `Igor Pavlov` |
| **Type** | `exe` |
| **Description** | `Archiveur de fichiers open source 7-Zip` |
| **Commande d'installation** | *(voir ci-dessous)* |
| **Commande de désinstallation** | *(voir ci-dessous)* |

#### Commande d'installation

Copier l'installeur `7z2409-x64.exe` sur un partage réseau accessible depuis tous les postes, puis saisir dans le champ **Commande d'installation** :

```
\\serveur\partage\7z2409-x64.exe /S
```

> **Le commutateur `/S` est sensible à la casse** : il doit être en majuscule. Il déclenche l'installation silencieuse sans aucune fenêtre ni interaction utilisateur.
>
> Par défaut, 7-Zip s'installe dans `C:\Program Files\7-Zip\`.
> Pour choisir un dossier d'installation différent, ajouter l'option `/D` **en dernier** :
>
> ```
> \\serveur\partage\7z2409-x64.exe /S /D=C:\Outils\7-Zip
> ```

#### Commande de désinstallation

L'installeur de 7-Zip dépose un exécutant de désinstallation dans son répertoire. Saisir dans le champ **Commande de désinstallation** :

```
"C:\Program Files\7-Zip\Uninstall.exe" /S
```

> Les guillemets sont nécessaires car le chemin contient des espaces.
> Le commutateur `/S` active là aussi le mode silencieux.
>
> Si vous avez installé 7-Zip dans un répertoire personnalisé via `/D`, adaptez le chemin en conséquence.

---

### Étape 2 — Assigner le paquet aux machines

Une fois le paquet créé :

1. Aller dans **Déploiements → Nouveau déploiement** (ou cliquer sur le paquet puis **Déployer**).
2. Sélectionner le ou les postes cibles dans la liste des machines enregistrées.
3. Choisir l'action **Installer** ou **Désinstaller**.
4. Valider — le déploiement passe à l'état **En attente**.

L'agent sur chaque poste récupère la commande lors de sa prochaine vérification (selon `poll_interval`), l'exécute et remonte le résultat (code de retour, sortie console) dans les journaux de déploiement.

### Étape 3 — Vérifier le résultat

Dans la console web, aller dans **Déploiements** et consulter le statut de chaque tâche :

| Statut | Signification |
|--------|---------------|
| `pending` | En attente de récupération par l'agent |
| `running` | En cours d'exécution sur le poste |
| `success` | Commande terminée avec le code de retour `0` |
| `failed` | Commande terminée avec un code de retour non nul |

En cas d'échec, cliquer sur la tâche pour afficher la sortie complète de la commande et identifier l'erreur.

---

## Rôles utilisateurs

| Rôle      | Droits |
|-----------|--------|
| `admin`   | Accès complet : gestion des utilisateurs, des groupes (créer, renommer, supprimer), des paquets, des déploiements et des machines |
| `tech`    | Peut créer des groupes, déplacer des machines entre groupes, modifier des paquets, déclencher des déploiements et des actions sur les machines |
| `viewer`  | Consultation uniquement (inventaire, groupes, déploiements, journaux) |

La gestion des comptes se fait depuis la console web → **Paramètres → Utilisateurs**.

---

## Gestion des groupes

La fonctionnalité **Groupes** permet d'organiser les machines en ensembles logiques et d'effectuer des actions en masse.

### Accéder aux groupes

Dans la console web, cliquer sur **Groupes** dans la barre de navigation latérale.

### Opérations disponibles

| Action | Rôle requis | Description |
|--------|-------------|-------------|
| Voir les groupes | Tous | Afficher la liste des groupes et leurs machines |
| Créer un groupe | `admin`, `tech` | Ajouter un nouveau groupe |
| Renommer un groupe | `admin` | Renommer un groupe existant (cascade sur les machines) |
| Supprimer un groupe | `admin` | Supprimer un groupe (les machines sont déplacées vers `default`) |
| Déplacer une machine | `admin`, `tech` | Changer le groupe d'une machine |
| MàJ groupe | `admin`, `tech` | Déclencher `update_windows` sur toutes les machines du groupe |
| Redémarrer tout | `admin`, `tech` | Planifier un redémarrage de toutes les machines du groupe |
| Déployer | `admin`, `tech` | Déployer un paquet sur toutes les machines du groupe |

> **Note :** Le groupe `default` ne peut pas être supprimé. Il sert de groupe de secours pour les machines non assignées.

---

## Sécurité en production

- Définir des secrets forts pour `JWT_SECRET` et `AGENT_SECRET` (32 caractères aléatoires minimum).
- Exposer le serveur derrière un reverse-proxy (nginx, Caddy…) avec **HTTPS** (certificat TLS).
- Restreindre le port 3000 au seul reverse-proxy via le pare-feu.
- Changer le mot de passe `admin` par défaut dès le premier démarrage.
- Sur les agents, restreindre les permissions de `agent.conf` au seul compte `SYSTEM` :

```powershell
$path = "$env:ProgramData\AppliDeployAgent\agent.conf"
$acl = Get-Acl $path
$acl.SetAccessRuleProtection($true, $false)
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "SYSTEM", "FullControl", "Allow")
$acl.AddAccessRule($rule)
Set-Acl $path $acl
```
