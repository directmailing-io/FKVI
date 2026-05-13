-- ─── Migration 009: Berufsgruppen-spezifische Spezialisierungen & Einrichtungstypen ───

-- 1. Add new columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS berufsgruppe text;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specializations_pflegefachkraft text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specializations_pflegeassistenz text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specializations_ota text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specializations_ata text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specializations_physiotherapie text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bereichswunsch_azubi text[] DEFAULT '{}';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS einrichtungstyp_pflegefachkraft text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS einrichtungstyp_pflegeassistenz text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS einrichtungstyp_ota text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS einrichtungstyp_ata text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS einrichtungstyp_physiotherapie text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS einrichtungstyp_azubi_pflege text[] DEFAULT '{}';

-- 2. Migrate all existing profiles to Pflegefachkraft (demo profiles only)
UPDATE profiles SET berufsgruppe = 'pflegefachkraft' WHERE berufsgruppe IS NULL;

-- 3. Migrate old specializations → specializations_pflegefachkraft
--    Map old flat labels to new berufsgruppen-specific labels
UPDATE profiles
SET specializations_pflegefachkraft = (
  SELECT COALESCE(array_agg(new_val ORDER BY new_val), '{}')
  FROM (
    SELECT CASE unnested
      WHEN 'Altenpflege'         THEN 'Altenpflege'
      WHEN 'Krankenpflege'       THEN 'Krankenpflege (allgemein)'
      WHEN 'Kinderkrankenpflege' THEN 'Kinderkrankenpflege'
      WHEN 'Intensivpflege'      THEN 'Intensivpflege'
      WHEN 'Onkologie'           THEN 'Onkologie'
      WHEN 'Palliativpflege'     THEN 'Palliativpflege'
      WHEN 'Psychiatrie'         THEN 'Psychiatrie'
      WHEN 'Neurologie'          THEN 'Neurologie'
      WHEN 'Geriatrie'           THEN 'Geriatrie'
      WHEN 'Demenzpflege'        THEN 'Demenzpflege'
      WHEN 'Wundmanagement'      THEN 'Wundmanagement'
      -- 'Orthopädie' has no direct match → dropped
      ELSE NULL
    END AS new_val
    FROM unnest(specializations) AS unnested
  ) t
  WHERE new_val IS NOT NULL
)
WHERE specializations IS NOT NULL AND array_length(specializations, 1) > 0;

-- 4. Migrate old preferred_facility_types → einrichtungstyp_pflegefachkraft
UPDATE profiles
SET einrichtungstyp_pflegefachkraft = (
  SELECT COALESCE(array_agg(new_val ORDER BY new_val), '{}')
  FROM (
    SELECT CASE unnested
      WHEN 'Stationäre Pflege / Pflegeheim' THEN 'Pflegeheim (vollstationär)'
      WHEN 'Ambulante Pflege'               THEN 'Ambulanter Pflegedienst'
      WHEN 'Intensivpflege'                 THEN 'Intensivstation (ITS)'
      WHEN 'Krankenhaus'                    THEN 'Krankenhaus (allgemein)'
      WHEN 'Rehabilitationszentrum'         THEN 'Rehabilitationsklinik'
      WHEN 'Psychiatrie'                    THEN 'Psychiatrische Klinik'
      WHEN 'Hospiz'                         THEN 'Hospiz'
      WHEN 'Behinderteneinrichtung'         THEN 'Behinderteneinrichtung'
      WHEN 'Tagespflege'                    THEN 'Tagespflege'
      ELSE NULL
    END AS new_val
    FROM unnest(preferred_facility_types) AS unnested
  ) t
  WHERE new_val IS NOT NULL
)
WHERE preferred_facility_types IS NOT NULL AND array_length(preferred_facility_types, 1) > 0;

-- 5. Drop old columns
ALTER TABLE profiles DROP COLUMN IF EXISTS specializations;
ALTER TABLE profiles DROP COLUMN IF EXISTS preferred_facility_types;
