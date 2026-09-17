# Chirayu Hire — candidate experience

## Direction

A calm engineering journal: precise alignment, generous but purposeful spacing, deep blue actions, warm paper, thin rules and a restrained yellow line marking the current journey stage. Inter handles reading and controls; Georgia italic provides a small human accent in editorial headings. Existing Chirayu branding and solar photography anchor the experience in the company.

## Audit and decisions

- Candidate priorities are the next conversation, preparation, feedback and history. The revised reference-led Home uses four summary tiles, assessment ratings, next interview, takeaways, preparation and a compact history table. All displayed numbers come from current records and local profile fields.
- Three destinations merit direct navigation. The requested desktop sidebar exposes Overview, My interviews, My profile and Help. Applications is disabled because there is no candidate application-tracking route. Mobile uses the existing compact two-row navigation.
- The sidebar follows the supplied dashboard reference. Interviews retains rows, compact status controls and search only above five invitations.
- Assessment previously repeated the total score in a badge and progress bar, surrounded category scores with cards, and used administrative language. It now presents one overall rating, a ruled list of observations, strengths, development points and a recruiter next-step note.
- Missing assessment data must not look like a zero score. The assessment view now explicitly describes unavailable feedback or ratings.
- Personal notes remain browser-local and clearly labelled. Invitation identity remains read-only. Save, discard and unsaved-change feedback are visible.
- Cancelled and missed invitations have no start action. Completed invitations without a saved report describe feedback availability.

## Reusable system

- `app/candidate-foundations.css`: scoped colour, type, spacing, control, focus and motion primitives.
- `components/PortalShell.module.css`: responsive shell and navigation.
- `components/CandidateJourneySteps.tsx`: invitation → preparation → interview → assessment → feedback → next step; current phase is announced with `aria-current="step"`.
- `components/CandidateOverview.module.css`: reference-led dashboard grid, score bars, summary tiles and responsive history table.
- `components/CandidateJourney.module.css`: shared Home, Interviews and Profile composition.
- `components/CandidateAssessment.module.css`: assessment reading layout and journey styling.
- `components/CandidateInterviewRow.tsx`: shared invitation status, date and action rendering.
- `lib/candidate-journey.ts` and `hooks/use-candidate-journey.ts`: shared status presentation and existing Supabase-backed loading.

## Motion and responsive rules

Page entry travels 8px over 420ms with a natural easing curve. On mobile it becomes a 300ms opacity transition. Button icons move 2px on precise-pointer hover over 180ms. Menus and dialogs use 150–250ms transitions. Nothing loops, counts up or animates score bars. Reduced-motion disables animation and transitions. Static environmental photography is intentional: these task-oriented pages do not need parallax.

At 900px, secondary context moves below primary content. At 800px the shell becomes compact and the six journey stages form two rows. At 600px navigation gets a dedicated row, form fields stack and interview actions span their rows. Content remains constrained on wide desktop screens.

## Integration boundaries

Existing URLs, authentication checks, Supabase APIs, database schema and interview execution remain in place. The assessment route retains its existing query and retake behaviour. No recruiter delivery or cross-device persistence was added for personal notes. Existing unconfigured-service sample behaviour in the assessment route was retained.

## Validation

TypeScript, targeted ESLint and deterministic interview-status tests are used alongside browser review with an isolated local fixture backend. Visual review covers desktop, tablet and small phones, including boundary widths. The preview uses fictional candidate records; live interviews and real candidate records are not exercised by these checks.
