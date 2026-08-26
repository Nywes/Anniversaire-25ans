/** Accès aux données. Tout passe par Supabase. */
import { supabase } from './supabase'
import type { Rsvp, SavedTrack, DrinkId, Attending, SleepGearId } from './types'
import type { Track } from './itunes'

/* ------------------------------------------------------------------ RSVP -- */

/** snake_case côté Postgres, camelCase côté React. */
type RsvpRow = {
  slug: string
  name: string
  attending: Attending
  maybe_note: string
  plus_one: boolean | null
  plus_one_name: string
  sleepover: boolean | null
  sleep_gear: SleepGearId | ''
  vegetarian: boolean | null
  diet_notes: string
  drinks_alcohol: boolean | null
  drinks: DrinkId[]
  message: string
}

const toRsvp = (r: RsvpRow): Rsvp => ({
  slug: r.slug,
  name: r.name,
  attending: r.attending,
  maybeNote: r.maybe_note ?? '',
  plusOne: r.plus_one,
  plusOneName: r.plus_one_name ?? '',
  sleepover: r.sleepover,
  sleepGear: r.sleep_gear ?? '',
  vegetarian: r.vegetarian,
  dietNotes: r.diet_notes ?? '',
  drinksAlcohol: r.drinks_alcohol,
  drinks: r.drinks ?? [],
  message: r.message ?? '',
})

const toRow = (r: Rsvp): RsvpRow => ({
  slug: r.slug,
  name: r.name,
  attending: r.attending,
  maybe_note: r.maybeNote,
  plus_one: r.plusOne,
  plus_one_name: r.plusOneName,
  sleepover: r.sleepover,
  sleep_gear: r.sleepGear,
  vegetarian: r.vegetarian,
  diet_notes: r.dietNotes,
  drinks_alcohol: r.drinksAlcohol,
  drinks: r.drinks,
  message: r.message,
})

export async function loadRsvp(slug: string): Promise<Rsvp | null> {
  const { data, error } = await supabase.from('rsvps').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data ? toRsvp(data as RsvpRow) : null
}

export async function saveRsvp(rsvp: Rsvp): Promise<void> {
  const { error } = await supabase
    .from('rsvps')
    .upsert({ ...toRow(rsvp), updated_at: new Date().toISOString() }, { onConflict: 'slug' })
  if (error) throw error
}

export async function loadAllRsvps(): Promise<Rsvp[]> {
  const { data, error } = await supabase.from('rsvps').select('*')
  if (error) throw error
  return (data as RsvpRow[]).map(toRsvp)
}

/** Slugs des gens qui ont dit oui — sert à allumer les cases du plateau. */
export async function loadConfirmedSlugs(): Promise<string[]> {
  const { data, error } = await supabase.from('rsvps').select('slug').eq('attending', 'oui')
  if (error) throw error
  return (data as { slug: string }[]).map((r) => r.slug)
}

/* ---------------------------------------------------------------- Tracks -- */

type TrackRow = {
  id: string
  guest_slug: string
  guest_name: string
  track_id: number
  title: string
  artist: string
  artwork: string
  preview_url: string | null
  apple_url: string
}

const toTrack = (r: TrackRow): SavedTrack => ({
  id: r.id,
  guestSlug: r.guest_slug,
  guestName: r.guest_name,
  trackId: r.track_id,
  title: r.title,
  artist: r.artist,
  artwork: r.artwork,
  previewUrl: r.preview_url,
  appleUrl: r.apple_url,
})

export async function loadTracks(): Promise<SavedTrack[]> {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as TrackRow[]).map(toTrack)
}

export async function addTrack(
  guestSlug: string,
  guestName: string,
  track: Track,
): Promise<SavedTrack> {
  const { data, error } = await supabase
    .from('tracks')
    .insert({
      guest_slug: guestSlug,
      guest_name: guestName,
      track_id: track.trackId,
      title: track.title,
      artist: track.artist,
      artwork: track.artwork,
      preview_url: track.previewUrl,
      apple_url: track.appleUrl,
    })
    .select()
    .single()

  // 23505 = violation de contrainte unique : quelqu'un a déjà proposé ce
  // morceau. On va chercher qui, pour pouvoir le dire plutôt que de laisser
  // l'invité deviner pourquoi son ajout est refusé.
  if (error) {
    if (error.code !== '23505') throw new Error(error.message)
    const { data: owner } = await supabase
      .from('tracks')
      .select('guest_name')
      .eq('track_id', track.trackId)
      .maybeSingle()
    throw new Error(`DUPLICATE:${owner?.guest_name ?? ''}`)
  }

  return toTrack(data as TrackRow)
}

export async function removeTrack(id: string): Promise<void> {
  const { error } = await supabase.from('tracks').delete().eq('id', id)
  if (error) throw error
}
