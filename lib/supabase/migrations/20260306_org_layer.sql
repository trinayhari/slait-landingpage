-- Organization layer (additive to personal/public flows)

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

CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id
  ON public.organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id
  ON public.organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_org_id
  ON public.organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email
  ON public.organization_invites((LOWER(email)));

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_organization_id
  ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_organization_id
  ON public.sessions(organization_id);

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
  FOR INSERT WITH CHECK (
    public.is_org_admin(organization_id)
    OR auth.uid() = user_id
  );

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
  USING (
    organization_id IS NULL OR public.is_org_member(organization_id)
  )
  WITH CHECK (
    organization_id IS NULL OR public.is_org_member(organization_id)
  );

DROP POLICY IF EXISTS "sessions_org_scope_guard" ON public.sessions;
CREATE POLICY "sessions_org_scope_guard" ON public.sessions
  AS RESTRICTIVE
  FOR ALL
  USING (
    organization_id IS NULL OR public.is_org_member(organization_id)
  )
  WITH CHECK (
    organization_id IS NULL OR public.is_org_member(organization_id)
  );

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

-- Keep existing personal/public behavior strictly personal-scope.
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
