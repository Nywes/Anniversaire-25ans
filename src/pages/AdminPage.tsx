import { useEffect, useMemo, useState } from 'react'
import { loadAllRsvps, loadTracks } from '../lib/store'
import { DRINKS, SLEEP_GEAR, type Rsvp, type SavedTrack } from '../lib/types'
import { EVENT } from '../config/event'
import { GUESTS, guestBySlug } from '../data/guests'
import { blobStyle } from '../lib/blob'
import Icon from '../components/Icon'

const OK = 'anniv:admin'

const ATTENDING = {
  oui: { label: 'Vient', cls: 'yes' },
  'peut-etre': { label: 'Peut-être', cls: 'maybe' },
  non: { label: 'Absent', cls: 'no' },
} as const

/** Les « oui » d'abord : c'est la liste qu'on relit le plus souvent. */
const RANK = { oui: 0, 'peut-etre': 1, non: 2 } as const

type Bit = { text: string }

/** Résume une réponse en pastilles, dans l'ordre d'utilité. */
function details(r: Rsvp): Bit[] {
  const bits: Bit[] = []

  if (r.plusOne) bits.push({ text: r.plusOneName ? `+1 ${r.plusOneName}` : '+1' })

  if (r.sleepover) {
    const gear = SLEEP_GEAR.find((g) => g.id === r.sleepGear)?.label
    bits.push({ text: gear ? `Dort là · ${gear.toLowerCase()}` : 'Dort là' })
  }

  if (r.vegetarian) bits.push({ text: 'Végétarien' })

  if (r.drinksAlcohol === false) bits.push({ text: 'Sans alcool' })
  else {
    for (const d of r.drinks) {
      bits.push({ text: DRINKS.find((x) => x.id === d)?.label ?? d })
    }
  }

  return bits
}

