import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  isAdmin: false,
  companyId: null,
  loading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await get().setSession(session)
    } else {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        // If it's the same user already in the store, just update the session
        // token in memory — no need to re-query the DB. Admin status and
        // companyId don't change between sessions for the same user.
        // Calling setSession() here would fire concurrent DB queries that
        // interfere with Supabase's internal token handling across tabs and
        // can leave the client in a broken state where all queries hang.
        if (get().user?.id === session.user.id) {
          set({ session, user: session.user })
        } else {
          // Different user (e.g. fresh login) — query DB to determine role
          await get().setSession(session)
        }
      } else {
        set({ user: null, session: null, isAdmin: false, companyId: null, loading: false })
      }
    })
  },

  setSession: async (session) => {
    const user = session.user

    const { data: adminData } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let companyId = null
    if (!adminData) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single()
      companyId = companyData?.id || null
    }

    set({ user, session, isAdmin: !!adminData, companyId, loading: false })
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // Eagerly sync store so callers can immediately read isAdmin/companyId after await.
    // onAuthStateChange will fire too, but takes the fast path (same user) without a DB query.
    await get().setSession(data.session)
    return data
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, isAdmin: false, companyId: null })
  },
}))
