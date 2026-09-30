import { z } from "zod";

export const fieldSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{0,49}$/),
  label: z.string().trim().min(1).max(200),
  // Beyond HR's own free-form question types (text/textarea/number/select),
  // the fixed apply-form fields (name/email/phone/resume/consent/location/
  // work preference) are represented as fields too -- see CORE_FIELDS below
  // -- so the whole form, not just HR's extra questions, is field-driven and
  // orderable/labelable/conditionally-visible through one system.
  type: z.enum([
    "text", "textarea", "number", "select",
    "email", "phone", "file", "consent", "location_search", "radio", "checkbox_group",
  ]),
  required: z.boolean(),
  // For select/radio/checkbox_group. Ignored for checkbox_group on the one
  // built-in "comfortable_locations" field, whose real options are the
  // campaign's own `locations` at render time, not anything stored here.
  options: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  // Conditional visibility: this field only renders (and, correspondingly,
  // is not required/validated) when another field's answer equals `value`.
  // Null = always shown. Evaluated against the same answers map every other
  // field reads/writes -- core fields included, since they're keyed by
  // their own CORE_FIELD id (e.g. "work_location_preference") the same way
  // an HR-authored field is keyed by its own id.
  condition: z.object({ fieldId: z.string(), value: z.string() }).nullable().default(null),
}).refine(f => (f.type !== "select" && f.type !== "radio") || f.options.length > 0, "Select/radio fields need options");
export const campaignSchema = z.object({
  // Optional for historical application snapshots and older API clients.
  department_id: z.string().uuid().optional(),
  id: z.string().uuid().optional(),
  role: z.string().trim().min(2).max(150),
  interview_mode: z.enum(["ai_assisted", "one_on_one"]).default("ai_assisted"),
  active: z.boolean(),
  // Independent of `active` (published/visible at all): whether a published
  // role is still accepting applications. A closed-but-active role stays
  // visible on the careers portal (old links, employer branding, SEO) but
  // is labeled "Closed" and blocks new submissions.
  is_open: z.boolean().default(true),
  locations: z.array(z.string().trim().min(1).max(100)).max(100),
  description: z.string().trim().min(1).max(5000),
  knowledge: z.string().trim().min(20).max(20000),
  min_years: z.number().min(0).max(60),
  max_years: z.number().min(0).max(60).nullable(),
  fields: z.array(fieldSchema).max(30),
  questions: z.array(z.string().trim().min(1).max(1000)).min(1).max(30),
  company_knowledge: z.string().max(20000),
  system_prompt: z.string().max(20000),
  ai_model: z.string().min(1).max(100),
  // Rich job-description metadata, candidate-facing on the /apply job detail
  // page. Defaults mirror the DB column defaults so rows created before this
  // migration (and admin submissions that omit them) still validate.
  workplace_type: z.enum(["In-Office", "On-Site", "Hybrid", "Remote"]).default("In-Office"),
  employment_type: z.enum(["Full-Time", "Part-Time", "Contract", "Internship"]).default("Full-Time"),
  experience_level: z.string().trim().min(1).max(100).default("Mid-Level"),
  salary_range: z.string().trim().max(200).default(""),
  skills: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  responsibilities: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
  qualifications: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
  benefits: z.array(z.string().trim().min(1).max(300)).max(50).default([]),
  job_code: z.string().trim().max(100).nullable().default(null),
}).superRefine((c, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: "custom", message });
  if (c.active && !c.locations.length) fail("Enter approved locations before publishing");
  if (c.max_years !== null && c.max_years < c.min_years) fail("Maximum experience must be at least minimum experience");
  if (new Set(c.fields.map(f => f.id)).size !== c.fields.length) fail("Question IDs must be unique");
  if (c.role === "Finance Manager" && c.locations.some(l => l !== "Khamgaon")) fail("Finance location must be Khamgaon");
  if (c.role === "Tendering Manager" && c.locations.some(l => !["Khamgaon", "Nagpur"].includes(l))) fail("Tendering locations must be Khamgaon or Nagpur");
});
export type Campaign = z.infer<typeof campaignSchema>;
export type Field = z.infer<typeof fieldSchema>;

export const CORE_FIELD_IDS = [
  "name", "email", "phone", "location", "work_location_preference",
  "comfortable_locations", "years", "resume", "consent",
] as const;
export type CoreFieldId = typeof CORE_FIELD_IDS[number];

export const WORK_LOCATION_PREFERENCE_OPTIONS = [
  "I prefer to work near my current location",
  "I'm open to relocating for this role",
];

