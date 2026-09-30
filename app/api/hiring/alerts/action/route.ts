import { erp } from "@/lib/hiring/server";
import { jobAlertActionSchema } from "@/lib/hiring/jobAlerts";
export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({error:"Use JSON for this request."},{status:415});
    const raw=await request.text();
    if(raw.length>512) return Response.json({error:"Invalid link."},{status:400});
    const parsed=jobAlertActionSchema.safeParse(JSON.parse(raw));
    if(!parsed.success) return Response.json({error:"This link is invalid."},{status:400});
    const {data,error}=await erp().rpc("hiring_alert_action",{p_action:parsed.data.action,p_token:parsed.data.token});
    if(error) throw error;
    if(!data) return Response.json({error:"This link is invalid or has expired. Request a new signup link from the careers page."},{status:400});
    return Response.json({message:parsed.data.action==="confirm"?"You are subscribed. We will email you when new jobs are published.":"You have unsubscribed from job alerts and career newsletters."},{headers:{"Cache-Control":"no-store"}});
  } catch { return Response.json({error:"Unable to update your subscription. Please try again."},{status:503}); }
}
