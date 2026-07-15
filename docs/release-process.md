# Processus de développement et publication

- `main` contient uniquement les versions vérifiées et publiables.
- `develop` reçoit les lots intégrés avant stabilisation.
- Une fonctionnalité importante utilise `feature/<nom-court>` depuis `develop`.
- Une correction urgente utilise `fix/<nom-court>`.
- Les changements rejoignent `main` par pull request après tests et revue sécurité.
- Les tags suivent SemVer. Avant la bêta : `v0.x.y-alpha.n`.

Avant chaque tag :

1. exécuter `npm test` et les contrôles de syntaxe ;
2. relire `docs/AUDIT-REPORT.md` ;
3. vérifier que `data/`, `.env`, modèles, exports et secrets sont ignorés ;
4. tester installation, connexion, profils, isolation et déconnexion ;
5. mettre à jour la version et les notes de publication.
6. produire et tester une archive `git archive` sans données ignorées ;
7. vérifier les checks CI et CodeQL du commit exact de la branche de release ;
8. confirmer que `main` local et distant n’ont pas divergé avant la fusion.

