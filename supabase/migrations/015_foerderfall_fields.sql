-- =============================================
-- FÖRDERFALL FELDER
-- Erweiterte Felder für Fachkräfte, Unternehmen und Vermittlungen
-- gemäß FKVI-Feldkonzept v1.0
-- =============================================

-- ── Profiles (Fachkraft) ──────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birth_date             DATE,
  ADD COLUMN IF NOT EXISTS social_security_number TEXT,
  ADD COLUMN IF NOT EXISTS ba_customer_number     TEXT,
  ADD COLUMN IF NOT EXISTS disability             BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS aufenthaltstitel       TEXT CHECK (aufenthaltstitel IN ('unbefristet', 'befristet', NULL)),
  ADD COLUMN IF NOT EXISTS aufenthaltstitel_bis   DATE,
  ADD COLUMN IF NOT EXISTS house_number           TEXT,
  ADD COLUMN IF NOT EXISTS residence_since        DATE,
  ADD COLUMN IF NOT EXISTS qualifikation          JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS soziales               JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── Companies (Unternehmen) ───────────────────────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS betriebsnummer  TEXT,
  ADD COLUMN IF NOT EXISTS ba_kundennummer TEXT,
  ADD COLUMN IF NOT EXISTS adresszusatz    TEXT,
  ADD COLUMN IF NOT EXISTS house_number    TEXT,
  ADD COLUMN IF NOT EXISTS address         TEXT,
  ADD COLUMN IF NOT EXISTS postal_code     TEXT,
  ADD COLUMN IF NOT EXISTS city            TEXT,
  ADD COLUMN IF NOT EXISTS klassifizierung JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── Reservations (Vermittlung / Förderfall) ───────────────────────────────────
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS arbeitsverhaeltnis JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verguetung         JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS massnahme          JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS foerderung         JSONB NOT NULL DEFAULT '{}'::jsonb;
