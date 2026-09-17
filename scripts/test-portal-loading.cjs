const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const base = process.env.INTERVIEW_TEST_URL || "http://localhost:3095";
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });
  await context.addInitScript(() => {
    localStorage.setItem("candidate_email", "loading@example.test");
    localStorage.setItem("password_id", "test-only");
    localStorage.setItem("candidate_name", "Ananya Sharma");
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("BROWSER", m.text().slice(0, 1800));
  });
  page.setDefaultNavigationTimeout(60000);
  let feedbackDone = false;
  const release = [];
  await page.route("**/rest/v1/interviews*", (r) =>
    r.fulfill({
      json: {
        id: "loading-test",
        mode: "ai",
        role: "Solar Design Engineer",
        questions: ["Tell me about yourself"],
      },
    }),
  );
  await page.route("**/rest/v1/feedback*", async (r) => {
    await new Promise((resolve) => release.push(resolve));
    feedbackDone = true;
    await r.fulfill({ json: [] });
  });
  await page.route("**/api/speech/transcribe", (r) =>
    r.fulfill({ json: { available: false } }),
  );
  await page.goto(`${base}/interview/loading-test`);
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .waitFor();
  assert.equal(
    feedbackDone,
    false,
    "room opens while feedback request is still pending",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Start interview", exact: true })
      .count(),
    1,
    "one mounted room",
  );
  await page
    .getByRole("navigation", { name: "Candidate navigation" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "Your interviews", exact: true })
      .getAttribute("aria-current"),
    "page",
  );
  assert.equal(
    await page
      .getByRole("img", { name: "Chirayu Power Logo" })
      .first()
      .evaluate((e) => e.complete && e.naturalWidth > 0),
    true,
  );
  require("node:fs").mkdirSync("test-results/portal", { recursive: true });
  await page.screenshot({
    path: "test-results/portal/ai-room.png",
    fullPage: true,
  });
  release.forEach((r) => r());
  const human = await context.newPage();
  let speechRequests = 0;
  await human.route("**/rest/v1/interviews*", (r) =>
    r.fulfill({
      json: {
        id: "human-test",
        mode: "one_on_one",
        role: "Operations Manager",
        interview_status: "scheduled",
        scheduled_at: new Date(Date.now() + 60000).toISOString(),
        teams_join_url: "https://teams.example.test/meeting",
      },
    }),
  );
  await human.route("**/rest/v1/feedback*", (r) => r.fulfill({ json: [] }));
  await human.route("**/api/speech/transcribe", (r) => {
    speechRequests++;
    return r.fulfill({ json: { available: false } });
  });
  await human.goto(`${base}/interview/human-test`);
  await human
    .getByRole("heading", { name: "Your interview is scheduled" })
    .waitFor();
  assert.equal(
    await human
      .getByRole("link", { name: "Join Interview" })
      .getAttribute("href"),
    "https://teams.example.test/meeting",
  );
  assert.equal(speechRequests, 0, "one-on-one does not initialize AI speech");
  await human.screenshot({
    path: "test-results/portal/one-on-one.png",
    fullPage: true,
  });
  const home = await context.newPage();
  let batches = 0;
  let selected = "";
  await home.route("**/rest/v1/interviews*", (r) => {
    selected = new URL(r.request().url()).searchParams.get("select");
    return r.fulfill({
      json: [
        {
          id: "a",
          role: "Engineer",
          type: "Technical",
          techstack: [],
          mode: "ai",
        },
        {
          id: "b",
          role: "Manager",
          type: "Behavioral",
          techstack: [],
          mode: "one_on_one",
        },
        {
          id: "c",
          role: "Designer",
          type: "Technical",
          techstack: [],
          mode: "ai",
        },
      ],
    });
  });
  let finishBatch;
  await home.route("**/rest/v1/feedback*", async (r) => {
    batches++;
    await new Promise((resolve) => (finishBatch = resolve));
    await r.fulfill({ json: [] });
  });
  await home.goto(base);
  await home.getByRole("heading", { name: "Engineer", exact: true }).waitFor();
  assert.ok(!selected.includes("*") && !selected.includes("resume"));
  assert.equal(
    await home
      .getByRole("table")
      .getByRole("link", {
        name: "Check details",
        exact: true,
      })
      .count(),
    3,
    "invitation links work before optional feedback arrives",
  );
  assert.equal(batches, 1, "one feedback request for three cards");
  finishBatch();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("navigation", { name: "Candidate navigation" })
    .waitFor();
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await page.getByRole("dialog", { name: "A little guidance." }).waitFor();
  await page.keyboard.press("Escape");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  const retry = await context.newPage();
  let attempts = 0;
  let allowSuccess = false;
  await retry.route("**/rest/v1/interviews*", (r) => {
    attempts++;
    return r.fulfill(
      !allowSuccess
        ? { status: 503, json: { message: "test failure" } }
        : { json: { id: "retry", mode: "one_on_one", role: "Engineer" } },
    );
  });
  await retry.route("**/rest/v1/feedback*", (r) => r.fulfill({ json: [] }));
  await retry.goto(`${base}/interview/retry`);
  await retry.getByRole("button", { name: "Retry loading" }).waitFor();
  allowSuccess = true;
  await retry.getByRole("button", { name: "Retry loading" }).click();
  await retry
    .getByRole("heading", { name: "Interview not yet scheduled" })
    .waitFor();
  console.log(
    JSON.stringify({
      passed: [
        "candidate header and original logo",
        "single room mount",
        "room does not wait for feedback",
        "one-on-one scheduled Teams link preserved",
        "no AI speech on one-on-one route",
        "3 invitations = 1 feedback request",
        "links available during feedback loading",
        "lightweight list payload",
        "mobile navigation",
        "request failure retry",
      ],
    }),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
