import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables missing')
}

// Global 20-second timeout prevents Supabase token refresh from hanging
// indefinitely, which would queue all queries and leave pages stuck loading.
const fetchWithTimeout = (url, options = {}) => {
  const { signal: externalSignal, ...rest } = options
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000)
  const combinedSignal = externalSignal
    ? (AbortSignal.any
        ? AbortSignal.any([externalSignal, controller.signal])
        : controller.signal)
    : controller.signal
  return fetch(url, { ...rest, signal: combinedSignal })
    .finally(() => clearTimeout(timeoutId))
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: { fetch: fetchWithTimeout },
})
