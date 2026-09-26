-- Adds "desktop_app" (AI-Transcribe, via the ERP relay -- see
-- app/api/hiring/interview/[id]/notes/ingest/route.ts) as a valid
-- round_notes.transcript_source, alongside the existing 'mic' (old
-- single-mic browser capture), 'graph_transcript', and 'manual_upload'.
--
-- Idempotent: safe to re-run.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'round_notes_transcript_source_check' AND conrelid = 'public.round_notes'::regclass
  ) THEN
    ALTER TABLE public.round_notes DROP CONSTRAINT round_notes_transcript_source_check;
  END IF;

  ALTER TABLE public.round_notes
    ADD CONSTRAINT round_notes_transcript_source_check
    CHECK (transcript_source IN ('mic', 'graph_transcript', 'manual_upload', 'desktop_app'));
END $$;
