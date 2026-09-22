-- Smart Interview database (not the ERP database).
-- Interview Notes Engine, Phase 1: generalize the one-on-one live-capture-and-draft
-- pattern (previously hardcoded to a single interview row: live_transcript / ai_notes /
-- hr_notes on public.interviews) so it works for EVERY human interview round, not just
-- the initial one-on-one screening call.
--
-- One interview (one candidate's application) can now have multiple human rounds --
-- Screening, Interview, Final Interview with MD, HR Round -- each needing its own
-- transcript and notes. round_notes is the child table: one row per (interview, round).
--
-- interviews.live_transcript / ai_notes / hr_notes / notes_submitted_at / notes_submitted_by
-- are NOT dropped -- existing one-on-one screening rows already in flight keep working
-- unchanged. New rounds write to round_notes instead; the backfill below copies any
-- existing screening-round data across so history isn't lost, without touching the
-- original columns.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.round_notes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id      UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  round             TEXT NOT NULL,
  transcript_source TEXT NOT NULL DEFAULT 'mic',
  live_transcript   JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_draft          JSONB,
  ai_verified       JSONB,
  hr_notes          JSONB,
  submitted_at      TIMESTAMPTZ,
  submitted_by      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS round_notes_interview_round_unique
  ON public.round_notes(interview_id, round);

CREATE INDEX IF NOT EXISTS round_notes_interview_id_idx ON public.round_notes(interview_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'round_notes_round_check' AND conrelid = 'public.round_notes'::regclass
  ) THEN
    ALTER TABLE public.round_notes
      ADD CONSTRAINT round_notes_round_check
      CHECK (round IN ('screening', 'interview', 'final_md', 'hr_round'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'round_notes_transcript_source_check' AND conrelid = 'public.round_notes'::regclass
  ) THEN
    ALTER TABLE public.round_notes
      ADD CONSTRAINT round_notes_transcript_source_check
      CHECK (transcript_source IN ('mic', 'graph_transcript', 'manual_upload'));
  END IF;
END $$;

-- Keep updated_at current on every write (same convention as the rest of this schema's
-- touched tables), so the ERP side can sort/show "last updated" without extra plumbing.
CREATE OR REPLACE FUNCTION public.fn_round_notes_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_round_notes_touch_updated_at ON public.round_notes;
CREATE TRIGGER trg_round_notes_touch_updated_at
  BEFORE UPDATE ON public.round_notes
  FOR EACH ROW EXECUTE FUNCTION public.fn_round_notes_touch_updated_at();

-- Backfill: any interview that already has one-on-one screening data gets a
-- round='screening' row, so nothing already submitted is orphaned by the switch.
-- ON CONFLICT DO NOTHING makes this safe to re-run after new rounds start writing rows.
INSERT INTO public.round_notes
  (interview_id, round, transcript_source, live_transcript, ai_draft, hr_notes, submitted_at, submitted_by)
SELECT
  id,
  'screening',
  'mic',
  COALESCE(live_transcript, '[]'::jsonb),
  ai_notes,
  hr_notes,
  notes_submitted_at,
  notes_submitted_by
FROM public.interviews
WHERE mode = 'one_on_one'
  AND (
    COALESCE(live_transcript, '[]'::jsonb) != '[]'::jsonb
    OR ai_notes IS NOT NULL
    OR hr_notes IS NOT NULL
  )
ON CONFLICT (interview_id, round) DO NOTHING;
