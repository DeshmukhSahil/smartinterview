import { z } from "zod";
export const jobAlertSignupSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254).transform(s => s.toLowerCase()),
  mobile: z.string().trim().transform(s => s.replace(/[ ()-]/g,""))
    .refine(s => /^\+[1-9]\d{7,14}$/.test(s),"Enter a mobile number with country code, for example +91 98765 43210."),
  consent: z.literal(true,{errorMap:() => ({message:"Please agree to receive job-alert emails."})}),
  newsletter: z.boolean().default(false),
  website: z.string().max(200).optional(),
});
export const jobAlertActionSchema = z.object({action:z.enum(["confirm","unsubscribe"]),token:z.string().regex(/^[a-f0-9]{64}$/)});
export const signupMessage = "Check your inbox for a confirmation email. If you are already subscribed, your current preferences remain unchanged.";
