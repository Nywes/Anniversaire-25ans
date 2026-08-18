/**
 * Accès aux données. Deux implémentations derrière la même API :
 *  - Supabase dès que VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY sont définies ;
 *  - localStorage sinon, pour pouvoir développer et montrer le site avant
 *    d'avoir créé le projet Supabase.
 */
import { supabase } from './supabase'
import type { Rsvp, SavedTrack, DrinkId, Attending, SleepGearId } from './types'
import type { Track } from './itunes'

const LS_RSVPS = 'anniv:rsvps'
const LS_TRACKS = 'anniv:tracks'

const readLs = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
const writeLs = (key: string, value: unknown) =>
  localStorage.setItem(key, JSON.stringify(value))

/* ------------------------------------------------------------------ RSVP -- */

/** snake_case côté Postgres, camelCase côté React. */
type RsvpRow = {
  slug: string
  name: string
  attending: Attending
  plus_one: boolean | null
  plus_one_name: string
  sleepover: boolean | null
  sleep_gear: SleepGearId | ''
  vegetarian: boolean | null
  diet_notes: string
  drinks_alcohol: boolean | null
  drinks: DrinkId[]
}

const toRsvp = (r: RsvpRow): Rsvp => ({
  slug: r.slug,
  name: r.name,
  attending: r.attending,
  plusOne: r.plus_one,
  plusOneName: r.plus_one_name ?? '',
  sleepover: r.sleepover,
  sleepGear: r.sleep_gear ?? '',
  vegetarian: r.vegetarian,
  dietNotes: r.diet_notes ?? '',
  drinksAlcohol: r.drinks_alcohol,
  drinks: r.drinks ?? [],
})

const toRow = (r: Rsvp): RsvpRow => ({
  slug: r.slug,
  name: r.name,
  attending: r.attending,
  plus_one: r.plusOne,
  plus_one_name: r.plusOneName,
  sleepover: r.sleepover,
  sleep_gear: r.sleepGear,
  vegetarian: r.vegetarian,
  diet_notes: r.dietNotes,
  drinks_alcohol: r.drinksAlcohol,
  drinks: r.drinks,
})

export async function loadRsvp(slug: string): Promise<Rsvp | null> {
  if (!supabase) {
    return readLs<Record<string, Rsvp>>(LS_RSVPS, {})[slug] ?? null
  }
  const { data, error } = await supabase.from('rsvps').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data ? toRsvp(data as RsvpRow) : null
}

export async function saveRsvp(rsvp: Rsvp): Promise<void> {
  if (!supabase) {
    const all = readLs<Record<string, Rsvp>>(LS_RSVPS, {})
    all[rsvp.slug] = rsvp
    writeLs(LS_RSVPS, all)
    return
  }
  const { error } = await supabase
    .from('rsvps')
    .upsert({ ...toRow(rsvp), updated_at: new Date().toISOString() }, { onConflict: 'slug' })
  if (error) throw error
}

export async function loadAllRsvps(): Promise<Rsvp[]> {
  if (!supabase) {
    return Object.values(readLs<Record<string, Rsvp>>(LS_RSVPS, {}))
  }
  const { data, error } = await supabase.from('rsvps').select('*')
  if (error) throw error
  return (data as RsvpRow[]).map(toRsvp)
}

/** Slugs des gens qui ont dit oui — sert à allumer les cases du plateau. */
export async function loadConfirmedSlugs(): Promise<string[]> {
  if (!supabase) {
    return Object.values(readLs<Record<string, Rsvp>>(LS_RSVPS, {}))
      .filter((r) => r.attending === 'oui')
      .map((r) => r.slug)
  }
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
  if (!supabase) return readLs<SavedTrack[]>(LS_TRACKS, [])
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
  const row = {
    guest_slug: guestSlug,
    guest_name: guestName,
    track_id: track.trackId,
    title: track.title,
    artist: track.artist,
    artwork: track.artwork,
    preview_url: track.previewUrl,
    apple_url: track.appleUrl,
  }

  if (!supabase) {
    const all = readLs<SavedTrack[]>(LS_TRACKS, [])
    const clash = all.find((t) => t.trackId === track.trackId)
    if (clash) throw new Error(`DUPLICATE:${clash.guestName}`)
    const saved: SavedTrack = { ...toTrack({ ...row, id: crypto.randomUUID() } as TrackRow) }
    all.push(saved)
    writeLs(LS_TRACKS, all)
    return saved
  }

  const { data, error } = await supabase.from('tracks').insert(row).select().single()

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
  if (!supabase) {
    writeLs(
      LS_TRACKS,
      readLs<SavedTrack[]>(LS_TRACKS, []).filter((t) => t.id !== id),
    )
    return
  }
  const { error } = await supabase.from('tracks').delete().eq('id', id)
  if (error) throw error
}
