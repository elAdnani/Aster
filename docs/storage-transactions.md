# Transactions du stockage léger

Aster conserve son fonctionnement sans dépendance avec quatre fichiers principaux : authentification, projets, tâches et conversations. Les écritures simples utilisent toujours un fichier temporaire suivi d’un renommage atomique.

## Opérations groupées

La suppression d’un compte, d’un profil ou d’un projet ainsi que la restauration d’une sauvegarde peuvent toucher plusieurs fichiers. Ces opérations suivent désormais le protocole suivant :

1. toutes les écritures et lectures dépendantes attendent une file globale unique ;
2. Aster charge un état cohérent des quatre stockages ;
3. il écrit `data/transaction.json` avec les versions brutes précédentes et leur empreinte SHA-256 ;
4. il remplace les fichiers concernés ;
5. il supprime le journal seulement après la dernière écriture réussie.

Si une écriture échoue, l’état précédent est restauré immédiatement. Si le processus ou la machine s’arrête avant la fin, le prochain démarrage détecte le journal et restaure l’état précédent avant de servir une lecture.

Un journal incomplet ou dont une empreinte ne correspond plus est refusé sans modifier les fichiers courants. Aster échoue alors de façon fermée afin de préserver les éléments nécessaires à une récupération manuelle.

## Confidentialité et limites

- Le journal reçoit les mêmes permissions restrictives (`0600`) que les autres données.
- Les projets, tâches et conversations y restent sous leur forme déjà chiffrée.
- Le fichier d’authentification contient des hashes de mots de passe/PIN et les politiques locales, jamais les secrets en clair.
- Le journal est transitoire et ignoré par Git avec l’ensemble du dossier `data/`.
- Une transaction groupée demande temporairement de l’espace supplémentaire pouvant approcher la taille du stockage courant.

Ce mécanisme rend le prototype JSON cohérent et récupérable. SQLite reste préférable à terme pour les grands historiques, les contraintes relationnelles et les recherches indexées.