function Avatar({ slug }: { slug: string }) {
  const guest = guestBySlug(slug)
  if (!guest) {
    // Invité surprise : pas d'avatar sur le plateau, on met son initiale.
    return <span className="answer-avatar answer-avatar--ghost">{slug.slice(7, 8).toUpperCase()}</span>
  }
  return (
    <span className="answer-avatar" style={blobStyle(guest.slug)}>
      <img src={guest.avatar} alt="" />
    </span>
  )
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(OK) === EVENT.adminCode,
  )
  const [code, setCode] = useState('')
  const [rsvps, setRsvps] = useState<Rsvp[]>([])
  const [tracks, setTracks] = useState<SavedTrack[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!unlocked) return
    Promise.all([loadAllRsvps(), loadTracks()])
      .then(([r, t]) => {
        setRsvps(r)
        setTracks(t)
      })
      .finally(() => setLoading(false))
  }, [unlocked])

  const { answered, silent, stats } = useMemo(() => {
    const answered = [...rsvps]
      .filter((r) => r.attending)
      .sort((a, b) => {
        const d = RANK[a.attending as keyof typeof RANK] - RANK[b.attending as keyof typeof RANK]
        return d !== 0 ? d : a.name.localeCompare(b.name, 'fr')
      })

    const seen = new Set(rsvps.map((r) => r.slug))
    const silent = GUESTS.filter((g) => !seen.has(g.slug))
    const yes = rsvps.filter((r) => r.attending === 'oui')

    return {
      answered,
      silent,
      stats: {
        yes: yes.length,
        maybe: rsvps.filter((r) => r.attending === 'peut-etre').length,
        no: rsvps.filter((r) => r.attending === 'non').length,
        veg: yes.filter((r) => r.vegetarian === true).length,
        beds: yes.filter((r) => r.sleepover === true).length,
        sober: yes.filter((r) => r.drinksAlcohol === false).length,
      },
    }
  }, [rsvps])

  if (!unlocked) {
    return (
      <main className="page">
        <h1 className="section-title">Espace privé</h1>
        <input
          className="field"
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code"
        />
        <button
          className="submit"
          onClick={() => {
            if (code === EVENT.adminCode) {
              sessionStorage.setItem(OK, code)
              setUnlocked(true)
            }
          }}
        >
          Entrer
        </button>
      </main>
    )
  }

  if (loading)
    return (
      <main className="page">
        <p className="lead">Chargement…</p>
      </main>
    )

  const copyCsv = () => {
    const csv = [
      'Titre,Artiste,Ajouté par',
      ...tracks.map((t) =>
        [t.title, t.artist, t.guestName].map((v) => `"${v.replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n')
    navigator.clipboard.writeText(csv)
  }

  return (
    <main className="page">
      <h1 className="section-title" style={{ fontSize: 26, marginBottom: 14 }}>
        Tableau de bord
      </h1>

      <div className="mini-stats">
        <div>
          <b className="t-ok">{stats.yes}</b>
          <small>oui</small>
        </div>
        <div>
          <b className="t-maybe">{stats.maybe}</b>
          <small>peut-être</small>
        </div>
        <div>
          <b className="t-no">{stats.no}</b>
          <small>non</small>
        </div>
        <div>
          <b className="t-muted">{silent.length}</b>
          <small>silence</small>
        </div>
      </div>
      <p className="hint" style={{ margin: '-4px 2px 18px' }}>
        {stats.veg} végétarien{stats.veg > 1 ? 's' : ''} · {stats.beds} couchage
        {stats.beds > 1 ? 's' : ''} · {stats.sober} sans alcool · {tracks.length} morceau
        {tracks.length > 1 ? 'x' : ''}
      </p>

      {/* ------------------------------------------------------- réponses -- */}

      <h2 className="section-title" style={{ margin: '0 2px 8px' }}>
        Qui a répondu quoi
      </h2>

      {answered.length === 0 && <p className="hint" style={{ margin: '0 2px' }}>Personne n'a encore répondu.</p>}

      {answered.map((r) => {
        const bits = details(r)
        const tag = ATTENDING[r.attending as keyof typeof ATTENDING]
        return (
          <div className="answer" key={r.slug}>
            <Avatar slug={r.slug} />
            <div className="answer-body">
              <div className="answer-head">
                <b>{r.name}</b>
                <span className={`tag tag--${tag.cls}`}>{tag.label}</span>
              </div>
              {bits.length > 0 && (
                <div className="answer-bits">
                  {bits.map((b) => (
                    <span className="bit" key={b.text}>
                      {b.text}
                    </span>
                  ))}
                </div>
              )}
              {r.dietNotes.trim() && <p className="answer-diet">{r.dietNotes}</p>}
            </div>
          </div>
        )
      })}

      {silent.length > 0 && (
        <>
          <h2 className="section-title" style={{ margin: '22px 2px 8px' }}>
            Sans réponse ({silent.length})
          </h2>
          <div className="silent">
            {silent.map((g) => (
              <span className="silent-one" key={g.slug} title={g.name}>
                <span className="answer-avatar" style={blobStyle(g.slug)}>
                  <img src={g.avatar} alt="" />
                </span>
                {g.name}
              </span>
            ))}
          </div>
        </>
      )}

      {/* ------------------------------------------------------- playlist -- */}

      <h2 className="section-title" style={{ margin: '26px 2px 4px' }}>
        La playlist ({tracks.length})
      </h2>
      <p className="hint" style={{ margin: '0 2px 10px' }}>
        Chaque titre ouvre sa fiche Apple Music : « + » dans l'app pour l'ajouter à ta
        playlist. Ou copie tout en CSV et laisse Soundiiz la construire d'un coup.
      </p>

      {tracks.length === 0 ? (
        <p className="hint" style={{ margin: '0 2px' }}>Aucun morceau proposé pour l'instant.</p>
      ) : (
        <>
          <div className="search-results" style={{ marginTop: 0 }}>
            {tracks.map((t) => (
              <a
                className="track"
                key={t.id}
                href={t.appleUrl}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <img src={t.artwork} alt="" />
                <span className="track-meta">
                  <span className="track-title">{t.title}</span>
                  <span className="track-artist">
                    {t.artist} · {t.guestName}
                  </span>
                </span>
                <span className="track-action play">
                  <Icon name="external" size={16} />
                </span>
              </a>
            ))}
          </div>
          <button className="link-btn" onClick={copyCsv}>
            <Icon name="copy" /> Copier en CSV
          </button>
        </>
      )}
    </main>
  )
}
