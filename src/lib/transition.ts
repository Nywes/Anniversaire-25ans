/**
 * Passage de main entre le plateau et la page perso.
 *
 * Le plateau relève la position exacte de la case choisie juste avant de
 * naviguer ; la page perso s'en sert pour faire voyager l'avatar de cette
 * position jusqu'à sa place définitive, en haut à gauche. C'est la technique
 * FLIP : on part de la position finale, on applique la transformation inverse
 * qui remet l'élément à son point de départ, puis on la relâche.
 *
 * Volontairement un module simple et non un contexte React : la donnée ne vit
 * qu'entre deux rendus et n'a rien à déclencher.
 */

type Handoff = { slug: string; rect: DOMRect; at: number }

let pending: Handoff | null = null
let clearTimer: number | undefined

/** Durée au-delà de laquelle la position est périmée (retour arrière, lien direct…). */
const STALE_MS = 2500

/** Fenêtre de grâce, voir le commentaire de takeHandoff. */
const GRACE_MS = 150

export const setHandoff = (slug: string, rect: DOMRect) => {
  clearTimeout(clearTimer)
  pending = { slug, rect, at: Date.now() }
}

export const takeHandoff = (slug: string): DOMRect | null => {
  if (!pending || pending.slug !== slug || Date.now() - pending.at > STALE_MS) {
    return null
  }

  /*
   * On n'efface pas immédiatement. En développement, StrictMode monte le
   * composant deux fois : le premier montage consommerait la position et le
   * second — celui qui reste réellement à l'écran, avec un nouveau nœud DOM —
   * ne trouverait plus rien, donc aucune animation. Une courte fenêtre laisse
   * les deux montages lire la même valeur, puis elle s'efface pour qu'un
   * rechargement ne rejoue pas le vol.
   */
  clearTimeout(clearTimer)
  clearTimer = window.setTimeout(() => {
    pending = null
  }, GRACE_MS)

  return pending.rect
}
