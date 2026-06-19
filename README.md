# mondial-site

Petit site statique pour partager les dashboards du Mondial 2026 avec le groupe, et donner à
Aymeric une page dédiée protégée par mot de passe. Hébergé sur **GitHub Pages** (déploiement
automatique à chaque `git push` sur `main`).

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
#    - dans ~/work/custom/wc26 : /maj  (classement, journées, super-vainqueur)
#    - dans ~/work/custom/aym  : /maj-aym  (dashboard.html)

# 2. Publier
cd ~/work/custom/mondial-site
AYM_PASSWORD='le-mot-de-passe' node publish.mjs

# 3. Déployer
git add -A && git commit -m "chore: maj du jour" && git push
```

Le mot de passe d'Aymeric n'est **jamais** stocké dans le repo : il sert uniquement à chiffrer
`aym.html` au moment du `publish`. Pour le changer, relancer `publish.mjs` avec une autre valeur.

## Test local

```bash
cd ~/work/custom/mondial-site
python3 -m http.server 8080   # crypto.subtle exige un contexte sûr (localhost l'est)
# ouvrir http://localhost:8080
```
