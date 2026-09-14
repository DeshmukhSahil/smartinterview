import { timingSafeEqual } from "node:crypto";
import { deliver, env, erp, failure } from "@/lib/hiring/server";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const actual = Buffer.from(request.headers.get("authorization") || "");
    const expected = Buffer.from(`Bearer ${env("HIRING_CRON_SECRET")}`);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return new Response("Unauthorized", { status: 401 });
    const { data, error } = await erp().from("hiring_applications").select("id").not("submitted_at", "is", null).neq("email_status", "sent").or("email_attempted_at.is.null,email_attempted_at.gt." + new Date(Date.now() - 23 * 3600000).toISOString()).order("submitted_at").limit(2);
    if (error) throw error;
    for (const a of data) await deliver(a.id);
    return Response.json({ processed: data.length });
  } catch (e) { return failure(e); }
}
