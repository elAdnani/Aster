# Pièces jointes texte

Aster accepte uniquement les fichiers `.txt`, `.md`, `.json` et `.csv`. Ils sont stockés dans la charge utile chiffrée de la conversation, jamais exécutés et jamais rendus comme HTML.

Limites actuelles :

- 256 Kio par fichier ;
- 5 fichiers par message ;
- 10 fichiers et 1 Mio au total par conversation.

Le navigateur envoie seulement les identifiants rattachés au message. Le serveur recharge leur contenu depuis la conversation du profil actif, vérifie leur appartenance, puis les ajoute à la requête Ollama dans une zone JSON explicitement marquée comme non fiable. Un autre profil ne peut ni récupérer ni transmettre ces fichiers au modèle.

Cette séparation réduit les contournements par client modifié. Elle ne supprime pas entièrement le risque d’injection de prompt contenu dans un document : l’utilisateur doit contrôler la provenance des fichiers et vérifier les réponses importantes.

Les formats binaires, images, PDF, archives, HTML et code exécutable sont refusés. Leur prise en charge future nécessitera une extraction isolée, des quotas distincts et une analyse de sécurité dédiée.
