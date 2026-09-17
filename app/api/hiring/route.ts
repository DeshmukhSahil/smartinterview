import { erp, failure } from "@/lib/hiring/server";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { data, error } = await erp().from("hiring_campaigns").select("id,role,locations,description,min_years,max_years,fields,workplace_type,employment_type,experience_level,salary_range,skills,responsibilities,qualifications,benefits,job_code").eq("active", true).order("role");
    if (error) throw error;
    return Response.json({ campaigns: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return failure(e); }
}
