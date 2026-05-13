-- View-only send support
ALTER TABLE document_sends
  ADD COLUMN IF NOT EXISTS send_mode text DEFAULT 'sign' CHECK (send_mode IN ('sign', 'view')),
  ADD COLUMN IF NOT EXISTS source_url text;
