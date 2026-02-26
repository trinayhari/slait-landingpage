-- Public Leaderboard Feature - Supabase schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- Enable UUID extension if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Handle must be URL-safe (lowercase alphanumeric, hyphens, 1-31 chars)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_handle_format
  CHECK (handle ~ '^[a-z0-9]([a-z0-9-]{0,29}[a-z0-9])?$');

CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles(handle);
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON public.profiles(is_public) WHERE is_public = true;

-- ---------------------------------------------------------------------------
-- SESSIONS (AI coding session analysis results)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('cursor', 'claude', 'chatgpt', 'copilot', 'windsurf', 'other')),
  file_name TEXT,
  overall_score NUMERIC(3,2) NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('High', 'Medium', 'Low')),
  dimension_scores JSONB NOT NULL,
  dimension_evidence JSONB,
  strengths JSONB NOT NULL DEFAULT '[]',
  weaknesses JSONB NOT NULL DEFAULT '[]',
  detected_patterns JSONB NOT NULL DEFAULT '[]',
  example_evidence JSONB NOT NULL DEFAULT '[]',
  hire_signal TEXT NOT NULL CHECK (hire_signal IN ('Strong Yes', 'Yes', 'Borderline', 'No')),
  summary TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_is_public ON public.sessions(is_public) WHERE is_public = true;

-- ---------------------------------------------------------------------------
-- LEADERBOARD VIEW (best score per user, percentile rank)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.leaderboard_stats AS
WITH public_users AS (
  SELECT p.id, p.handle, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.is_public = true
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.user_id = p.id AND s.is_public = true
    )
),
best_scores AS (
  SELECT
    s.user_id,
    MAX(s.overall_score) AS best_score,
    COUNT(*) AS session_count
  FROM public.sessions s
  WHERE s.is_public = true
  GROUP BY s.user_id
),
ranked AS (
  SELECT
    pu.id,
    pu.handle,
    pu.display_name,
    pu.avatar_url,
    bs.best_score,
    bs.session_count,
    PERCENT_RANK() OVER (ORDER BY bs.best_score DESC) AS percentile_rank
  FROM public_users pu
  JOIN best_scores bs ON bs.user_id = pu.id
)
SELECT
  id,
  handle,
  display_name,
  avatar_url,
  best_score,
  session_count,
  percentile_rank,
  ROUND((1 - percentile_rank) * 100)::INTEGER AS percentile_display,
  ROW_NUMBER() OVER (ORDER BY best_score DESC) AS rank
FROM ranked;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update own; anyone can read public profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Sessions: users can CRUD own; anyone can read public sessions
DROP POLICY IF EXISTS "sessions_select_own" ON public.sessions;
CREATE POLICY "sessions_select_own" ON public.sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_select_public" ON public.sessions;
CREATE POLICY "sessions_select_public" ON public.sessions
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "sessions_insert_own" ON public.sessions;
CREATE POLICY "sessions_insert_own" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_update_own" ON public.sessions;
CREATE POLICY "sessions_update_own" ON public.sessions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_delete_own" ON public.sessions;
CREATE POLICY "sessions_delete_own" ON public.sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Leaderboard view: readable by all (uses underlying tables' RLS via security_invoker or we grant select)
-- Views in Postgres use RLS of underlying tables when accessed. For leaderboard_stats we want public read.
-- Grant usage on the view (default: view uses definer rights, so we need to allow anon/authenticated to read)
-- Actually in Supabase, authenticated and anon can query the view; the view reads from profiles and sessions
-- which have RLS. So we need the view to be readable. Create a policy isn't for views in older PG.
-- In Postgres 15+ we can use security_invoker. Simpler: grant SELECT on leaderboard_stats to anon, authenticated.
GRANT SELECT ON public.leaderboard_stats TO anon;
GRANT SELECT ON public.leaderboard_stats TO authenticated;

-- ---------------------------------------------------------------------------
-- AUTH TRIGGER: create profile on signup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_handle TEXT;
  candidate TEXT;
  suffix INT := 0;
BEGIN
  -- Generate base handle from email or id
  base_handle := LOWER(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'user'), '[^a-zA-Z0-9]', '', 'g'));
  IF length(base_handle) < 2 THEN
    base_handle := 'user';
  END IF;
  base_handle := substring(base_handle from 1 for 28);

  candidate := base_handle;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE handle = candidate) LOOP
    suffix := suffix + 1;
    candidate := base_handle || suffix::TEXT;
    IF length(candidate) > 31 THEN
      base_handle := substring(base_handle from 1 for 28 - length(suffix::TEXT));
      candidate := base_handle || suffix::TEXT;
    END IF;
  END LOOP;

  INSERT INTO public.profiles (id, handle, display_name, avatar_url)
  VALUES (
    NEW.id,
    candidate,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- UPDATED_AT for profiles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