// Canonical id/type per fixed apply-form field -- these never change no
// matter what a campaign's stored override says (email must always validate
// as an email address regardless of what a campaign's own `fields` entry
// claims), so the rest of the system (screen/submit routes, email delivery,
// the ERP) can keep reading candidate.email/phone/etc. as a stable, typed
// contract. label/required/condition/order ARE campaign-configurable, via a
// same-id entry in that campaign's own `fields` array -- that's the "dynamic
// with conditions" part: HR can relabel, reorder, make optional, or attach a
// visibility condition, without the validation semantics ever moving.
const CORE_FIELD_DEFAULTS: Record<CoreFieldId, { label: string; type: Field["type"] }> = {
  name: { label: "Full name", type: "text" },
  email: { label: "Email address", type: "email" },
  phone: { label: "Phone number", type: "phone" },
  location: { label: "Current location", type: "location_search" },
  work_location_preference: { label: "Work location preference", type: "radio" },
  comfortable_locations: { label: "I am comfortable working at", type: "checkbox_group" },
  years: { label: "Total experience (years)", type: "number" },
  resume: { label: "Upload your resume", type: "file" },
  consent: {
    label: "I agree to share my application and resume with Chirayu Power HR and to AI-assisted screening through OpenRouter and its model providers. I understand HR makes the final decision.",
    type: "consent",
  },
};

export function isCoreFieldId(id: string): id is CoreFieldId {
  return (CORE_FIELD_IDS as readonly string[]).includes(id);
}

// A campaign's `fields` array is the literal, complete source of truth for
// its apply form -- a field renders and is validated only if it's actually
// present there. Nothing is synthesized for a missing core field; every
// campaign needs its own name/email/phone/etc. entries seeded in (see
// migrations/20260930_seed_core_hiring_fields.sql for the one-time
// backfill, and the ERP's campaign editor for new campaigns going forward).
//
// What this DOES still do: for any field whose id matches a CORE_FIELD_ID,
// its `type` (and, for work_location_preference, its `options`) are forced
// to the canonical value from CORE_FIELD_DEFAULTS, regardless of what's
// stored -- so email always validates as an email, work location preference
// always offers the same two real choices, etc., even though a campaign is
// otherwise free to edit that entry's label/required/condition/order.
export function normalizeCoreFields(fields: Field[]): Field[] {
  return fields.map(f => {
    if (!isCoreFieldId(f.id)) return f;
    const def = CORE_FIELD_DEFAULTS[f.id];
    return {
      ...f,
      type: def.type,
      options: f.id === "work_location_preference" ? WORK_LOCATION_PREFERENCE_OPTIONS : f.options,
    };
  });
}

// A field's condition (if any) is checked against the same answers a
// candidate is filling in -- `lookup(fieldId)` returns that field's current
// string value, or the joined values of a checkbox_group. No condition
// means always visible/applicable.
export function conditionMet(field: Field, lookup: (fieldId: string) => string | string[]): boolean {
  if (!field.condition) return true;
  const v = lookup(field.condition.fieldId);
  return Array.isArray(v) ? v.includes(field.condition.value) : v === field.condition.value;
}

export const applicantSchema = z.object({
  campaign_id: z.string().uuid(), name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(254).transform(s => s.toLowerCase()),
  phone: z.string().trim().regex(/^[+\d ()-]{7,25}$/),
  // The candidate's own current city (free entry, via the India Post search --
  // see searchLocations() in app/page.tsx), completely independent of the job's
  // own approved locations (Campaign.locations). Deliberately not validated
  // against c.locations: a candidate can live anywhere and still apply for a
  // role based in a different city, which is the whole point of separating
  // "where the candidate lives" from "where the role is."
  // These three, unlike name/email/phone above, are only structurally typed
  // here -- their actual requiredness is condition-aware and enforced in
  // validateAnswers() against the campaign's own withCoreFields() config, the
  // same way an HR custom question's requiredness already worked. That's
  // what makes them genuinely conditional: a campaign can mark one optional,
  // or attach a `condition` that hides it (and its requirement) entirely.
  location: z.string().trim().max(100).default(""), years: z.number().min(0).max(60),
  work_location_preference: z.enum(["near_current", "open_to_relocate", ""]).default(""),
  // Only meaningful for a role open in more than one place -- which of the
  // job's OWN locations the candidate would accept. Not shown/asked at all
  // for a single-location role, since there's nothing to choose there.
  comfortable_locations: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  answers: z.record(z.string().max(50), z.string().max(2000)), consent: z.literal(true),
});
export const resultSchema = z.object({
  fit: z.enum(["suitable", "not_suitable", "needs_review"]),
  reason: z.string().min(10).max(2000),
  evidence: z.array(z.string().max(500)).max(8),
  gaps: z.array(z.string().max(500)).max(8),
});
// "unknown" is the common case in practice: a single-microphone live capture from the HR
// side can't reliably diarize who said what, so most captured chunks are tagged unknown
// rather than falsely attributed to either speaker.
export const transcriptTurnSchema = z.object({
  role: z.enum(["hr", "candidate", "unknown"]),
  content: z.string().min(1).max(4000),
});
export const notesSchema = z.object({
  summary: z.string().min(1).max(2000),
  keyPoints: z.array(z.string().max(300)).max(10),
  strengths: z.array(z.string().max(300)).max(8),
  concerns: z.array(z.string().max(300)).max(8),
  followUps: z.array(z.string().max(300)).max(8),
  recommendation: z.enum(["strong_yes", "yes", "needs_review", "no"]),
});
export type InterviewNotes = z.infer<typeof notesSchema>;
export type TranscriptTurn = z.infer<typeof transcriptTurnSchema>;

