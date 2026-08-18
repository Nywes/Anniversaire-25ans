/**
 * Toutes les infos de la soirée. C'est le SEUL fichier à remplir pour que le
 * site soit à jour : titre, dates, lieu, cagnotte, liens.
 */

export const EVENT = {
  hostName: 'Eliott',

  /** Formule affichée en gros sur le plateau. */
  when: 'Week-end du 14—15 Novembre',

  /** Bornes réelles, au format ISO local. Sert uniquement au fichier .ics. */
  start: '2026-11-14T18:00:00',
  end: '2026-11-15T14:00:00',

  place: {
    name: 'La Boutecaillère',
    address: 'Chiché',
    /** Relevé sur OpenStreetMap (La Boutecaillère, Le Deffend, Chiché). */
    lat: 46.7716114,
    lng: -0.3717714,
    /** Note libre : code d'entrée, parking, comment arriver… Laisser '' pour masquer. */
    directions: '',
  },

  dressCode: '',

  /** Lien de cagnotte (Lydia, Leetchi…). Laisser '' pour afficher « surtout rien ». */
  giftUrl: '',

  /** Groupe WhatsApp, affiché une fois la réponse envoyée. Laisser '' pour masquer. */
  whatsappUrl: '',

  /** Mot de passe de la page /admin. */
  adminCode: 'indomie',
} as const

export const startDate = () => new Date(EVENT.start)
export const endDate = () => new Date(EVENT.end)

export const mapsUrl = () => {
  const q = encodeURIComponent(`${EVENT.place.name}, ${EVENT.place.address}`)
  // maps.apple.com bascule tout seul vers Google Maps sur Android.
  return `https://maps.apple.com/?q=${q}&ll=${EVENT.place.lat},${EVENT.place.lng}`
}
