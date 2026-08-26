/**
 * Recherche de morceaux via l'iTunes Search API : gratuite, sans clé, sans
 * inscription. Elle renvoie l'identifiant Apple Music du titre (utilisable pour
 * l'ajouter à une playlist depuis /admin) et un extrait de 30 s.
 *
 * L'endpoint renvoie normalement `access-control-allow-origin: *`, donc un
 * simple fetch suffit. Comme cet en-tête a déjà été signalé absent sur certains
 * nœuds d'Apple, on retombe sur JSONP (`&callback=`, officiellement supporté)
 * plutôt que de laisser la recherche muette le soir de la fête.
 */

export type Track = {
  trackId: number
  title: string
  artist: string
  album: string
  artwork: string
  previewUrl: string | null
  /** Ouvre la fiche du titre dans Apple Music. */
  appleUrl: string
}

type ItunesResult = {
  trackId: number
  trackName: string
  artistName: string
  collectionName?: string
  artworkUrl100?: string
  previewUrl?: string
  trackViewUrl?: string
}

let seq = 0

function jsonp<T>(url: string, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const cb = `__itunes_cb_${Date.now()}_${seq++}`
    const script = document.createElement('script')

    const cleanup = () => {
      delete (window as never as Record<string, unknown>)[cb]
      script.remove()
      clearTimeout(timer)
    }

    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('timeout'))
    }, timeoutMs)

    ;(window as never as Record<string, unknown>)[cb] = (data: T) => {
      cleanup()
      resolve(data)
    }

    script.onerror = () => {
      cleanup()
      reject(new Error('network'))
    }

    script.src = `${url}&callback=${cb}`
    document.head.appendChild(script)
  })
}

export async function searchTracks(term: string, limit = 10): Promise<Track[]> {
  const q = term.trim()
  if (q.length < 2) return []

  const url =
    'https://itunes.apple.com/search' +
    `?term=${encodeURIComponent(q)}` +
    `&entity=song&country=FR&limit=${limit}`

  let data: { results: ItunesResult[] }
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    data = await res.json()
  } catch {
    data = await jsonp<{ results: ItunesResult[] }>(url)
  }

  return (data.results ?? [])
    .filter((r) => r.trackId && r.trackName)
    .map((r) => ({
      trackId: r.trackId,
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName ?? '',
      // artworkUrl100 se redimensionne en changeant le suffixe.
      artwork: (r.artworkUrl100 ?? '').replace('100x100', '200x200'),
      previewUrl: r.previewUrl ?? null,
      appleUrl: r.trackViewUrl ?? `https://music.apple.com/fr/song/${r.trackId}`,
    }))
}
