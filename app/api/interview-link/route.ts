import { z } from "zod";
import { interviewDb } from "@/lib/hiring/server";
import { LINK_TOKEN_PATTERN, verifyInterviewLinkToken } from "@/lib/hiring/link";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  id: z.string().uuid(),
  token: z.string().regex(LINK_TOKEN_PATTERN),
});

// Every rejection looks identical (unknown id, wrong token, malformed input),
// so this can't be used to probe which interviews exist.
const invalid = () => Response.json({ error: "This link is invalid or has expired." }, { status: 404 });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid();
  try {
    const { data, error } = await interviewDb()
      .from("interviews")
      .select("id,candidate_email,password_id")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (error) throw error;
    if (!data?.candidate_email || !data.password_id) return invalid();
    if (!verifyInterviewLinkToken(data.id, data.password_id, parsed.data.token)) return invalid();
    return Response.json({ email: data.candidate_email, passwordId: data.password_id }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Something went wrong. Please try again shortly." }, { status: 500 });
  }
}
