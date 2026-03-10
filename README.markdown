# AppliDeploy

Solution open source de gestion de parc informatique et de déploiement logiciel.

## Sommaire

- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation du serveur](#installation-du-serveur)
- [Build de la console web](#build-de-la-console-web)
- [Variables d'environnement](#variables-denvironnement)
- [Premier démarrage](#premier-démarrage)
- [Installation de l'agent Windows](#installation-de-lagent-windows)
- [Configuration de l'agent](#configuration-de-lagent)
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
| Node.js   | 18.x LTS        |
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

Créer un fichier `.env` à la racine (ou exporter les variables dans le shell) :

```dotenv
# Obligatoire en production
JWT_SECRET=<chaine-aleatoire-longue>
AGENT_SECRET=<chaine-aleatoire-longue>

# Optionnel
PORT=3000
ADMIN_PASSWORD=<mot-de-passe-initial-admin>
```

> ⚠️ Sans `JWT_SECRET` ni `AGENT_SECRET`, le serveur démarre avec des valeurs par défaut **non sécurisées** et affiche un avertissement. Ne pas utiliser les valeurs par défaut en production.

### 5. Démarrer le serveur

```bash
npm start
```

Le serveur écoute sur `http://0.0.0.0:3000` (ou sur le port défini par `PORT`).

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

## Installation de l'agent Windows

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

## Rôles utilisateurs

| Rôle       | Droits |
|------------|--------|
| `admin`    | Accès complet : gestion des utilisateurs, des paquets, des déploiements et des machines |
| `tech`     | Peut créer/modifier des paquets et déclencher des déploiements |
| `readonly` | Consultation uniquement (inventaire, journaux) |

La gestion des comptes se fait depuis la console web → **Paramètres → Utilisateurs**.

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
