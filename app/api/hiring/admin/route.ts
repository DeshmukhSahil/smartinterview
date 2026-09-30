import { z } from "zod";
import { PUBLIC_DEPARTMENT_COLUMNS } from "@/lib/hiring/hiringDepartments";
import { campaignSchema } from "@/lib/hiring/schema";
import { cors, erp, failure, requireHR, deliver, retakeInterview, interviewDb } from "@/lib/hiring/server";
import { interviewLoginUrl } from "@/lib/hiring/link";
export const dynamic = "force-dynamic";
export async function OPTIONS(r: Request) { return new Response(null, { status: 204, headers: cors(r) }); }
export async function GET(r: Request) {
  try {
    await requireHR(r, "view");
    const db = erp();
    const [campaigns, applications, departments] = await Promise.all([
      db.from("hiring_campaigns").select("*").order("updated_at", { ascending: false }),
      db.from("hiring_applications").select("id,campaign_id,candidate,screening,submitted_at,email_status,delivery_error,interview_id").not("submitted_at", "is", null).order("submitted_at", { ascending: false }).limit(100),
      db.from("hiring_departments").select(PUBLIC_DEPARTMENT_COLUMNS).order("sort_order").order("name"),
    ]);
    if (campaigns.error || applications.error || departments.error) throw campaigns.error || applications.error || departments.error;
    return Response.json({ campaigns: campaigns.data, applications: applications.data, departments: departments.data }, { headers: { ...cors(r), "Cache-Control": "no-store" } });
  } catch (e) { return failure(e, r); }
}
export async function POST(r: Request) {
  try {
    const body = await r.json();
    await requireHR(r, body.create_department !== undefined ? "edit" : body.resume_id || body.link_ids ? "view" : "edit");
    if (body.create_department !== undefined) {
      const parsed = z.string().trim().min(2, "Enter at least 2 characters for the department name.").max(100).safeParse(body.create_department);
      if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400, headers: cors(r) });
      const { data, error } = await erp().from("hiring_departments").insert({ name: parsed.data }).select(PUBLIC_DEPARTMENT_COLUMNS).single();
      if (error?.code === "23505") return Response.json({ error: "This department already exists. Select it from the list." }, { status: 409, headers: cors(r) });
      if (error) throw error;
      return Response.json({ department: data }, { status: 201, headers: cors(r) });
    }
    if (body.link_ids) {
      // Candidate sign-in links (/interview/[id]/[token]) can only be minted
      // server-side -- the token is keyed with a secret the ERP never sees --
      // so the ERP's Candidate Credentials list asks for them here. "view" is
      // enough: that list already shows every candidate's access code.
      const { z } = await import("zod");
      const ids = z.array(z.string().uuid()).max(1000).parse(body.link_ids);
      const links: Record<string, string> = {};
      // Chunked so the .in() filter's URL stays well under proxy length limits.
      for (let i = 0; i < ids.length; i += 100) {
        const { data, error } = await interviewDb().from("interviews").select("id,password_id").in("id", ids.slice(i, i + 100));
        if (error) throw error;
        for (const row of data || []) if (row.password_id) links[row.id] = interviewLoginUrl(row.id, row.password_id);
      }
      return Response.json({ links }, { headers: { ...cors(r), "Cache-Control": "no-store" } });
    }
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
    if (values.department_id) {
      const department = await erp().from("hiring_departments").select("id").eq("id", values.department_id).maybeSingle();
      if (department.error) throw department.error;
      if (!department.data) return Response.json({ error: "Select an existing hiring department." }, { status: 400, headers: cors(r) });
    }
    const query = id ? erp().from("hiring_campaigns").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id) : erp().from("hiring_campaigns").insert(values);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return Response.json({ campaign: data }, { headers: cors(r) });
  } catch (e) { return failure(e, r); }
}
