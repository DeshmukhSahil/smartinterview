import { z } from "zod";
import { interviewDb } from "@/lib/hiring/server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email(),
  passwordId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "Please provide a valid email and invitation access code." }, { status: 400 });
    }

    const cleanEmail = parsed.data.email.trim().toLowerCase();
    const cleanPass = parsed.data.passwordId.trim().toUpperCase();

    // Local mock testing fallback if configured with mock credentials
    if (cleanEmail === "candidate@mock.com" && cleanPass === "CP-MOCK") {
      return Response.json({
        candidate: {
          candidate_name: "Candidate (Mock)",
          candidate_email: "candidate@mock.com",
          password_id: "CP-MOCK",
        },
      });
    }

    const db = interviewDb();
    const { data, error } = await db
      .from("interviews")
      .select("id, candidate_name, candidate_email, password_id, role, mode")
      .eq("candidate_email", cleanEmail)
      .eq("password_id", cleanPass)
      .limit(1);

    if (error) {
      console.error("Database candidate login query error:", error);
      return Response.json({ error: "Failed to authenticate against the database." }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return Response.json({ error: "Invalid credentials. Please verify your email and access code." }, { status: 401 });
    }

    const candidate = data[0];
    return Response.json({
      candidate: {
        id: candidate.id,
        candidate_name: candidate.candidate_name || "Candidate",
        candidate_email: candidate.candidate_email || cleanEmail,
        password_id: candidate.password_id || cleanPass,
        role: candidate.role,
        mode: candidate.mode,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Candidate login handler error:", err);
    return Response.json({ error: "An error occurred during authentication. Please try again." }, { status: 500 });
  }
}
