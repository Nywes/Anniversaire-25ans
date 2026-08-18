/**
 * Microsoft Clarity : enregistrement des sessions et cartes de chaleur.
 *
 * Gratuit et sans plafond — pas d'échantillonnage, pas de limite de sessions,
 * contrairement à Hotjar ou PostHog dont les offres gratuites coupent vite.
 *
 * Ne se charge que si VITE_CLARITY_ID est renseignée : sans elle, aucun script
 * tiers n'est injecté et le site reste strictement autonome. C'est aussi ce qui
 * évite d'enregistrer ses propres allers-retours en développement.
 *
 * Reproduit le tampon officiel de Clarity (« Installer manuellement » dans le
 * tableau de bord) plutôt qu'un simple <script src> : window.clarity est posé
 * en fonction-file d'attente avant même que le script asynchrone soit chargé,
 * pour qu'un futur appel — un événement personnalisé, un identifiant — ne
 * s'exécute pas dans le vide s'il survient trop tôt.
 *
 * Clarity masque par défaut le contenu saisi dans les champs de formulaire :
 * les prénoms des accompagnants et les allergies ne partent donc pas dans les
 * enregistrements, seuls les clics et les déplacements sont visibles.
 */

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] }

declare global {
  interface Window {
    clarity?: ClarityFn
  }
}

const ID = import.meta.env.VITE_CLARITY_ID

export function startClarity() {
  if (!ID || typeof document === 'undefined') return
  if (window.clarity) return

  window.clarity = function (...args: unknown[]) {
    ;(window.clarity!.q = window.clarity!.q || []).push(args)
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.clarity.ms/tag/${ID}`
  document.head.appendChild(script)
}
