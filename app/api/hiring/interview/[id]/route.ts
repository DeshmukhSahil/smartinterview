import { z } from "zod";
import { requireHR, failure, cors, interviewDb } from "@/lib/hiring/server";

export const dynamic = "force-dynamic";

export async function OPTIONS(r: Request) { return new Response(null, { status: 204, headers: cors(r) }); }

export async function GET(r: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireHR(r, "view");
    const { id } = await params;
    z.string().uuid().parse(id);
    const { data, error } = await interviewDb().from("interviews").select("*").eq("id", id).single();
    if (error || !data) throw new Error("Interview not found");
    return Response.json({ interview: data }, { headers: { ...cors(r), "Cache-Control": "no-store" } });
  } catch (e) { return failure(e, r); }
}
