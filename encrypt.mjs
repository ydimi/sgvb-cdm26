// Chiffrement AES d'une page HTML, sans aucune dependance (Web Crypto natif Node 19+).
//
// La sortie est une page HTML AUTOPORTANTE : elle embarque le contenu chiffre + un petit
// script qui, dans le navigateur, demande le mot de passe, redérive la cle (memes parametres
// PBKDF2) et dechiffre cote client. Le mot de passe n'est jamais ecrit dans le fichier.
//
// Usage CLI :  AYM_PASSWORD='...' node encrypt.mjs <source.html> <sortie.html>
// Ou importe  : import { encryptHtml } from "./encrypt.mjs"

import fs from "node:fs";

const ITERATIONS = 150000;
const subtle = globalThis.crypto.subtle;
const b64 = (buf) => Buffer.from(buf).toString("base64");

async function deriveKey(password, salt, usages) {
  const baseKey = await subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    usages
  );
}

// Chiffre `html` avec `password` et renvoie une page HTML autoportante (string).
export async function encryptHtml(html, password) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ["encrypt"]);
  const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(html));
  const data = { salt: b64(salt), iv: b64(iv), ct: b64(ct), iters: ITERATIONS };
  return unlockPage(data);
}

// Petite verif round-trip (utilisee par le test) : dechiffre cote Node.
export async function decryptData(data, password) {
  const dec = (s) => Uint8Array.from(Buffer.from(s, "base64"));
  const key = await deriveKey(password, dec(data.salt), ["decrypt"]);
  const buf = await subtle.decrypt({ name: "AES-GCM", iv: dec(data.iv) }, key, dec(data.ct));
  return new TextDecoder().decode(buf);
}

function unlockPage(data) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Espace Aymeric — SGVB · CdM 2026</title>
<style>
  :root { --bg:#0f1320; --card:#171c2c; --line:#2a3142; --txt:#e6e9f0; --muted:#8b93a7; --amber:#f59e0b; --red:#f87171; }
  * { box-sizing:border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background:var(--bg); color:var(--txt); padding:24px; }
  .box { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:28px; max-width:360px; width:100%; text-align:center; }
  h1 { font-size:18px; margin:0 0 6px; }
  p { color:var(--muted); font-size:13px; margin:0 0 18px; }
  input { width:100%; padding:11px 12px; border-radius:9px; border:1px solid var(--line); background:#0f1320; color:var(--txt); font-size:15px; }
  button { width:100%; margin-top:12px; padding:11px; border:none; border-radius:9px; background:var(--amber); color:#1a1205; font-weight:700; font-size:15px; cursor:pointer; }
  .err { color:var(--red); font-size:13px; min-height:18px; margin-top:10px; }
  .lock { font-size:34px; margin-bottom:8px; }
</style>
</head>
<body>
  <form class="box" id="f">
    <div class="lock">🔒</div>
    <h1>Espace Aymeric</h1>
    <p>Saisis le mot de passe pour accéder à ton comparateur de pronos.</p>
    <input id="pw" type="password" autocomplete="current-password" placeholder="Mot de passe" autofocus>
    <button type="submit">Entrer</button>
    <div class="err" id="err"></div>
    <a href="index.html" style="display:inline-block;margin-top:14px;color:var(--muted);font-size:13px;text-decoration:none;">← Retour au menu</a>
  </form>
<script>
const DATA = ${JSON.stringify(data)};
const dec = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function unlock(pw) {
  const baseKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name:"PBKDF2", salt:dec(DATA.salt), iterations:DATA.iters, hash:"SHA-256" },
    baseKey, { name:"AES-GCM", length:256 }, false, ["decrypt"]);
  const buf = await crypto.subtle.decrypt({ name:"AES-GCM", iv:dec(DATA.iv) }, key, dec(DATA.ct));
  return new TextDecoder().decode(buf);
}
function render(html) {
  document.open(); document.write(html); document.close();
}
async function attempt(pw, fromStore) {
  try {
    const html = await unlock(pw);
    sessionStorage.setItem("aym_pw", pw);
    render(html);
  } catch (e) {
    if (!fromStore) document.getElementById("err").textContent = "Mot de passe incorrect.";
    sessionStorage.removeItem("aym_pw");
  }
}
document.getElementById("f").addEventListener("submit", e => {
  e.preventDefault();
  attempt(document.getElementById("pw").value, false);
});
// Re-déverrouillage silencieux si déjà saisi dans cette session.
const saved = sessionStorage.getItem("aym_pw");
if (saved) attempt(saved, true);
</script>
</body>
</html>`;
}

// --- CLI -------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const [src, out] = process.argv.slice(2);
  const password = process.env.AYM_PASSWORD;
  if (!src || !out) { console.error("Usage: AYM_PASSWORD='...' node encrypt.mjs <source.html> <sortie.html>"); process.exit(1); }
  if (!password) { console.error("ERREUR : variable d'environnement AYM_PASSWORD manquante."); process.exit(1); }
  const html = fs.readFileSync(src, "utf8");
  const page = await encryptHtml(html, password);
  fs.writeFileSync(out, page);
  console.log(`chiffre : ${out} (${(page.length / 1024).toFixed(1)} Ko)`);
}
