✅ Créer une application complète de gestion de parc informatique, déploiement de logiciels et systèmes, équivalente à WAPT

Développe une application complète client-serveur de gestion de parc informatique, de déploiement logiciel, de déploiement de systèmes d’exploitation et de gestion des mises à jour, avec les mêmes fonctionnalités que WAPT de Tranquil IT, en version open source moderne, ergonomique et modulaire.

🎯 Objectif principal

Créer une solution complète et sécurisée pour l’administration centralisée des postes clients d’un parc informatique (Windows, Linux si possible), incluant une interface serveur (console web ou desktop), un agent client (service Windows et Linux), et un backend scalable.

🧱 Architecture technique

Partie Serveur (backend + frontend)

-   Backend API REST/GraphQL en Python (FastAPI ou Django REST) ou Node.js
-   Base de données PostgreSQL
-   Message Broker (optionnel mais recommandé) : RabbitMQ ou Redis Streams pour exécution des tâches
-   Websocket ou polling long pour les communications asynchrones avec les clients
-   Sécurité : HTTPS, Authentification OAuth2 ou JWT, chiffrement des communications client-serveur
-   Frontend (au choix) :

-   Console Web SPA (React.js, Vue.js ou Svelte)
-   Dark Mode, responsive, ergonomique
-   Authentification avec gestion des droits RBAC (admin, tech, readonly...)

⚙️ Partie Client (agent)

Plateformes supportées

-   Windows 10/11 (obligatoire)
-   Linux (optionnel dans un second temps)

Fonctionnement

-   Service système (Windows Service / systemd) nommé AppliDeployAgent
-   Se connecte au backend pour récupérer des commandes à exécuter toutes les X minutes (configurable)
-   Maintient un journal de logs local (rotation de logs)
-   Authentification client/serveur avec certificat ou jeton

🧩 Fonctionnalités à implémenter

1. 🎯 Store logiciel personnalisé

-   Interface web affichant les logiciels disponibles dans les dépôts
-   Possibilité d’approuver/désapprouver certains paquets par groupe

2. 🧙‍♂️ Assistant de création de paquets

-   Interface graphique permettant d’emballer un installeur (exe/msi) avec des scripts personnalisés (pré-installation, post-installation)
-   Génération automatique d’un paquet .zip ou .wapt contenant :

-   Script Python/PowerShell
-   Métadonnées (version, licence, vendor)
-   Dépendances

-   Intégration avec une bibliothèque de Setup Helpers

3. 📚 Librairie de Setup Helpers

-   Fonctions pré-écrites en Python/PowerShell :

-   Installer un MSI en silencieux
-   Ajouter une clé registre
-   Supprimer une app
-   Créer un raccourci

-   Documentées dans l’interface admin

4. 🚀 Déploiement de logiciels et configurations

-   Déploiement à la demande ou planifié
-   Déploiement par groupes, par OU ou individuellement
-   Suivi d’état (en cours, réussi, échoué)
-   Déploiement de scripts de configuration (registre, politiques, etc.)

5. 🖥️ Inventaire Informatique

-   Récupération automatique des informations :

-   Matériel (CPU, RAM, Disque, SN, BIOS)
-   Logiciel (OS, version, Build, apps installées)
-   Réseau (IP, MAC, nom machine, domaine)

-   Historique des modifications
-   Export CSV/Excel

6. 💽 Déploiement de systèmes d'exploitation

-   PXE Boot ou ISO personnalisé
-   Intégration avec WDS ou outil de type Clonezilla
-   Script de post-installation auto-déployé via l’agent

7. 🔄 Gestion des mises à jour Windows

-   Liste des mises à jour installées/en attente
-   Déclenchement manuel d’un scan ou d’un téléchargement
-   Déclenchement de l’installation
-   Reboot différé avec message utilisateur

8. 🧩 Utilisation de dépôts secondaires

-   Dépôts secondaires en LAN ou distant
-   Priorité de récupération configurables
-   Authentification si nécessaire

9. 🔐 Gestion des droits d’accès

-   Gestion RBAC (Admin, Technicien, Auditeur)
-   Droits par OU, groupe ou scope réseau

10. 🔐 Chiffrement des données

-   Chiffrement des paquets envoyés (AES 256)
-   Stockage chiffré côté serveur des données sensibles

11. 📢 Envoi de messages aux utilisateurs

-   Envoi d’un message popup au poste client via l’agent
-   Message différé ou conditionnel
-   Support multi-langue

12. 🏢 Déploiement par Unités Organisationnelles

-   Intégration LDAP/Active Directory
-   Détection automatique des OU
-   Affectation de paquets à une OU

13. 📤 Export des données de reporting

-   Tableau de bord personnalisable
-   Export PDF, CSV ou Excel
-   Graphiques de synthèse (nombre d’installations, mises à jour, erreurs, etc.)

14. 🧾 Audit matériel et logiciel

-   Scan périodique
-   Détection de logiciels non autorisés
-   Comparaison entre état attendu et état réel
-   Export des écarts

🔐 Sécurité attendue

-   Authentification forte (SAML, LDAP, ou 2FA en option)
-   Communication sécurisée via HTTPS + mutual TLS possible
-   Signature numérique des paquets et scripts
-   Possibilité de journalisation centralisée
-   Intégration CrowdSec, fail2ban ou autre solution de blocage IP

🛠️ Fonctionnalités avancées

-   Planification de maintenance
-   Déploiement sur plusieurs sites géographiques
-   Intégration avec GLPI ou outil ITSM
-   API publique pour intégration tierce
-   Mode "off-line" (cache local sur dépôt secondaire)
