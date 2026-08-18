import { EVENT, mapsUrl } from '../config/event'

/**
 * Mini-carte composée de tuiles OpenStreetMap posées à la main.
 *
 * L'iframe officielle d'OSM réclame WebGL et s'affiche en gris sur les
 * appareils qui ne le gèrent pas ; ici ce sont de simples <img>, donc ça marche
 * partout, ça se style librement et il n'y a aucune clé d'API à gérer.
 */

/** Niveau de zoom très bas : la carte sert à situer Chiché dans la France, pas
 *  à trouver la porte d'entrée. Le bouton « Comment y aller » prend le relais
 *  pour l'itinéraire précis. */
const Z = 5
const TILE = 256

const lonToTile = (lon: number) => ((lon + 180) / 360) * 2 ** Z
const latToTile = (lat: number) => {
  const r = (lat * Math.PI) / 180
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** Z
}

export default function Map() {
  const { lat, lng } = EVENT.place

  // Position du point en « pixels monde » à ce niveau de zoom.
  const px = lonToTile(lng) * TILE
  const py = latToTile(lat) * TILE
  const cx = Math.floor(px / TILE)
  const cy = Math.floor(py / TILE)

  const tiles = []
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const tx = cx + dx
      const ty = cy + dy
      tiles.push(
        <img
          key={`${tx}-${ty}`}
          src={`https://tile.openstreetmap.org/${Z}/${tx}/${ty}.png`}
          alt=""
          loading="lazy"
          width={TILE}
          height={TILE}
          style={{
            position: 'absolute',
            // On décale l'ensemble pour que le point tombe pile au centre.
            left: `calc(50% + ${tx * TILE - px}px)`,
            top: `calc(50% + ${ty * TILE - py}px)`,
          }}
        />,
      )
    }
  }

  return (
    <a className="map" href={mapsUrl()} target="_blank" rel="noreferrer" aria-label="Ouvrir le plan">
      {tiles}
      <span className="map-pin" aria-hidden="true" />
      <span className="map-credit">© OpenStreetMap</span>
    </a>
  )
}
