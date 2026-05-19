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
-- PROJECTS (grouped session analyses)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL CHECK (source IN ('cursor', 'claude', 'chatgpt', 'copilot', 'windsurf', 'other')),
  overall_score NUMERIC(3,2),
  confidence TEXT CHECK (confidence IN ('High', 'Medium', 'Low')),
  hire_signal TEXT CHECK (hire_signal IN ('Strong Yes', 'Yes', 'Borderline', 'No')),
  dimension_scores JSONB,
  module_eval JSONB,
  summary TEXT,
  strengths JSONB NOT NULL DEFAULT '[]',
  weaknesses JSONB NOT NULL DEFAULT '[]',
  detected_patterns JSONB NOT NULL DEFAULT '[]',
  claude_md TEXT,
  skills_files JSONB,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON public.projects(is_public) WHERE is_public = true;

-- ---------------------------------------------------------------------------
-- SESSIONS (AI coding session analysis results)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  session_label TEXT,
  source TEXT NOT NULL CHECK (source IN ('cursor', 'claude', 'chatgpt', 'copilot', 'windsurf', 'other')),
  file_name TEXT,
  overall_score NUMERIC(3,2),
  confidence TEXT CHECK (confidence IN ('High', 'Medium', 'Low')),
  dimension_scores JSONB,
  dimension_evidence JSONB,
  -- 9-module full evaluation result (present on sessions analysed with pipeline v2.2+)
  module_eval JSONB,
  -- Annotated transcript turns (character-offset module spans per user message)
  annotated_turns JSONB,
  strengths JSONB NOT NULL DEFAULT '[]',
  weaknesses JSONB NOT NULL DEFAULT '[]',
  detected_patterns JSONB NOT NULL DEFAULT '[]',
  example_evidence JSONB NOT NULL DEFAULT '[]',
  hire_signal TEXT CHECK (hire_signal IN ('Strong Yes', 'Yes', 'Borderline', 'No')),
  summary TEXT NOT NULL,
  -- Raw chat log (original uploaded session)
  raw_log TEXT,
  -- Supplementary files uploaded alongside the chat log (CLAUDE.md, skills.md, etc.)
  supplementary_files JSONB,
  -- Config metadata from CLI (plans used, rules used, skills/plugins discovered)
  config_metadata JSONB,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON public.sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_is_public ON public.sessions(is_public) WHERE is_public = true;

