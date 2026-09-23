// One-off seed: publishes every role from "Final Designations at Chirayu
// Power.docx" (via lib/hiring/departments.ts) as an open hiring_campaigns
// row in the ERP Supabase project, skipping any role a live campaign
// already effectively covers (matched by the same Jaccard word-overlap
// logic the careers page uses to pair a live campaign with its canonical
// document entry).
//
// SAFE BY DEFAULT: run with no flags to DRY-RUN -- prints a summary and
// writes the full generated payload to seed-department-roles.preview.json
// for review. Nothing is written to the database until you pass --apply.
//
//   node scripts/seed-department-roles.cjs            # dry run
//   node scripts/seed-department-roles.cjs --apply     # actually inserts
//
// Requires ERP_SUPABASE_URL and ERP_SUPABASE_SERVICE_ROLE_KEY (read from
// .env in the repo root, or already exported in the shell).
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

const APPLY = process.argv.includes("--apply");

// --- load .env (this repo has no dotenv dependency; existing scripts
// expect env vars to already be exported, but we read .env directly here
// so this is copy-paste runnable) ---
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

// --- load the department/role taxonomy straight from the TS source, same
// transpile-to-vm trick scripts/test-candidate-journey.cjs already uses,
// so this never drifts from what the careers page itself renders ---
const compiled = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, "../lib/hiring/departments.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;
const sandbox = { exports: {} };
vm.runInNewContext(compiled, sandbox);
const { DEPARTMENT_ORDER, DEPARTMENT_ROLES, departmentForRole } = sandbox.exports;

// --- word-overlap matching, duplicated from matchCanonicalRole's logic
// (that function only returns the best match, not its score, and we need
// the score here to decide "already covered" vs. "seed it") ---
const STOPWORDS = new Set(["the", "and", "of", "for", "in", "a", "to", "on", "with", "or"]);
function tokenize(s) {
  return new Set(s.toLowerCase().replace(/[^a-z0-9&]+/g, " ").split(" ").filter(w => w && !STOPWORDS.has(w)));
}
function similarity(a, b) {
  const ta = tokenize(a), tb = tokenize(b);
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  const union = new Set([...ta, ...tb]).size;
  return union > 0 ? shared / union : 0;
}
// A live title counts as "already covering" a canonical role above this
// score -- 1.0 is an exact word-set match (any order); 0.6 still allows
// minor phrasing drift without treating unrelated roles as duplicates.
const ALREADY_COVERED_THRESHOLD = 0.6;

// --- generic content generation (the document has no AI-screening
// config, HR-approved locations, or precise experience numbers -- these
// are deliberately generic placeholders for HR to refine per campaign) ---
function experienceFor(title) {
  const t = title.toLowerCase();
  if (/intern|trainee/.test(t)) return { min_years: 0, max_years: 1, experience_level: "Entry-Level" };
  if (/\bhead\b|\bvp\b|vice president|\bpresident\b|\bcfo\b|\bceo\b|\bgm\b|general manager|\bchief\b/.test(t))
    return { min_years: 10, max_years: 20, experience_level: "Leadership" };
  if (/assistant manager|deputy manager|asst\.? manager/.test(t))
    return { min_years: 3, max_years: 6, experience_level: "Mid-Level" };
  if (/\bjr\.?\b|junior/.test(t)) return { min_years: 0, max_years: 2, experience_level: "Junior" };
  if (/\bsr\.?\b|senior|principal|\blead\b/.test(t)) return { min_years: 5, max_years: 10, experience_level: "Senior" };
  if (/\bmanager\b/.test(t)) return { min_years: 4, max_years: 8, experience_level: "Managerial" };
  return { min_years: 1, max_years: 5, experience_level: "Mid-Level" };
}

const DEPT_ABBR = {
  Finance: "FIN", Marketing: "MKT", Sales: "SAL", Designing: "DSG", "O&M": "OM",
  Stores: "STR", Liaisoning: "LSN", Tendering: "TND", Purchase: "PUR", Project: "PRJ",
  HR: "HR", Safety: "SFT", "Admin & Support": "ADM", "Solar I&C": "SIC",
};

