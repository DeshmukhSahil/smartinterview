import { z } from "zod";
import { requireHR, failure, cors, interviewDb, sendEmail } from "@/lib/hiring/server";
import { notesSchema, type InterviewNotes } from "@/lib/hiring/schema";

export const dynamic = "force-dynamic";

export async function OPTIONS(r: Request) { return new Response(null, { status: 204, headers: cors(r) }); }

function formatNotes(notes: InterviewNotes | null): string {
  if (!notes) return "Not available.";
  const list = (items: string[]) => (items.length ? items.map(i => `- ${i}`).join("\n") : "- None noted");
  return `Summary: ${notes.summary}

Key points:
${list(notes.keyPoints)}

Strengths:
${list(notes.strengths)}

Areas of concern:
${list(notes.concerns)}

Suggested follow-ups:
${list(notes.followUps)}

Recommendation: ${notes.recommendation.replace("_", " ")}`;
}

export async function POST(r: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const hr = await requireHR(r, "edit");
    const { id } = await params;
    z.string().uuid().parse(id);
    const body = await r.json();
    const hrNotes = notesSchema.parse(body.hr_notes);

    const db = interviewDb();
    const { data: interview, error } = await db.from("interviews").select("*").eq("id", id).single();
    if (error || !interview) throw new Error("Interview not found");
    if (interview.mode !== "one_on_one") throw new Error("Notes are only available for one-on-one interviews");

    const now = new Date().toISOString();
    const updated = await db.from("interviews").update({
      hr_notes: hrNotes, notes_submitted_at: now, notes_submitted_by: hr.email, interview_status: "completed",
    }).eq("id", id);
    if (updated.error) throw updated.error;

    const text = `Interview report — ${interview.role}
Candidate: ${interview.candidate_name}

--- AI-drafted notes (captured live during the call) ---
${formatNotes(interview.ai_notes as InterviewNotes | null)}

--- HR notes (reviewed and edited by ${hr.email}) ---
${formatNotes(hrNotes)}

Chirayu Power HR Team`;

    const recipients = [interview.candidate_email, hr.email].filter((v, i, arr) => v && arr.indexOf(v) === i) as string[];
    await sendEmail({
      to: recipients,
      subject: `Chirayu Power — interview report: ${interview.role}`,
      text,
      idempotencyKey: `notes-${id}`,
    });
    const emailed = await db.from("interviews").update({ notes_email_sent_at: new Date().toISOString() }).eq("id", id);
    if (emailed.error) throw emailed.error;

    return Response.json({ success: true }, { headers: cors(r) });
  } catch (e) { return failure(e, r); }
}
