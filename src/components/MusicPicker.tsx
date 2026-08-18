import { useEffect, useRef, useState } from 'react'
import { searchTracks, type Track } from '../lib/itunes'
import { addTrack, loadTracks, removeTrack } from '../lib/store'
import { MAX_TRACKS, type SavedTrack } from '../lib/types'
import Icon from './Icon'

type Props = { guestSlug: string; guestName: string }

export default function MusicPicker({ guestSlug, guestName }: Props) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<Track[]>([])
  const [mine, setMine] = useState<SavedTrack[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState<number | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)

  const full = mine.length >= MAX_TRACKS

  useEffect(() => {
    loadTracks()
      .then((all) => setMine(all.filter((t) => t.guestSlug === guestSlug)))
      .catch(() => {})
  }, [guestSlug])

  // Recherche différée : on n'appelle l'API qu'une fois la frappe retombée.
  useEffect(() => {
    if (term.trim().length < 2 || full) {
      setResults([])
      return
    }
    const id = setTimeout(() => {
      setBusy(true)
      searchTracks(term)
        .then(setResults)
        .catch(() => setError('Recherche indisponible, réessaie dans un instant.'))
        .finally(() => setBusy(false))
    }, 400)
    return () => clearTimeout(id)
  }, [term, full])

  useEffect(() => {
    return () => {
      audio.current?.pause()
    }
  }, [])

  const preview = (track: Track | SavedTrack) => {
    if (!track.previewUrl) return
    if (playing === track.trackId) {
      audio.current?.pause()
      setPlaying(null)
      return
    }
    audio.current?.pause()
    const el = new Audio(track.previewUrl)
    el.play().catch(() => {})
    el.onended = () => setPlaying(null)
    audio.current = el
    setPlaying(track.trackId)
  }

  const add = async (track: Track) => {
    if (full) return
    setError('')
    try {
      const saved = await addTrack(guestSlug, guestName, track)
      setMine((m) => [...m, saved])
      setTerm('')
      setResults([])
    } catch (e) {
      const msg = (e as Error).message
      if (msg.startsWith('DUPLICATE')) {
        const who = msg.slice('DUPLICATE:'.length)
        setError(who ? `Déjà ajoutée par ${who}` : 'Ce morceau est déjà dans la playlist')
      } else {
        setError("Impossible d'ajouter ce morceau.")
      }
    }
  }

  const drop = async (t: SavedTrack) => {
    if (playing === t.trackId) {
      audio.current?.pause()
      setPlaying(null)
    }
    await removeTrack(t.id)
    setMine((m) => m.filter((x) => x.id !== t.id))
  }

  return (
    <div className="card">
      <h2 className="section-title">La playlist de la soirée</h2>
      <p className="hint">
        Je vais faire une playlist commune pour le début de soirée, tu peux ajouter{' '}
        {MAX_TRACKS} morceaux max.
      </p>

      {mine.length > 0 && (
        <div className="search-results">
          {mine.map((t) => (
            <div className="track" key={t.id}>
              <button
                onClick={() => preview(t)}
                aria-label={`Écouter ${t.title}`}
                style={{ padding: 0, lineHeight: 0 }}
              >
                <img src={t.artwork} alt="" />
              </button>
              <span className="track-meta">
                <span className="track-title">{t.title}</span>
                <span className="track-artist">{t.artist}</span>
              </span>
              <button
                className="track-action remove"
                onClick={() => drop(t)}
                aria-label={`Retirer ${t.title}`}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!full && (
        <input
          className="field"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Un titre, un artiste…"
          autoComplete="off"
          enterKeyHint="search"
        />
      )}

      {full && (
        <p className="hint" style={{ marginTop: 12, color: 'var(--c3)' }}>
          Tes {MAX_TRACKS} morceaux sont enregistrés. Retires-en un pour changer.
        </p>
      )}

      {busy && (
        <p className="hint" style={{ marginTop: 10 }}>
          Recherche…
        </p>
      )}
      {error && (
        <p className="hint" style={{ marginTop: 10, color: 'var(--no)' }}>
          {error}
        </p>
      )}

      {results.length > 0 && (
        <div className="search-results">
          {results.map((t) => (
            <div className="track" key={t.trackId}>
              <button
                onClick={() => preview(t)}
                aria-label={`Écouter ${t.title}`}
                style={{ padding: 0, lineHeight: 0 }}
              >
                <img src={t.artwork} alt="" />
              </button>
              <span className="track-meta">
                <span className="track-title">{t.title}</span>
                <span className="track-artist">{t.artist}</span>
              </span>
              <button
                className="track-action"
                onClick={() => add(t)}
                aria-label={`Ajouter ${t.title}`}
              >
                <Icon name="plus" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
