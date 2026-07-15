# Changelog

Toutes les évolutions importantes d’Aster Local sont documentées ici. Le projet suit SemVer pour ses préversions.

## [0.2.0-alpha.2] - 2026-07-15

### Ajouté

- Comptes locaux administrateur/utilisateur et profils isolés.
- Configuration Personnel, Foyer ou Personnalisé.
- PIN optionnel protégé par scrypt avec limitation des essais.
- Chiffrement AES-256-GCM des conversations avec dérivation HKDF par profil.
- Politiques IA appliquées côté serveur : modèles, règles et skills déclarés.
- File d’inférence FIFO et parallélisme indépendant par profil.
- Suspension, réactivation et suppression protégée des comptes et profils avec révocation des sessions et nettoyage des conversations.
- Sauvegarde portable chiffrée par phrase secrète et restauration locale avec validation intégrale et révocation de toutes les sessions.
- Projets persistants chiffrés par profil, déplacement des conversations et recherche serveur isolée.
- CI Node 20/22/24, CodeQL et processus de publication.

### Sécurité

- Sessions `HttpOnly`, `SameSite=Strict`, révocables et gardées en mémoire.
- Administration limitée au rôle administrateur et aux connexions loopback.
- Mutations des fichiers JSON sérialisées et écritures atomiques.
- CSP, protection iframe, validation d’origine et limitation du login.
- Suppression de l’adresse personnelle des métadonnées Git avant le premier push.

### Limites connues

- Accès distant non prêt pour Internet public.
- Clé de chiffrement stockée dans le même compte système que les données.
- Skills, VPN/Tor, pièces jointes et planification persistante encore incomplets.

## [0.1.0-alpha.1] - 2026-07-15

- Première tranche verticale : PWA, chat Ollama, streaming, conversations persistantes et authentification locale initiale.
