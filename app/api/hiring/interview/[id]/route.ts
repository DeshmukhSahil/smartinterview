import { z } from "zod";
import { requireHR, failure, cors, interviewDb, submitRoundNotes } from "@/lib/hiring/server";
import { notesSchema } from "@/lib/hiring/schema";

export const dynamic = "force-dynamic";

export async function OPTIONS(r: Request) { return new Response(null, { status: 204, headers: cors(r) }); }

export async function GET(r: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireHR(r, "view");
    const { id } = await params;
    z.string().uuid().parse(id);
    const db = interviewDb();
    const [interviewRes, roundsRes] = await Promise.all([
      db.from("interviews").select("*").eq("id", id).single(),
      db.from("round_notes").select("*").eq("interview_id", id),
    ]);
    if (interviewRes.error || !interviewRes.data) throw new Error("Interview not found");
    // Deliberately not thrown on: if round_notes doesn't exist yet (migration not applied),
    // this degrades to an empty array and every fallback below reads the legacy columns —
    // the response never breaks because of this table's absence.
    const roundNotes = roundsRes.data ?? [];

    // Backward compatibility: any candidate whose screening round hasn't been backfilled
    // into round_notes (or predates this table) still resolves hr_notes/ai_notes/
    // live_transcript from the legacy interviews columns the ERP drawer already reads —
    // round_notes wins once it exists for this interview.
    const screeningRow = roundNotes.find((rn) => rn.round === "screening");
    const interview = {
      ...interviewRes.data,
      hr_notes: screeningRow?.hr_notes ?? interviewRes.data.hr_notes,
      ai_notes: screeningRow?.ai_draft ?? interviewRes.data.ai_notes,
      live_transcript: screeningRow?.live_transcript ?? interviewRes.data.live_transcript,
      notes_submitted_at: screeningRow?.submitted_at ?? interviewRes.data.notes_submitted_at,
      notes_submitted_by: screeningRow?.submitted_by ?? interviewRes.data.notes_submitted_by,
    };

    return Response.json(
      { interview, round_notes: roundNotes },
      { headers: { ...cors(r), "Cache-Control": "no-store" } }
    );
  } catch (e) { return failure(e, r); }
}

// The general "HR remarks" form in the ERP candidate drawer's Notes tab — one overall
// assessment per candidate, filled in by hand rather than captured live off a call.
// Writes to the same place notes/submit uses for the screening round (round_notes),
// so there's one source of truth instead of a second column this table doesn't share.
export async function PATCH(r: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const hr = await requireHR(r, "edit");
    const { id } = await params;
    z.string().uuid().parse(id);
    const body = await r.json();
    const hrNotes = notesSchema.parse(body.hr_notes);

    await submitRoundNotes(id, "screening", hrNotes, hr.email);

    return Response.json({ success: true }, { headers: cors(r) });
  } catch (e) { return failure(e, r); }
}
