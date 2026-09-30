import { z } from "zod";
import { roundSchema } from "./schema";
export const desktopReportSchema = z.object({
  summary:z.string().max(100000),recommendation:z.enum(["hire","hold","reject"]),
  recommendation_reason:z.string().max(100000),
  strengths:z.array(z.object({point:z.string().max(10000),evidence:z.string().max(10000)})).max(100),
  concerns:z.array(z.object({point:z.string().max(10000),evidence:z.string().max(10000)})).max(100),
});
export const desktopDeliverySchema = z.object({
  version:z.literal(1),delivery_id:z.string().regex(/^[a-f0-9]{64}$/),
  session_id:z.string().uuid(),interview_id:z.string().uuid(),author_id:z.string().uuid(),
  round:roundSchema, revision:z.number().int().nonnegative(),
  segments:z.array(z.object({id:z.number().int(),channel:z.enum(["mic","speaker"]),
    role:z.literal("unknown"),content:z.string().min(1).max(100000),
    start_ms:z.number().int().nonnegative(),end_ms:z.number().int().nonnegative(),
  }).refine(s=>s.end_ms>=s.start_ms)).min(1).max(20000),
  report:desktopReportSchema.nullable(),
});
export function desktopNotes(report:z.infer<typeof desktopReportSchema>) {
  return {
    summary:report.summary.slice(0,2000), keyPoints:[report.recommendation_reason.slice(0,300)],
    strengths:report.strengths.slice(0,8).map(p=>`${p.point} — ${p.evidence}`.slice(0,300)),
    concerns:report.concerns.slice(0,8).map(p=>`${p.point} — ${p.evidence}`.slice(0,300)),
    followUps:[], recommendation:report.recommendation==="hire"?"yes":report.recommendation==="reject"?"no":"needs_review",
  };
}