// A human interview round. "screening" is the original one-on-one call; the other three
// are candidate_pipeline stages (Interview / Final Interview with MD / HR Round) that
// previously had no notes capture at all -- see migrations/20260922_round_notes.sql.
// Short DB tokens, distinct from the ERP's candidate_pipeline.stage display names;
// ROUND_LABELS is the display mapping.
export const roundSchema = z.enum(["screening", "interview", "final_md", "hr_round"]);
export type Round = z.infer<typeof roundSchema>;
export const ROUND_LABELS: Record<Round, string> = {
  screening: "Screening",
  interview: "Interview",
  final_md: "Final Interview with MD",
  hr_round: "HR Round",
};
export const roundNotesRowSchema = z.object({
  id: z.string().uuid(),
  interview_id: z.string().uuid(),
  round: roundSchema,
  // "desktop_app" = AI-Transcribe (mic+speaker capture with AEC, via the ERP relay --
  // see lib/hiring/server.ts ingestRoundTranscript()), replacing the old single-mic
  // browser capture as the default path for human rounds.
  transcript_source: z.enum(["mic", "graph_transcript", "manual_upload", "desktop_app"]),
  live_transcript: z.array(transcriptTurnSchema),
  ai_draft: notesSchema.nullable(),
  ai_verified: notesSchema.nullable(),
  hr_notes: notesSchema.nullable(),
  submitted_at: z.string().nullable(),
  submitted_by: z.string().nullable(),
});
export type RoundNotesRow = z.infer<typeof roundNotesRowSchema>;
// Bridges the core answer shape (named properties on `a`) and HR's custom
// questions (the generic `a.answers` map) into one lookup, so conditionMet()
// and the requiredness loop below work identically for both kinds of field.
function coreOrCustomAnswer(a: z.infer<typeof applicantSchema>, fieldId: string): string | string[] {
  switch (fieldId) {
    case "name": return a.name;
    case "email": return a.email;
    case "phone": return a.phone;
    case "location": return a.location;
    case "work_location_preference": return a.work_location_preference;
    case "comfortable_locations": return a.comfortable_locations;
    case "years": return String(a.years);
    case "consent": return a.consent ? "true" : "";
    case "resume": return ""; // the actual file, never condition-driven
    default: return a.answers[fieldId] ?? "";
  }
}
export function validateAnswers(c: Campaign, a: z.infer<typeof applicantSchema>) {
  if (Object.keys(a.answers).some(id => !c.fields.some(f => f.id === id) && !isCoreFieldId(id))) {
    throw new Error("Form changed. Reload and try again");
  }
  const lookup = (fieldId: string) => coreOrCustomAnswer(a, fieldId);
  for (const f of normalizeCoreFields(c.fields)) {
    if (!conditionMet(f, lookup)) continue;
    if (f.id === "comfortable_locations") {
      if (c.locations.length > 1 && f.required && !a.comfortable_locations.some(l => c.locations.includes(l))) {
        throw new Error("Choose at least one location you're comfortable working at for this role");
      }
      continue;
    }
    // name/email/phone/consent/resume: structurally required and validated
    // by applicantSchema itself (or, for resume, the upload route) -- always,
    // not campaign-configurable, so nothing further to check here.
    if (f.id === "name" || f.id === "email" || f.id === "phone" || f.id === "consent" || f.id === "resume") continue;
    if (f.id === "location" || f.id === "work_location_preference" || f.id === "years") {
      const v = lookup(f.id);
      const empty = Array.isArray(v) ? v.length === 0 : !v.trim();
      if (f.required && empty) throw new Error(`${f.label} is required`);
      continue;
    }
    const v = a.answers[f.id]?.trim() || "";
    if (f.required && !v) throw new Error(`${f.label} is required`);
    if (v && f.type === "select" && !f.options.includes(v)) throw new Error(`Invalid ${f.label}`);
    if (v && f.type === "number" && (!Number.isFinite(Number(v)) || Number(v) < 0)) throw new Error(`Invalid ${f.label}`);
  }
}
