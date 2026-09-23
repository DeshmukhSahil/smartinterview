import { z } from "zod";
import { activeCampaign, deliver, erp, failure, hash } from "@/lib/hiring/server";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const { token } = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(await request.json());
    const db = erp();
    const { data: a, error } = await db.from("hiring_applications").select("*").eq("token_hash", hash(token)).single();
    if (error || !a) throw new Error("Invalid application");
    if (!a.submitted_at) {
      if (Date.now() - Date.parse(a.created_at) > 24 * 3600000) return Response.json({ error: "This screening expired. Please upload your resume again." }, { status: 410 });
      const current = await activeCampaign(a.campaign_id);
      if (!a.candidate.open_to_relocate && !current.locations.includes(a.candidate.location)) return Response.json({ error: "This location is no longer available. Please reload the form." }, { status: 409 });
      const saved = await db.from("hiring_applications").update({ submitted_at: new Date().toISOString() }).eq("id", a.id).is("submitted_at", null);
      if (saved.error?.code === "23505") return Response.json({ error: "An application for this campaign and email has already been received. Please check your email or contact HR." }, { status: 409 });
      if (saved.error) throw saved.error;
    }
    await deliver(a.id);
    const state = await db.from("hiring_applications").select("email_status").eq("id", a.id).single();
    if (state.error) throw state.error;
    return Response.json({ received: true, reference: a.id, email_status: state.data.email_status }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return failure(e); }
}
