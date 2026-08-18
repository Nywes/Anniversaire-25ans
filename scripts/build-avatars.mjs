/**
 * Prend les SVG bruts de assets/Avatars/, enlève leur fond gris, les optimise,
 * et les recopie dans public/avatars/ avec un nom de fichier utilisable en URL.
 *
 * Génère aussi src/data/avatars.generated.ts (ne pas éditer à la main : les
 * prénoms d'affichage se personnalisent dans src/data/guests.ts).
 *
 *   npm run avatars
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, basename, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { optimize } from 'svgo'

const root = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(root, 'assets/Avatars')
const OUT = join(root, 'public/avatars')
const DATA = join(root, 'src/data/avatars.generated.ts')

/** "Eugénie" -> "eugenie", "Antonin2" -> "antonin2" */
const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Prénom d'affichage par défaut : on retire un éventuel suffixe numérique. */
const prettify = (s) => s.replace(/\d+$/, '').trim()

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
mkdirSync(dirname(DATA), { recursive: true })

const files = readdirSync(SRC)
  .filter((f) => extname(f).toLowerCase() === '.svg')
  .sort((a, b) => a.localeCompare(b, 'fr'))

let before = 0
let after = 0
const entries = []

for (const file of files) {
  const raw = readFileSync(join(SRC, file), 'utf8')
  before += Buffer.byteLength(raw)

  // Le générateur d'avatars pose un aplat gris en fond. On le retire pour que
  // la couleur de la case transparaisse derrière le personnage.
  const unbacked = raw.replace(/<g id="svga-group-backs[^"]*">[\s\S]*?<\/g>/g, '')

  const { data } = optimize(unbacked, {
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: { overrides: { removeViewBox: false, cleanupIds: false } },
      },
      { name: 'removeDimensions' },
    ],
  })
  after += Buffer.byteLength(data)

  const name = basename(file, extname(file))
  const slug = slugify(name)
  writeFileSync(join(OUT, `${slug}.svg`), data)
  entries.push({ slug, name: prettify(name) })
}

const ts = `// Généré par \`npm run avatars\` — ne pas éditer à la main.
// Pour changer un prénom affiché, utilise NAME_OVERRIDES dans src/data/guests.ts.

export type Avatar = { slug: string; name: string }

export const AVATARS: Avatar[] = ${JSON.stringify(entries, null, 2)}
`
writeFileSync(DATA, ts)

const kb = (n) => `${Math.round(n / 1024)} ko`
console.log(`${entries.length} avatars → public/avatars/`)
console.log(`${kb(before)} → ${kb(after)} (-${Math.round((1 - after / before) * 100)}%)`)
