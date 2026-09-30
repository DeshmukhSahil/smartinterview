import { erp, failure } from "@/lib/hiring/server";
import { PUBLIC_DEPARTMENT_COLUMNS } from "@/lib/hiring/hiringDepartments";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const db = erp();
    const { data, error } = await db.from("hiring_campaigns").select("id,department_id,role,locations,description,min_years,max_years,fields,workplace_type,employment_type,experience_level,salary_range,skills,responsibilities,qualifications,benefits,job_code,is_open").eq("active", true).order("role");
    if (error) throw error;
    const departments = await db.from("hiring_departments").select(PUBLIC_DEPARTMENT_COLUMNS).order("sort_order").order("name");
    if (departments.error) throw departments.error;
    return Response.json({ campaigns: data, departments: departments.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return failure(e); }
}
