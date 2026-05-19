-- Team interest signups (landing page)
-- Run in Supabase SQL Editor: Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.team_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_interest_email ON public.team_interest ((LOWER(email)));
