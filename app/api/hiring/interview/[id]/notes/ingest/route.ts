import { z } from "zod";
import { requireIngestSecret, failure, cors, interviewDb, draftNotes, ingestRoundTranscript } from "@/lib/hiring/server";
import { transcriptTurnSchema, roundSchema } from "@/lib/hiring/schema";

export const dynamic = "force-dynamic";

export async function OPTIONS(r: Request) { return new Response(null, { status: 204, headers: cors(r) }); }

// Server-to-server only -- called by the ERP's interview-transcript-ingest
// Edge Function once AI-Transcribe delivers a finished session, not by any
// browser. The ERP has already verified the submitting interviewer is
// actually assigned to this round (candidate_pipeline.interviewer_ids)
// before relaying here; requireIngestSecret only proves the request came
// from the ERP itself. See /notes/draft for the analogous HR-session path
// this mirrors (same draftNotes() call, different auth and a different
// save that stamps transcript_source="desktop_app").
export async function POST(r: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireIngestSecret(r);
    const { id } = await params;
    z.string().uuid().parse(id);
    const body = await r.json();
    const transcript = z.array(transcriptTurnSchema).max(400).parse(body.transcript);
    const round = roundSchema.parse(body.round);

    const db = interviewDb();
    const { data: interview, error } = await db.from("interviews").select("role,job_description").eq("id", id).single();
    if (error || !interview) throw new Error("Interview not found");

    const notes = await draftNotes(transcript, { role: interview.role, jobDescription: interview.job_description || "" });
    await ingestRoundTranscript(id, round, transcript, notes);

    return Response.json({ notes }, { headers: cors(r) });
  } catch (e) { return failure(e, r); }
}
