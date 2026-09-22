import { z } from "zod";
import { requireHR, failure, cors, interviewDb, draftNotes, saveRoundDraft } from "@/lib/hiring/server";
import { transcriptTurnSchema, roundSchema } from "@/lib/hiring/schema";

export const dynamic = "force-dynamic";

export async function OPTIONS(r: Request) { return new Response(null, { status: 204, headers: cors(r) }); }

// Called periodically from the HR "conduct interview" page while a human round is live:
// the browser sends its accumulated speech-to-text transcript for THIS round, and this
// refreshes the AI-drafted notes shown to the interviewer in near-real-time. `round`
// defaults to "screening" so the original one-on-one flow keeps working unchanged; every
// later round (Interview / Final Interview with MD / HR Round) passes its own round.
export async function POST(r: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireHR(r, "edit");
    const { id } = await params;
    z.string().uuid().parse(id);
    const body = await r.json();
    const transcript = z.array(transcriptTurnSchema).max(400).parse(body.transcript);
    const round = roundSchema.parse(body.round ?? "screening");

    const db = interviewDb();
    const { data: interview, error } = await db.from("interviews").select("role,job_description").eq("id", id).single();
    if (error || !interview) throw new Error("Interview not found");

    const notes = await draftNotes(transcript, { role: interview.role, jobDescription: interview.job_description || "" });
    await saveRoundDraft(id, round, transcript, notes);

    return Response.json({ notes }, { headers: cors(r) });
  } catch (e) { return failure(e, r); }
}
