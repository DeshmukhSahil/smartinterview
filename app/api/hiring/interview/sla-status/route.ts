import { z } from "zod";
import { requireIngestSecret, failure, cors, interviewDb } from "@/lib/hiring/server";
import { roundSchema } from "@/lib/hiring/schema";

export const dynamic = "force-dynamic";

export async function OPTIONS(r: Request) { return new Response(null, { status: 204, headers: cors(r) }); }

// Server-to-server only, same auth as /notes/ingest. Lets the ERP's
// interview-sla-scheduler check whether a report has been submitted for a
// batch of (interview_id, round) pairs, without needing direct read access
// to this app's own Supabase project (round_notes has no RLS policies
// today, so cross-project access from the ERP's anon key is unverified --
// this endpoint is the reliable path instead of assuming that works).
const bodySchema = z.object({
  pairs: z.array(z.object({ interview_id: z.string().uuid(), round: roundSchema })).min(1).max(200),
});

export async function POST(r: Request) {
  try {
    requireIngestSecret(r);
    const { pairs } = bodySchema.parse(await r.json());

    const interviewIds = [...new Set(pairs.map(p => p.interview_id))];
    const { data, error } = await interviewDb()
      .from("round_notes")
      .select("interview_id,round,submitted_at")
      .in("interview_id", interviewIds);
    if (error) throw error;

    const byKey = new Map((data ?? []).map(row => [`${row.interview_id}:${row.round}`, row.submitted_at as string | null]));
    const results = pairs.map(p => ({
      interview_id: p.interview_id,
      round: p.round,
      submitted_at: byKey.get(`${p.interview_id}:${p.round}`) ?? null,
    }));

    return Response.json({ results }, { headers: { ...cors(r), "Cache-Control": "no-store" } });
  } catch (e) { return failure(e, r); }
}
