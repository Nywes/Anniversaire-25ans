import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/*
 * On échoue bruyamment plutôt que de retomber sur un stockage local : un site
 * qui a l'air de marcher mais qui perd les réponses est bien pire qu'un site
 * qui refuse de démarrer. Les variables sont inlinées à la compilation, donc
 * les ajouter sur Vercel ne suffit pas — il faut redéployer.
 */
if (!url || !key) {
  throw new Error(
    'VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont obligatoires. ' +
      'En local : remplis .env. Sur Vercel : Settings → Environment Variables, puis redéploie.',
  )
}

export const supabase = createClient(url, key)
