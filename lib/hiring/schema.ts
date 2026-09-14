import { z } from "zod";

export const fieldSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{0,49}$/),
  label: z.string().trim().min(1).max(200),
  type: z.enum(["text", "textarea", "number", "select"]),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
}).refine(f => f.type !== "select" || f.options.length > 0, "Select fields need options");
export const campaignSchema = z.object({
  id: z.string().uuid().optional(),
  role: z.enum(["Sales Executive / BDM", "O&M Executive", "Technician", "Tendering Manager", "Finance Manager"]),
  active: z.boolean(),
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
}).superRefine((c, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: "custom", message });
  if (c.active && !c.locations.length) fail("Enter approved locations before publishing");
  if (c.max_years !== null && c.max_years < c.min_years) fail("Maximum experience must be at least minimum experience");
  if (new Set(c.fields.map(f => f.id)).size !== c.fields.length) fail("Question IDs must be unique");
  if (c.role === "Finance Manager" && c.locations.some(l => l !== "Khamgaon")) fail("Finance location must be Khamgaon");
  if (c.role === "Tendering Manager" && c.locations.some(l => !["Khamgaon", "Nagpur"].includes(l))) fail("Tendering locations must be Khamgaon or Nagpur");
});
export type Campaign = z.infer<typeof campaignSchema>;
export const applicantSchema = z.object({
  campaign_id: z.string().uuid(), name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(254).transform(s => s.toLowerCase()),
  phone: z.string().trim().regex(/^[+\d ()-]{7,25}$/),
  location: z.string().trim().min(1).max(100), years: z.number().min(0).max(60),
  answers: z.record(z.string().max(50), z.string().max(2000)), consent: z.literal(true),
});
export const resultSchema = z.object({
  fit: z.enum(["suitable", "not_suitable", "needs_review"]),
  reason: z.string().min(10).max(2000),
  evidence: z.array(z.string().max(500)).max(8),
  gaps: z.array(z.string().max(500)).max(8),
});
export function validateAnswers(c: Campaign, a: z.infer<typeof applicantSchema>) {
  if (!c.locations.includes(a.location)) throw new Error("Choose an available location for this role");
  if (Object.keys(a.answers).some(id => !c.fields.some(f => f.id === id))) throw new Error("Form changed. Reload and try again");
  for (const f of c.fields) {
    const v = a.answers[f.id]?.trim() || "";
    if (f.required && !v) throw new Error(`${f.label} is required`);
    if (v && f.type === "select" && !f.options.includes(v)) throw new Error(`Invalid ${f.label}`);
    if (v && f.type === "number" && (!Number.isFinite(Number(v)) || Number(v) < 0)) throw new Error(`Invalid ${f.label}`);
  }
}
