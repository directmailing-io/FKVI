-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Document Signing Feature
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/sbqlpiksowrbefqweasn/sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Document Templates (Mediathek / Vorlagenbibliothek) ──────────────────────
create table if not exists public.document_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  storage_path  text not null,           -- path in 'document-templates' bucket
  file_name     text not null,
  file_size     bigint,
  page_count    integer,
  fields        jsonb not null default '[]'::jsonb,
  -- fields schema: [{id,type,page,x,y,width,height,label,required,prefill_key,group_name,option_value}]
  -- type: 'text' | 'checkbox' | 'signature' | 'date' | 'initials'
  -- x,y,width,height stored as % of page dimensions (0-100) for resolution independence
  is_active     boolean not null default true,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.document_templates enable row level security;

create policy "Admin full access on document_templates"
  on public.document_templates
  using (exists (select 1 from public.admin_users where user_id = auth.uid()));

-- ─── Document Sends (Dokument-Versand an Unterzeichner) ──────────────────────
create table if not exists public.document_sends (
  id                   uuid primary key default gen_random_uuid(),
  template_id          uuid not null references public.document_templates(id) on delete restrict,
  profile_id           uuid references public.profiles(id) on delete set null,
  token                text not null unique default encode(gen_random_bytes(32), 'hex'),
  prefill_data         jsonb not null default '{}'::jsonb,  -- {field_id: value}
  signer_name          text,
  signer_email         text,
  message              text,
  status               text not null default 'pending'
                       check (status in ('pending','opened','signed','submitted','expired','revoked')),
  expires_at           timestamptz default (now() + interval '30 days'),
  signed_storage_path  text,             -- path in 'signed-documents' bucket
  open_count           integer not null default 0,
  first_opened_at      timestamptz,
  last_opened_at       timestamptz,
  signed_at            timestamptz,
  submitted_at         timestamptz,
  sent_by              uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.document_sends enable row level security;

create policy "Admin full access on document_sends"
  on public.document_sends
  using (exists (select 1 from public.admin_users where user_id = auth.uid()));

-- ─── Audit Log (immutable, inserted only via service-role API) ─────────────
create table if not exists public.document_audit_log (
  id               uuid primary key default gen_random_uuid(),
  document_send_id uuid not null references public.document_sends(id) on delete cascade,
  event_type       text not null
                   check (event_type in ('created','opened','signed','submitted','revoked','downloaded')),
  ip_address       text,
  user_agent       text,
  metadata         jsonb,
  created_at       timestamptz not null default now()
);

alter table public.document_audit_log enable row level security;

create policy "Admin read on document_audit_log"
  on public.document_audit_log
  for select
  using (exists (select 1 from public.admin_users where user_id = auth.uid()));

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_document_sends_token         on public.document_sends (token);
create index if not exists idx_document_sends_profile_id    on public.document_sends (profile_id);
create index if not exists idx_document_sends_status        on public.document_sends (status);
create index if not exists idx_document_sends_signed_at     on public.document_sends (signed_at desc nulls last);
create index if not exists idx_document_audit_log_send_id   on public.document_audit_log (document_send_id);

-- ─── Storage Buckets (run separately if these fail due to permissions) ────────
-- Go to Supabase Dashboard → Storage → Create bucket:
--   Name: document-templates  Private: YES  Max size: 50MB  MIME: application/pdf
--   Name: signed-documents    Private: YES  Max size: 50MB  MIME: application/pdf
--   Name: signature-images    Private: YES  Max size: 2MB   MIME: image/png

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('document-templates', 'document-templates', false, 52428800, array['application/pdf']),
  ('signed-documents',   'signed-documents',   false, 52428800, array['application/pdf']),
  ('signature-images',   'signature-images',   false, 2097152,  array['image/png'])
on conflict (id) do nothing;
