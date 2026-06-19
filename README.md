# sgvb-cdm26

Petit site statique pour partager les dashboards du Mondial 2026 avec le groupe, et donner à
Aymeric une page dédiée protégée par mot de passe. Hébergé sur **GitHub Pages** (déploiement
automatique à chaque `git push` sur `main`). En ligne : https://ydimi.github.io/sgvb-cdm26/

## Contenu

- `index.html` — menu général (public).
- `classement.html`, `journees-sgvb.html`, `super-vainqueur-sgvb.html` — copiés depuis `../wc26/` (publics).
- `aym.html` — comparateur d'Aymeric, **chiffré AES** (mot de passe demandé à l'ouverture).
- `publish.mjs` — copie la liste blanche + génère `aym.html`. `encrypt.mjs` — chiffrement (sans dépendance).

## Étanchéité (non négociable)

`publish.mjs` n'importe **que** 4 fichiers nommés explicitement. Aucune analyse de cotes, stratégie,
prono ou snapshot personnel n'est jamais copié. Le `.gitignore` bloque en plus tout `*.md`/`*.json`/snapshot.

## Mise à jour quotidienne

```bash
# 1. Régénérer les sources (comme d'habitude)
#    - dans ~/work/custom/wc26 : /maj      (classement, histoires, journées, super-vainqueur)
#    - dans ~/work/custom/aym  : /maj-aym  (dashboard.html)

# 2. Publier + déployer en une commande
cd ~/work/custom/sgvb-cdm26
./deploy.sh
```

`deploy.sh` lance `publish.mjs` (copie liste blanche + chiffre la page Aymeric), puis commit + push.

## Mot de passe de la page Aymeric

Stocké en local dans `.aym-password` (jamais committé, cf `.gitignore`). `publish.mjs` le lit
automatiquement — rien à taper. Pour le changer : éditer `.aym-password` puis relancer `./deploy.sh`.
On peut aussi le passer ponctuellement via `AYM_PASSWORD='...' node publish.mjs` (prioritaire sur le fichier).

## Test local

```bash
cd ~/work/custom/sgvb-cdm26
python3 -m http.server 8080   # crypto.subtle exige un contexte sûr (localhost l'est)
# ouvrir http://localhost:8080
```
