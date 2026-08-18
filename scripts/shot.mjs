/**
 * Capture d'écran en émulation mobile réelle.
 *
 * `--window-size` ne suffit pas sur macOS : le système impose une largeur de
 * fenêtre minimale (~500 px), Chrome rend donc la page plus large que demandé
 * puis rogne l'image. On passe par le protocole DevTools et
 * Emulation.setDeviceMetricsOverride, qui force le vrai viewport CSS.
 *
 *   node scripts/shot.mjs <url> <fichier.png> [largeur] [hauteur]
 *
 * SHOT_EVAL="…" exécute du JS dans la page avant la capture, pour photographier
 * un état qui demande une interaction :
 *
 *   SHOT_EVAL="document.querySelector('.choice.yes').click()" node scripts/shot.mjs …
 */
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const [url = 'http://localhost:5173/', out = '/tmp/shot.png', w = '390', h = '844'] =
  process.argv.slice(2)

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9333

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--user-data-dir=/tmp/chrome-shot-profile',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Le port met un instant à écouter. */
async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${PORT}/json`).then((r) => r.json())
      const page = list.find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {
      /* pas encore prêt */
    }
    await sleep(250)
  }
  throw new Error('Chrome ne répond pas sur le port de debug')
}

const ws = new WebSocket(await target())
await new Promise((r) => (ws.onopen = r))

let id = 0
const pending = new Map()
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result)
    pending.delete(msg.id)
  }
}
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const n = ++id
    pending.set(n, resolve)
    ws.send(JSON.stringify({ id: n, method, params }))
  })

await send('Emulation.setDeviceMetricsOverride', {
  width: Number(w),
  height: Number(h),
  deviceScaleFactor: 2,
  mobile: true,
})

// Chrome headless annonce « prefers-reduced-motion: reduce ». La règle
// d'accessibilité de index.css écrase alors toutes les durées à 0,01 ms et les
// captures d'animation sont trompeuses : on rétablit la préférence par défaut.
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
})
await send('Page.enable')
await send('Page.navigate', { url })
await sleep(2500) // polices + avatars

if (process.env.SHOT_EVAL) {
  await send('Runtime.evaluate', { expression: process.env.SHOT_EVAL })
  // SHOT_WAIT permet de viser une frame précise d'une animation en cours.
  await sleep(Number(process.env.SHOT_WAIT ?? 2500))
}

const { data } = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
})

writeFileSync(out, Buffer.from(data, 'base64'))
console.log(`${out} — viewport ${w}×${h}`)

ws.close()
chrome.kill()
