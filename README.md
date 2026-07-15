# ✦ Aster Local

**Votre IA quotidienne, sur votre machine, accessible à distance seulement lorsque vous le décidez.**

Aster Local est un espace IA open source et local-first inspiré par la simplicité de ChatGPT, l’organisation en projets de Codex et la gestion de profils de Netflix. Cette version est une **alpha expérimentale** : le chat local et les protections principales fonctionnent, mais l’accès Internet n’est pas encore prêt pour un usage public.

## Pourquoi Aster

- Léger : aucun framework serveur, aucune dépendance npm d’exécution et environ 0,23 Mio de sources hors Git et données.
- Local : le serveur écoute uniquement `127.0.0.1` par défaut et contacte seulement l’instance Ollama configurée.
- Privé : conversations chiffrées AES-256-GCM, clés dérivées par profil, aucune télémétrie.
- Familial : jusqu’à 3 comptes et 4 profils par compte selon la configuration administrateur.
- Contrôlé : PIN optionnel, modèles autorisés, règles système et parallélisme appliqués côté serveur.
- Flexible : compatible avec les modèles exposés par Ollama ; Gemma peut être choisi sans être téléchargé ni imposé par Aster.

## Démarrage

Prérequis : Node.js 20+ et [Ollama](https://ollama.com/) si vous souhaitez converser avec un modèle local.

```powershell
npm.cmd start
```

Ouvrez ensuite <http://127.0.0.1:4317>. Aucun `npm install` n’est nécessaire.

Au premier démarrage :

1. créez le compte administrateur local ;
2. choisissez l’organisation Personnel, Foyer ou Personnalisé ;
3. sélectionnez un profil ;
4. configurez les modèles autorisés dans Réglages → IA et capacités ;
5. démarrez Ollama et installez séparément le modèle voulu.

Exemple, uniquement si ce modèle existe dans votre installation Ollama :

```powershell
ollama pull gemma4:12b
```

L’administrateur peut aussi lancer cette installation depuis le [catalogue local documenté](./docs/model-catalog.md). Aster demande toujours confirmation et n’installe rien en arrière-plan.

Le nom du modèle est configurable et n’est pas une dépendance du projet.

## Fonctions présentes

- PWA responsive pour ordinateur et mobile.
- Chat Ollama en streaming, arrêt de génération et historique persistant.
- Projets chiffrés persistants, déplacement des conversations et recherche serveur dans les titres et messages.
- Planification privée par profil avec tâches, échéances et rattachement facultatif à un projet.
- Comptes administrateur/utilisateur, sélection de profils et déconnexion.
- PIN de profil haché avec scrypt et essais limités.
- Isolation serveur des conversations par profil.
- Chiffrement authentifié des titres, messages et modèles au repos.
- Règles système et allowlist de modèles appliquées par le service local.
- File FIFO et limite de requêtes parallèles indépendantes par profil.
- Export/import, VPN/Tor, plugins et skills affichés seulement comme préparations lorsqu’ils ne sont pas encore exécutables.

## Sécurité et limites

Ne publiez jamais directement le port 4317 sur Internet. Le jeton distant actuel est une fondation technique globale, pas encore un système d’identité distant par profil. Aster ne fournit pas TLS, récupération de compte, coffre système pour la clé de stockage ni sandbox de plugins.

Les fichiers privés sont placés dans `data/`, ignoré par Git. La clé `data/storage.key` doit être sauvegardée avec prudence : perdre cette clé rend les conversations chiffrées irrécupérables.

Consultez [SECURITY.md](./SECURITY.md), [RULES.md](./RULES.md) et le [rapport d’audit](./docs/AUDIT-REPORT.md) avant d’activer une fonction réseau.

## Développement

```powershell
npm.cmd test
npm.cmd run dev
```

- `main` : préversions vérifiées.
- `develop` : intégration des lots testés.
- `feature/*`, `fix/*`, `release/*` : changements isolés.

Les pull requests exécutent les tests sur Node 20, 22 et 24 ainsi que CodeQL. Voir [CONTRIBUTING.md](./CONTRIBUTING.md) et le [processus de publication](./docs/release-process.md).

## Feuille de route

1. coffre natif du système pour la clé de chiffrement locale ;
2. stockage transactionnel léger et index de recherche plein texte ;
3. pièces jointes et vues de planification avancées ;
4. runtime de skills sandboxé et permissions explicites ;
5. accès distant HTTPS authentifié par compte et profil ;
6. packaging desktop puis validation mobile.

## Licence

Apache License 2.0. Les modèles et leurs poids conservent leurs propres licences et ne sont jamais intégrés au dépôt.
