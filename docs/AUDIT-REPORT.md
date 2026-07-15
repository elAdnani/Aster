# Aster Local — état, audit et feuille de route

Date de l’audit : 15 juillet 2026. Version : prototype `0.1.0`.

## Résumé exécutif

Aster est aujourd’hui un prototype local-first utilisable pour créer un compte administrateur, choisir un profil, conserver des conversations séparées et dialoguer avec un moteur Ollama local. Le socle n’utilise aucune dépendance npm d’exécution, ce qui réduit fortement la taille et la surface d’attaque.

Le dépôt peut être publié comme **prototype expérimental**, mais pas encore présenté comme une solution de sécurité achevée, un client distant prêt pour Internet ou une alternative complète à ChatGPT/Codex. Les conversations sont isolées logiquement par profil mais restent en clair sur le disque.

## Ce qui fonctionne

- Serveur Node.js sans dépendance externe, lié à `127.0.0.1` par défaut.
- PWA responsive et installable.
- Détection d’Ollama et catalogue des modèles installés.
- Chat en streaming avec arrêt de génération.
- Conversations persistantes avec création, lecture, renommage, suppression et chiffrement AES-256-GCM.
- Premier compte administrateur créé uniquement depuis la boucle locale.
- Mots de passe hachés avec scrypt (`N=2^17`, `r=8`, `p=1`) et sel aléatoire.
- Sessions aléatoires 256 bits dans un cookie `HttpOnly`, `SameSite=Strict`.
- Connexion, déconnexion et sélection de profil.
- PIN optionnel de 4 à 8 chiffres, haché avec scrypt et limité à cinq essais sur dix minutes.
- Requêtes de conversations systématiquement filtrées par le profil actif.
- Administration locale : choix Personnel/Foyer/Personnalisé, jusqu’à trois comptes et quatre profils par compte.
- Politiques par profil appliquées côté serveur : modèles autorisés, règles système, skills déclarés et limite parallèle préparée.
- File d’inférence FIFO par profil, avec parallélisme administrateur réellement appliqué, annulation et plafond de 25 attentes.
- Création de comptes non administrateurs et ajout de profils par l’administrateur.
- Projets chiffrés par profil, déplacement des conversations et recherche serveur dans les titres et messages.
- Amorces Plugins et Bibliothèque encore non persistantes.
- Planification chiffrée par profil avec tâches, échéances et rattachement aux projets.
- VPN, Proton VPN et Tor présentés uniquement comme options futures, jamais activés automatiquement.

## Sécurité mise en place

- API métier fermée sans session ou jeton distant configuré.
- Routes administrateur limitées au rôle `admin` et à une connexion loopback réelle.
- Données et `.env` exclus de Git.
- Écriture atomique des fichiers d’authentification et de conversations, avec mutations concurrentes sérialisées.
- Clé de chiffrement distincte dérivée par profil via HKDF ; contenus et titres absents du JSON en clair.
- Limites de taille sur les corps, messages et conversations.
- Limitation basique des tentatives de connexion : huit essais par adresse sur dix minutes.
- Vérification de l’origine des requêtes mutantes lorsque l’en-tête `Origin` est présent.
- CSP, interdiction d’iframe, politique de permissions, `nosniff` et absence de referrer.
- Aucun outil shell, accès fichiers arbitraire, télémétrie ou téléchargement automatique de modèle.

## Problèmes et risques connus

### Priorité critique avant accès Internet

1. La clé maîtresse se trouve sur le même compte système que les données. Prévoir sauvegarde/récupération protégée et intégration au coffre de clés du système pour le packaging desktop.
2. Le jeton distant est un secret global et ne représente pas un utilisateur. Remplacer par des sessions distantes authentifiées, révocables et limitées au profil.
3. Le serveur ne fournit pas TLS. L’accès distant doit obligatoirement passer par un tunnel ou réseau privé audité avec HTTPS.
4. Les comptes ne disposent pas encore de récupération de mot de passe, rotation des sessions, liste de sessions ni révocation par appareil.

### Priorité élevée

1. Les sessions sont en mémoire et disparaissent au redémarrage. C’est sûr mais peu pratique ; une persistance chiffrée et révocable sera nécessaire.
2. Le stockage JSON deviendra fragile avec plusieurs requêtes et de gros historiques. Migrer vers SQLite avec contraintes d’appartenance et transactions.
3. Les règles, modèles et quotas parallèles sont appliqués côté serveur, mais les skills et routes VPN n’ont pas encore de moteur d’exécution. Ne pas les présenter comme capacités actives.
4. La politique CSP autorise encore les scripts et styles inline pour conserver l’interface actuelle. Extraire le code inline afin de supprimer `unsafe-inline`.
5. Aucun test navigateur automatisé complet, test mobile visuel, audit WCAG ou test de charge n’est encore présent.

### Fonctionnalités incomplètes

- Installation, permissions et sandbox des plugins/skills.
- Détection automatique RAM/VRAM pour recommander la limite parallèle ; la limite choisie est déjà appliquée.
- Import/export réellement filtré et chiffré par profil.
- Applications desktop/mobile natives et routage VPN par application.

## État des tests

La suite couvre le service statique, la traversée de chemins, la protection API, le cycle CRUD des conversations, les entrées invalides, le setup administrateur, les cookies sécurisés, le login, la configuration de l’installation, la création et le cycle de vie des comptes/profils, leur isolation, ainsi que la sauvegarde/restauration chiffrée avec refus des secrets incorrects et fichiers altérés. Elle doit rester verte avant chaque publication.

## Conditions de publication GitHub

- Publier clairement sous le statut `experimental` ou `alpha`.
- Ne jamais committer `data/`, `.env`, journaux, exports, modèles ou jetons.
- Activer l’analyse de secrets et les mises à jour de sécurité du dépôt.
- Ajouter une procédure de signalement privé des vulnérabilités.
- Créer les premières issues depuis la liste des risques critiques et élevés.
- Ne pas annoncer l’accès Internet, le VPN/Tor, les PIN ou le chiffrement comme terminés.

## Ordre recommandé

1. SQLite et migrations.
2. Coffre natif du système pour la clé de chiffrement locale.
3. Sessions distantes et tunnel HTTPS.
4. Index de recherche plein texte, pièces jointes et vues de planification avancées.
5. Runtime sandboxé pour les skills.
6. Packaging desktop, tests multiplateformes et première bêta.
