import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://tjxxdiadfikkcequsrdz.supabase.co'

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqeHhkaWFkZmlra2NlcXVzcmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NTE5NTIsImV4cCI6MjEwNTUyNzk1Mn0.KkhjFe_RaxooqD5E_EO1rKB7PboYlEDVyRABOsvFAXc'

async function fetchConTiempo(url, options = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 22000)
  try {
    return await fetch(url, { ...options, signal: options.signal || ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: fetchConTiempo }
})
