import { after } from "next/server";
import { PDFParse } from "pdf-parse";
import { applicantSchema, validateAnswers } from "@/lib/hiring/schema";
import { activeCampaign, driveUploadResume, erp, failure, hash, newToken } from "@/lib/hiring/server";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  let uploadedPath: string | null = null;
  try {
    if (Number(request.headers.get("content-length") || 0) > 4500000) return Response.json({ error: "Resume must be under 4 MB" }, { status: 413 });
    const db = erp();
    // Deployment proxy must overwrite this header; never expose the server directly.
    const ip = request.headers.get(process.env.HIRING_CLIENT_IP_HEADER || "x-forwarded-for")?.split(",")[0].trim();
    if (!ip && process.env.NODE_ENV === "production") throw new Error("Client IP not available");
    const limited = await db.rpc("hiring_take_rate_limit", { p_key: hash(`screen:${ip || "local"}`) });
    if (limited.error) throw limited.error;
    if (!limited.data) return Response.json({ error: "Too many screening requests. Please try again in an hour." }, { status: 429 });
    const form = await request.formData();
    const parsed = applicantSchema.safeParse(JSON.parse(String(form.get("candidate"))));
    if (!parsed.success) return Response.json({ error: "Complete the required candidate details and consent before uploading." }, { status: 400 });
    const a = parsed.data;
    const c = await activeCampaign(a.campaign_id);
    try { validateAnswers(c, a); } catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }
    const file = form.get("resume");
    if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) return Response.json({ error: "Upload a PDF or text resume under 4 MB." }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdf = file.name.toLowerCase().endsWith(".pdf") && buffer.subarray(0, 5).toString() === "%PDF-";
    const txt = file.name.toLowerCase().endsWith(".txt") && !buffer.includes(0);
    if (!pdf && !txt) return Response.json({ error: "Only PDF and plain text resumes are supported." }, { status: 400 });
    let text = "";
    if (pdf) {
      const parser = new PDFParse({ data: buffer });
      try { text = (await parser.getText()).text; } finally { await parser.destroy(); }
    } else text = buffer.toString("utf8");
    if (text.trim().length < 80 || text.length > 60000) return Response.json({ error: "Use a readable text-based resume (80–60,000 characters). Scanned PDFs need OCR before uploading." }, { status: 400 });
    // AI fit screening (OpenRouter) no longer runs here: the candidate would
    // wait on it for every upload. The application is stored as "pending" and
    // the ERP's hiring-screening-worker screens it in the background, where HR
    // reviews the result in the Candidate Pipeline.
    const assessment = { fit: "pending", reason: "", evidence: [] as string[], gaps: [] as string[], model: null, queued_at: new Date().toISOString() };
    const token = newToken();
    const id = crypto.randomUUID();
    const path = `${id}/resume.${pdf ? "pdf" : "txt"}`;
    const upload = await db.storage.from("hiring-resumes").upload(path, buffer, { contentType: pdf ? "application/pdf" : "text/plain", upsert: false });
    if (upload.error) throw upload.error;
    uploadedPath = path;
    const saved = await db.from("hiring_applications").insert({ id, campaign_id: c.id, token_hash: hash(token), candidate: a, campaign_snapshot: c, resume_path: path, resume_text: text, screening: assessment });
    if (saved.error) throw saved.error;
    uploadedPath = null;
    // Best-effort archive copy in the ERP's Google Drive "Applied Resumes"
    // folder, run AFTER the response is sent so the candidate never waits on
    // Drive. Never fails the application -- and the resume_url column lives in
    // the ERP database (this repo's migrations only cover the Smart Interview
    // DB), so this write is kept separate from the insert above in case that
    // column isn't provisioned yet.
    after(async () => {
      try {
        const filename = `${a.name}_${c.role}_Resume.${pdf ? "pdf" : "txt"}`.replace(/[\\/:*?"<>|]/g, "_");
        const driveUrl = await driveUploadResume({ filename, buffer, mimeType: pdf ? "application/pdf" : "text/plain" });
        if (driveUrl) {
          const urlSaved = await erp().from("hiring_applications").update({ resume_url: driveUrl }).eq("id", id);
          if (urlSaved.error) console.error("Could not store resume_url (has the ERP-side migration for this column run?)", urlSaved.error);
        }
      } catch (e) {
        console.error("Google Drive resume archive upload failed", e);
      }
    });
    return Response.json({ token }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (uploadedPath) await erp().storage.from("hiring-resumes").remove([uploadedPath]);
    return failure(e);
  }
}
