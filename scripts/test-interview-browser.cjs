// Local browser regression checks. All AI, transcription and feedback writes are mocked.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const baseUrl = process.env.INTERVIEW_TEST_URL || "http://localhost:3095";
require("node:fs").mkdirSync("test-results/interview-journey", {
  recursive: true,
});
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    permissions: ["microphone", "camera"],
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(60000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.addInitScript(() => {
    localStorage.setItem("candidate_email", "test@example.test");
    localStorage.setItem("password_id", "local-test");
    localStorage.setItem("candidate_name", "Ananya Sharma");
    const getMedia = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    window.testTracks = [];
    navigator.mediaDevices.getUserMedia = async (opts) => {
      const m = await getMedia(opts);
      window.testTracks.push(...m.getTracks());
      return m;
    };
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [],
        addEventListener() {},
        removeEventListener() {},
        cancel() {
          clearTimeout(window.voiceTimer);
        },
        speak(u) {
          window.lastUtterance = u;
          window.voiceTimer = setTimeout(() => u.onend?.(), window.holdGreeting && u.text.includes("AI interviewer") ? 10000 : 1200);
        },
      },
    });
    class Recognition {
      start() {
        window.rec = this;
        setTimeout(() => this.onstart?.(), 0);
      }
      abort() {}
    }
    window.SpeechRecognition = Recognition;
  });
  let requests = [];
  await page.route("**/api/chat/local", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "text/plain",
      body:
        "0:" +
        JSON.stringify(
          "तुमच्या project बद्दल आणखी सांगा. How did you approach the design?",
        ) +
        "\n",
    });
  });
  await page.route("**/rest/v1/interviews*", (route) =>
    route.fulfill({
      json: {
        id: "design-test",
        role: "Solar Design Engineer",
        questions: [
          "Introduce yourself",
          "Your experience",
          "A project",
          "Collaboration",
          "Your questions",
        ],
        ai_model: "test",
        mode: "ai",
      },
    }),
  );
  await page.route("**/rest/v1/feedback*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto(`${baseUrl}/interview/design-test`);
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .waitFor();
  assert.equal(await page.locator("textarea").count(), 0);
  assert.equal(
    await page
      .getByRole("navigation", { name: "Portal navigation" })
      .count(),
    1,
  );
  assert.equal(await page.getByRole("combobox").count(), 0);
  await page.waitForFunction(
    () => !document.querySelector("button[class*=primary]")?.disabled,
  );
  await page.screenshot({
    path: "test-results/interview-journey/prejoin.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Enable", exact: true }).click();
  await page.getByText("Microphone permission granted").waitFor();
  await page.getByRole("button", { name: "Test", exact: true }).click();
  await page.getByText("If you heard Alex, you’re ready.").waitFor();
  await page.evaluate(() => { window.holdGreeting = true; });
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "I’d like to respond", exact: true })
    .click();
  await page.waitForFunction(() => window.rec);
  assert.equal(
    await page
      .getByRole("complementary", { name: "Conversation transcript" })
      .count(),
    0,
  );
  await page.evaluate(() =>
    window.rec.onresult({
      resultIndex: 0,
      results: [
        {
          0: {
            transcript:
              "मी solar design केले आहे. यह मेरा project था. I led the team.",
          },
          isFinal: true,
        },
      ],
    }),
  );
  await page
    .getByText("मी solar design केले आहे. यह मेरा project था. I led the team.")
    .waitFor();
  await page.waitForTimeout(3200);
  assert.equal(requests.length, 1);
  await page.getByRole("button", { name: "Transcript", exact: true }).click();
  await page
    .getByRole("complementary", { name: "Conversation transcript" })
    .waitFor();
  await page.screenshot({
    path: "test-results/interview-journey/transcript.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Close transcript" }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: "test-results/interview-journey/live.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Turn camera on", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("video")?.srcObject?.getVideoTracks().length === 1,
  );
  await page.getByRole("button", { name: "Collapse camera preview" }).click();
  await page.getByRole("button", { name: "Expand camera preview" }).click();
  await page
    .getByRole("button", { name: "Turn camera off", exact: true })
    .click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByLabel("Speaking pace").fill("0.85");
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  await page.evaluate(() => {
    navigator.mediaDevices.getDisplayMedia = async () => {
      const c = document.createElement("canvas");
      c.width = 1280;
      c.height = 720;
      const x = c.getContext("2d");
      x.fillStyle = "#f4f2ea";
      x.fillRect(0, 0, 1280, 720);
      x.fillStyle = "#4d6242";
      x.font = "40px sans-serif";
      x.fillText("Project presentation — screen sharing test", 70, 120);
      window.screenTest = c.captureStream(1);
      return window.screenTest;
    };
  });
  await page.getByRole("button", { name: "Share screen", exact: true }).click();
  await page.getByText("Your shared screen", { exact: false }).waitFor();
  assert.equal(
    await page.getByRole("heading", { name: "Alex", exact: true }).count(),
    1,
  );
  await page.screenshot({
    path: "test-results/interview-journey/sharing.png",
    fullPage: true,
  });
  assert.ok(
    (
      await page
        .getByRole("button", { name: "End interview", exact: true })
        .boundingBox()
    ).y < 740,
    "call controls fit laptop",
  );
  await page.evaluate(() => {
    const t = window.screenTest.getVideoTracks()[0];
    t.stop();
    t.dispatchEvent(new Event("ended"));
  });
  await page
    .getByRole("button", { name: "Share screen", exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/interview-journey/mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page
    .getByRole("button", { name: "End interview", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "Keep talking" }).click();
  const mediaStopped = await page.evaluate(() => {
    const m = document.querySelector("video")?.srcObject;
    return !m || m.getTracks().every((t) => t.readyState === "ended");
  });
  assert.equal(mediaStopped, true);
  await page.route("**/interview/design-test", async (route) => {
    if (route.request().method() === "POST")
      await route.fulfill({
        status: 503,
        body: "Simulated feedback failure for cleanup test",
      });
    else await route.fallback();
  });
  await page
    .getByRole("button", { name: "End interview", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "End interview", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Thank you for the conversation." })
    .waitFor();
  assert.equal(
    await page.evaluate(() =>
      window.testTracks.every((t) => t.readyState === "ended"),
    ),
    true,
  );
  await page.screenshot({
    path: "test-results/interview-journey/completion.png",
    fullPage: true,
  });
  const login = await browser.newPage({
    viewport: { width: 1366, height: 768 },
  });
  await login.goto(`${baseUrl}/login`);
  await login.getByRole("heading", { name: "Welcome to Chirayu." }).waitFor();
  await login.screenshot({
    path: "test-results/interview-journey/login.png",
    fullPage: true,
  });
  console.log(
    JSON.stringify({
      passed: [
        "white portal sidebar and navbar",
        "separate device check",
        "mic permission",
        "speaker test",
        "interruption",
        "automatic single answer",
        "mixed-script transcript",
        "transcript toggle",
        "camera collapse",
        "settings keyboard close",
        "screen layout retains Alex",
        "native share cleanup",
        "mobile overflow",
        "end confirmation",
        "login screen",
      ],
      errors,
    }),
  );
  assert.deepEqual(errors, []);

  const cloud = await context.newPage();
  // This fixture changes backend availability; do not reuse the previous fixture’s capability response.
  const cloudSession = await context.newCDPSession(cloud);
  await cloudSession.send("Network.clearBrowserCache");
  let transcriptionCalls = 0;
  let cloudAnswers = 0;
  await cloud.route("**/rest/v1/interviews*", (r) =>
    r.fulfill({
      json: {
        id: "design-test",
        role: "Solar Design Engineer",
        questions: ["Tell me about yourself"],
        ai_model: "test",
      },
    }),
  );
  await cloud.route("**/rest/v1/feedback*", (r) => r.fulfill({ json: [] }));
  await cloud.route("**/api/speech/transcribe", async (r) => {
    if (r.request().method() === "GET")
      return r.fulfill({ json: { available: true } });
    transcriptionCalls++;
    if (transcriptionCalls === 1)
      return r.fulfill({
        status: 503,
        json: { error: "We couldn’t capture that answer. Please try again." },
      });
    assert.ok(
      !r.request().postDataBuffer().toString().includes('name="language"'),
    );
    return r.fulfill({
      json: {
        text: "मी solar project केले. यह मेरा अनुभव है. My role was design.",
      },
    });
  });
  await cloud.route("**/api/chat/local", (r) => {
    cloudAnswers++;
    return r.fulfill({
      contentType: "text/plain",
      body:
        "0:" +
        JSON.stringify("Could you tell me more about that project?") +
        "\n",
    });
  });
  await cloud.goto(`${baseUrl}/interview/design-test`);
  await cloud
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await cloud.waitForTimeout(2600);
  await cloud.evaluate(() =>
    window.rec.onresult({
      resultIndex: 0,
      results: [
        { 0: { transcript: "My live provisional answer" }, isFinal: false },
      ],
    }),
  );
  await cloud
    .getByRole("button", { name: "Done speaking", exact: true })
    .click();
  await cloud.getByRole("button", { name: "Try again", exact: true }).waitFor();
  await cloud.getByRole("button", { name: "Try again", exact: true }).click();
  await cloud.getByRole("button", { name: "Transcript", exact: true }).click();
  await cloud
    .getByText("मी solar project केले. यह मेरा अनुभव है. My role was design.")
    .waitFor();
  assert.equal(transcriptionCalls, 2);
  assert.equal(cloudAnswers, 1);
  console.log(
    "PASS: multilingual audio retry, no forced language, final transcript replaces provisional captions, completion and media track cleanup",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
