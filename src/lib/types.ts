export const DRINKS = [
  { id: 'biere', label: 'Bière' },
  { id: 'vin', label: 'Vin' },
  { id: 'fort', label: 'Alcool fort' },
] as const

export type DrinkId = (typeof DRINKS)[number]['id']

/**
 * Ce que la personne apporte pour dormir — sert à savoir quoi prévoir.
 * Libellés volontairement courts : au-delà, ils ne tiennent plus à deux par
 * ligne sur un téléphone et chaque réponse prend sa propre ligne.
 */
export const SLEEP_GEAR = [
  { id: 'matelas', label: 'Mon matelas' },
  { id: 'voiture', label: 'Ma voiture' },
  { id: 'rien', label: 'Rien du tout' },
] as const

export type SleepGearId = (typeof SLEEP_GEAR)[number]['id']

/** `null` = la question n'a pas encore été touchée, ce qui n'est pas « non ». */
export type Attending = 'oui' | 'non' | 'peut-etre' | null

export const MAX_TRACKS = 3

export type Rsvp = {
  slug: string
  name: string
  attending: Attending
  /**
   * Les oui/non sont eux aussi à trois états : avec un simple booléen, `false`
   * allumerait le bouton « Non » dès l'ouverture et on enregistrerait des
   * réponses que personne n'a données.
   */
  plusOne: boolean | null
  plusOneName: string
  sleepover: boolean | null
  sleepGear: SleepGearId | ''
  vegetarian: boolean | null
  dietNotes: string
  drinksAlcohol: boolean | null
  drinks: DrinkId[]
}

export const emptyRsvp = (slug: string, name: string): Rsvp => ({
  slug,
  name,
  attending: null,
  plusOne: null,
  plusOneName: '',
  sleepover: null,
  sleepGear: '',
  vegetarian: null,
  dietNotes: '',
  drinksAlcohol: null,
  drinks: [],
})

export type SavedTrack = {
  id: string
  guestSlug: string
  guestName: string
  trackId: number
  title: string
  artist: string
  artwork: string
  previewUrl: string | null
  appleUrl: string
}
