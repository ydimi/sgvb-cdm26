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
  ["journees-sgvb.html", "🗓️ Journées"],
  ["super-vainqueur-sgvb.html", "🌌 Super vainqueur"],
  ["aym.html", "🔒 Aymeric"],
];
function navHtml(active) {
  const link = ([href, label]) => {
    const on = href === active;
    const bg = on ? "#f59e0b" : "#171c2c";
    const col = on ? "#1a1205" : "#e6e9f0";
    return `<a href="${href}" style="color:${col};text-decoration:none;white-space:nowrap;padding:7px 11px;border-radius:8px;background:${bg};border:1px solid #2a3142;font-weight:600;">${label}</a>`;
  };
  // max-width + margin auto : menu centre et identique sur TOUTES les pages
  // (independant du fait que le <body> de la page soit centre ou pleine largeur).
  return `<nav style="position:sticky;top:0;z-index:99999;display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap;max-width:1000px;margin:0 auto;background:#0b0e18;border-bottom:1px solid #2a3142;padding:10px 12px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:13px;">${NAV_ITEMS.map(link).join("")}</nav>`;
}
function injectNav(html, active) {
  const nav = navHtml(active);
  return /<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, (m) => m + nav) : nav + html;
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
  fs.writeFileSync(path.join(HERE, f.to), injectNav(raw, f.to));
  console.log(`copie   : ${f.to} (+ menu)`);
  copied++;
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
const dashboard = injectNav(fs.readFileSync(AYM_SRC, "utf8"), "aym.html");
const page = await encryptHtml(dashboard, password);
fs.writeFileSync(path.join(HERE, AYM_OUT), page);
console.log(`chiffre : ${AYM_OUT} (${(page.length / 1024).toFixed(1)} Ko)`);

console.log(`\nOK -> ${copied} page(s) publique(s) + 1 page chiffree.`);
console.log(`Prochaine etape : git add -A && git commit -m "chore: maj du jour" && git push`);
