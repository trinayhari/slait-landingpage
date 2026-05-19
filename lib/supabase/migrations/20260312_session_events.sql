-- Add ML-ready session data columns to capture event logs and outcome metadata
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_events JSONB DEFAULT '[]';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS end_reason TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS error_message TEXT;
