import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GUESTS } from '../data/guests'
import { blobStyle } from '../lib/blob'
import { loadConfirmedSlugs } from '../lib/store'
import { setHandoff } from '../lib/transition'
import { isLive } from '../lib/supabase'
import { EVENT } from '../config/event'

const ORDER_KEY = 'anniv:order'

const shuffle = <T,>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Chacun a son propre plateau, tiré au sort une fois puis mémorisé : il ne
 * bouge plus d'une visite à l'autre, sinon on recherche sa tête à chaque fois.
 * Il n'est rebattu que si la liste des invités a changé.
 */
const stableOrder = () => {
  const bySlug = new Map(GUESTS.map((g) => [g.slug, g]))
  let stored: string[] = []
  try {
    stored = JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]')
  } catch {
    stored = []
  }

  const sameRoster =
    stored.length === GUESTS.length && stored.every((s) => bySlug.has(s))

  const order = sameRoster ? stored : shuffle(GUESTS.map((g) => g.slug))
  if (!sameRoster) localStorage.setItem(ORDER_KEY, JSON.stringify(order))

  return order.map((s) => bySlug.get(s)!)
}

export default function BoardPage() {
  const navigate = useNavigate()
  const [chosen, setChosen] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [confirmed, setConfirmed] = useState<string[]>([])
  const guests = useMemo(stableOrder, [])

  useEffect(() => {
    loadConfirmedSlugs().then(setConfirmed).catch(() => {})
  }, [])

  const pick = (slug: string) => {
    if (chosen) return
    setChosen(slug)
    localStorage.setItem('anniv:me', slug)

    /*
     * 1. les autres cartes se rabattent (~860 ms)
     * 2. tout s'efface sauf la tache colorée (480 ms)
     * 3. un temps d'arrêt : on doit voir l'avatar seul, posé, avant qu'il ne
     *    parte — sans cette respiration l'enchaînement paraît brusque
     * 4. la page perso reprend le mouvement.
     */
    const t1 = window.setTimeout(() => setLeaving(true), 820)
    const t2 = window.setTimeout(() => {
      // Seule la tache colorée voyage : c'est elle qu'on relève, pas la carte,
      // dont le plastique vient justement de s'effacer.
      const art = document.querySelector('.tile.is-chosen .tile-art')
      if (art) setHandoff(slug, art.getBoundingClientRect())
      navigate(`/moi/${slug}`)
    }, 1620)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }

  return (
    <main className="page page--board">
      {!isLive && (
        <div className={`banner${leaving ? ' is-gone' : ''}`}>
          <b>Mode démo.</b> Supabase n'est pas encore branché : les réponses ne
          sont enregistrées que dans ce navigateur.
        </div>
      )}

      <header className={`board-head${leaving ? ' is-gone' : ''}`}>
        <h1 className="display">
          Anniversaire <em>{EVENT.hostName}</em>
        </h1>
        <p className="lead">Trouve ta tête et dis-moi si tu viens.</p>
      </header>

      <div className={`board-frame${leaving ? ' is-leaving' : ''}`}>
        <div className="board-plastic" aria-hidden="true" />
        <div className="board">
          {guests.map((g, i) => {
            const isChosen = chosen === g.slug
            const isDown = chosen !== null && !isChosen
            return (
              <div className={`slot${isChosen ? ' is-host' : ''}`} key={g.slug}>
                <button
                  className={
                    'tile' + (isDown ? ' is-down' : '') + (isChosen ? ' is-chosen' : '')
                  }
                  style={{
                    ...blobStyle(g.slug),
                    // Décalage en cascade : les cartes tombent l'une après l'autre.
                    transitionDelay: isDown ? `${(i % 6) * 44}ms` : '0ms',
                  }}
                  onClick={() => pick(g.slug)}
                  aria-label={g.name}
                >
                  <span className="tile-art">
                    <img
                      src={g.avatar}
                      alt=""
                      loading={i < 9 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                    {confirmed.includes(g.slug) && (
                      <span className="tile-check" aria-hidden="true" />
                    )}
                  </span>
                  <span className="tile-name">{g.name}</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {!chosen && (
        <Link to="/moi/invite" className="ghost-link">
          Je ne suis pas sur le plateau
        </Link>
      )}
    </main>
  )
}
