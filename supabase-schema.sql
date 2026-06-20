-- =============================================================
--  DADFLIX — Supabase Schema
--  Run this entire file in your Supabase SQL Editor:
--  Dashboard → SQL Editor → New Query → Paste → Run
-- =============================================================

-- ── Settings (stores the admin passcode) ─────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Profiles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#e5573f',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Hero Banners (one per profile) ────────────────────────────
CREATE TABLE IF NOT EXISTS heroes (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id     UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  tag            TEXT DEFAULT 'A DADFLIX ORIGINAL',
  title          TEXT NOT NULL,
  description    TEXT,
  background_url TEXT,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Memory Rows (named shelves per profile) ───────────────────
CREATE TABLE IF NOT EXISTS memory_rows (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  position   INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Memory Cards (individual memories inside a row) ───────────
CREATE TABLE IF NOT EXISTS cards (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  row_id        UUID REFERENCES memory_rows(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  year          TEXT,
  match_text    TEXT DEFAULT '100% Match',
  message       TEXT,
  media_url     TEXT,
  media_type    TEXT DEFAULT 'image',   -- 'image' | 'video'
  thumbnail_url TEXT,                   -- for videos: first-frame thumbnail
  position      INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
--  Row Level Security — allow anonymous public access
--  (This is a private family link site, protected by admin code)
-- =============================================================

ALTER TABLE settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE heroes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards       ENABLE ROW LEVEL SECURITY;

-- Settings
CREATE POLICY "anon_select_settings" ON settings FOR SELECT USING (true);
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_settings" ON settings FOR DELETE USING (true);

-- Profiles
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE USING (true);

-- Heroes
CREATE POLICY "anon_select_heroes" ON heroes FOR SELECT USING (true);
CREATE POLICY "anon_insert_heroes" ON heroes FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_heroes" ON heroes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_heroes" ON heroes FOR DELETE USING (true);

-- Memory Rows
CREATE POLICY "anon_select_rows" ON memory_rows FOR SELECT USING (true);
CREATE POLICY "anon_insert_rows" ON memory_rows FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_rows" ON memory_rows FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_rows" ON memory_rows FOR DELETE USING (true);

-- Cards
CREATE POLICY "anon_select_cards" ON cards FOR SELECT USING (true);
CREATE POLICY "anon_insert_cards" ON cards FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_cards" ON cards FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_cards" ON cards FOR DELETE USING (true);

-- =============================================================
--  Storage bucket — run this separately OR create it manually
--  in: Storage → New Bucket → "dadflix-media" → Public
-- =============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('dadflix-media', 'dadflix-media', true)
-- ON CONFLICT DO NOTHING;
