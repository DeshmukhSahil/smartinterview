import { z } from "zod";
import { cors, failure, interviewDb, requireErpRight } from "@/lib/hiring/server";

export const dynamic = "force-dynamic";

// ERP Candidate Pipeline → "Edit role". The browser sends the ERP session; the
// right (hr.candidate_pipeline.edit) is checked against the ERP database here,
// then the change is written with the service key — the ERP never writes to
// this database directly. Only the role label changes: interview questions and
// job description stay as they were.
const bodySchema = z.object({ role: z.string().trim().min(2).max(150) });

export async function OPTIONS(r: Request) { return new Response(null, { status: 204, headers: cors(r) }); }

export async function PATCH(r: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireErpRight(r, "hr", "candidate_pipeline", "edit");
    const { id } = await params;
    z.string().uuid().parse(id);
    const { role } = bodySchema.parse(await r.json());

    const db = interviewDb();
    const { data: before, error: readError } = await db.from("interviews").select("id, role").eq("id", id).maybeSingle();
    if (readError) throw readError;
    if (!before) return Response.json({ error: "Candidate not found" }, { status: 404, headers: cors(r) });

    const { error } = await db.from("interviews").update({ role }).eq("id", id);
    if (error) throw error;

    return Response.json({ success: true, role, previous_role: before.role ?? null }, { headers: { ...cors(r), "Cache-Control": "no-store" } });
  } catch (e) { return failure(e, r); }
}
