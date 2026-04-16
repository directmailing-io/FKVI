import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import ProfileCard from '@/components/matching/ProfileCard'
import ProfileDetailModal from '@/components/matching/ProfileDetailModal'
import FilterPanel, { EMPTY_FILTERS, countActiveFilters } from '@/components/matching/FilterPanel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SlidersHorizontal, Heart, Loader2, User, EyeOff } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function MatchingBrowse() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState(new Set())
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [detailProfile, setDetailProfile] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)
  const { companyId, session } = useAuthStore()

  useEffect(() => {
    let mounted = true

    const run = async () => {
      setLoading(true)
      try {
        const { data } = await Promise.race([
          supabase
            .from('profiles')
            .select(`
              id, gender, age, nationality, marital_status, children_count, has_drivers_license,
              state_preferences, nationwide, preferred_facility_types, work_time_preference,
              profile_image_url, vimeo_video_url, vimeo_video_id,
              nursing_education, education_duration, graduation_year, german_recognition, education_notes,
              specializations, additional_qualifications,
              total_experience_years, germany_experience_years, experience_areas,
              language_skills, fkvi_competency_proof
            `)
            .eq('status', 'published')
            .order('created_at', { ascending: false }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
        ])
        if (mounted) setProfiles(data || [])
      } catch {
        if (mounted) setProfiles([])
      } finally {
        if (mounted) setLoading(false)
      }

      if (!companyId) return
      try {
        const { data } = await Promise.race([
          supabase.from('favorites').select('profile_id').eq('company_id', companyId),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
        ])
        if (mounted) setFavorites(new Set((data || []).map(f => f.profile_id)))
      } catch {
        // non-critical
      }
    }

    run()
    return () => { mounted = false }
  }, [companyId])

  const toggleFavorite = async (profileId) => {
    if (!companyId) return
    const isFav = favorites.has(profileId)
    if (isFav) {
      await supabase.from('favorites').delete()
        .eq('company_id', companyId)
        .eq('profile_id', profileId)
      setFavorites(prev => { const next = new Set(prev); next.delete(profileId); return next })
    } else {
      await supabase.from('favorites').insert({ company_id: companyId, profile_id: profileId })
      setFavorites(prev => new Set([...prev, profileId]))
    }
  }

  const applyFilters = useCallback((profiles) => {
    return profiles.filter(p => {
      if (filters.gender && p.gender !== filters.gender) return false
      if (filters.german_recognition && p.german_recognition !== filters.german_recognition) return false
      if (filters.has_drivers_license && !p.has_drivers_license) return false
      if (filters.work_time_preference && p.work_time_preference !== filters.work_time_preference) return false

      if (filters.specializations.length > 0) {
        if (!filters.specializations.some(s => (p.specializations || []).includes(s))) return false
      }
      if (filters.additional_qualifications.length > 0) {
        if (!filters.additional_qualifications.some(q => (p.additional_qualifications || []).includes(q))) return false
      }
      if (filters.experience_areas.length > 0) {
        if (!filters.experience_areas.some(a => (p.experience_areas || []).includes(a))) return false
      }
      if (filters.preferred_facility_types.length > 0) {
        if (!filters.preferred_facility_types.some(t => (p.preferred_facility_types || []).includes(t))) return false
      }
      if (filters.state_preferences.length > 0) {
        if (!p.nationwide && !filters.state_preferences.some(s => (p.state_preferences || []).includes(s))) return false
      }
      return true
    })
  }, [filters])

  const filtered = applyFilters(profiles)
  const favoriteCount = favorites.size
  const activeFilterCount = countActiveFilters(filters)

  const handleBookAppointment = async () => {
    if (favorites.size === 0 || !session?.access_token || !companyId) return
    setBookingLoading(true)
    try {
      const res = await fetch('/api/matching/save-interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ profile_ids: [...favorites], company_id: companyId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      window.open('https://calendly.com/fachkraft-vermittlung/beratungsgesprach-fachkrafte-aus-dem-ausland', '_blank')
    } catch (err) {
      toast({ title: 'Fehler', description: err.message || 'Bitte versuchen Sie es erneut.', variant: 'destructive' })
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Welcome Banner ── */}
      {!bannerDismissed && (
        <div className="bg-[#1e3a5f] rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)'
          }} />
          <button
            onClick={() => setBannerDismissed(true)}
            className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors text-lg leading-none"
          >×</button>

          <h2 className="font-bold text-base mb-3">Willkommen auf der FKVI Matching-Plattform</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="flex items-start gap-3 bg-white/10 rounded-xl p-3">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <div>
                <p className="font-semibold mb-0.5">Profile entdecken & filtern</p>
                <p className="text-white/65 text-xs leading-relaxed">
                  Alle Profile sind anonymisiert – Name und Kontaktdaten werden erst nach Ihrer Anfrage geteilt. Nutzen Sie Filter, um passende Fachkräfte zu finden.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white/10 rounded-xl p-3">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <div>
                <p className="font-semibold mb-0.5">
                  <Heart className="h-3.5 w-3.5 inline mr-1 fill-white" />Vormerken & Termin anfragen
                </p>
                <p className="text-white/65 text-xs leading-relaxed">
                  Interessante Profile über das Herz-Symbol vormerken und dann „Interesse bekunden" – wir kontaktieren Sie für ein Kennenlerngespräch.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white/10 rounded-xl p-3">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <div>
                <p className="font-semibold mb-0.5">Kandidaten reservieren</p>
                <p className="text-white/65 text-xs leading-relaxed">
                  Passt der Kandidat nach dem Kennenlernen? FKVI reserviert die Fachkraft exklusiv für Ihr Unternehmen und begleitet den gesamten Prozess.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
            <EyeOff className="h-3.5 w-3.5 text-white/50 shrink-0" />
            <p className="text-xs text-white/50">
              Alle Namen und Kontaktdaten sind anonymisiert. Die vollständigen Informationen erhalten Sie erst nach erfolgreicher Vermittlung.
            </p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matching-Plattform</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {loading ? 'Lädt...' : `${filtered.length} ${filtered.length === 1 ? 'Fachkraft' : 'Fachkräfte'} verfügbar`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'border-fkvi-blue bg-fkvi-blue/5 text-fkvi-blue'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-fkvi-blue text-white text-xs rounded-full px-1.5">{activeFilterCount}</span>
            )}
          </button>
          {favoriteCount > 0 && (
            <Button onClick={handleBookAppointment} variant="teal" size="sm" disabled={bookingLoading}>
              {bookingLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Heart className="h-4 w-4 mr-1.5 fill-white" />}
              Termin buchen & Profile freischalten ({favoriteCount})
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filters - Desktop sidebar */}
        {showFilters && (
          <div className="hidden lg:block w-64 shrink-0">
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(EMPTY_FILTERS)}
            />
          </div>
        )}

        {/* Profile Grid */}
        <div className="flex-1 min-w-0">
          {/* Mobile Filters */}
          {showFilters && (
            <div className="lg:hidden mb-4">
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                onReset={() => setFilters(EMPTY_FILTERS)}
              />
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <Skeleton className="h-44 rounded-none" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-8 w-full mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
              <User className="h-12 w-12 text-gray-200 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-600 mb-1">Keine Profile gefunden</h3>
              <p className="text-gray-400 text-sm">Versuchen Sie es mit anderen Filtereinstellungen.</p>
              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Filter zurücksetzen
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(profile => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  isFavorite={favorites.has(profile.id)}
                  onToggleFavorite={toggleFavorite}
                  onViewDetail={(p) => { setDetailProfile(p); setDetailOpen(true) }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Favorite bar (bottom) */}
      {favoriteCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-fkvi-blue text-white rounded-full px-5 py-2.5 shadow-lg flex items-center gap-3">
            <Heart className="h-4 w-4 fill-white" />
            <span className="text-sm font-medium">{favoriteCount} vorgemerkt</span>
            <button
              onClick={handleBookAppointment}
              disabled={bookingLoading}
              className="bg-white text-fkvi-blue text-xs font-semibold px-3 py-1 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-60"
            >
              {bookingLoading ? 'Wird gespeichert...' : 'Termin buchen & freischalten →'}
            </button>
          </div>
        </div>
      )}

      {/* Profile Detail Modal */}
      <ProfileDetailModal
        profile={detailProfile}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        isFavorite={detailProfile ? favorites.has(detailProfile.id) : false}
        onToggleFavorite={toggleFavorite}
      />

    </div>
  )
}
