// Publie le site : copie les fichiers PUBLICS (liste blanche stricte) et genere la page
// chiffree d'Aymeric. N'effectue AUCUNE action git (le commit/push reste manuel).
//
// Etancheite wc26 (NON negociable) : on ne copie JAMAIS un dossier, uniquement les fichiers
// nommes ci-dessous. Aucun .md d'analyse, aucun snapshot, aucune cote personnelle ne transite.
//
// Usage : AYM_PASSWORD='...' node publish.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encryptHtml } from "./encrypt.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CUSTOM = path.resolve(HERE, "..");

// --- Liste blanche : fichiers PUBLICS copies tels quels --------------------
const PUBLIC_FILES = [
  { from: path.join(CUSTOM, "wc26", "classement.html"), to: "classement.html" },
  { from: path.join(CUSTOM, "wc26", "histoire-du-jour.html"), to: "histoire-du-jour.html" },
  { from: path.join(CUSTOM, "wc26", "journees-sgvb.html"), to: "journees-sgvb.html" },
  { from: path.join(CUSTOM, "wc26", "super-vainqueur-sgvb.html"), to: "super-vainqueur-sgvb.html" },
];

// --- Page chiffree d'Aymeric ----------------------------------------------
const AYM_SRC = path.join(CUSTOM, "aym", "dashboard.html");
const AYM_OUT = "aym.html";

// Noms reputes PRIVES : garde-fou, on refuse de publier quoi que ce soit qui matche.
const FORBIDDEN = /(methode|strategie|pronos|tableau-final|analyses|classements|suivi|snapshot|\.profile|recherche)/i;

function assertPublic(name) {
  if (FORBIDDEN.test(name)) {
    console.error(`ABANDON : nom de fichier suspect (prive) refuse a la publication : ${name}`);
    process.exit(1);
  }
}

// --- Barre de navigation persistante injectee en haut de chaque page ------
// (wc26 n'est jamais modifie : on injecte uniquement dans les copies publiees.)
const NAV_ITEMS = [
  ["index.html", "🏠 Accueil"],
  ["classement.html", "📈 Classement"],
  ["histoire-du-jour.html", "📖 Histoires"],
  ["journees-sgvb.html", "🗓️ Journées"],
  ["super-vainqueur-sgvb.html", "🌌 Super vainqueur"],
  ["aym.html", "🔒 Aymeric"],
];
// Barre PLEINE LARGEUR fixee tout en haut (meme fond bord a bord sur toutes les
// pages), boutons centres dans une colonne de 1000px. On neutralise le padding-top
// du body de la page hote + un espaceur, pour un rendu STRICTEMENT identique partout.
// Pas de surlignage "page active" : la barre est la meme sur chaque page.
const NAV_BAR = `<style>
  body { margin-top:0 !important; padding-top:0 !important; }
  .sgvb-nav { position:fixed; top:0; left:0; right:0; z-index:99999; background:#0b0e18; border-bottom:1px solid #2a3142; }
  .sgvb-nav .in { display:flex; gap:6px; justify-content:center; align-items:center; max-width:1000px; margin:0 auto; padding:10px 12px; overflow-x:auto; -webkit-overflow-scrolling:touch; white-space:nowrap; }
  .sgvb-nav a { flex:0 0 auto; color:#e6e9f0; text-decoration:none; padding:7px 11px; border-radius:8px; background:#171c2c; border:1px solid #2a3142; font:600 13px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
  .sgvb-spacer { height:58px; }
</style>
<nav class="sgvb-nav"><div class="in">${NAV_ITEMS.map(([href, label]) => `<a href="${href}">${label}</a>`).join("")}</div></nav>
<div class="sgvb-spacer"></div>`;
function injectNav(html) {
  return /<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, (m) => m + NAV_BAR) : NAV_BAR + html;
}

let copied = 0;
for (const f of PUBLIC_FILES) {
  assertPublic(path.basename(f.from));
  if (!fs.existsSync(f.from)) {
    console.error(`ABANDON : fichier source attendu introuvable : ${f.from}`);
    console.error(`  -> lance d'abord la generation wc26 (/maj) avant de publier.`);
    process.exit(1);
  }
  const raw = fs.readFileSync(f.from, "utf8");
  fs.writeFileSync(path.join(HERE, f.to), injectNav(raw));
  console.log(`copie   : ${f.to} (+ menu)`);
  copied++;
}

// Page d'accueil : generee depuis le template, avec le MEME menu injecte.
const INDEX_TPL = path.join(HERE, "index.template.html");
if (fs.existsSync(INDEX_TPL)) {
  fs.writeFileSync(path.join(HERE, "index.html"), injectNav(fs.readFileSync(INDEX_TPL, "utf8")));
  console.log(`genere  : index.html (+ menu)`);
}

const password = process.env.AYM_PASSWORD;
if (!password) {
  console.error("ABANDON : variable d'environnement AYM_PASSWORD manquante (mot de passe page Aymeric).");
  process.exit(1);
}
if (!fs.existsSync(AYM_SRC)) {
  console.error(`ABANDON : ${AYM_SRC} introuvable -> lance d'abord /maj-aym.`);
  process.exit(1);
}
const dashboard = injectNav(fs.readFileSync(AYM_SRC, "utf8"));
const page = await encryptHtml(dashboard, password);
fs.writeFileSync(path.join(HERE, AYM_OUT), page);
console.log(`chiffre : ${AYM_OUT} (${(page.length / 1024).toFixed(1)} Ko)`);

console.log(`\nOK -> ${copied} page(s) publique(s) + 1 page chiffree.`);
console.log(`Prochaine etape : git add -A && git commit -m "chore: maj du jour" && git push`);
