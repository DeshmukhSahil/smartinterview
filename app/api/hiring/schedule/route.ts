import { z } from "zod";
import { requireHR, failure, cors, interviewDb, sendEmail } from "@/lib/hiring/server";
import { interviewLoginUrl } from "@/lib/hiring/link";
import { createTeamsMeeting } from "@/lib/teams";

export const dynamic = "force-dynamic";

export async function OPTIONS(r: Request) { return new Response(null, { status: 204, headers: cors(r) }); }

const bodySchema = z.object({
  interview_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  duration_minutes: z.number().min(15).max(180).default(45),
  time_zone: z.string().min(1).max(100).default("Asia/Kolkata"),
});

export async function POST(r: Request) {
  try {
    const hr = await requireHR(r, "edit");
    const parsed = bodySchema.parse(await r.json());
    const db = interviewDb();
    const { data: interview, error } = await db.from("interviews").select("*").eq("id", parsed.interview_id).single();
    if (error || !interview) throw new Error("Interview not found");
    if (interview.mode !== "one_on_one") throw new Error("Scheduling only applies to one-on-one interviews");

    const start = new Date(parsed.scheduled_at);
    const end = new Date(start.getTime() + parsed.duration_minutes * 60000);
    const meeting = await createTeamsMeeting({
      subject: `Chirayu Power — ${interview.role} interview with ${interview.candidate_name}`,
      startISO: start.toISOString(), endISO: end.toISOString(), timeZone: parsed.time_zone,
      candidateEmail: interview.candidate_email, candidateName: interview.candidate_name,
      hrEmail: hr.email,
      bodyText: `One-on-one interview for the ${interview.role} role at Chirayu Power.`,
    });

    const updated = await db.from("interviews").update({
      scheduled_at: start.toISOString(), scheduled_by: hr.email,
      teams_event_id: meeting.eventId, teams_join_url: meeting.joinUrl,
      interview_status: "scheduled",
    }).eq("id", parsed.interview_id);
    if (updated.error) throw updated.error;

    const loginUrl = interviewLoginUrl(parsed.interview_id, interview.password_id);
    const when = start.toLocaleString("en-IN", { timeZone: parsed.time_zone, dateStyle: "full", timeStyle: "short" });
    await sendEmail({
      to: [interview.candidate_email],
      subject: `Chirayu Power — your ${interview.role} interview is scheduled`,
      text: `Your one-on-one interview for the ${interview.role} role has been scheduled for ${when} (${parsed.time_zone}).\n\nLog in to your candidate portal to join at the scheduled time: ${loginUrl}\nLogin email: ${interview.candidate_email}\nAccess password ID: ${interview.password_id}\n\nYou will also receive a separate calendar invite with the Teams link.\n\nChirayu Power HR Team`,
      idempotencyKey: `schedule-${parsed.interview_id}-${start.toISOString()}`,
    });

    return Response.json({ success: true, join_url: meeting.joinUrl, scheduled_at: start.toISOString() }, { headers: cors(r) });
  } catch (e) { return failure(e, r); }
}
