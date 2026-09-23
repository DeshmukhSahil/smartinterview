// Department taxonomy sourced from "Final Designations at Chirayu Power.docx"
// (the company's internal role-hierarchy reference). Campaigns are created
// with free-text role titles by HR, so there's no reliable foreign key to a
// department -- this classifies a campaign's `role` string into one of the
// company's real departments by keyword match against that reference.
//
// Order matters: entries are checked top-to-bottom and the first match wins,
// so more specific/ambiguous department pairs (e.g. "Graphic Designer" under
// Marketing vs. "Design Engineer" under Designing) are ordered with the
// narrower or more distinguishing pattern first.
export const DEPARTMENT_ORDER = [
  "Finance",
  "Marketing",
  "Sales",
  "Designing",
  "O&M",
  "Stores",
  "Liaisoning",
  "Tendering",
  "Purchase",
  "Project",
  "HR",
  "Safety",
  "Admin & Support",
  "Solar I&C",
] as const;

export type Department = (typeof DEPARTMENT_ORDER)[number];

const DEPARTMENT_PATTERNS: [Department, RegExp][] = [
  ["Finance", /finance|\bcfo\b|\baccounts?\b/i],
  ["Marketing", /marketing|graphic designer|\bbrand(ing)?\b|\bseo\b|social media|ai\s*&\s*automation|automation engineer/i],
  ["Sales", /\bsales\b|\bbdm\b|business development|tele-?caller/i],
  // "Principal Engineer" and "Lead Engineer" are Designing-track titles
  // that use "Engineer" without "design"/"engineering" -- called out by
  // name (not a bare \bengineer\b) so they don't swallow Project's own
  // "Site Engineer"/"Project Engineer" titles, which are checked later.
  ["Designing", /\bdesign\b|\bdesigning\b|\bengineering\b|\bcad\b|\bstaad\b|principal engineer|lead engineer/i],
  ["O&M", /o\s*&\s*m\b|operations?\s*(and|&)\s*maintenance/i],
  ["Stores", /\bstores?\b|inventory|warehouse/i],
  // "Liasoning" (missing the second "i") is a live, misspelled title in
  // production campaign data -- matched alongside the correct spelling.
  ["Liaisoning", /liaison|liasoning/i],
  ["Tendering", /tender/i],
  ["Purchase", /purchase|procurement/i],
  ["Project", /\bprojects?\b|site engineer|site supervisor|site trainee|site co-?ordinator/i],
  ["HR", /\bhr\b|human resource|talent acquisition|\brecruit|ta\s*&\s*development/i],
  ["Safety", /safety|\bhse\b/i],
  ["Admin & Support", /\badmin\b|\bdriver\b|housekeeping|office assistant|\bpeon\b/i],
  ["Solar I&C", /\bi\s*&\s*c\b|installation|solar installer|\binstaller\b|\bhelper\b|\btechnician\b/i],
];

const OTHER: Department | "Other" = "Other";

// Falls back to "Other" (rather than throwing) so a campaign with an
// unrecognized role title still renders somewhere instead of disappearing.
export function departmentForRole(role: string): Department | "Other" {
  const match = DEPARTMENT_PATTERNS.find(([, pattern]) => pattern.test(role));
  return match ? match[0] : OTHER;
}

export interface DepartmentRole {
  title: string;
  task: string;
  duration: string;
}

