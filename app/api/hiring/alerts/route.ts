import { createHmac } from "node:crypto";
import { erp, env } from "@/lib/hiring/server";
import { jobAlertSignupSchema, signupMessage } from "@/lib/hiring/jobAlerts";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({error:"Use JSON for this request."},{status:415});
    if (Number(request.headers.get("content-length") || 0)>4096) return Response.json({error:"Request too large."},{status:413});
    const raw = await request.text();
    if (raw.length>4096) return Response.json({error:"Request too large."},{status:413});
    let body;
    try { body=JSON.parse(raw); } catch { return Response.json({error:"Check your signup details."},{status:400}); }
    if (body?.website) return Response.json({message:signupMessage});
    const parsed=jobAlertSignupSchema.safeParse(body);
    if(!parsed.success) return Response.json({error:parsed.error.issues[0].message},{status:400});
    const ip=request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
    const ipHash=createHmac("sha256",env("ERP_SUPABASE_SERVICE_ROLE_KEY")).update(ip).digest("hex");
    const {error}=await erp().rpc("hiring_subscribe_alerts",{p_email:parsed.data.email,p_mobile:parsed.data.mobile,p_newsletter:parsed.data.newsletter,p_ip_hash:ipHash});
    if(error?.code==="P0002") return Response.json({error:"Too many signup attempts. Please try again in an hour."},{status:429,headers:{"Retry-After":"3600"}});
    if(error) throw error;
    return Response.json({message:signupMessage},{status:202,headers:{"Cache-Control":"no-store"}});
  } catch { return Response.json({error:"Job alerts are temporarily unavailable. Please try again later."},{status:503}); }
}
