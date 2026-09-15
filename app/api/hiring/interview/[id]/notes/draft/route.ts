import { z } from "zod";
import { requireHR, failure, cors, interviewDb, draftNotes } from "@/lib/hiring/server";
import { transcriptTurnSchema } from "@/lib/hiring/schema";

export const dynamic = "force-dynamic";

export async function OPTIONS(r: Request) { return new Response(null, { status: 204, headers: cors(r) }); }

// Called periodically from the HR "conduct interview" page while a one-on-one call is
// live: the browser sends its accumulated speech-to-text transcript, and this refreshes
// the AI-drafted notes shown to the interviewer in near-real-time.
export async function POST(r: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireHR(r, "edit");
    const { id } = await params;
    z.string().uuid().parse(id);
    const body = await r.json();
    const transcript = z.array(transcriptTurnSchema).max(400).parse(body.transcript);

    const db = interviewDb();
    const { data: interview, error } = await db.from("interviews").select("role,job_description,mode").eq("id", id).single();
    if (error || !interview) throw new Error("Interview not found");
    if (interview.mode !== "one_on_one") throw new Error("Notes are only available for one-on-one interviews");

    const notes = await draftNotes(transcript, { role: interview.role, jobDescription: interview.job_description || "" });
    const saved = await db.from("interviews").update({ live_transcript: transcript, ai_notes: notes }).eq("id", id);
    if (saved.error) throw saved.error;

    return Response.json({ notes }, { headers: cors(r) });
  } catch (e) { return failure(e, r); }
}
