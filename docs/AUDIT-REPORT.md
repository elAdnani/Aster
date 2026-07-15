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
- Conversations persistantes avec création, lecture, renommage et suppression.
- Premier compte administrateur créé uniquement depuis la boucle locale.
- Mots de passe hachés avec scrypt (`N=2^17`, `r=8`, `p=1`) et sel aléatoire.
- Sessions aléatoires 256 bits dans un cookie `HttpOnly`, `SameSite=Strict`.
- Connexion, déconnexion et sélection de profil.
- Requêtes de conversations systématiquement filtrées par le profil actif.
- Administration locale : choix Personnel/Foyer/Personnalisé, jusqu’à trois comptes et quatre profils par compte.
- Création de comptes non administrateurs et ajout de profils par l’administrateur.
- Recherche visuelle dans les conversations, amorces Projets, Planification, Plugins et Bibliothèque.
- VPN, Proton VPN et Tor présentés uniquement comme options futures, jamais activés automatiquement.

## Sécurité mise en place

- API métier fermée sans session ou jeton distant configuré.
- Routes administrateur limitées au rôle `admin` et à une connexion loopback réelle.
- Données et `.env` exclus de Git.
- Écriture atomique des fichiers d’authentification et de conversations.
- Limites de taille sur les corps, messages et conversations.
- Limitation basique des tentatives de connexion : huit essais par adresse sur dix minutes.
- Vérification de l’origine des requêtes mutantes lorsque l’en-tête `Origin` est présent.
- CSP, interdiction d’iframe, politique de permissions, `nosniff` et absence de referrer.
- Aucun outil shell, accès fichiers arbitraire, télémétrie ou téléchargement automatique de modèle.

## Problèmes et risques connus

### Priorité critique avant accès Internet

1. Les conversations et métadonnées sont enregistrées en JSON clair. Ajouter un chiffrement au repos avec clés séparées par profil et une stratégie de récupération.
2. Le jeton distant est un secret global et ne représente pas un utilisateur. Remplacer par des sessions distantes authentifiées, révocables et limitées au profil.
3. Le serveur ne fournit pas TLS. L’accès distant doit obligatoirement passer par un tunnel ou réseau privé audité avec HTTPS.
4. Les comptes ne disposent pas encore de récupération de mot de passe, rotation des sessions, liste de sessions ni révocation par appareil.

### Priorité élevée

1. Les sessions sont en mémoire et disparaissent au redémarrage. C’est sûr mais peu pratique ; une persistance chiffrée et révocable sera nécessaire.
2. Le stockage JSON deviendra fragile avec plusieurs requêtes et de gros historiques. Migrer vers SQLite avec contraintes d’appartenance et transactions.
3. Les règles, skills, quotas, VPN et catalogue IA affichés ne sont pas tous appliqués côté serveur. Ne pas les présenter comme protections actives.
4. La politique CSP autorise encore les scripts et styles inline pour conserver l’interface actuelle. Extraire le code inline afin de supprimer `unsafe-inline`.
5. Aucun test navigateur automatisé complet, test mobile visuel, audit WCAG ou test de charge n’est encore présent.

### Fonctionnalités incomplètes

- PIN de profil.
- Suppression/suspension de compte et profil avec gestion des données associées.
- Dossiers/projets persistants et déplacement des conversations.
- Recherche serveur dans le contenu des messages.
- Planification persistante.
- Installation, permissions et sandbox des plugins/skills.
- File d’attente et requêtes Ollama parallèles selon la RAM/VRAM.
- Import/export réellement filtré et chiffré par profil.
- Applications desktop/mobile natives et routage VPN par application.

## État des tests

La suite couvre le service statique, la traversée de chemins, la protection API, le cycle CRUD des conversations, les entrées invalides, le setup administrateur, les cookies sécurisés, le login, la configuration de l’installation, la création de comptes/profils et l’isolation entre profils. Elle doit rester verte avant chaque publication.

## Conditions de publication GitHub

- Publier clairement sous le statut `experimental` ou `alpha`.
- Ne jamais committer `data/`, `.env`, journaux, exports, modèles ou jetons.
- Activer l’analyse de secrets et les mises à jour de sécurité du dépôt.
- Ajouter une procédure de signalement privé des vulnérabilités.
- Créer les premières issues depuis la liste des risques critiques et élevés.
- Ne pas annoncer l’accès Internet, le VPN/Tor, les PIN ou le chiffrement comme terminés.

## Ordre recommandé

1. SQLite et migrations.
2. PIN et cycle de vie comptes/profils.
3. Règles/skills réellement appliqués côté serveur.
4. Chiffrement au repos et sauvegardes.
5. Sessions distantes et tunnel HTTPS.
6. Projets, recherche plein texte et planification.
7. Gestion des requêtes Ollama, files et parallélisme.
8. Packaging desktop, tests multiplateformes et première bêta.
