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

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await get().setSession(session)
      } else {
        set({ user: null, session: null, isAdmin: false, companyId: null, loading: false })
      }
    })
  },

  setSession: async (session) => {
    const user = session.user

    // Check if admin
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    // Check if company
    let companyId = null
    if (!adminData) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single()
      companyId = companyData?.id || null
    }

    set({
      user,
      session,
      isAdmin: !!adminData,
      companyId,
      loading: false,
    })
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
