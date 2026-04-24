-- Migration 006: CV / Lebenslauf fields for profiles

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birth_date     date,
  ADD COLUMN IF NOT EXISTS phone          text,
  ADD COLUMN IF NOT EXISTS contact_email  text,
  ADD COLUMN IF NOT EXISTS street         text,
  ADD COLUMN IF NOT EXISTS city           text,
  ADD COLUMN IF NOT EXISTS postal_code    text,
  ADD COLUMN IF NOT EXISTS country        text DEFAULT 'Deutschland',
  ADD COLUMN IF NOT EXISTS work_experience   jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS education_history jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS personal_skills   text[] DEFAULT '{}';

COMMENT ON COLUMN profiles.work_experience   IS '[{id,company,position,department,employment_type,start_date,end_date,is_current,description}]';
COMMENT ON COLUMN profiles.education_history IS '[{id,institution,degree,field,start_date,end_date,notes}]';
COMMENT ON COLUMN profiles.personal_skills   IS 'Array of skill tags (e.g. "Wundversorgung", "Palliativpflege")';
