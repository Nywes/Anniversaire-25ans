import { useEffect, useRef } from 'react'

/**
 * Feux d'artifice de fond, extrêmement flous.
 *
 * Le canevas est rendu à un quart de la résolution de l'écran puis étiré : le
 * flou masque totalement la pixellisation et le coût de chaque image est divisé
 * par une quinzaine, ce qui compte sur un téléphone. Le flou lui-même est en
 * CSS (une seule passe GPU) et non appliqué au dessin.
 */

const COLORS = [
  '#ff5a5f',
  '#ffc93c',
  '#2ec4b6',
  '#5878ff',
  '#9b5de5',
  '#ff7bac',
  '#b8e62d',
  '#ff8a3d',
  '#00d1ff',
  '#4ade80',
]

const SCALE = 0.26
/** Assez espacé pour rester discret : on ne veut pas un 14 juillet. */
const GAP_MIN = 2600
const GAP_MAX = 7000
const MAX_LIVE = 2

type Rocket = { x: number; y: number; vy: number; burstY: number; color: string }
type Spark = {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  color: string
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

export default function Fireworks() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    const resize = () => {
      w = canvas.width = Math.max(1, Math.round(window.innerWidth * SCALE))
      h = canvas.height = Math.max(1, Math.round(window.innerHeight * SCALE))
    }
    resize()
    window.addEventListener('resize', resize)

    const rockets: Rocket[] = []
    let sparks: Spark[] = []
    let nextLaunch = performance.now() + rand(400, 1600)
    let last = performance.now()
    let raf = 0

    const launch = () => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      rockets.push({
        x: rand(0.12, 0.88) * w,
        y: h,
        vy: -rand(0.42, 0.62) * h,
        // Assez haut pour que les étincelles retombent dans le cadre plutôt
        // que de s'éteindre derrière le bouton collant du bas.
        burstY: rand(0.1, 0.38) * h,
        color,
      })
    }

    const burst = (r: Rocket) => {
      const n = Math.round(rand(22, 32))
      const power = rand(0.1, 0.2) * h
      for (let i = 0; i < n; i++) {
        // Angle réparti puis bruité : une explosion parfaitement régulière
        // se voit, même très floue.
        const a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2)
        const s = power * rand(0.55, 1)
        sparks.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          age: 0,
          life: rand(1.1, 1.9),
          color: r.color,
        })
      }
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      // Borné : après un passage en arrière-plan, dt vaudrait plusieurs
      // secondes et tout partirait hors de l'écran d'un coup.
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      // Effacement progressif plutôt que clearRect : laisse une traînée tout en
      // gardant le canevas transparent, donc le fond du site reste visible.
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0,0,0,0.10)'
      ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'

      if (now >= nextLaunch && rockets.length + (sparks.length ? 1 : 0) < MAX_LIVE) {
        launch()
        nextLaunch = now + rand(GAP_MIN, GAP_MAX)
      }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]
        r.y += r.vy * dt
        r.vy += 0.28 * h * dt // la fusée ralentit en montant
        ctx.globalAlpha = 0.9
        ctx.fillStyle = r.color
        ctx.beginPath()
        ctx.arc(r.x, r.y, h * 0.024, 0, Math.PI * 2)
        ctx.fill()
        if (r.y <= r.burstY || r.vy >= 0) {
          burst(r)
          rockets.splice(i, 1)
        }
      }

      for (const s of sparks) {
        s.age += dt
        s.x += s.vx * dt
        s.y += s.vy * dt
        s.vy += 0.26 * h * dt // gravité
        s.vx *= 0.985
        s.vy *= 0.985
        const t = s.age / s.life
        ctx.globalAlpha = Math.max(0, (1 - t) ** 1.6) * 0.95
        ctx.fillStyle = s.color
        ctx.beginPath()
        // Généreux : le flou CSS de 24 px dilue énormément l'énergie, des
        // points fins deviennent invisibles une fois étalés.
        ctx.arc(s.x, s.y, h * 0.034 * (1 - t * 0.4), 0, Math.PI * 2)
        ctx.fill()
      }
      sparks = sparks.filter((s) => s.age < s.life)

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    raf = requestAnimationFrame(frame)

    // Onglet caché : inutile de consommer de la batterie.
    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) {
        last = performance.now()
        nextLaunch = last + rand(600, 2000)
        raf = requestAnimationFrame(frame)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas className="fireworks" ref={ref} aria-hidden="true" />
}
