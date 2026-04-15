-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES (Fachkräfte)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Status
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'reserved', 'completed')),

  -- Persönliche Daten
  first_name TEXT,
  last_name TEXT,
  gender TEXT CHECK (gender IN ('männlich', 'weiblich', 'divers')),
  age INTEGER CHECK (age > 0 AND age < 100),
  nationality TEXT,
  marital_status TEXT,
  children_count INTEGER DEFAULT 0,
  has_drivers_license BOOLEAN DEFAULT false,

  -- Präferenzen
  state_preferences TEXT[] DEFAULT '{}',
  nationwide BOOLEAN DEFAULT false,
  preferred_facility_types TEXT[] DEFAULT '{}',
  work_time_preference TEXT,

  -- Medien
  profile_image_url TEXT,
  vimeo_video_url TEXT,
  vimeo_video_id TEXT,

  -- Ausbildung
  school_education TEXT,
  nursing_education TEXT,
  education_duration TEXT,
  graduation_year INTEGER,
  german_recognition TEXT CHECK (german_recognition IN ('anerkannt', 'in_bearbeitung', 'nicht_beantragt', 'abgelehnt')),
  education_notes TEXT,

  -- Qualifikationen
  specializations TEXT[] DEFAULT '{}',
  additional_qualifications TEXT[] DEFAULT '{}',

  -- Berufserfahrung
  total_experience_years NUMERIC(5,1),
  germany_experience_years NUMERIC(5,1),
  experience_areas TEXT[] DEFAULT '{}',

  -- Sprache
  language_skills JSONB DEFAULT '[]',

  -- FKVI-intern
  fkvi_competency_proof TEXT,
  internal_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROFILE DOCUMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS profile_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  doc_type TEXT,
  description TEXT,
  link TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COMPANIES (Unternehmen)
-- =============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  internal_notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FAVORITES
-- =============================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, profile_id)
);

-- =============================================
-- RESERVATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  process_status INTEGER NOT NULL DEFAULT 1
    CHECK (process_status BETWEEN 1 AND 11),
  reserved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- =============================================
-- PROCESS STATUS HISTORY
-- =============================================
CREATE TABLE IF NOT EXISTS process_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  old_status INTEGER,
  new_status INTEGER NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ADMIN USERS (separate table to identify admins)
-- =============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: get company_id for current user
CREATE OR REPLACE FUNCTION get_company_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM companies WHERE user_id = auth.uid() LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES policies
CREATE POLICY "Admin: full access to profiles"
  ON profiles FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Public: read published profiles"
  ON profiles FOR SELECT
  USING (status = 'published');

CREATE POLICY "Company: read published profiles"
  ON profiles FOR SELECT
  USING (
    status = 'published'
    AND EXISTS (SELECT 1 FROM companies WHERE user_id = auth.uid() AND status = 'approved')
  );

CREATE POLICY "Company: read own reserved profiles"
  ON profiles FOR SELECT
  USING (
    status = 'reserved'
    AND EXISTS (
      SELECT 1 FROM reservations r
      JOIN companies c ON r.company_id = c.id
      WHERE r.profile_id = profiles.id
      AND c.user_id = auth.uid()
    )
  );

-- PROFILE DOCUMENTS policies
CREATE POLICY "Admin: full access to documents"
  ON profile_documents FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Company/Public: read documents of visible profiles"
  ON profile_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = profile_documents.profile_id
      AND (
        p.status = 'published'
        OR (
          p.status = 'reserved'
          AND EXISTS (
            SELECT 1 FROM reservations r
            JOIN companies c ON r.company_id = c.id
            WHERE r.profile_id = p.id AND c.user_id = auth.uid()
          )
        )
      )
    )
  );

-- COMPANIES policies
CREATE POLICY "Admin: full access to companies"
  ON companies FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Company: read own company"
  ON companies FOR SELECT
  USING (user_id = auth.uid());

-- FAVORITES policies
CREATE POLICY "Company: manage own favorites"
  ON favorites FOR ALL
  USING (company_id = get_company_id())
  WITH CHECK (company_id = get_company_id());

-- RESERVATIONS policies
CREATE POLICY "Admin: full access to reservations"
  ON reservations FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Company: read own reservations"
  ON reservations FOR SELECT
  USING (company_id = get_company_id());

-- PROCESS STATUS HISTORY policies
CREATE POLICY "Admin: full access to history"
  ON process_status_history FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Company: read own history"
  ON process_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reservations r
      JOIN companies c ON r.company_id = c.id
      WHERE r.id = process_status_history.reservation_id
      AND c.user_id = auth.uid()
    )
  );

-- ADMIN USERS policies
CREATE POLICY "Admin: read admin users"
  ON admin_users FOR SELECT
  USING (is_admin());

-- =============================================
-- STORAGE BUCKET for profile images
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admin: upload profile images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-images' AND is_admin());

CREATE POLICY "Public: read profile images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

CREATE POLICY "Admin: delete profile images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'profile-images' AND is_admin());