// The full canonical role hierarchy per department, verbatim from the
// document (minus the "Current Posts @ Chirayu power" named-employee
// rosters, which are internal HR data, not public role listings) -- each
// with its own Task/Duration text as written in the document.
export const DEPARTMENT_ROLES: Record<Department, DepartmentRole[]> = {
  Finance: [
    { title: "Chief Financial Officer (CFO)", task: "Oversees financial strategy, ensures compliance, manages taxation, audits, banking, and investor relations.", duration: "Long-term leadership role (8-12+ years in role; typically 18-25+ yrs overall exp.)." },
    { title: "Manager - Finance", task: "Manages MIS, monthly financial reporting, bank reconciliations, vendor payments, and financial planning.", duration: "4-6 years in role (usually 10-15 yrs exp.)." },
    { title: "Deputy Manager - Finance", task: "Supervises finance executives, ensures GST/TDS compliance, and coordinates with statutory/internal auditors, looking after daily transactions and payments.", duration: "3-5 years (usually 7-10 yrs exp.)." },
    { title: "Finance Executive", task: "Handles daily accounting in Tally/ERP, bank entries, expense vouchers, and vendor follow-ups.", duration: "2-4 years (typically 2-6 yrs exp.)." },
    { title: "Jr. Finance Executive", task: "Supports accounting through data entry, document control, voucher preparation, and petty cash management.", duration: "1-2 years (entry-level, 0-2 yrs exp.)." },
    { title: "Finance Trainee", task: "Learns financial processes under executives, assists with data entry, reconciliations, and MIS support.", duration: "6-12 months (fresher role; stepping stone to Junior Finance Executive)." },
  ],
  Marketing: [
    { title: "Manager - Marketing", task: "Leads the entire marketing function, sets strategy, allocates budgets, plans campaigns, oversees brand building and corporate communication.", duration: "5+ years (senior role; pipeline to Head - Marketing/GM level)." },
    { title: "Assistant Manager - Marketing", task: "Supervises marketing executives, ensures campaigns are aligned to sales goals, coordinates between marketing, sales, and design teams.", duration: "3-5 years (stepping stone to Manager)." },
    { title: "Sr. Marketing Executive", task: "Takes ownership of campaigns, mentors executives/trainees, handles client presentations, brochures, and exhibition activities, Marketing Automation and Marketing Strategies.", duration: "2-4 years (mid-level before moving into Managerial track)." },
    { title: "Digital Marketing Executive", task: "Manages SEO, Google Ads, LinkedIn campaigns, website updates, and online lead generation for solar EPC/trading projects.", duration: "1-3 years (specialist track; can grow into Senior Executive or Assistant Manager - Digital)." },
    { title: "Marketing Executive", task: "Executes day-to-day marketing tasks such as social media posting, event coordination, and client communication support.", duration: "1-3 years (early career role)." },
    { title: "Graphic Designer", task: "Creates all visual branding material - brochures, creatives, presentations, videos, social media graphics - to maintain brand identity.", duration: "Ongoing specialist role (can grow into Creative Lead or Design Manager if team expands)." },
    { title: "Marketing Trainee", task: "Learns basics of marketing, assists in campaigns, data collection, and social media support.", duration: "6-12 months (entry-level, freshers/MBAs)." },
    { title: "AI & Automation Engineer", task: "Develops AI models, automates workflows, ensures system efficiency, and integrates solutions with existing processes.", duration: "2-3 yrs (2-5 yrs exp.)" },
  ],
  Sales: [
    { title: "President - Sales & Business Development", task: "Leads overall sales strategy, ensures P&L growth, manages key client relationships, and drives organizational targets.", duration: "8-12+ years in role (board-level; long-term leadership)." },
    { title: "Vice President - Sales (Projects)", task: "Drives EPC/RESCO/Open Access project sales, manages large accounts, and closes high-value deals.", duration: "5-8 years before moving to President level (typically 15-20+ yrs total exp.)." },
    { title: "Vice President - Sales (Trading & Channel Partnerships)", task: "Oversees trading of modules, inverters, and BoS, builds distributor/dealer networks, and ensures trading revenue growth.", duration: "5-8 years (typically 15-20+ yrs exp.)." },
    { title: "General Manager - Sales (Projects / Trading / Innovation)", task: "Mentors BDMs, sets regional/segment strategies, and ensures alignment of sales execution with company objectives.", duration: "3-5 years (usually 12-15 yrs exp.)." },
    { title: "Sr BDM (Projects / Trading / Innovation)", task: "Focuses on large industrial clients, repeat business, and strategic partnerships to grow long-term accounts. Hiring, sorting talent for overall growth of vertical.", duration: "3-4 years (usually 8-12 yrs exp.)." },
    { title: "BDM (Projects / Trading / Innovation)", task: "Manages the sales funnel, develops new business opportunities, and coordinates closely with sales executives and marketing. Hiring sales team and allocation of work on daily basis.", duration: "3-4 years (usually 5-8 yrs exp.)." },
    { title: "Sr. Sales Executive (Projects / Trading)", task: "Handles client acquisition, leads negotiations, and manages key accounts from proposal to closure. Payment recovery and co-ordinating with different teams for overall timely deliveries.", duration: "2-3 years (typically 3-6 yrs exp.)." },
    { title: "Sales Executive (Projects / Trading)", task: "Executes day-to-day sales activities including follow-ups, proposal submissions, and converting leads to orders.", duration: "2-3 years (usually 1-4 yrs exp.)." },
    { title: "Jr. Sales Executive (Projects / Trading)", task: "Supports sales pipeline through lead generation, cold calling, CRM updates, and coordination with design/finance teams.", duration: "1-2 years (entry-level, 0-2 yrs exp.)." },
    { title: "Sales Trainee", task: "Learns sales processes, assists with research, appointment setting, and supports data entry/administrative tasks.", duration: "6-12 months (fresher role, stepping stone to Jr. Sales Executive)." },
    { title: "Sr. Tele-Caller Executive", task: "Leads inside sales calling efforts, handles high-potential leads, mentors junior tele-callers, ensures CRM updates, and supports conversion with sales executives.", duration: "2-3 years (typically 3-5 yrs exp. before moving into Sales Executive role)." },
    { title: "Jr. Tele-Caller Executive", task: "Makes outbound calls, follows scripts, explains solar solutions to potential clients, fixes appointments for sales team, and updates CRM daily.", duration: "1-2 years (entry-level, 0-2 yrs exp.; stepping stone to Senior Tele-Caller or Sales Executive)." },
  ],
  Designing: [
    { title: "Principal Engineer", task: "Acts as subject matter authority on codes and standards, handles complex studies (grid interconnection, protection, geotechnical, structural).", duration: "Long-term specialist role (may remain SME or move to senior management)." },
    { title: "Lead Engineer - (Electrical / Civil / SCADA / Structural)", task: "Leads design packages, interfaces with clients/utilities, reviews designs, and mentors junior engineers.", duration: "3-4 years before moving to Principal Engineer or Asst. Manager." },
    { title: "Sr. Design Engineer (Electrical / Civil)", task: "Validates and cross-checks designs, coordinates across disciplines, manages utility submissions, and introduces value-engineering solutions. Handles bigger projects.", duration: "2-3 years before moving into Lead or Manager roles." },
    { title: "Design Engineer (Electrical / Civil)", task: "Prepares detailed designs including layouts, cable schedules, STAAD models, 3D models, client co-ordination and complete design packages for medium projects.", duration: "3-5 years (core execution role)." },
    { title: "Graduate Engineer Trainee - Design (GET)", task: "Supports senior engineers with basic layouts, SLDs, quantity take-offs, and BoQ preparation. Site visits and validating designs, actual site work and team coordination.", duration: "6-12 months (transition role into Junior/Design Engineer)." },
    { title: "Design Intern", task: "Learns solar design basics (PVSyst, CAD, STAAD, Sketchup etc.), supports mark-ups, drafting, and redline corrections.", duration: "0-6 months (temporary learning role)." },
    { title: "VP - Engineering", task: "Defines organizational engineering strategy, drives innovation (storage/BESS), ensures compliance with codes, and approves final sign-offs.", duration: "Board-level / long-term leadership role." },
    { title: "GM - Engineering", task: "Leads overall engineering strategy, focuses on cost optimization (Capex/LCoE), sets enterprise-wide KPIs, and develops the talent pipeline.", duration: "4-5 years; pipeline to VP level." },
    { title: "Manager - Design", task: "Plans resources and budgets, reviews client submissions, ensures governance, and manages inter-discipline coordination. Hiring and talent acquisition, team reviews and team coordination.", duration: "3-4 years before AGM level." },
    { title: "Assistant Manager - Design", task: "Leads a small team, prepares schedules, ensures quality checks, and supports resource allocation.", duration: "2-3 years." },
  ],
  "O&M": [
    { title: "Head - O&M", task: "Leads the O&M division, ensures AMC revenue growth, client satisfaction, uptime KPIs, and manages overall strategy.", duration: "Long-term leadership (10-15+ yrs exp.)." },
    { title: "Manager - O&M", task: "Oversees day-to-day AMC contracts, site engineers, vendor management, and client reporting, weekly/monthly reporting, team coordination and asset allocation.", duration: "4-6 yrs (8-12 yrs exp.)." },
    { title: "Assistant Manager - O&M", task: "Supports the Manager by handling scheduling, spare parts planning, MIS reports, and coordination with design/procurement.", duration: "3-4 yrs (6-9 yrs exp.)." },
    { title: "Sr. O&M Executive", task: "Leads site-level teams, ensures preventive & corrective maintenance, troubleshooting, and client updates. Co-ordination with manufacturer and end consumer for satisfactory solutions.", duration: "2-3 yrs (3-6 yrs exp.)." },
    { title: "O&M Executive", task: "Executes daily site operations including monitoring, cleaning supervision, inverter/HT checks, and reporting. Daily site reporting to senior.", duration: "2-3 yrs (1-4 yrs exp.)." },
    { title: "Jr. O&M Executive", task: "Assists in site visits, routine inspections, and logging operational data under senior guidance.", duration: "1-2 yrs (0-2 yrs exp.)." },
    { title: "O&M Trainee", task: "Learns O&M processes, assists in preventive checks, MIS preparation, and client reporting.", duration: "6-12 months (fresher/entry-level role)." },
  ],
  Stores: [
    { title: "Head - Stores & Inventory", task: "Leads the stores function, ensures inventory control, material planning, audits, and coordination with procurement/finance. Planning and reporting are integral parts.", duration: "Long-term leadership role (10-15+ yrs exp.)." },
    { title: "Manager - Stores & Logistics", task: "Supervises multiple store locations, plans dispatches, manages logistics, and ensures timely site deliveries. Surprise visits to stores for stock audit, automating processes, hiring and training the team.", duration: "4-6 yrs in role (12-15 yrs exp.)." },
    { title: "Assistant Manager - Stores", task: "Handles day-to-day store operations, supervises executives/keepers, ensures ERP/Tally stock entries, and reconciles physical vs. system stock.", duration: "3-4 yrs (7-10 yrs exp.)." },
    { title: "Stores Executive", task: "Executes GRN (Goods Receipt Notes), issues materials to projects, manages stock ledgers, and coordinates with site engineers.", duration: "2-3 yrs (3-6 yrs exp.)." },
    { title: "Store Keeper", task: "Maintains physical stock at store/warehouse, supervises loading-unloading, tagging, and storage of materials.", duration: "2-3 yrs (2-5 yrs exp.)." },
    { title: "Jr. Store Executive", task: "Supports documentation, data entry in ERP, and assists in physical stock counting.", duration: "1-2 yrs (entry-level, 0-2 yrs exp.)." },
    { title: "Stores Trainee / Intern", task: "Learns store operations, helps with documentation, barcode tagging, and assists in cycle counts.", duration: "6-12 months (fresher role)." },
  ],
  Liaisoning: [
    { title: "Head - Liaisoning", task: "Leads the liaisoning function, builds relationships with government bodies, ensures smooth approvals for solar projects, and monitors compliance.", duration: "Long-term leadership (10-15+ yrs exp. in government/utility interface)." },
    { title: "Manager - Liaisoning", task: "Oversees state-level permissions, coordinates with DISCOM offices, MEDA, CEIG, and ensures timelines for approvals/subsidies.", duration: "4-6 yrs in role (10-12 yrs overall exp.)." },
    { title: "Sr. Liaison Executive", task: "Handles multiple projects independently, manages key approval processes (DISCOM, MEDA, CEIG, subsidy offices), supports managers in escalations, and guides junior executives.", duration: "3-4 years (5-8 yrs exp.; stepping stone to Assistant/Manager - Liaisoning)." },
    { title: "Liaison Executive", task: "Executes day-to-day liaison work, visits government/discom offices, submits documents, and tracks permission status.", duration: "2-3 yrs (2-5 yrs exp.)." },
    { title: "Jr. Liaison Executive", task: "Assists in preparing applications, coordinating with clients for required papers, and supporting senior executives in field visits.", duration: "1-2 yrs (entry-level, 0-2 yrs exp.)." },
    { title: "Liaison Trainee", task: "Learns the process of government and DISCOM approvals, supports documentation, and accompanies executives on visits.", duration: "6-12 months (fresher role)." },
  ],
  Tendering: [
    { title: "Head - Tendering", task: "Leads the tendering team, reviews bid strategies, ensures competitive pricing, and final submission approvals.", duration: "Long-term leadership role (12-15+ yrs exp.)." },
    { title: "Manager - Tendering", task: "Oversees preparation of tenders, coordinates with sales/design/procurement/finance, and ensures timely submission.", duration: "4-6 yrs in role (10-12 yrs exp.)." },
    { title: "Tendering Executive", task: "Works on BoQ, cost sheets, rate analysis, vendor quotations, and compiles technical & commercial bid documents.", duration: "2-3 yrs (2-5 yrs exp.)." },
    { title: "Jr. Tendering Executive", task: "Assists in document collection, formatting proposals, coordinating with procurement/design for inputs, and basic cost sheets.", duration: "1-2 yrs (0-2 yrs exp.)." },
    { title: "Tendering Trainee", task: "Learns tendering processes, supports data entry, vendor database maintenance, and bid submissions.", duration: "6-12 months (entry-level)." },
  ],
  Purchase: [
    { title: "Head - Purchase", task: "Leads overall procurement strategy, vendor development, rate contracts, and ensures timely material availability at optimal cost.", duration: "Long-term leadership role (12-15+ yrs exp.)." },
    { title: "Manager - Purchase", task: "Oversees purchase planning, vendor negotiations, and coordinates with project, design, and finance teams for procurement needs. Team hiring, training and continuous process improvement.", duration: "4-6 yrs in role (10-12 yrs exp.)." },
    { title: "Purchase Executive", task: "Executes day-to-day purchase orders, vendor follow-ups, maintains purchase records, and supports audits.", duration: "2-3 yrs (2-6 yrs exp.)." },
    { title: "Jr. Purchase Executive", task: "Supports executives with documentation, quotation collection, vendor database management, and GRN follow-up with stores.", duration: "1-2 yrs (0-2 yrs exp.)." },
    { title: "Purchase Trainee", task: "Learns procurement processes, assists with vendor data entry, basic negotiations, and MIS reporting.", duration: "6-12 months (fresher/entry-level)." },
  ],
  Project: [
    { title: "Head - Projects", task: "Leads overall project execution across sites, ensures timely delivery, quality, and cost control; interfaces with clients and management.", duration: "Long-term role (15+ yrs exp.)." },
    { title: "Project Manager", task: "Manages one or multiple projects end-to-end, including planning, execution, client coordination, billing support, and team leadership.", duration: "5-7 yrs in role (10-15 yrs exp.)." },
    { title: "Assistant Project Manager", task: "Supports Project Manager in scheduling, progress monitoring, contractor management, and safety compliance.", duration: "3-5 yrs (8-12 yrs exp.)." },
    { title: "Sr. Project Engineer (Civil / Electrical / Mechanical)", task: "Leads discipline-specific project execution, ensures quality, supervises site engineers, and resolves technical/site issues.", duration: "3-4 yrs in role (6-10 yrs exp.)." },
    { title: "Project Engineer (Civil / Electrical / Mechanical)", task: "Executes assigned project scope, prepares daily progress reports, checks contractor work, and ensures compliance with drawings/standards.", duration: "2-3 yrs (3-6 yrs exp.)." },
    { title: "Jr. Project Engineer (Civil / Electrical)", task: "Assists senior engineers in site supervision, documentation, contractor billing, and material reconciliation.", duration: "1-2 yrs (0-3 yrs exp.)." },
    { title: "Sr. Site Engineer (Civil / Electrical / Mechanical)", task: "Leads site execution, manages team & subcontractors, ensures safety & quality compliance, coordinates with project management, and handles reporting & client communication.", duration: "3-5 yrs (5-8 yrs exp.)." },
    { title: "Site Engineer (Civil / Electrical / Mechanical)", task: "Executes site-level activities, ensures safety compliance, supervises technicians, and coordinates with project engineers.", duration: "2-3 yrs (2-5 yrs exp.)." },
    { title: "Jr. Site Engineer (Civil / Electrical)", task: "Supports site activities, assists in installation, quality checks, and prepares basic site reports.", duration: "1-2 yrs (entry-level, 0-2 yrs exp.)." },
    { title: "Site Supervisor", task: "Supervises labor/contractors, ensures work discipline, site housekeeping, and safety norms.", duration: "2-3 yrs (typically diploma/ITI background)." },
    { title: "Site Trainee", task: "Learns site processes, assists in documentation, quality checks, and supports engineers in day-to-day work.", duration: "6-12 months (fresher role)." },
    { title: "Project Co-ordinator", task: "Coordinates site activities, surprise visits, monitors material availability/requirement, prepares site reports and material records.", duration: "2-3 yrs (diploma/ITI background)." },
  ],
  HR: [
    { title: "Head - HR", task: "Leads HR strategy, policies, culture, compliance, and workforce planning.", duration: "Long-term leadership (12-15+ yrs exp.)." },
    { title: "Manager - HR", task: "Oversees HR operations, payroll, employee relations, statutory compliance, and admin support.", duration: "4-6 yrs in role (10-12 yrs exp.)." },
    { title: "Manager - TA & Development", task: "Handles recruitment strategy, campus hiring, onboarding, training, and leadership development.", duration: "4-6 yrs in role (8-12 yrs exp.)." },
    { title: "HR Executive - Talent Acquisition", task: "Executes recruitment activities, job postings, candidate screening, interviews, and onboarding.", duration: "2-3 yrs (2-5 yrs exp.)." },
    { title: "HR Executive - Admin", task: "Manages attendance, payroll processing, leave records, PF/ESIC, and compliance documentation.", duration: "2-3 yrs (2-5 yrs exp.)." },
    { title: "Jr. HR Executive", task: "Supports documentation, employee database management, induction, and basic admin activities.", duration: "1-2 yrs (0-2 yrs exp.)." },
    { title: "HR Trainee", task: "Learns recruitment, HR operations, and engagement activities under guidance of executives/managers.", duration: "6-12 months (entry-level)." },
  ],
  Safety: [
    { title: "Head - Safety", task: "Leads safety strategy across all sites, ensures compliance with legal norms, client safety requirements, ISO standards, and drives zero-incident culture.", duration: "Long-term leadership (12-15+ yrs exp.)." },
    { title: "Safety Manager", task: "Oversees project/site safety teams, prepares safety policies, conducts safety audits, and liaises with clients & statutory authorities.", duration: "4-6 yrs in role (10-12 yrs exp.)." },
    { title: "Safety Officer (Electrical / Civil / General)", task: "Executes daily safety checks at sites, ensures PPE usage, prepares safety toolbox talks, and enforces safety compliance.", duration: "2-3 yrs (2-6 yrs exp.)." },
    { title: "Jr. Safety Officer", task: "Supports site safety enforcement, checks work permits, assists in safety documentation, and reports unsafe practices.", duration: "1-2 yrs (0-2 yrs exp.)." },
    { title: "Safety Trainee", task: "Learns HSE processes, assists in toolbox meetings, safety reporting, and compliance documentation.", duration: "6-12 months (entry-level)." },
  ],
  "Admin & Support": [
    { title: "Admin & Support Manager", task: "Leads office administration, transport, housekeeping, and ensures smooth functioning of support staff.", duration: "Long-term role (10-15 yrs exp.)." },
    { title: "Driver", task: "Responsible for official travel of staff, client visits, and logistics support for company vehicles.", duration: "Ongoing role (career support staff)." },
    { title: "Office Assistant (Peon / Helper)", task: "Supports office operations with filing, document movement, tea/refreshments, and basic admin tasks.", duration: "Ongoing role." },
    { title: "Housekeeping Staff", task: "Ensures office cleanliness, pantry upkeep, and facility hygiene.", duration: "Ongoing role." },
    { title: "Admin Assistant / Admin Executive", task: "Handles scheduling, asset tracking, stationery, and vendor coordination for housekeeping/transport.", duration: "2-3 yrs (entry/mid-level admin role)." },
  ],
  "Solar I&C": [
    { title: "Head - I&C", task: "Leads the entire installation function, ensures project execution quality, coordinates with project managers, and drives safety compliance.", duration: "Long-term role (12-15+ yrs exp.)." },
    { title: "Manager - Solar I&C", task: "Oversees multiple site installation teams, plans manpower allocation, supervises subcontractors, and ensures timely completion.", duration: "4-6 yrs (10-12 yrs exp.)." },
    { title: "Assistant Manager - Solar I&C (Civil / Electrical)", task: "Manages site-level execution teams, monitors structure erection, module mounting, cabling, and reports to Project Manager.", duration: "3-4 yrs (6-9 yrs exp.)." },
    { title: "Sr. Solar I&C Supervisor (Civil / Electrical)", task: "Supervises groups of installers, ensures proper module mounting, cabling practices, earthing, and safety standards.", duration: "2-3 yrs (3-6 yrs exp.)." },
    { title: "Solar I&C Technician (Civil / Electrical)", task: "Executes hands-on installation work - mounting modules, tightening structures, laying cables, terminations, and basic testing.", duration: "2-3 yrs (1-4 yrs exp.)." },
    { title: "Junior Solar I&C Helper (Civil / Electrical)", task: "Assists installers in module handling, structure fixing, cable pulling, and basic site support.", duration: "1-2 yrs (0-2 yrs exp.)." },
    { title: "Solar Installer Trainee (Civil / Electrical)", task: "Learns on-site installation methods, supports civil/electrical installation teams, and follows safety instructions.", duration: "6-12 months (entry-level)." },
  ],
};

