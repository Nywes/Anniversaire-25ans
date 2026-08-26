import { useEffect, useRef, useState } from 'react'
import { searchTracks, type Track } from '../lib/itunes'
import { addTrack, loadTracks, removeTrack } from '../lib/store'
import { MAX_TRACKS, type SavedTrack } from '../lib/types'
import Icon from './Icon'

type Props = { guestSlug: string; guestName: string }

/**
 * Glyphe lecture/pause posé sur la pochette. Contrairement aux icônes de
 * Icon.tsx (au trait, fill="none"), celui-ci est plein : sur la vignette d'une
 * pochette chargée, un simple contour se perd, alors qu'un pastille sombre +
 * triangle plein reste lisible à 44 px sur n'importe quelle image.
 */
function PlayGlyph({ playing }: { playing: boolean }) {
  return (
    <span className="track-play" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        {playing ? (
          <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
        ) : (
          <path d="M8 5.5v13l11-6.5z" />
        )}
      </svg>
    </span>
  )
}

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
                className="track-photo"
                onClick={() => preview(t)}
                aria-label={playing === t.trackId ? `Mettre en pause ${t.title}` : `Écouter ${t.title}`}
              >
                <img src={t.artwork} alt="" />
                <PlayGlyph playing={playing === t.trackId} />
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
            // Toute la ligne ajoute le morceau : un bouton « + » minuscule au
            // bout était trop facile à rater. La pochette reste un vrai
            // <button> imbriqué pour l'écoute (un <div role="button"> autour
            // plutôt qu'un <button> autour évite d'imbriquer deux boutons,
            // ce que les navigateurs gèrent mal), avec stopPropagation pour
            // ne pas déclencher l'ajout en même temps.
            <div
              className="track track--pick"
              key={t.trackId}
              role="button"
              tabIndex={0}
              onClick={() => add(t)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  add(t)
                }
              }}
            >
              <button
                className="track-photo"
                onClick={(e) => {
                  e.stopPropagation()
                  preview(t)
                }}
                aria-label={playing === t.trackId ? `Mettre en pause ${t.title}` : `Écouter ${t.title}`}
              >
                <img src={t.artwork} alt="" />
                <PlayGlyph playing={playing === t.trackId} />
              </button>
              <span className="track-meta">
                <span className="track-title">{t.title}</span>
                <span className="track-artist">{t.artist}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
