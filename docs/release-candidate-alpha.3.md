# Aster Local 0.2.0-alpha.3 — rapport de release candidate

Audit réalisé le 15 juillet 2026 depuis `develop` `0f12367` et la branche `release/v0.2.0-alpha.3`.

## Verdict

La candidate est adaptée à une publication **alpha expérimentale locale**. Elle n’est pas adaptée à une exposition directe sur Internet ni à une promesse d’anonymat, de VPN applicatif ou de runtime de skills sécurisé.

## Preuves vérifiées

- `main` local et distant étaient identiques sur `0550598` avant la préparation de la candidate.
- CI Node 20/22/24 et CodeQL GitHub ont réussi sur `develop` `0f12367`.
- `npm.cmd test` réussit : 9 tests couvrant notamment authentification, profils, chiffrement, altération du stockage, sauvegarde/restauration, projets, tâches, modèles, pièces jointes et sessions.
- La même suite réussit depuis une archive produite par `git archive`, sans fichiers locaux ni installation préalable.
- Contrôles de syntaxe Node réussis pour le serveur et les scripts client.
- Archive : 48 fichiers, 258 446 octets (0,246 Mio), aucune dépendance npm d’exécution.
- Aucun secret connu, chemin utilisateur, modèle, export, journal ou donnée locale dans les fichiers publiés.
- Tous les fichiers publiés sont réguliers ; aucun exécutable ou lien symbolique.
- Démarrage neuf : shell HTTP 200, état non configuré et non authentifié, aucun en-tête `Server` ou `X-Powered-By`.
- CSP servie sans `unsafe-inline`, scripts et styles limités à la même origine.
- Interface des sessions et compositeur vérifiés à 390 px sans débordement horizontal.

## Hygiène du dépôt

- `.gitignore` couvre données, environnements, journaux, sauvegardes Aster, modèles et fichiers de clés.
- Les commits utilisent uniquement l’adresse GitHub `noreply` du mainteneur.
- Les actions GitHub officielles sont figées par SHA et utilisent des permissions minimales.
- Le skill tiers sans provenance a été remplacé par un skill Aster court, identique pour Claude et Codex, sans URL ni commande d’installation.

## Limites bloquant une version publique Internet

1. clé maîtresse stockée avec le compte système plutôt que dans un coffre natif ;
2. absence de TLS et d’identité distante par compte/profil ;
3. sessions uniquement en mémoire ;
4. absence de récupération de compte et de rotation périodique des sessions ;
5. VPN, Tor et skills encore déclaratifs, sans frontière d’exécution auditée ;
6. stockage JSON convenable pour l’alpha mais non validé pour de gros volumes concurrents.

## Règle de publication

Publier uniquement si les checks GitHub de la branche de release réussissent encore après ce rapport. Créer ensuite le tag signé ou annoté `v0.2.0-alpha.3` sur le commit de fusion dans `main`. Ne jamais publier automatiquement un port réseau ni télécharger un modèle pendant la mise à jour.
