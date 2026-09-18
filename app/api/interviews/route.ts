import { supabase } from "@/lib/supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("interviews")
      .select("id, role, candidate_name, questions")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return Response.json({ success: true, data }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { error } = await supabase.from("interviews").insert([body]);

    if (error) throw error;
    return Response.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}
