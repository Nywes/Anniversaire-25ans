/**
 * La forme de chaque invité est tirée de son slug : aléatoire à l'œil, stable
 * d'un chargement à l'autre, et identique sur le plateau et sur sa page perso.
 */
import type { CSSProperties } from 'react'
// La couleur, elle, est attribuée dans src/data/guests.ts, où l'on connaît la
// liste complète : c'est la seule façon de garantir que les douze teintes
// sortent toutes au lieu de se répéter par paquets.
import { tintFor } from '../data/guests'

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Générateur pseudo-aléatoire déterministe (xorshift32). */
const rng = (seed: number) => () => {
  seed ^= seed << 13
  seed ^= seed >>> 17
  seed ^= seed << 5
  return ((seed >>> 0) % 1000) / 1000
}

/**
 * Un `border-radius` à 8 valeurs donne une tache organique. La plage 30–70 %
 * est le bon compromis : en dessous de 30 % on retombe sur un carré arrondi,
 * au-dessus de 70 % sur un cercle. Les rayons horizontaux et verticaux sont
 * tirés séparément, c'est leur écart qui fait la déformation.
 */
export const blobFor = (slug: string) => {
  const next = rng(hash(slug) || 1)
  const v = () => Math.round(30 + next() * 40)
  return `${v()}% ${v()}% ${v()}% ${v()}% / ` + `${v()}% ${v()}% ${v()}% ${v()}%`
}

/**
 * Variante plus sage, pour les pochettes d'album : reconnaissable comme
 * « pas un cercle », mais sans l'exubérance des avatars du plateau. Plage
 * resserrée autour de 50 % (38–62 plutôt que 30–70) — huit valeurs tirées
 * indépendamment tombent presque toujours assez loin les unes des autres
 * pour ne jamais se lire comme une forme symétrique.
 */
export const subtleBlobFor = (seed: string) => {
  const next = rng(hash(seed) || 1)
  const v = () => Math.round(38 + next() * 24)
  return `${v()}% ${v()}% ${v()}% ${v()}% / ` + `${v()}% ${v()}% ${v()}% ${v()}%`
}

/** Style prêt à poser sur un élément qui utilise --blob / --tint. */
export const blobStyle = (slug: string) =>
  ({ '--blob': blobFor(slug), '--tint': tintFor(slug) }) as CSSProperties
