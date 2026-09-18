import { campaignSchema } from "@/lib/hiring/schema";
import { cors, erp, failure, requireHR, deliver, retakeInterview } from "@/lib/hiring/server";
export const dynamic = "force-dynamic";
export async function OPTIONS(r: Request) { return new Response(null, { status: 204, headers: cors(r) }); }
export async function GET(r: Request) {
  try {
    await requireHR(r, "view");
    const db = erp();
    const [campaigns, applications] = await Promise.all([
      db.from("hiring_campaigns").select("*").order("updated_at", { ascending: false }),
      db.from("hiring_applications").select("id,campaign_id,candidate,screening,submitted_at,email_status,delivery_error,interview_id").not("submitted_at", "is", null).order("submitted_at", { ascending: false }).limit(100),
    ]);
    if (campaigns.error || applications.error) throw campaigns.error || applications.error;
    return Response.json({ campaigns: campaigns.data, applications: applications.data }, { headers: { ...cors(r), "Cache-Control": "no-store" } });
  } catch (e) { return failure(e, r); }
}
export async function POST(r: Request) {
  try {
    const body = await r.json();
    await requireHR(r, body.resume_id ? "view" : "edit");
    if (body.retry_id) {
      const id = (await import("zod")).z.string().uuid().parse(body.retry_id);
      await deliver(id);
      return Response.json({ success: true }, { headers: cors(r) });
    }
    if (body.retake_id) {
      const id = (await import("zod")).z.string().uuid().parse(body.retake_id);
      const interview = await retakeInterview(id);
      return Response.json({ success: true, interview }, { headers: cors(r) });
    }
    if (body.resume_id) {
      const id = (await import("zod")).z.string().uuid().parse(body.resume_id);
      const { data, error } = await erp().from("hiring_applications").select("resume_path").eq("id", id).not("submitted_at", "is", null).single();
      if (error) throw error;
      const link = await erp().storage.from("hiring-resumes").createSignedUrl(data.resume_path, 60);
      if (link.error) throw link.error;
      return Response.json({ url: link.data.signedUrl }, { headers: cors(r) });
    }
    if (body.delete_id) {
      const id = (await import("zod")).z.string().uuid().parse(body.delete_id);
      // Refuse to delete a campaign that already has candidate applications —
      // that history must stay intact. Closing (is_open=false) is the correct
      // way to stop new applications on a campaign that's already been used.
      const existing = await erp().from("hiring_applications").select("id", { count: "exact", head: true }).eq("campaign_id", id);
      if (existing.error) throw existing.error;
      if ((existing.count || 0) > 0) {
        throw new Error(`This campaign has ${existing.count} candidate application(s) and cannot be deleted. Set it to Closed instead to stop accepting new applications.`);
      }
      const del = await erp().from("hiring_campaigns").delete().eq("id", id);
      if (del.error) throw del.error;
      return Response.json({ success: true }, { headers: cors(r) });
    }
    const parsed = campaignSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: parsed.error.issues.map(i => i.message).join("; ") }, { status: 400, headers: cors(r) });
    const { id, ...values } = parsed.data;
    const query = id ? erp().from("hiring_campaigns").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id) : erp().from("hiring_campaigns").insert(values);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return Response.json({ campaign: data }, { headers: cors(r) });
  } catch (e) { return failure(e, r); }
}
