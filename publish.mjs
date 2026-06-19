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
    console.error(`ABANDON : nom de fichier suspect (privé) refusé à la publication : ${name}`);
    process.exit(1);
  }
}

// --- Barre de navigation persistante injectee en haut de chaque page ------
// (wc26 n'est jamais modifie : on injecte uniquement dans les copies publiees.)
const NAV_ITEMS = [
  ["index.html", "🏠 Accueil"],
  ["classement.html", "📈 Classement"],
  ["histoire-du-jour.html", "📖 Histoires du jour"],
  ["journees-sgvb.html", "🗓️ Journées"],
  ["super-vainqueur-sgvb.html", "🌌 Super vainqueur"],
  ["aym.html", "🔒 Aymeric"],
];
// Barre PLEINE LARGEUR fixee tout en haut (meme fond bord a bord sur toutes les
// pages), boutons centres dans une colonne de 1000px. On neutralise le padding-top
// du body de la page hote + un espaceur, pour un rendu STRICTEMENT identique partout.
// Pas de surlignage "page active" : la barre est la meme sur chaque page.
// Bouton hamburger FLOTTANT (haut-droite), sans barre de titre permanente : il ne prend
// quasiment pas de place et laisse tout l'ecran au contenu (utile en paysage pour les graphes).
// Le menu s'ouvre en petit panneau au tap ; clic a cote (backdrop) pour fermer. Aucun decalage
// du contenu (le bouton flotte par-dessus).
const NAV_BAR = `<style>
  .sgvb-burger { position:fixed; top:10px; right:10px; z-index:100000; background:#161b22; color:#e6edf3; border:1px solid #2a313c; border-radius:8px; padding:8px 12px; font-size:16px; line-height:1; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.45); }
  .sgvb-backdrop { display:none; position:fixed; inset:0; z-index:99999; }
  .sgvb-backdrop.open { display:block; }
  .sgvb-menu { display:none; position:fixed; top:52px; right:10px; z-index:100000; flex-direction:column; gap:6px; min-width:210px; background:#0b0e13; border:1px solid #2a313c; border-radius:10px; padding:8px; box-shadow:0 10px 26px rgba(0,0,0,.5); }
  .sgvb-menu.open { display:flex; }
  .sgvb-menu a { color:#e6edf3; text-decoration:none; padding:10px 12px; border-radius:8px; background:#161b22; border:1px solid #2a313c; white-space:nowrap; font:600 14px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
</style>
<button class="sgvb-burger" type="button" aria-label="Menu" onclick="var m=document.querySelector('.sgvb-menu'),b=document.querySelector('.sgvb-backdrop');m.classList.toggle('open');b.classList.toggle('open')">☰</button>
<div class="sgvb-backdrop" onclick="document.querySelector('.sgvb-menu').classList.remove('open');this.classList.remove('open')"></div>
<div class="sgvb-menu">${NAV_ITEMS.map(([href, label]) => `<a href="${href}">${label}</a>`).join("")}</div>`;
function injectNav(html) {
  return /<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, (m) => m + NAV_BAR) : NAV_BAR + html;
}

let copied = 0;
for (const f of PUBLIC_FILES) {
  assertPublic(path.basename(f.from));
  if (!fs.existsSync(f.from)) {
    console.error(`ABANDON : fichier source attendu introuvable : ${f.from}`);
    console.error(`  -> lance d'abord la génération wc26 (/maj) avant de publier.`);
    process.exit(1);
  }
  const raw = fs.readFileSync(f.from, "utf8");
  fs.writeFileSync(path.join(HERE, f.to), injectNav(raw));
  console.log(`copié   : ${f.to} (+ menu)`);
  copied++;
}

// Page d'accueil : generee depuis le template, avec le MEME menu injecte.
const INDEX_TPL = path.join(HERE, "index.template.html");
if (fs.existsSync(INDEX_TPL)) {
  fs.writeFileSync(path.join(HERE, "index.html"), injectNav(fs.readFileSync(INDEX_TPL, "utf8")));
  console.log(`généré  : index.html (+ menu)`);
}

// Mot de passe Aymeric : variable d'env AYM_PASSWORD, sinon fichier local .aym-password
// (jamais committe, cf .gitignore) pour ne pas avoir a le taper dans la commande.
const PW_FILE = path.join(HERE, ".aym-password");
let password = process.env.AYM_PASSWORD;
if (!password && fs.existsSync(PW_FILE)) password = fs.readFileSync(PW_FILE, "utf8").trim();
if (!password) {
  console.error("ABANDON : mot de passe Aymeric introuvable.");
  console.error(`  -> cree le fichier ${PW_FILE} contenant le mot de passe, ou exporte AYM_PASSWORD.`);
  process.exit(1);
}
if (!fs.existsSync(AYM_SRC)) {
  console.error(`ABANDON : ${AYM_SRC} introuvable -> lance d'abord /maj-aym.`);
  process.exit(1);
}
const dashboard = injectNav(fs.readFileSync(AYM_SRC, "utf8"));
const page = await encryptHtml(dashboard, password);
fs.writeFileSync(path.join(HERE, AYM_OUT), page);
console.log(`chiffré : ${AYM_OUT} (${(page.length / 1024).toFixed(1)} Ko)`);

console.log(`\nOK -> ${copied} page(s) publique(s) + 1 page chiffrée.`);
console.log(`Prochaine étape : git add -A && git commit && git push  (ou la commande Claude /publie-site)`);
