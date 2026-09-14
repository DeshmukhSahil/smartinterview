# Hiring campaigns

The ERP Create Interview page manages campaigns. The interview app serves `/apply` and `/api/hiring/*`. Campaign settings, screening and private resume files live in the ERP database. Generated interview records live in the existing Smart Interview database. No new mailbox is created: the mandatory submitted email becomes the existing portal login email.

## Deployment

1. Apply ERP migration `supabase/migrations/20260912120000_hiring_campaigns.sql` to the ERP database, which must already have `has_view_right` and `has_any_right`.
2. Apply `migrations/20260912_hiring_interview_link.sql` to the Smart Interview database. The existing interviews table must have the columns used by ERP Create Interview, including `system_prompt`.
3. Configure the server variables in `.env.hiring.example` in the interview deployment. Reuse the existing Smart Interview URL, and provide its service-role key separately. Never put service keys or the OpenRouter key in browser variables. `ERP_ORIGIN` must be the exact ERP origin without a trailing slash. The ERP's existing `VITE_SMART_INTERVIEW_API_URL` must point to this interview deployment.
4. Configure a verified Resend sender/domain and its API key. The acknowledgement body is fixed and includes login email, generated access password ID, and portal URL. The initial send happens during submission. Configure an authenticated scheduler to POST `/api/hiring/retry` every minute with `Authorization: Bearer <HIRING_CRON_SECRET>` to recover interrupted or failed sends. No scheduler is automatically installed. HR can also retry from Create Interview.
5. Set the trusted client IP header for your deployment. The reverse proxy MUST overwrite that header and prevent direct origin access. The screen endpoint limits requests to ten per IP per hour. Configure a 4.5 MB request-body limit at the proxy as well. Resume files are limited to 4 MB; PDF and plain text are supported. Scanned PDFs require OCR and DOCX is not currently supported.
6. In Create Interview, select a role template, review and expand role knowledge, edit questions, then save and publish. Templates contain the user-provided locations; campaigns are drafts by default. Copy the application page URL for hiring campaigns. Publishing requires at least one location.

## Behavior and operations

- Selection drives locations and questions. Email and core candidate fields cannot be removed. Changing a candidate detail invalidates the prior screening, requiring another upload. Screening tokens expire after 24 hours unless already submitted.
- OpenRouter defaults to `openrouter/free`, permits only free model IDs, and requests providers that do not collect data. Free capacity and compatible providers are not guaranteed. Invalid results, rate limits and provider failures return `needs_review`, preserving the option to apply. No automatic rejection occurs.
- Only job-related evidence should inform fit. HR knowledge is the role definition. Candidate text is marked as untrusted; missing evidence is not proof of unsuitability. Contact details are redacted where possible; consent explains external AI processing. Redaction is best-effort and is not full anonymization.
- Submission persists before provisioning and email. A unique campaign/email constraint prevents repeat applications. A delivery lease and unique interview link prevent duplicate provisioning. Retried email requests reuse the same Resend idempotency key. The provider's deduplication window is 24 hours; after 23 hours uncertain sends require manual review instead of blindly sending again. Do not change sender/public URL while retrying pending messages, because idempotent payloads must stay identical.
- `sent` means the email provider accepted the message, not guaranteed inbox delivery. Inspect the provider dashboard for bounces. Applications are shown in the campaign section of Create Interview; this feature does not insert into the separate legacy candidate_pipeline table.
- The stored application contains the exact campaign snapshot used to screen and create the interview. Subsequent HR edits affect new screenings. Paused campaigns or removed locations cannot accept new submissions.
- Resumes use a private ERP bucket. Only the service can write; authorized HR can obtain a 60-second signed download link. Application APIs never return passwords or internal role knowledge to the public.
- Existing Smart Interview login stores and queries legacy `password_id` credentials. This feature uses that existing contract. Existing permissive interviews-table policies and client-side authentication are a separate security limitation; review/harden that legacy login before an internet-facing launch. This migration does not broaden its policies.
- Schedule retention cleanup for abandoned (unsubmitted) screenings after 24 hours: remove each `resume_path` from `hiring-resumes`, then delete its application row. Set a company-approved retention period for submitted applications before launch. No candidate records are automatically deleted by this change.

## Acceptance checks (use synthetic resumes and a controlled email address)

1. Verify unauthenticated admin calls are 401, non-HR calls 403, HR can save, and drafts are absent from `/apply`.
2. Publish each template, verify all role-specific cities and fields, single-location Finance, and mandatory email/consent. Confirm invalid values are rejected at the API too.
3. Compare an accounting resume, a banking/collections-only resume and an ambiguous resume for Finance. Confirm evidence-based reasons and HR review on uncertainty or provider outage.
4. Upload text PDF/TXT; reject invalid, scanned and oversized input. Edit a field after screening and verify the previous result cannot be submitted by the UI.
5. Submit twice and concurrently: verify one submitted application, one linked interview and one email. Simulate email failure, retry, verify the original credentials remain unchanged and login works.
6. Verify HR can download a resume and inspect failed delivery, while public callers cannot read application records or the storage bucket.

References: [OpenRouter free routing](https://openrouter.ai/docs/faq), [provider privacy](https://openrouter.ai/docs/guides/privacy/data-collection), [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
