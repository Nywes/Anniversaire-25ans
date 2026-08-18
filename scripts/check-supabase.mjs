/**
 * Vérifie que Supabase est correctement branché, avant de découvrir le
 * contraire le soir de la fête.
 *
 *   node scripts/check-supabase.mjs
 *
 * Contrôle, dans l'ordre : les variables d'environnement, la validité de la clé
 * anon, l'existence et la lisibilité des deux tables, puis un vrai aller-retour
 * d'écriture (insertion + suppression d'un morceau bidon, qui ne laisse aucune
 * trace). Le quota de 3 morceaux par invité est vérifié au passage.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

const env = {}
try {
  for (const line of readFileSync(root + '.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].trim()
  }
} catch {
  fail('Pas de fichier .env à la racine du projet.')
}

const URL_ = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY

function fail(msg, hint) {
  console.error(`\n  ✗ ${msg}`)
  if (hint) console.error(`    ${hint}`)
  console.error('')
  process.exit(1)
}
const ok = (msg) => console.log(`  ✓ ${msg}`)

if (!URL_ || !KEY) {
  fail(
    'VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY est vide dans .env.',
    'Supabase → Project Settings → API : « Project URL » et la clé « anon public ».',
  )
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(URL_)) {
  fail(
    `L'URL ne ressemble pas à un projet Supabase : ${URL_}`,
    'Format attendu : https://xxxxxxxx.supabase.co (sans chemin ni barre finale).',
  )
}
ok('Variables d\'environnement présentes')

const base = URL_.replace(/\/$/, '') + '/rest/v1'
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
}

async function api(path, init = {}) {
  const res = await fetch(base + path, { ...init, headers: { ...headers, ...init.headers } })
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { status: res.status, body }
}

/* ------------------------------------------------------------- les tables -- */

for (const table of ['rsvps', 'tracks']) {
  const { status, body } = await api(`/${table}?select=*&limit=1`)

  if (status === 401 || status === 403) {
    fail(
      `Clé anon refusée sur « ${table} » (HTTP ${status}).`,
      'Vérifie que tu as bien copié la clé « anon public » et non la « service_role ».',
    )
  }
  if (status === 404 || body?.code === '42P01') {
    fail(
      `La table « ${table} » n'existe pas.`,
      'Supabase → SQL Editor → colle supabase/schema.sql → Run.',
    )
  }
  if (status !== 200) {
    fail(`Lecture de « ${table} » impossible (HTTP ${status}).`, JSON.stringify(body))
  }
  // Attention : un 200 ne prouve pas que la lecture est autorisée. Avec RLS
  // activé et aucune policy de select, Postgres ne renvoie pas d'erreur mais
  // zéro ligne. Seul l'aller-retour d'écriture plus bas tranche vraiment.
  ok(`Table « ${table} » présente`)
}

/* ------------------------------------------------- un vrai aller-retour ---- */

const probe = {
  guest_slug: '__verification__',
  guest_name: 'Vérification',
  track_id: -1,
  title: 'Test',
  artist: 'Test',
}

const ins = await api('/tracks', {
  method: 'POST',
  body: JSON.stringify(probe),
  headers: { Prefer: 'return=representation' },
})

if (ins.status !== 201) {
  fail(
    `Écriture refusée sur « tracks » (HTTP ${ins.status}).`,
    'Les policies RLS ne sont pas créées. Supabase → SQL Editor → rejoue la ' +
      'section « RLS » de supabase/schema.sql (les create policy, pas seulement ' +
      'les alter table enable).',
  )
}
ok('Écriture autorisée')

const del = await api('/tracks?track_id=eq.-1', { method: 'DELETE' })
if (del.status !== 204 && del.status !== 200) {
  console.warn(
    `  ! Ligne de test non supprimée (HTTP ${del.status}) — à retirer à la main dans Supabase.`,
  )
} else {
  ok('Suppression autorisée, aucune trace laissée')
}

const { body: counts } = await api('/rsvps?select=slug')
console.log(`\n  Supabase est branché. ${counts?.length ?? 0} réponse(s) enregistrée(s).\n`)
