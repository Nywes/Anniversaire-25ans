import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * `null` tant que les variables d'environnement ne sont pas renseignées.
 * Dans ce cas l'app bascule sur localStorage (voir src/lib/store.ts) : on peut
 * développer et montrer le site sans avoir encore créé le projet Supabase.
 */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null

export const isLive = supabase !== null
