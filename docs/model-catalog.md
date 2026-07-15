# Catalogue de modèles local

Aster ne télécharge jamais de modèle automatiquement. L’administrateur local choisit une variante, voit sa taille approximative, confirme l’installation, puis Aster relaie la progression fournie par Ollama.

## Catalogue Gemma 4

Valeurs vérifiées le 15 juillet 2026 :

| Modèle Ollama | Taille affichée | Contexte | Usage indicatif |
| --- | ---: | ---: | --- |
| `gemma4:e2b` | 7,2 Go | 128K | option légère |
| `gemma4:e4b` | 9,6 Go | 128K | option équilibrée |
| `gemma4:12b` | 7,6 Go | 256K | choix Aster recommandé |
| `gemma4:26b` | 18 Go | 256K | machines plus puissantes |

Sources primaires : [carte officielle Gemma 4](https://ai.google.dev/gemma/docs/core/model_card_4), [registre Ollama Gemma 4](https://registry.ollama.com/library/gemma4) et [tags Ollama](https://registry.ollama.com/library/gemma4/tags).

Les tailles dépendent du tag et de la quantification. Elles indiquent surtout l’espace de téléchargement ; elles ne garantissent ni la mémoire requise, ni la vitesse, ni la compatibilité GPU. Aster ne déduit donc pas automatiquement un modèle à partir de la RAM seule.

## Garde-fous

- Route d’installation réservée au compte administrateur et aux connexions loopback.
- Noms limités au catalogue maintenu dans le serveur ; aucune référence arbitraire n’est transmise à Ollama.
- Confirmation explicite dans l’interface avec taille annoncée.
- Un seul téléchargement simultané par modèle.
- Annulation de la requête Ollama si le client abandonne la connexion.
- Aucun modèle, cache Ollama ou poids n’entre dans le dépôt Git ou les sauvegardes Aster.

L’ajout d’une variante exige une vérification de sa source, de son tag, de sa taille et de sa licence avant publication.
