import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
const configured = () => Boolean(process.env.SPEECH_TRANSCRIPTION_URL || process.env.GROQ_API_KEY);
export async function GET() {
  return Response.json({ available: configured() }, { headers: { "Cache-Control": "private, max-age=30" } });
}
export async function POST(request: NextRequest) {
  // Only accept submissions from the application origin.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin && origin !== process.env.HIRING_PUBLIC_URL?.replace(/\/$/, "")) {
    return Response.json({ error: "Origin not allowed." }, { status: 403 });
  }
  if (!configured()) return Response.json({ error: "Speech capture is temporarily unavailable. Please try again or contact your recruiter." }, { status: 503 });
  if (Number(request.headers.get("content-length")) > 12 * 1024 * 1024) return Response.json({ error: "Audio is too large." }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const language = form.get("language");
    if (!(file instanceof File) || !file.size || file.size > 12 * 1024 * 1024 || !/^(audio\/|video\/webm)/.test(file.type)) {
      return Response.json({ error: "Provide an audio recording under 12 MB." }, { status: 400 });
    }
    const body = new FormData();
    body.append("file", file);
    body.append("model", process.env.SPEECH_TRANSCRIPTION_MODEL || "whisper-large-v3");
    body.append("response_format", "json");
    body.append("temperature", "0");
    body.append("prompt", "Interview in Hindi, Marathi and English. Preserve the spoken language and code-switching. हिंदी और मराठी देवनागरी में, English words in English. Do not translate or invent speech.");
    if (typeof language === "string" && ["en", "hi", "mr"].includes(language)) body.append("language", language);
    const key = process.env.SPEECH_TRANSCRIPTION_API_KEY || process.env.GROQ_API_KEY;
    const response = await fetch(process.env.SPEECH_TRANSCRIPTION_URL || "https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST", body, headers: key ? { Authorization: `Bearer ${key}` } : {}, signal: AbortSignal.timeout(55000),
    });
    if (!response.ok) return Response.json({ error: "Transcription is temporarily unavailable. Retry your recording." }, { status: response.status === 429 ? 429 : 502 });
    const result = await response.json();
    return Response.json({ text: typeof result.text === "string" ? result.text.trim() : "" });
  } catch {
    return Response.json({ error: "Could not transcribe this recording. Please retry." }, { status: 502 });
  }
}
