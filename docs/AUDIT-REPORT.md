# Aster Local — état, audit et feuille de route

Audit initial : 15 juillet 2026. Dernière vérification : 15 juillet 2026 sur `develop` après `0.2.0-alpha.3`.

## Résumé exécutif

Aster est aujourd’hui un prototype local-first utilisable pour créer un compte administrateur, choisir un profil, conserver des conversations séparées et dialoguer avec un moteur Ollama local. Le socle n’utilise aucune dépendance npm d’exécution, ce qui réduit fortement la taille et la surface d’attaque.

Le dépôt est publiable comme **prototype expérimental**, mais pas encore présentable comme une solution de sécurité achevée, un client distant prêt pour Internet ou une alternative complète à ChatGPT/Codex. Conversations, projets, tâches et pièces jointes texte sont isolés par profil et chiffrés au repos.

## Ce qui fonctionne

- Serveur Node.js sans dépendance externe, lié à `127.0.0.1` par défaut.
- PWA responsive et installable.
- Détection d’Ollama, catalogue Gemma 4 sourcé et installation locale explicite avec progression.
- Chat en streaming avec arrêt de génération.
- Conversations persistantes avec création, lecture, renommage, suppression et chiffrement AES-256-GCM.
- Premier compte administrateur créé uniquement depuis la boucle locale.
- Mots de passe hachés avec scrypt (`N=2^17`, `r=8`, `p=1`) et sel aléatoire.
- Sessions aléatoires 256 bits dans un cookie `HttpOnly`, `SameSite=Strict`.
- Rotation après sélection du profil, expiration après 12 heures d’inactivité ou sept jours au total, et plafond de dix sessions par compte.
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
- Pièces jointes TXT, Markdown, JSON et CSV chiffrées, bornées et transmises au modèle comme données non fiables.
- VPN, Proton VPN et Tor présentés uniquement comme options futures, jamais activés automatiquement.

## Sécurité mise en place

- API métier fermée sans session ou jeton distant configuré.
- Routes administrateur limitées au rôle `admin` et à une connexion loopback réelle.
- Données et `.env` exclus de Git.
- Écritures atomiques, file globale de mutations et journal de rollback multi-stockages récupéré automatiquement après interruption.
- Clé de chiffrement distincte dérivée par profil via HKDF ; contenus et titres absents du JSON en clair.
- Limites de taille sur les corps, messages et conversations.
- Limitation basique des tentatives de connexion : huit essais par adresse sur dix minutes.
- Vérification de l’origine des requêtes mutantes lorsque l’en-tête `Origin` est présent.
- Validation stricte de l’en-tête `Host` et du port, avec liste explicite pour les déploiements non locaux, afin de bloquer le DNS rebinding.
- CSP, interdiction d’iframe, politique de permissions, `nosniff` et absence de referrer.
- Aucun outil shell, accès fichiers arbitraire, télémétrie ou téléchargement automatique de modèle.

## Problèmes et risques connus

### Priorité critique avant accès Internet

1. La clé maîtresse se trouve sur le même compte système que les données. Prévoir sauvegarde/récupération protégée et intégration au coffre de clés du système pour le packaging desktop.
2. Le jeton distant est un secret global et ne représente pas un utilisateur. Remplacer par des sessions distantes authentifiées, révocables et limitées au profil.
3. Le serveur ne fournit pas TLS. L’accès distant doit obligatoirement passer par un tunnel ou réseau privé audité avec HTTPS.
4. Les comptes disposent d’une liste de sessions en mémoire, d’une révocation par appareil, d’une rotation après sélection du profil et d’une expiration inactive ; récupération de mot de passe et rotation périodique supplémentaire restent à concevoir avant l’accès distant.

### Priorité élevée

1. Les sessions sont en mémoire et disparaissent au redémarrage. C’est sûr mais peu pratique ; une persistance chiffrée et révocable sera nécessaire.
2. Le stockage JSON deviendra fragile avec plusieurs requêtes et de gros historiques. Migrer vers SQLite avec contraintes d’appartenance et transactions.
3. Les règles, modèles et quotas parallèles sont appliqués côté serveur, mais les skills et routes VPN n’ont pas encore de moteur d’exécution. Ne pas les présenter comme capacités actives.
4. La CSP interdit maintenant les scripts et styles inline ; conserver ce contrôle dans la CI.
5. Aucun test navigateur automatisé complet, test mobile visuel, audit WCAG ou test de charge n’est encore présent.

### Fonctionnalités incomplètes

- Installation, permissions et sandbox des plugins/skills.
- Détection automatique RAM/VRAM pour recommander la limite parallèle ; la limite choisie est déjà appliquée.
- Import/export réellement filtré et chiffré par profil.
- Applications desktop/mobile natives et routage VPN par application.

## État des tests

La suite compte actuellement 13 scénarios automatisés. Elle couvre le service statique, le refus des hôtes non autorisés, la traversée de chemins, la protection API, le cycle CRUD des conversations, les entrées invalides, le setup administrateur, les cookies sécurisés, le login, la rotation et l’expiration des sessions, la configuration de l’installation, la création et le cycle de vie des comptes/profils, leur isolation, ainsi que la sauvegarde/restauration chiffrée avec refus des secrets incorrects et fichiers altérés. Elle doit rester verte avant chaque publication.

## Conditions de publication GitHub

- Publier clairement sous le statut `experimental` ou `alpha`.
- Ne jamais committer `data/`, `.env`, journaux, exports, modèles ou jetons.
- Activer l’analyse de secrets et les mises à jour de sécurité du dépôt.
- Ajouter une procédure de signalement privé des vulnérabilités.
- Créer les premières issues depuis la liste des risques critiques et élevés.
- Ne pas annoncer l’accès Internet public, le VPN/Tor ou les skills exécutables comme terminés. Les PIN et le chiffrement local existent, mais ne compensent pas l’absence de coffre système, de TLS et d’audit externe.

## Ordre recommandé

1. SQLite et migrations mesurées face au stockage JSON transactionnel actuel.
2. Coffre natif du système pour la clé de chiffrement locale.
3. Sessions distantes et tunnel HTTPS.
4. Index de recherche plein texte incrémental et vues de planification avancées.
5. Runtime sandboxé pour les skills.
6. Packaging desktop, tests multiplateformes et première bêta.