function buildCampaign(department, roleDoc, index) {
  const { min_years, max_years, experience_level } = experienceFor(roleDoc.title);
  return {
    role: roleDoc.title,
    interview_mode: "ai_assisted",
    active: true,
    is_open: true,
    locations: ["Khamgaon"],
    description: roleDoc.task,
    knowledge: `${roleDoc.title} - ${department} Department at Chirayu Power.\n\nTask: ${roleDoc.task}\n\nTypical duration/experience: ${roleDoc.duration}`,
    min_years,
    max_years,
    fields: [],
    questions: [
      `Walk us through your relevant experience for the ${roleDoc.title} role in our ${department} department.`,
      `This role involves: "${roleDoc.task}" Can you share an example of similar work you've done?`,
      `What draws you to a ${department} role at a solar EPC company like Chirayu Power?`,
      "What is your current notice period or earliest availability to join?",
    ],
    company_knowledge: `Chirayu Power Private Limited is a solar EPC (Engineering, Procurement & Construction) and renewable energy company headquartered in Khamgaon, Maharashtra, operating under the tagline "Energy with Integrity". This role sits within the company's ${department} department.`,
    system_prompt: `You are screening candidates for the ${roleDoc.title} position in the ${department} department at Chirayu Power, a solar EPC company. The role involves: ${roleDoc.task} Assess the candidate's relevant experience, communication clarity, and genuine interest in the role. Be professional and courteous throughout.`,
    ai_model: "gemini-2.5-flash",
    workplace_type: "In-Office",
    employment_type: "Full-Time",
    experience_level,
    salary_range: "",
    skills: [],
    responsibilities: [roleDoc.task],
    qualifications: [],
    benefits: [],
    job_code: `${DEPT_ABBR[department]}-${String(index + 1).padStart(2, "0")}`,
  };
}

// Basic sanity checks mirroring campaignSchema's constraints, so a bad
// generated row fails loudly here instead of as an opaque 400 from the
// insert (see lib/hiring/schema.ts campaignSchema).
function assertValid(c) {
  const fail = msg => { throw new Error(`Invalid campaign "${c.role}": ${msg}`); };
  if (c.role.length < 2 || c.role.length > 150) fail("role length");
  if (!c.description || c.description.length > 5000) fail("description length");
  if (c.knowledge.length < 20 || c.knowledge.length > 20000) fail("knowledge length");
  if (c.min_years < 0 || c.min_years > 60) fail("min_years range");
  if (c.max_years !== null && (c.max_years < c.min_years || c.max_years > 60)) fail("max_years range");
  if (!c.questions.length || c.questions.length > 30) fail("questions count");
  if (c.questions.some(q => !q.length || q.length > 1000)) fail("question length");
  if (!c.ai_model.length || c.ai_model.length > 100) fail("ai_model length");
  if (c.active && !c.locations.length) fail("active campaign needs locations");
  if (c.job_code && c.job_code.length > 100) fail("job_code length");
}

async function main() {
  const { createClient } = require("@supabase/supabase-js");
  const sb = createClient(ERP_SUPABASE_URL, ERP_SUPABASE_SERVICE_ROLE_KEY);

  console.log("==> Fetching existing hiring_campaigns roles for dedup...");
  const { data: existing, error } = await sb.from("hiring_campaigns").select("role");
  if (error) throw new Error(`Failed to read hiring_campaigns: ${error.message}`);
  console.log(`==> ${existing.length} existing campaigns found.`);

  const toInsert = [];
  const skipped = [];
  for (const department of DEPARTMENT_ORDER) {
    const canonicalRoles = DEPARTMENT_ROLES[department];
    canonicalRoles.forEach((roleDoc, index) => {
      const alreadyCovered = existing.some(row => {
        if (departmentForRole(row.role) !== department) return false;
        return similarity(row.role, roleDoc.title) >= ALREADY_COVERED_THRESHOLD;
      });
      if (alreadyCovered) {
        skipped.push({ department, title: roleDoc.title });
        return;
      }
      const campaign = buildCampaign(department, roleDoc, index);
      assertValid(campaign);
      toInsert.push(campaign);
    });
  }

  console.log(`\n==> ${toInsert.length} roles to seed, ${skipped.length} already covered by an existing campaign:`);
  for (const s of skipped) console.log(`    skip [${s.department}] ${s.title}`);

  const previewPath = path.join(__dirname, "seed-department-roles.preview.json");
  fs.writeFileSync(previewPath, JSON.stringify(toInsert, null, 2));
  console.log(`\n==> Full payload written to ${previewPath} for review.`);

  if (!APPLY) {
    console.log("\nDRY RUN complete -- nothing was written. Re-run with --apply to insert these rows.");
    return;
  }

  console.log(`\n==> Inserting ${toInsert.length} campaigns into hiring_campaigns (chunks of 20)...`);
  for (let i = 0; i < toInsert.length; i += 20) {
    const chunk = toInsert.slice(i, i + 20);
    const { error: insertError } = await sb.from("hiring_campaigns").insert(chunk);
    if (insertError) throw new Error(`Insert failed at chunk starting index ${i}: ${insertError.message}`);
    console.log(`    inserted ${Math.min(i + 20, toInsert.length)}/${toInsert.length}`);
  }
  console.log("==> Done.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