const STOPWORDS = new Set(["the", "and", "of", "for", "in", "a", "to", "on", "with", "or"]);

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9&]+/g, " ")
      .split(" ")
      .filter(w => w && !STOPWORDS.has(w))
  );
}

// Finds the canonical document role that best matches a live campaign's
// free-text title, by Jaccard similarity of their word sets -- handles
// reordering ("Finance Manager" vs. "Manager - Finance") and picks the more
// specific of two overlapping candidates (e.g. "Sr. O&M Executive" over
// "O&M Executive" when the live title says "Sr."). Returns null when
// nothing in the department shares any words with the live title, so
// callers can fall back to the campaign's own description instead of
// showing a misleading match.
export function matchCanonicalRole(department: Department | "Other", roleTitle: string): DepartmentRole | null {
  if (department === "Other") return null;
  const candidates = DEPARTMENT_ROLES[department];
  const liveTokens = tokenize(roleTitle);
  let best: DepartmentRole | null = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const candidateTokens = tokenize(candidate.title);
    let shared = 0;
    for (const t of liveTokens) if (candidateTokens.has(t)) shared++;
    const union = new Set([...liveTokens, ...candidateTokens]).size;
    const score = union > 0 ? shared / union : 0;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return bestScore > 0 ? best : null;
}
