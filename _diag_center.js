const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 700 } })).newPage();
  await page.goto("http://localhost:3000/apply", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "_diag_center_desktop.png" });
  await browser.close();
})();
