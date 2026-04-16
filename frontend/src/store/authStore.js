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
        if (event === 'TOKEN_REFRESHED') {
          // Only update session token — user roles never change on refresh,
          // so there is no need to re-query admin_users / companies.
          // Doing so caused concurrent DB queries that could leave the
          // Supabase client in a broken state after a cross-tab token refresh.
          set({ session, user: session.user })
        } else {
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
    return data
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, isAdmin: false, companyId: null })
  },
}))
