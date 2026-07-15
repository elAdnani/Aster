# Sauvegarder et restaurer Aster

La sauvegarde administrateur contient les comptes, profils, politiques, projets et conversations accessibles. Elle est chiffrée avant de quitter le service local.

## Créer une sauvegarde

1. Ouvrir **Réglages → Données** depuis la machine qui héberge Aster.
2. Choisir **Créer une sauvegarde chiffrée**.
3. Saisir une phrase secrète unique d’au moins 12 caractères.
4. Conserver le fichier `.aster.json` et la phrase secrète dans deux emplacements distincts.

Aster ne conserve pas cette phrase secrète. Le fichier ne peut pas être récupéré si elle est perdue.

## Restaurer

La restauration est réservée à l’administrateur connecté depuis l’adresse locale. Elle remplace tous les comptes, profils, politiques et conversations, puis révoque toutes les sessions.

1. Créer une sauvegarde récente de l’installation actuelle.
2. Choisir **Restaurer une sauvegarde** et sélectionner le fichier.
3. Saisir sa phrase secrète puis la confirmation `RESTAURER`.
4. Se reconnecter avec un compte administrateur présent dans la sauvegarde.

Un mauvais secret, un fichier modifié ou une structure incohérente est refusé avant le remplacement des données.

## Format et sécurité

- Dérivation de clé : scrypt (`N=131072`, `r=8`, `p=1`) avec sel aléatoire.
- Chiffrement authentifié : AES-256-GCM avec nonce aléatoire.
- Format versionné : `aster-backup`, version 1.
- La clé `storage.key` n’est pas exportée ; les conversations sont rechiffrées avec la clé de la machine de destination.
- Les conversations orphelines qui ne correspondent plus à un profil existant ne sont pas exportées.

Une sauvegarde reste une donnée sensible : ne pas la publier dans Git, la joindre à une issue ou la partager avec sa phrase secrète.
