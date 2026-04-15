# FKVI – Fachkraft Vermittlung International

## Projektstruktur

- `frontend/` — React + Vite + Tailwind + shadcn/ui
- `backend/` — Node.js + Express + socket.io
- `supabase/migrations/` — Datenbank-Schema

## Lokale Entwicklung

### Voraussetzungen
- Node.js >= 18
- npm >= 9

### Setup

1. Dependencies installieren:
```bash
cd frontend && npm install
cd ../backend && npm install
```

2. Umgebungsvariablen:
```bash
cp .env.example frontend/.env
cp .env.example backend/.env
# Dann .env Dateien mit echten Werten befüllen
```

3. Starten:
```bash
# Frontend (Port 5173)
cd frontend && npm run dev

# Backend (Port 3001)
cd backend && npm run dev
```

## Supabase

Projekt: https://sbqlpiksowrbefqweasn.supabase.co

Migrations manuell ausführen:
```bash
# In Supabase SQL Editor oder via psql
```

## Deployment

- Frontend → Vercel (Static)
- Backend → Vercel / eigener Server
