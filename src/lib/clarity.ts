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
 * Clarity masque par défaut le contenu saisi dans les champs de formulaire :
 * les prénoms des accompagnants et les allergies ne partent donc pas dans les
 * enregistrements, seuls les clics et les déplacements sont visibles.
 */

const ID = import.meta.env.VITE_CLARITY_ID

export function startClarity() {
  if (!ID || typeof document === 'undefined') return
  if (document.getElementById('clarity-script')) return

  const s = document.createElement('script')
  s.id = 'clarity-script'
  s.async = true
  s.src = `https://www.clarity.ms/tag/${ID}`
  document.head.appendChild(s)
}
