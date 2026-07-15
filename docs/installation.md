# Installer Aster Local

## Version alpha actuelle

Prérequis obligatoire : Node.js 20 ou plus récent. Ollama et un modèle sont nécessaires uniquement pour converser ; les comptes, profils, projets et réglages restent accessibles sans modèle.

1. Cloner ou copier le dossier Aster.
2. Ouvrir un terminal dans ce dossier.
3. Lancer le diagnostic :

   ```powershell
   npm.cmd run doctor
   ```

4. Démarrer Aster sous Windows :

   ```powershell
   npm.cmd start
   ```

   Sous macOS ou Linux, utiliser `npm start`.

5. Ouvrir <http://127.0.0.1:4317>.
6. Créer le premier compte administrateur et terminer la configuration obligatoire.
7. Facultativement, lancer Ollama puis installer explicitement un modèle compatible.

Aucun `npm install` n’est nécessaire. Le diagnostic ne télécharge rien, ne lit aucun fichier personnel et n’affiche jamais les identifiants éventuellement présents dans une URL Ollama.

## Pourquoi Docker n’est pas imposé

Un conteneur n’allège pas Gemma : les poids du modèle occupent le même espace disque et Ollama doit toujours accéder au GPU. Il ajouterait une image Node, des volumes et une couche réseau alors qu’Aster fonctionne déjà avec les modules intégrés à Node.

La version alpha privilégie donc le processus natif lié à `127.0.0.1`. Un conteneur pourra être proposé plus tard pour un serveur domestique administré, avec volumes chiffrés, utilisateur non privilégié, limites de ressources et configuration GPU documentée. Il ne deviendra pas le parcours par défaut sans bénéfice mesuré.

## Installation empaquetée prévue

Le futur installateur desktop devra :

1. expliquer l’espace utilisé avant toute installation ;
2. créer le compte administrateur et ses profils ;
3. laisser « aucun modèle pour le moment » comme choix valide ;
4. proposer les modèles avec leur taille, sans téléchargement silencieux ;
5. conserver la connexion directe locale comme réglage réseau par défaut ;
6. créer le service et le raccourci uniquement après confirmation ;
7. exécuter un autotest de confidentialité et de connexion.

Aucun VPN, modèle, accès distant ou composant Tor ne doit être sélectionné automatiquement.

## Mobile et web distant

L’appairage futur utilisera un code court ou QR à durée limitée, lié à un compte et un profil précis. Il ne devra jamais exposer les réglages administrateur ou l’historique d’un autre profil. Voir `RULES.md` pour les frontières obligatoires.
