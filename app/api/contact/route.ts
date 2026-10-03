import { z } from "zod";
import { erp, cors, failure, hash, sendEmail, env } from "@/lib/hiring/server";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(150),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  message: z.string().trim().min(10, "Message is too short.").max(4000),
  // Honeypot: a hidden field real visitors never see or fill (see the
  // contact page's visuallyHidden wrapper). A non-empty value means a bot
  // filled every field blindly -- accept without erroring (so it doesn't
  // learn to look elsewhere) but never create a lead or send anything.
  company: z.string().max(200).optional(),
});

// Same automated-source identity justdial-webhook/indiamart-sync write as
// created_by on public.leads -- recognized across the ERP as "not a human
// user," not specific to any one integration.
const SYSTEM_USER_ID = "45bcb418-e51e-4b98-a78e-5d1bbdedf8b4";

/** Expand {FY1-FY2} token in a lead-number prefix, e.g. "LE/CPPL/{FY1-FY2}/" -> "LE/CPPL/26-27/". */
function expandPrefix(prefix: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const fy1 = month >= 4 ? year : year - 1;
  const fy2 = (fy1 + 1) % 100;
  return prefix.replace(/{FY1-FY2}/g, `${String(fy1).slice(-2)}-${String(fy2).padStart(2, "0")}`);
}

// Mirrors justdial-webhook's lead_number allocation exactly (read
// number_formats.current_number, increment, build the number) so a contact-
// form lead looks and numbers like every other automated-source lead.
async function nextLeadNumber(db: ReturnType<typeof erp>): Promise<string> {
  const { data: formatData } = await db
    .from("number_formats")
    .select("id, prefix, current_number")
    .eq("form_name", "Lead")
    .eq("is_active", true)
    .maybeSingle();
  const currentNum = formatData?.current_number ?? 10246;
  const nextNum = currentNum + 1;
  const prefix = expandPrefix(formatData?.prefix ?? "LE/CPPL/{FY1-FY2}/");
  if (formatData?.id) {
    await db.from("number_formats").update({ current_number: nextNum, updated_at: new Date().toISOString() }).eq("id", formatData.id);
  }
  return `${prefix}${nextNum}`;
}

export async function OPTIONS(request: Request) {
  return new Response(null, { headers: cors(request) });
}

export async function POST(request: Request) {
  try {
    const parsed = contactSchema.parse(await request.json());
    if (parsed.company) return Response.json({ received: true }, { headers: cors(request) });

    const db = erp();
    // Same trusted-proxy-header + hashed-IP rate limiting as /api/hiring/screen.
    const ip = request.headers.get(process.env.HIRING_CLIENT_IP_HEADER || "x-forwarded-for")?.split(",")[0].trim();
    if (!ip && process.env.NODE_ENV === "production") throw new Error("Client IP not available");
    const limited = await db.rpc("hiring_take_rate_limit", { p_key: hash(`contact:${ip || "local"}`) });
    if (limited.error) throw limited.error;
    if (!limited.data) return Response.json({ error: "Too many messages sent. Please try again later." }, { status: 429, headers: cors(request) });

    // Source of truth: a real Lead in the ERP's existing Leads module (same
    // table/shape justdial-webhook and indiamart-sync write to), so this
    // shows up in the CRM pipeline HR already works from -- not a one-off
    // inbox only reachable by searching email.
    const leadNumber = await nextLeadNumber(db);
    const newLead = {
      lead_number: leadNumber,
      customer_name: parsed.name,
      contact_person_name: parsed.name,
      email: parsed.email,
      lead_source: "Website",
      other_source: "Careers site contact form (careers.chirayupower.com/contact)",
      project_title: "Website Contact Form Inquiry",
      remarks: parsed.message,
      stage: "new",
      is_active: true,
      created_by: SYSTEM_USER_ID,
      lead_date: new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error: insertErr } = await db.from("leads").insert(newLead);
    if (insertErr) throw insertErr;

    // Best-effort instant notification -- the lead above is already saved
    // and is what HR actually works from, so a failure here must never fail
    // the request or look like the message wasn't received.
    try {
      await sendEmail({
        to: [env("CONTACT_EMAIL_TO")],
        subject: `New website message from ${parsed.name}`,
        text: `Name: ${parsed.name}\nEmail: ${parsed.email}\n\n${parsed.message}\n\nSaved as lead ${leadNumber} in the CRM.`,
        replyTo: parsed.email,
      });
    } catch (emailErr) {
      console.error("Contact form: lead saved but notification email failed", emailErr);
    }

    return Response.json({ received: true }, { headers: cors(request) });
  } catch (e) { return failure(e, request); }
}
