# Changelog

Toutes les évolutions importantes d’Aster Local sont documentées ici. Le projet suit SemVer pour ses préversions.

## [0.2.0-alpha.3] - 2026-07-15

### Ajouté

- Cycle de vie complet des comptes et profils avec révocation des sessions et nettoyage des données.
- Sauvegarde/restauration chiffrée et validée, réservée à l’administrateur local.
- Projets et planification chiffrés par profil, recherche serveur et déplacement des conversations.
- Catalogue Gemma 4 vérifié avec installation Ollama explicite et progression.
- Journal de transaction récupérable pour les mutations touchant plusieurs stockages.
- Pièces jointes TXT, Markdown, JSON et CSV chiffrées, bornées et vérifiées côté serveur.
- Liste et révocation des sessions du compte sans conservation d’adresse IP ni User-Agent complet.

### Sécurité

- CSP stricte sans `unsafe-inline` et ressources de l’application limitées à la même origine.
- Actions GitHub officielles figées sur des SHA vérifiés.
- Skill de design tiers sans provenance remplacé par un skill Aster minimal pour Claude et Codex.
- Tests d’altération du stockage, d’injection dans les pièces jointes et d’isolation des profils.

### Limites connues

- Accès distant non prêt pour Internet public.
- Clé de chiffrement stockée dans le même compte système que les données.
- Sessions gardées uniquement en mémoire et perdues au redémarrage du service.
- Runtime de skills, VPN/Tor et formats de pièces jointes binaires non implémentés.

## [0.2.0-alpha.2] - 2026-07-15

### Ajouté

- Comptes locaux administrateur/utilisateur et profils isolés.
- Configuration Personnel, Foyer ou Personnalisé.
- PIN optionnel protégé par scrypt avec limitation des essais.
- Chiffrement AES-256-GCM des conversations avec dérivation HKDF par profil.
- Politiques IA appliquées côté serveur : modèles, règles et skills déclarés.
- File d’inférence FIFO et parallélisme indépendant par profil.
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
- Skills, VPN/Tor et projets persistants encore incomplets.

## [0.1.0-alpha.1] - 2026-07-15

- Première tranche verticale : PWA, chat Ollama, streaming, conversations persistantes et authentification locale initiale.
