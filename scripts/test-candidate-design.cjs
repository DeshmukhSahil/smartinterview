const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  await context.addInitScript(() => {
    localStorage.setItem("candidate_email", "design@example.test");
    localStorage.setItem("candidate_name", "Ananya Sharma");
    localStorage.setItem("password_id", "fixture-only");
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/rest/v1/interviews*", (r) =>
    r.fulfill({
      json: [
        {
          id: "round-2",
          role: "Procurement Executive",
          mode: "one_on_one",
          interview_status: "scheduled",
          scheduled_at: "2026-10-18T05:30:00Z",
          created_at: "2026-09-15T00:00:00Z",
        },
        {
          id: "round-1",
          role: "Procurement Executive",
          mode: "ai_assisted",
          interview_status: "completed",
          created_at: "2026-09-14T00:00:00Z",
        },
      ],
    }),
  );
  await page.route("**/rest/v1/feedback*", (r) =>
    r.fulfill({
      json: [
        {
          id: "report-1",
          interview_id: "round-1",
          created_at: "2026-09-15T00:00:00Z",
          analysis: {
            categoryScores: [
              {
                name: "Role knowledge",
                score: 82,
                comment:
                  "Explained supplier evaluation with a specific example.",
              },
              {
                name: "Problem solving",
                score: 74,
                comment: "Consider lead-time uncertainty.",
              },
              {
                name: "Communication",
                score: 88,
                comment: "Clear examples and concise answers.",
              },
            ],
            strengths: [
              "Explained supplier selection using cost, quality and delivery criteria.",
            ],
            areasForImprovement: [
              "Quantify savings and describe how risks were tracked.",
            ],
          },
        },
      ],
    }),
  );
  await page.goto("http://localhost:3095", { waitUntil: "networkidle" });
  await page
    .getByRole("heading", { name: "Your interview insights" })
    .waitFor();
  await page.getByLabel("Select assessment").waitFor();
  assert.equal(
    await page
      .getByRole("complementary", { name: "Portal sidebar" })
      .evaluate((e) => getComputedStyle(e).backgroundColor),
    "rgb(255, 255, 255)",
  );
  await page.locator("summary").first().click();
  await page
    .getByText("Explained supplier evaluation with a specific example.")
    .waitFor();
  await page.locator("summary").first().click();
  assert.equal(
    await page
      .locator('img[src*="solar-hero"]')
      .evaluate((e) => e.complete && e.naturalWidth > 0),
    true,
  );
  fs.mkdirSync("artifacts", { recursive: true });
  await page.screenshot({
    path: "artifacts/candidate-dashboard-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Update profile" }).click();
  await page.getByLabel("Phone number").fill("+91 9000000000");
  await page.getByLabel("Preferred work location").fill("Nagpur");
  await page
    .getByLabel("Interview availability")
    .fill("Weekdays, 10 AM�1 PM IST");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await page
    .getByText("Preferences saved in this browser.", { exact: true })
    .waitFor();
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await page.getByText("100%", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "artifacts/candidate-dashboard-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "no horizontal overflow",
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("navigation", { name: "Portal navigation" }).waitFor();
  await page.getByRole("button", { name: "Close menu", exact: true }).click();
  await page.route("**/rest/v1/feedback*", (r) => r.fulfill({ json: [] }));
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Your experience deserves a closer look.").waitFor();
  await page.route("**/rest/v1/interviews*", (r) =>
    r.fulfill({ status: 500, json: { message: "fixture error" } }),
  );
  await page.reload({ waitUntil: "networkidle" });
  await page
    .getByRole("alert")
    .filter({ hasText: /load your interviews/ })
    .waitFor();
  await page.getByRole("button", { name: "Retry", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: desktop, real-score chart, evidence expansion, image load, local profile persistence, mobile overflow/menu, empty and failure states.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
