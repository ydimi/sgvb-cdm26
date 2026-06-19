#!/usr/bin/env bash
# Commande dediee : publie le site (menu + page Aymeric chiffree) puis deploie.
# Le mot de passe est lu depuis .aym-password (pas besoin de le taper).
#
# Prerequis : avoir regenere les sources avant
#   - dans ~/work/custom/wc26 : /maj      (classement, histoires, journees, super-vainqueur)
#   - dans ~/work/custom/aym  : /maj-aym  (dashboard.html)
#
# Usage : ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

node publish.mjs

if git diff --quiet && git diff --cached --quiet; then
  echo "Rien de nouveau a deployer."
  exit 0
fi

git add -A
git commit -m "chore: maj du $(date +'%d/%m/%Y %H:%M')"
git push
echo ""
echo "Deploye -> https://ydimi.github.io/sgvb-cdm26/ (en ligne dans ~30 s)"