-- ---------------------------------------------------------------------------
-- LEADERBOARD VIEW (best score per user, percentile rank)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.leaderboard_stats AS
WITH scored_entries AS (
  SELECT s.user_id, s.overall_score, 'session'::text AS entry_type
  FROM public.sessions s
  WHERE s.project_id IS NULL
    AND s.organization_id IS NULL
    AND s.overall_score IS NOT NULL

  UNION ALL

  SELECT p.user_id, p.overall_score, 'project'::text AS entry_type
  FROM public.projects p
  WHERE p.overall_score IS NOT NULL
    AND p.organization_id IS NULL
),
session_totals AS (
  SELECT s.user_id, COUNT(*)::bigint AS session_count
  FROM public.sessions s
  WHERE s.organization_id IS NULL
  GROUP BY s.user_id
),
project_totals AS (
  SELECT p.user_id, COUNT(*)::bigint AS project_count
  FROM public.projects p
  WHERE p.overall_score IS NOT NULL
    AND p.organization_id IS NULL
  GROUP BY p.user_id
),
public_users AS (
  SELECT p.id, p.handle, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.is_public = true
    AND EXISTS (
      SELECT 1 FROM scored_entries se
      WHERE se.user_id = p.id
    )
),
best_scores AS (
  SELECT
    se.user_id,
    MAX(se.overall_score) AS best_score,
    ROUND(AVG(se.overall_score)::numeric, 2) AS avg_score,
    COALESCE(st.session_count, 0) AS session_count,
    COALESCE(pt.project_count, 0) AS project_count
  FROM scored_entries se
  LEFT JOIN session_totals st ON st.user_id = se.user_id
  LEFT JOIN project_totals pt ON pt.user_id = se.user_id
  GROUP BY se.user_id, st.session_count, pt.project_count
),
ranked AS (
  SELECT
    pu.id,
    pu.handle,
    pu.display_name,
    pu.avatar_url,
    bs.best_score,
    bs.avg_score,
    bs.session_count,
    bs.project_count,
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
  avg_score,
  session_count,
  percentile_rank,
  ROUND((1 - percentile_rank) * 100)::INTEGER AS percentile_display,
  ROW_NUMBER() OVER (ORDER BY best_score DESC) AS rank,
  project_count
FROM ranked;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
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

-- Projects: users can CRUD own; anyone can read public projects
DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
CREATE POLICY "projects_select_own" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_select_public" ON public.projects;
CREATE POLICY "projects_select_public" ON public.projects
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
CREATE POLICY "projects_insert_own" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
CREATE POLICY "projects_update_own" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
CREATE POLICY "projects_delete_own" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

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

-- ---------------------------------------------------------------------------
-- MIGRATION: Add 9-module pipeline columns to existing sessions table
-- Run this if the sessions table already exists without these columns.
-- ---------------------------------------------------------------------------
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS module_eval JSONB;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS annotated_turns JSONB;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS raw_log TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_label TEXT;
ALTER TABLE public.sessions ALTER COLUMN overall_score DROP NOT NULL;
ALTER TABLE public.sessions ALTER COLUMN confidence DROP NOT NULL;
ALTER TABLE public.sessions ALTER COLUMN dimension_scores DROP NOT NULL;
ALTER TABLE public.sessions ALTER COLUMN hire_signal DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- MIGRATION: Add project table columns if projects table exists from older setup
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('cursor', 'claude', 'chatgpt', 'copilot', 'windsurf', 'other'));
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS overall_score NUMERIC(3,2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS confidence TEXT CHECK (confidence IN ('High', 'Medium', 'Low'));
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS hire_signal TEXT CHECK (hire_signal IN ('Strong Yes', 'Yes', 'Borderline', 'No'));
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS dimension_scores JSONB;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS module_eval JSONB;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS strengths JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS weaknesses JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS detected_patterns JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS claude_md TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS skills_files JSONB;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- MIGRATION: Add api_key to profiles for CLI authentication
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS api_key UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_api_key ON public.profiles(api_key);

-- ---------------------------------------------------------------------------
-- MIGRATION: Add status, turn_count, updated_at for live CLI session tracking
-- ---------------------------------------------------------------------------
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'complete'
  CHECK (status IN ('in_progress', 'complete'));
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS turn_count INTEGER DEFAULT 0;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ---------------------------------------------------------------------------
-- MIGRATION: Add ML-ready session data columns (event log + outcome metadata)
-- ---------------------------------------------------------------------------
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_events JSONB DEFAULT '[]';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS end_reason TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Enable Supabase Realtime on sessions for live dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;

-- ---------------------------------------------------------------------------
-- Get session metadata for a public profile (includes private sessions for display)
-- SECURITY DEFINER so we can show private session metadata on profile pages.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_profile_sessions(p_profile_id uuid)
RETURNS TABLE (
  id uuid,
  source text,
  file_name text,
  overall_score numeric,
  hire_signal text,
  dimension_scores jsonb,
  created_at timestamptz,
  is_public boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.source, s.file_name, s.overall_score, s.hire_signal, s.dimension_scores, s.created_at, s.is_public
  FROM sessions s
  JOIN profiles p ON p.id = s.user_id AND p.id = p_profile_id AND p.is_public = true
  WHERE s.project_id IS NULL
    AND s.organization_id IS NULL
    AND s.overall_score IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_sessions(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_profile_sessions(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Get project metadata for a public profile
-- SECURITY DEFINER so project metadata can be listed on public profiles.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_profile_projects(p_profile_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  source text,
  overall_score numeric,
  hire_signal text,
  created_at timestamptz,
  is_public boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p2.id, p2.name, p2.source, p2.overall_score, p2.hire_signal, p2.created_at, p2.is_public
  FROM projects p2
  JOIN profiles p ON p.id = p2.user_id AND p.id = p_profile_id AND p.is_public = true
  WHERE p2.organization_id IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_projects(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_profile_projects(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- TEAM INTEREST (landing page signups for team/candidates)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique per email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_interest_email ON public.team_interest ((LOWER(email)));

-- ---------------------------------------------------------------------------
-- FEEDBACK (landing page feedback form submissions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ORGANIZATIONS (additive org scope for profiles/projects/leaderboard)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organizations_slug_format
    CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$')
);

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON public.organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON public.organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON public.organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.organization_invites((LOWER(email)));

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_organization_id ON public.sessions(organization_id);

CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships m
    WHERE m.organization_id = org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships m
    WHERE m.organization_id = org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role = 'admin'
  );
$$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_select_member" ON public.organizations;
CREATE POLICY "organizations_select_member" ON public.organizations
  FOR SELECT USING (public.is_org_member(id));

DROP POLICY IF EXISTS "organizations_insert_creator" ON public.organizations;
CREATE POLICY "organizations_insert_creator" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "organizations_update_admin" ON public.organizations;
CREATE POLICY "organizations_update_admin" ON public.organizations
  FOR UPDATE USING (public.is_org_admin(id));

DROP POLICY IF EXISTS "organization_memberships_select_member" ON public.organization_memberships;
CREATE POLICY "organization_memberships_select_member" ON public.organization_memberships
  FOR SELECT USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "organization_memberships_insert_admin_or_self" ON public.organization_memberships;
CREATE POLICY "organization_memberships_insert_admin_or_self" ON public.organization_memberships
  FOR INSERT WITH CHECK (public.is_org_admin(organization_id) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "organization_memberships_update_admin" ON public.organization_memberships;
CREATE POLICY "organization_memberships_update_admin" ON public.organization_memberships
  FOR UPDATE USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "organization_memberships_delete_admin" ON public.organization_memberships;
CREATE POLICY "organization_memberships_delete_admin" ON public.organization_memberships
  FOR DELETE USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "organization_invites_select_admin" ON public.organization_invites;
CREATE POLICY "organization_invites_select_admin" ON public.organization_invites
  FOR SELECT USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "organization_invites_insert_admin" ON public.organization_invites;
CREATE POLICY "organization_invites_insert_admin" ON public.organization_invites
  FOR INSERT WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "organization_invites_update_admin" ON public.organization_invites;
CREATE POLICY "organization_invites_update_admin" ON public.organization_invites
  FOR UPDATE USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "projects_select_org_member" ON public.projects;
CREATE POLICY "projects_select_org_member" ON public.projects
  FOR SELECT USING (
    organization_id IS NOT NULL
    AND public.is_org_member(organization_id)
  );

DROP POLICY IF EXISTS "sessions_select_org_member" ON public.sessions;
CREATE POLICY "sessions_select_org_member" ON public.sessions
  FOR SELECT USING (
    organization_id IS NOT NULL
    AND public.is_org_member(organization_id)
  );

DROP POLICY IF EXISTS "projects_org_scope_guard" ON public.projects;
CREATE POLICY "projects_org_scope_guard" ON public.projects
  AS RESTRICTIVE
  FOR ALL
  USING (organization_id IS NULL OR public.is_org_member(organization_id))
  WITH CHECK (organization_id IS NULL OR public.is_org_member(organization_id));

DROP POLICY IF EXISTS "sessions_org_scope_guard" ON public.sessions;
CREATE POLICY "sessions_org_scope_guard" ON public.sessions
  AS RESTRICTIVE
  FOR ALL
  USING (organization_id IS NULL OR public.is_org_member(organization_id))
  WITH CHECK (organization_id IS NULL OR public.is_org_member(organization_id));

CREATE OR REPLACE FUNCTION public.get_org_leaderboard(p_org_slug text)
RETURNS TABLE (
  id uuid,
  handle text,
  display_name text,
  avatar_url text,
  best_score numeric,
  avg_score numeric,
  session_count bigint,
  project_count bigint,
  percentile_rank double precision,
  percentile_display integer,
  rank bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH org AS (
  SELECT id
  FROM public.organizations
  WHERE slug = p_org_slug
),
scored_entries AS (
  SELECT s.user_id, s.overall_score
  FROM public.sessions s
  WHERE s.overall_score IS NOT NULL
    AND s.organization_id = (SELECT id FROM org)
  UNION ALL
  SELECT p.user_id, p.overall_score
  FROM public.projects p
  WHERE p.overall_score IS NOT NULL
    AND p.organization_id = (SELECT id FROM org)
),
session_totals AS (
  SELECT s.user_id, COUNT(*)::bigint AS session_count
  FROM public.sessions s
  WHERE s.organization_id = (SELECT id FROM org)
  GROUP BY s.user_id
),
project_totals AS (
  SELECT p.user_id, COUNT(*)::bigint AS project_count
  FROM public.projects p
  WHERE p.organization_id = (SELECT id FROM org)
    AND p.overall_score IS NOT NULL
  GROUP BY p.user_id
),
best_scores AS (
  SELECT
    se.user_id,
    MAX(se.overall_score) AS best_score,
    ROUND(AVG(se.overall_score)::numeric, 2) AS avg_score,
    COALESCE(st.session_count, 0) AS session_count,
    COALESCE(pt.project_count, 0) AS project_count
  FROM scored_entries se
  LEFT JOIN session_totals st ON st.user_id = se.user_id
  LEFT JOIN project_totals pt ON pt.user_id = se.user_id
  GROUP BY se.user_id, st.session_count, pt.project_count
),
ranked AS (
  SELECT
    p.id,
    p.handle,
    p.display_name,
    p.avatar_url,
    bs.best_score,
    bs.avg_score,
    bs.session_count,
    bs.project_count,
    PERCENT_RANK() OVER (ORDER BY bs.best_score DESC) AS percentile_rank
  FROM public.profiles p
  JOIN best_scores bs ON bs.user_id = p.id
)
SELECT
  id,
  handle,
  display_name,
  avatar_url,
  best_score,
  avg_score,
  session_count,
  project_count,
  percentile_rank,
  ROUND((1 - percentile_rank) * 100)::INTEGER AS percentile_display,
  ROW_NUMBER() OVER (ORDER BY best_score DESC) AS rank
FROM ranked;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_leaderboard(text) TO authenticated;
