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
const PALETTE = 12

/**
 * Un pas de 5 sur une palette de 12 : 5 et 12 étant premiers entre eux, on
 * parcourt les douze couleurs avant d'en réutiliser une seule. Tirer la couleur
 * d'un hachage du prénom, comme on le faisait, donnait des paquets — la moitié
 * de la palette ne sortait jamais et le vert citron revenait cinq fois.
 * Le pas fait aussi sauter d'un bout à l'autre de la palette entre deux voisins.
 */
const tintAt = (i: number) => `var(--c${((i * 5) % PALETTE) + 1})`

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
