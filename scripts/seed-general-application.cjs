// One-off seed: publishes the single "General Application" catch-all
// campaign the careers page's zero-result search state links to (see
// openGeneralApplication / GENERAL_APPLICATION_JOB_CODE in app/page.tsx).
// It's identified by job_code "GENERAL" -- the frontend looks it up by
// that, never by its display title, so the title can be edited later in
// the HR admin panel without breaking the link.
//
// SAFE BY DEFAULT: dry-run unless you pass --apply. Refuses to insert a
// second one if a campaign with job_code "GENERAL" already exists.
//
//   node scripts/seed-general-application.cjs            # dry run
//   node scripts/seed-general-application.cjs --apply     # actually inserts
//
// Requires ERP_SUPABASE_URL and ERP_SUPABASE_SERVICE_ROLE_KEY (read from
// .env in the repo root, or already exported in the shell).
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const APPLY = process.argv.includes("--apply");
const JOB_CODE = "GENERAL";

const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
  }
}

const ERP_SUPABASE_URL = process.env.ERP_SUPABASE_URL;
const ERP_SUPABASE_SERVICE_ROLE_KEY = process.env.ERP_SUPABASE_SERVICE_ROLE_KEY;
if (!ERP_SUPABASE_URL || !ERP_SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing ERP_SUPABASE_URL / ERP_SUPABASE_SERVICE_ROLE_KEY in .env or the environment.");
  process.exit(1);
}

async function main() {
  const { createClient } = require("@supabase/supabase-js");
  const sb = createClient(ERP_SUPABASE_URL, ERP_SUPABASE_SERVICE_ROLE_KEY);

  console.log("==> Checking for an existing General Application campaign...");
  const { data: existing, error: existingError } = await sb.from("hiring_campaigns").select("id,role,job_code");
  if (existingError) throw new Error(`Failed to read hiring_campaigns: ${existingError.message}`);
  const already = existing.find(row => row.job_code === JOB_CODE);
  if (already) {
    console.log(`==> Already exists: "${already.role}" (id ${already.id}). Nothing to do -- edit it directly in the HR admin panel if you want to change its content.`);
    return;
  }

  // Open to every city the company currently lists a role in, so the
  // "preferred location" dropdown isn't artificially narrow for an
  // application that isn't tied to one specific site. (The select above
  // only fetched id/role/job_code, so locations need their own fetch.)
  const { data: withLocations, error: locError } = await sb.from("hiring_campaigns").select("locations");
  if (locError) throw new Error(`Failed to read locations: ${locError.message}`);
  const allLocations = [...new Set(withLocations.flatMap(row => row.locations || []))].sort();
  if (!allLocations.length) throw new Error("No existing campaign locations found to seed this campaign's locations from.");

  const campaign = {
    role: "General Application",
    interview_mode: "one_on_one",
    active: true,
    is_open: true,
    locations: allLocations,
    description: "Don't see the exact role you're looking for in our current openings? Tell us what you're interested in and attach your resume -- HR reviews every general application and will reach out if there's a fit with an upcoming or unlisted opening.",
    knowledge: "This is a general, open application not tied to a specific role or department -- Chirayu Power is a solar EPC (Engineering, Procurement & Construction) company. There is no fixed job description or experience bracket to screen against here. Assess only general professionalism, clarity of the resume, and whether the candidate's stated experience is coherent and relevant to *some* role at a solar EPC company (finance, sales, engineering/design, project execution, O&M, HR, admin, etc.) -- do not reject for not matching a specific role. Default to needs_review rather than not_suitable whenever evidence is ambiguous, since HR still needs to manually match this candidate to a relevant opening.",
    min_years: 0,
    max_years: null,
    fields: [
      { id: "desired_role", label: "What role, job title, or area are you interested in?", type: "text", required: true, options: [] },
    ],
    questions: [
      "Tell us about your background and the kind of role you're hoping to find at Chirayu Power.",
      "What skills or experience would you bring to a role that isn't currently listed on our careers page?",
    ],
    company_knowledge: "Chirayu Power Private Limited is a solar EPC (Engineering, Procurement & Construction) and renewable energy company headquartered in Khamgaon, Maharashtra, operating under the tagline \"Energy with Integrity\".",
    system_prompt: "",
    ai_model: "gemini-2.5-flash",
    workplace_type: "In-Office",
    employment_type: "Full-Time",
    experience_level: "All levels",
    salary_range: "",
    skills: [],
    responsibilities: [],
    qualifications: [],
    benefits: [],
    job_code: JOB_CODE,
  };

  console.log("\n==> Campaign to insert:");
  console.log(JSON.stringify(campaign, null, 2));

  if (!APPLY) {
    console.log("\nDRY RUN complete -- nothing was written. Re-run with --apply to insert this campaign.");
    return;
  }

  const { error: insertError } = await sb.from("hiring_campaigns").insert(campaign);
  if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
  console.log("==> Done. \"General Application\" is now live (job_code: GENERAL).");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
