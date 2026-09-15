-- Smart Interview database (not the ERP database).
-- Adds one-on-one (human-conducted, Teams-based) interview support:
-- scheduling, live transcript capture, and AI/HR notes.
-- Idempotent: safe to re-run.

ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'ai_assisted';
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS interview_status TEXT NOT NULL DEFAULT 'pending_schedule';
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS scheduled_by TEXT;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS teams_join_url TEXT;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS teams_meeting_id TEXT;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS teams_event_id TEXT;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS live_transcript JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS ai_notes JSONB;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS hr_notes JSONB;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS notes_submitted_at TIMESTAMPTZ;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS notes_submitted_by TEXT;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS notes_email_sent_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'interviews_mode_check' AND conrelid = 'public.interviews'::regclass
  ) THEN
    ALTER TABLE public.interviews
      ADD CONSTRAINT interviews_mode_check
      CHECK (mode IN ('ai_assisted', 'one_on_one'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'interviews_interview_status_check' AND conrelid = 'public.interviews'::regclass
  ) THEN
    ALTER TABLE public.interviews
      ADD CONSTRAINT interviews_interview_status_check
      CHECK (interview_status IN ('pending_schedule', 'scheduled', 'completed', 'no_show', 'cancelled'));
  END IF;
END $$;
