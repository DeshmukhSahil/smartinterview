import { cors, driveUploadResume, failure, requireErpRight } from "@/lib/hiring/server";

export const dynamic = "force-dynamic";

// ERP "Add Candidate" → archive the uploaded resume in the same Google Drive
// "Applied Resumes" folder the careers flow uses, so every candidate's resume
// lives in one place. The Drive script URL is a server secret, so the ERP
// browser sends the file here with its session; the right
// (hr.candidate_pipeline.add) is checked against the ERP database first.
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = /^(application\/pdf|text\/plain|image\/(png|jpe?g|webp)|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/;

export async function OPTIONS(r: Request) { return new Response(null, { status: 204, headers: cors(r) }); }

export async function POST(r: Request) {
  try {
    await requireErpRight(r, "hr", "candidate_pipeline", "add");
    const form = await r.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return Response.json({ error: "No resume file was sent" }, { status: 400, headers: cors(r) });
    if (file.size > MAX_BYTES) return Response.json({ error: "Resume is larger than 10 MB" }, { status: 413, headers: cors(r) });
    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED.test(mimeType)) return Response.json({ error: "Unsupported resume file type" }, { status: 415, headers: cors(r) });

    const name = String(form.get("candidate_name") || "Candidate").trim().slice(0, 80);
    const role = String(form.get("role") || "").trim().slice(0, 80);
    const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase().slice(0, 5) : "pdf";
    const filename = `${name}${role ? `_${role}` : ""}_Resume.${ext}`.replace(/[\\/:*?"<>|]/g, "_");

    const driveUrl = await driveUploadResume({ filename, buffer: Buffer.from(await file.arrayBuffer()), mimeType });
    if (!driveUrl) return Response.json({ error: "Google Drive archive is not configured on the careers server" }, { status: 503, headers: cors(r) });
    return Response.json({ driveUrl }, { headers: { ...cors(r), "Cache-Control": "no-store" } });
  } catch (e) { return failure(e, r); }
}
