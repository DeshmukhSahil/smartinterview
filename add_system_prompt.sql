-- Migration: Add system_prompt column to the interviews table to support dynamic interviewer behavior, tone, power moves, and moods.
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS system_prompt TEXT;
