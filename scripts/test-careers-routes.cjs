// Run against npm run dev. Public API is mocked; no applications are submitted.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { parseCareersRoute, departmentPath, jobPath, searchPath } = require("../lib/hiring/routes.ts");
assert.equal(parseCareersRoute("/careers/departments/o-and-m", "", "/careers").department, "o-and-m");
assert.equal(parseCareersRoute("/jobs/a/apply").stage, "form");
assert.equal(parseCareersRoute("/jobs/%ZZ").kind, "invalid");
assert.equal(parseCareersRoute("/departments/no-such-department").kind, "department");
assert.equal(departmentPath("Admin & Support"), "/departments/admin-and-support");
assert.equal(jobPath("a/b"), "/jobs/a%2Fb");
assert.equal(parseCareersRoute("/", searchPath("a & b", "City").slice(1)).query, "a & b");

const base = process.env.CAREERS_TEST_URL || "http://localhost:3000";
const output = path.join(process.cwd(), "test-results", "careers-routes");
fs.mkdirSync(output, { recursive: true });
const job = (id, role, is_open = true) => ({ id, role, is_open, locations: ["Khamgaon"], description: "A detailed role description for navigation verification.", min_years: 1, max_years: 5, fields: [{ id: "response", label: "Additional information", type: "text", required: false, options: [], condition: null }], workplace_type: "In-Office", employment_type: "Full-Time", experience_level: "Mid-Level", salary_range: "", skills: [], responsibilities: [], qualifications: [], benefits: [], job_code: id });
const campaigns = [job("11111111-1111-4111-8111-111111111111", "Digital Marketing Executive"), job("22222222-2222-4222-8222-222222222222", "Digital Marketing Executive", false), job("33333333-3333-4333-8333-333333333333", "Finance Manager")];
const { DEPARTMENT_ROLES } = require("../lib/hiring/departments.ts");
const departments = [
  { id: "d-marketing", name: "Marketing", slug: "marketing", icon_key: "Marketing", reference_roles: DEPARTMENT_ROLES.Marketing },
  { id: "d-finance", name: "Finance", slug: "finance", icon_key: "Finance", reference_roles: DEPARTMENT_ROLES.Finance },
  { id: "d-new", name: "Experimental Systems (renamed)", slug: "experimental-systems", icon_key: null, reference_roles: [] },
  { id: "d-empty", name: "A new department without published jobs", slug: "new-department", icon_key: null, reference_roles: [] },
];
campaigns[0].department_id = "d-marketing";
campaigns[1].department_id = "d-marketing";
campaigns[2].department_id = "d-finance";
campaigns.push({ ...job("44444444-4444-4444-8444-444444444444", "Finance and Marketing Specialist"), department_id: "d-new" });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route("**/api/hiring", route => route.fulfill({ json: { campaigns, departments } }));
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base);
    await page.locator('a[href$="/departments/marketing"].role-tile').waitFor();
    await page.evaluate(() => { window.__spaMarker = "preserved"; });
    await page.locator('a[href$="/departments/marketing"].role-tile').click();
    await page.waitForURL("**/departments/marketing");
    await page.locator(".dept-role-preview").waitFor({ state: "visible" });
    assert.equal(await page.locator(".role-tile.is-open").count(), 1);
    await page.locator(".role-tile.is-closed").hover();
    await page.waitForFunction(() => document.querySelector('.dept-role-preview-link')?.getAttribute('href').includes('22222222'));
    await page.locator(".role-tile.is-open").click();
    await page.waitForURL(`**/jobs/${campaigns[0].id}`);
    await page.locator(".job-detail h1").waitFor();
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await page.waitForURL(`**/jobs/${campaigns[0].id}/apply`);
    await page.getByLabel("Additional information").fill("Keep my answer during navigation");
    await page.goBack();
    await page.locator(".job-detail h1").waitFor();
    await page.goForward();
    await page.getByLabel("Additional information").waitFor();
    assert.equal(await page.getByLabel("Additional information").inputValue(), "Keep my answer during navigation");
    assert.equal(await page.evaluate(() => window.__spaMarker), "preserved", "Navigation must not reload the SPA");

    for (const pathname of ["/departments/marketing", "/roles/digital-marketing-executive", jobPath(campaigns[0].id), jobPath(campaigns[0].id, true)]) {
      const response = await page.goto(`${base}${pathname}`);
      assert.equal(response.status(), 200, `Direct route ${pathname}`);
      if (pathname.endsWith("/apply")) await page.getByLabel("Additional information").waitFor();
      else if (pathname.startsWith("/jobs/")) await page.locator(".job-detail h1").waitFor();
      else await page.locator(".role-tile.is-open").waitFor();
      await page.reload();
      assert.equal(new URL(page.url()).pathname, new URL(`${base}${pathname}`).pathname);
    }
    // New departments resolve from data; title keywords do not control membership.
    await page.goto(`${base}/departments/experimental-systems`);
    await page.getByRole("heading", { name: /Experimental Systems/ }).waitFor();
    assert.equal(await page.locator(".role-tile").count(), 1);
    assert.ok((await page.locator(".role-tile").innerText()).includes("Finance and Marketing Specialist"));
    await page.reload();
    await page.getByRole("heading", { name: /Experimental Systems/ }).waitFor();
    await page.goto(`${base}/roles/finance-and-marketing-specialist`);
    await page.getByRole("link", { name: "View all roles in Experimental Systems (renamed)" }).waitFor();
    await page.goto(`${base}/departments/new-department`);
    await page.getByText("No published jobs in this department right now.").waitFor();
    await page.goto(base);
    await page.locator('a[href$="/departments/new-department"].role-tile').waitFor();
    await page.goto(`${base}/roles/digital-marketing-executive`);
    await page.locator(".role-tile.is-open").waitFor();
    assert.equal(await page.locator(".role-tile").count(), 2, "Role URLs include distinct jobs with the same title");
    await page.goto(`${base}${jobPath(campaigns[1].id, true)}`);
    await page.getByRole("button", { name: "Position Closed", exact: true }).waitFor();
    assert.equal(await page.locator("#apply-form").count(), 0);
    assert.equal(await page.getByRole("button", { name: /03.*Your application/ }).isDisabled(), true);
    for (const pathname of ["/jobs/missing", "/departments/missing", "/roles/missing"]) {
      await page.goto(`${base}${pathname}`);
      await page.getByRole("heading", { name: "This opportunity is unavailable" }).waitFor();
      assert.equal(await page.locator(".role-tile").count(), 0);
    }

    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${base}/departments/marketing`);
      await page.locator(".role-tile.is-open").waitFor();
      assert.equal(await page.locator(".dept-role-preview").isVisible(), width >= 1100);
      const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll('body *')].filter(n => n.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map(n => n.className) }));
      assert.ok(overflow.scroll <= width, JSON.stringify(overflow));
      await page.screenshot({ path: path.join(output, `department-${width}.png`) });
      for (const apply of [false, true]) {
        await page.goto(`${base}${jobPath(campaigns[0].id, apply)}`);
        await page.locator(apply ? "#apply-form" : "#job-detail").waitFor();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow on ${apply ? "application" : "details"} at ${width}px`);
        if (width === 375) await page.screenshot({ path: path.join(output, `${apply ? "application" : "details"}-${width}.png`) });
      }
    }
    await page.goto(`${base}/roles/marketing-trainee`);
    await page.getByRole("heading", { name: "Marketing Trainee", exact: true }).waitFor();
    await page.getByText("No published jobs for this role right now.", { exact: false }).waitFor();
    const touch = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: true, isMobile: true });
    await touch.route("**/api/hiring", route => route.fulfill({ json: { campaigns, departments } }));
    const touchPage = await touch.newPage();
    await touchPage.goto(`${base}/departments/marketing`);
    await touchPage.locator(".role-tile.is-open").waitFor();
    assert.equal(await touchPage.locator(".dept-role-preview").isVisible(), false, "Large touch-only displays have no hover preview");
    await touchPage.locator(".role-tile.is-open").tap();
    await touchPage.locator(".job-detail h1").waitFor();
    await touch.close();
    assert.deepEqual(errors, []);
    console.log("PASS: SPA navigation, back/forward, draft preservation, direct links/reload, role duplicates, closed/missing jobs, base-path parsing, desktop hover, touch navigation, and 320–1440px layouts.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
