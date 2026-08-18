import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { guestBySlug } from '../data/guests'
import { blobStyle } from '../lib/blob'
import { loadRsvp, saveRsvp } from '../lib/store'
import { takeHandoff } from '../lib/transition'
import {
  DRINKS,
  SLEEP_GEAR,
  emptyRsvp,
  type Rsvp,
  type DrinkId,
  type Attending,
} from '../lib/types'
import { EVENT, mapsUrl } from '../config/event'
import { downloadIcs } from '../lib/ics'
import MusicPicker from '../components/MusicPicker'
import Map from '../components/Map'
import Icon from '../components/Icon'

/* -------------------------------------------------------------- fragments */

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null
  onChange: (v: boolean) => void
}) {
  return (
    <div className="choice-row">
      <button className="choice yes" aria-pressed={value === true} onClick={() => onChange(true)}>
        Oui
      </button>
      <button className="choice no" aria-pressed={value === false} onClick={() => onChange(false)}>
        Non
      </button>
    </div>
  )
}

function Reveal({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={`reveal${open ? ' open' : ''}`}>
      <div>{children}</div>
    </div>
  )
}

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/* ------------------------------------------------------------------ page */

export default function GuestPage() {
  const { slug = '' } = useParams()
  const known = guestBySlug(slug)
  const isGhost = slug === 'invite'

  const [ghostName, setGhostName] = useState('')
  const [rsvp, setRsvp] = useState<Rsvp>(() => emptyRsvp(slug, known?.name ?? ''))
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const heroRef = useRef<HTMLSpanElement>(null)

  const effectiveSlug = isGhost ? `invite-${slugify(ghostName)}` : slug
  const effectiveName = isGhost ? ghostName.trim() : (known?.name ?? '')
  const ready = effectiveName.length > 1 && rsvp.attending !== null
  const comingIsh = rsvp.attending === 'oui' || rsvp.attending === 'peut-etre'

  /**
   * Reprise de l'animation du plateau : l'avatar part de la case agrandie et
   * rejoint sa place en haut à gauche. Le calcul doit avoir lieu avant que le
   * navigateur ne peigne, d'où useLayoutEffect.
   */
  useLayoutEffect(() => {
    const el = heroRef.current
    if (!el) return
    window.scrollTo(0, 0)
    const from = takeHandoff(slug)
    if (!from) return

    // On respecte le réglage système ici plutôt que via la règle CSS : le vol
    // n'a de sens que s'il est vu en entier.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const to = el.getBoundingClientRect()
    const dx = from.left + from.width / 2 - (to.left + to.width / 2)
    const dy = from.top + from.height / 2 - (to.top + to.height / 2)
    const scale = from.width / to.width

    /*
     * Web Animations plutôt qu'une transition CSS : la transition demande de
     * poser l'état de départ, de forcer un recalcul, puis de le relâcher, et ce
     * recalcul se fait avaler par le regroupement des styles quand le composant
     * vient tout juste d'être monté — le transform sautait à l'arrivée en une
     * frame. Ici l'animation est décrite d'un bloc, sans dépendre du moment où
     * le navigateur décide de recalculer.
     */
    const flight = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
        { transform: 'translate(0px, 0px) scale(1)' },
      ],
      { duration: 720, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' },
    )

    return () => flight.cancel()
  }, [slug])

  useEffect(() => {
    if (isGhost || !known) return
    loadRsvp(slug)
      .then((found) => found && setRsvp(found))
      .catch(() => {})
  }, [slug, known, isGhost])

  if (!known && !isGhost) {
    return (
      <main className="page">
        <p className="lead">Cette page n'existe pas.</p>
        <Link className="link-btn" to="/">
          <Icon name="back" size={16} /> Retour au plateau
        </Link>
      </main>
    )
  }

  const set = <K extends keyof Rsvp>(key: K, value: Rsvp[K]) =>
    setRsvp((r) => ({ ...r, [key]: value }))

  const toggleDrink = (id: DrinkId) =>
    setRsvp((r) => ({
      ...r,
      drinks: r.drinks.includes(id) ? r.drinks.filter((d) => d !== id) : [...r.drinks, id],
    }))

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      await saveRsvp({ ...rsvp, slug: effectiveSlug, name: effectiveName })
      localStorage.setItem('anniv:me', effectiveSlug)
      setDone(true)
      if (rsvp.attending === 'oui') {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.7 },
          colors: ['#ff5a5f', '#ffc93c', '#2ec4b6', '#9b5de5', '#ff7bac'],
        })
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setError("Ça n'est pas passé. Réessaie dans un instant ?")
    } finally {
      setSaving(false)
    }
  }

  const copyAddress = () => {
    const full = [EVENT.place.name, EVENT.place.address, EVENT.place.directions]
      .filter(Boolean)
      .join(', ')
    navigator.clipboard.writeText(full).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
  }

  const hero = known && (
    <span className="hero-avatar" ref={heroRef} style={blobStyle(known.slug)}>
      <img src={known.avatar} alt="" />
    </span>
  )

  /* ------------------------------------------------------------ confirmé */

  if (done) {
    const headline =
      rsvp.attending === 'oui'
        ? `À très vite, ${effectiveName} !`
        : rsvp.attending === 'peut-etre'
          ? 'Tiens-moi au courant !'
          : 'Merci quand même !'

    return (
      <main className="page">
        <header className="guest-head">
          {hero}
          <h1 className="section-title" style={{ fontSize: 26 }}>
            {headline}
          </h1>
        </header>

        <div className="card">
          <p className="lead">
            {rsvp.attending === 'non'
              ? 'Dommage, tu vas me manquer. Si ça change, reviens modifier ta réponse.'
              : `${EVENT.when}, ${EVENT.place.name} à ${EVENT.place.address}.`}
          </p>
          {comingIsh && (
            <div className="btn-row">
              <button className="link-btn" onClick={downloadIcs}>
                <Icon name="calendar" /> Ajouter à l'agenda
              </button>
              <a className="link-btn" href={mapsUrl()} target="_blank" rel="noreferrer">
                <Icon name="route" /> Comment y aller
              </a>
              {EVENT.whatsappUrl && (
                <a className="link-btn" href={EVENT.whatsappUrl} target="_blank" rel="noreferrer">
                  <Icon name="chat" /> Rejoindre le groupe
                </a>
              )}
            </div>
          )}
        </div>

        <button className="link-btn" onClick={() => setDone(false)}>
          Modifier ma réponse
        </button>
      </main>
    )
  }

  /* ------------------------------------------------------------ formulaire */

  const attend = (v: Attending) => set('attending', v)

  return (
    <main className="page">
      <Link className="back" to="/" aria-label="Retour au plateau">
        <Icon name="back" size={20} />
      </Link>

      <header className="guest-head">
        {hero}
        <h1 className="section-title" style={{ fontSize: 30 }}>
          {effectiveName || 'toi'}
        </h1>
      </header>

      {isGhost && (
        <div className="card">
          <h2 className="section-title">Tu t'appelles comment ?</h2>
          <input
            className="field"
            value={ghostName}
            onChange={(e) => setGhostName(e.target.value)}
            placeholder="Prénom et nom"
            autoComplete="name"
          />
        </div>
      )}

      <div className="card">
        <h2 className="section-title">{EVENT.when}</h2>
        <button className="address" onClick={copyAddress}>
          {EVENT.place.name} - {EVENT.place.address.toUpperCase()}
          {EVENT.place.directions && (
            <>
              <br />
              {EVENT.place.directions}
            </>
          )}
          {copied && <span className="address-hint">Adresse copiée</span>}
        </button>

        <Map />

        <div className="btn-row">
          <a className="link-btn" href={mapsUrl()} target="_blank" rel="noreferrer">
            <Icon name="route" /> Comment y aller
          </a>
          <button className="link-btn" onClick={downloadIcs}>
            <Icon name="calendar" /> Ajouter à l'agenda
          </button>
        </div>

        {EVENT.dressCode && (
          <p className="hint" style={{ marginTop: 14 }}>
            <b>Dress code :</b> {EVENT.dressCode}
          </p>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">Tu viens ?</h2>
        <div className="choice-row trio">
          <button
            className="choice yes"
            aria-pressed={rsvp.attending === 'oui'}
            onClick={() => attend('oui')}
          >
            Je suis là
          </button>
          <button
            className="choice maybe"
            aria-pressed={rsvp.attending === 'peut-etre'}
            onClick={() => attend('peut-etre')}
          >
            Peut-être
          </button>
          <button
            className="choice no"
            aria-pressed={rsvp.attending === 'non'}
            onClick={() => attend('non')}
          >
            Je peux pas
          </button>
        </div>
      </div>

      <Reveal open={comingIsh}>
        <div className="card">
          <h2 className="section-title">Tu veux ramener quelqu'un ?</h2>
          <p className="hint">Une personne qui n'est pas déjà sur le plateau — avec plaisir !</p>
          <YesNo value={rsvp.plusOne} onChange={(v) => set('plusOne', v)} />
          <Reveal open={rsvp.plusOne === true}>
            <input
              className="field"
              value={rsvp.plusOneName}
              onChange={(e) => set('plusOneName', e.target.value)}
              placeholder="Son prénom"
              autoComplete="off"
            />
          </Reveal>
        </div>

        <div className="card">
          <h2 className="section-title">Tu dors sur place ?</h2>
          <YesNo value={rsvp.sleepover} onChange={(v) => set('sleepover', v)} />

          <Reveal open={rsvp.sleepover === true}>
            <p className="hint" style={{ marginTop: 16 }}>
              Tu as de quoi dormir ?
            </p>
            <div className="chips chips--center">
              {SLEEP_GEAR.map((g) => (
                <button
                  key={g.id}
                  className="chip"
                  aria-pressed={rsvp.sleepGear === g.id}
                  onClick={() => set('sleepGear', rsvp.sleepGear === g.id ? '' : g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="card">
          <h2 className="section-title">Végétarien ?</h2>
          <YesNo value={rsvp.vegetarian} onChange={(v) => set('vegetarian', v)} />
          <input
            className="field"
            value={rsvp.dietNotes}
            onChange={(e) => set('dietNotes', e.target.value)}
            placeholder="Allergies, intolérances, trucs que tu ne manges pas…"
          />
        </div>

        <div className="card">
          <h2 className="section-title">Tu bois de l'alcool ?</h2>
          <YesNo value={rsvp.drinksAlcohol} onChange={(v) => set('drinksAlcohol', v)} />

          <Reveal open={rsvp.drinksAlcohol === true}>
            <p className="hint" style={{ marginTop: 16 }}>
              Tu préfères quoi ? (plusieurs choix possibles)
            </p>
            <div className="chips">
              {DRINKS.map((d) => (
                <button
                  key={d.id}
                  className="chip"
                  aria-pressed={rsvp.drinks.includes(d.id)}
                  onClick={() => toggleDrink(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        {ready && <MusicPicker guestSlug={effectiveSlug} guestName={effectiveName} />}
      </Reveal>

      {error && (
        <p className="hint" style={{ color: 'var(--no)', textAlign: 'center' }}>
          {error}
        </p>
      )}

      <button className="submit" onClick={submit} disabled={!ready || saving}>
        {saving
          ? 'Enregistrement…'
          : rsvp.attending === null
            ? "Dis-moi d'abord si tu viens"
            : 'Sauvegarder ma réponse'}
      </button>
    </main>
  )
}
