import { AVATARS } from './avatars.generated'

/**
 * Le prénom affiché sous chaque avatar vient du nom du fichier SVG.
 * Si un fichier est mal nommé (surnom, homonyme, faute), corrige-le ici plutôt
 * que dans avatars.generated.ts qui est réécrit à chaque `npm run avatars`.
 *
 *   'antonin2': 'Antonin B.',
 */
const NAME_OVERRIDES: Record<string, string> = {}

/**
 * Invités masqués du plateau sans supprimer leur fichier (brouille, désistement…).
 */
const HIDDEN: string[] = []

export type Guest = {
  slug: string
  name: string
  /** Chemin de l'avatar servi depuis public/. */
  avatar: string
  /** Couleur du fond derrière le visage. */
  tint: string
}

/** Doit rester synchronisé avec les --c1…--cN de index.css. */
const PALETTE = 20

/**
 * La palette est battue une fois pour toutes, puis distribuée dans l'ordre.
 *
 * Le mélange est *seedé* : il produit un ordre d'apparence aléatoire mais
 * rigoureusement identique à chaque chargement et pour tout le monde — deux
 * invités qui comparent leurs écrans voient les mêmes couleurs. Un vrai
 * Math.random() donnerait des couleurs différentes à chaque visite, et tirer
 * la teinte d'un hachage du prénom, comme on l'a essayé, forme des paquets :
 * la moitié de la palette ne sort jamais.
 */
const shuffledPalette = (() => {
  const a = Array.from({ length: PALETTE }, (_, i) => i + 1)
  let seed = 0x9e3779b1
  const rand = () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return (seed >>> 0) / 4294967296
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
})()

const tintAt = (i: number) => `var(--c${shuffledPalette[i % PALETTE]})`

export const GUESTS: Guest[] = AVATARS.filter((a) => !HIDDEN.includes(a.slug))
  .map((a) => ({
    slug: a.slug,
    name: NAME_OVERRIDES[a.slug] ?? a.name,
    avatar: `/avatars/${a.slug}.svg`,
    tint: '',
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  .map((g, i) => ({ ...g, tint: tintAt(i) }))

export const guestBySlug = (slug: string | undefined) =>
  GUESTS.find((g) => g.slug === slug)

export const tintFor = (slug: string) =>
  guestBySlug(slug)?.tint ?? `var(--c${(slug.length % PALETTE) + 1})`

/** Case « je ne suis pas sur le plateau » : +1, oubliés, pièces rapportées. */
export const GHOST_SLUG = '__inconnu__'
