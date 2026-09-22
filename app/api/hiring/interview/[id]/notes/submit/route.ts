import { z } from "zod";
import { requireHR, failure, cors, interviewDb, sendEmail, getRoundNotes, submitRoundNotes } from "@/lib/hiring/server";
import { notesSchema, roundSchema, ROUND_LABELS, type InterviewNotes } from "@/lib/hiring/schema";

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

// `round` defaults to "screening" so the original one-on-one flow keeps working
// unchanged; every later round (Interview / Final Interview with MD / HR Round) passes
// its own round and writes to round_notes instead of the legacy interviews columns.
export async function POST(r: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const hr = await requireHR(r, "edit");
    const { id } = await params;
    z.string().uuid().parse(id);
    const body = await r.json();
    const hrNotes = notesSchema.parse(body.hr_notes);
    const round = roundSchema.parse(body.round ?? "screening");

    const db = interviewDb();
    const { data: interview, error } = await db.from("interviews").select("*").eq("id", id).single();
    if (error || !interview) throw new Error("Interview not found");

    await submitRoundNotes(id, round, hrNotes, hr.email);

    // Screening keeps its historical meaning: submitting notes for the ORIGINAL one-on-one
    // call marks smartinterview's own interview_status complete. Later rounds live in the
    // ERP's candidate_pipeline.stage instead — that's what the pipeline's forward-only
    // stage rules and audit log already track, so this stays screening-only.
    if (round === "screening" && interview.mode === "one_on_one") {
      const stamped = await db.from("interviews")
        .update({ interview_status: "completed", notes_email_sent_at: new Date().toISOString() })
        .eq("id", id);
      if (stamped.error) throw stamped.error;
    }

    const roundRow = await getRoundNotes(id, round);
    const liveDraft = (roundRow?.ai_draft ?? null) as InterviewNotes | null;
    const roundLabel = ROUND_LABELS[round];

    const text = `Interview report — ${interview.role}
Candidate: ${interview.candidate_name}
Round: ${roundLabel}
${liveDraft ? `
--- AI-drafted notes (captured live during the call) ---
${formatNotes(liveDraft)}
` : ""}
--- HR remarks (reviewed by ${hr.email}) ---
${formatNotes(hrNotes)}

Chirayu Power HR Team`;

    const recipients = [interview.candidate_email, hr.email].filter((v, i, arr) => v && arr.indexOf(v) === i) as string[];
    await sendEmail({
      to: recipients,
      subject: `Chirayu Power — interview report (${roundLabel}): ${interview.role}`,
      text,
      idempotencyKey: `notes-${id}-${round}`,
    });

    return Response.json({ success: true }, { headers: cors(r) });
  } catch (e) { return failure(e, r); }
}
