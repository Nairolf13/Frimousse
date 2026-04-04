#!/usr/bin/env node
/**
 * check-i18n.js
 * Détecte les clés manquantes dans en/es/ar par rapport à fr (référence).
 * Usage : node scripts/check-i18n.js
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = resolve(__dirname, '../src/lib/locales');

const LANGS = ['en', 'es', 'ar'];
const REF_LANG = 'fr';

function loadJson(lang) {
  try {
    return JSON.parse(readFileSync(resolve(LOCALES_DIR, `${lang}.json`), 'utf-8'));
  } catch (e) {
    console.error(`Impossible de lire ${lang}.json :`, e.message);
    process.exit(1);
  }
}

const ref = loadJson(REF_LANG);
const refKeys = Object.keys(ref);

let totalMissing = 0;
let totalExtra = 0;

for (const lang of LANGS) {
  const locale = loadJson(lang);
  const localeKeys = new Set(Object.keys(locale));

  const missing = refKeys.filter(k => !localeKeys.has(k));
  const extra = Object.keys(locale).filter(k => !ref[k]);

  if (missing.length === 0 && extra.length === 0) {
    console.log(`✅  ${lang}.json — complet (${refKeys.length} clés)`);
    continue;
  }

  console.log(`\n⚠️   ${lang}.json`);

  if (missing.length > 0) {
    totalMissing += missing.length;
    console.log(`  ${missing.length} clé(s) MANQUANTE(S) :`);
    for (const key of missing) {
      console.log(`    ✗  "${key}"  →  valeur fr : "${ref[key]}"`);
    }
  }

  if (extra.length > 0) {
    totalExtra += extra.length;
    console.log(`  ${extra.length} clé(s) EN TROP (absentes de fr.json) :`);
    for (const key of extra) {
      console.log(`    +  "${key}"`);
    }
  }
}

console.log('\n─────────────────────────────────────────');
if (totalMissing === 0 && totalExtra === 0) {
  console.log('Toutes les traductions sont synchronisées.');
} else {
  if (totalMissing > 0) console.log(`Total manquant : ${totalMissing} clé(s)`);
  if (totalExtra > 0)   console.log(`Total en trop  : ${totalExtra} clé(s)`);
  process.exit(1);
}
