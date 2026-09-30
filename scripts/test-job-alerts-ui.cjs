const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs");
const base=process.env.CAREERS_TEST_URL||"http://localhost:3000";
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(20000);
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 let requests=0,posted,fail=true;
 await page.route("**/api/hiring/alerts",async route=>{requests++;posted=route.request().postDataJSON();await route.fulfill({status:fail?503:202,json:fail?{error:"Temporarily unavailable. Try again."}:{message:"Check your inbox for a confirmation email."}});});
 await page.goto(base);await page.getByRole("button",{name:"Get Job Alerts",exact:true}).click();
 await page.getByRole("textbox",{name:"Email address"}).waitFor();
 assert.equal(await page.getByRole("textbox",{name:"Email address"}).evaluate(n=>n===document.activeElement),true);
 const social=page.getByRole("navigation",{name:"Follow Chirayu Power"});
 assert.equal(await social.getByRole("link").count(),5);
 const links=await social.getByRole("link").evaluateAll(ns=>ns.map(n=>({href:n.href,rel:n.rel,target:n.target})));
 assert.ok(links.some(x=>x.href==="https://x.com/Chirayu_Power"));assert.ok(links.some(x=>x.href.includes("chirayupower_eventzone")));
 assert.ok(links.every(x=>x.target==="_blank"&&x.rel.includes("noopener")));
 const form=page.getByRole("form",{name:"Subscribe to job alerts"});
 await form.getByRole("button",{name:"Send confirmation email"}).click();assert.equal(requests,0);
 await page.getByRole("textbox",{name:"Email address"}).fill("Test.Reader@example.com");
 await page.getByRole("textbox",{name:"Mobile number"}).fill("9876543210");
 await page.getByRole("checkbox",{name:/I agree/}).check();
 await form.getByRole("button",{name:"Send confirmation email"}).click();
 await page.getByRole("alert").filter({hasText:"country code"}).waitFor();assert.equal(requests,0);
 await page.getByRole("textbox",{name:"Mobile number"}).fill("+91 98765 43210");
 await page.getByRole("checkbox",{name:/Also send/}).check();
 await form.getByRole("button",{name:"Send confirmation email"}).click();
 await page.getByRole("alert").filter({hasText:"Temporarily unavailable"}).waitFor();
 assert.equal(await page.getByRole("textbox",{name:"Email address"}).inputValue(),"Test.Reader@example.com");
 fs.mkdirSync("test-results/job-alerts",{recursive:true});
 for(const width of [1440,768,375,320]){
  await page.setViewportSize({width,height:1000});await form.scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow at ${width}`);
  await page.screenshot({path:`test-results/job-alerts/signup-${width}.png`});
 }
 fail=false;await form.getByRole("button",{name:"Send confirmation email"}).click();
 await page.getByRole("status").filter({hasText:"Check your inbox"}).waitFor();
 assert.equal(posted.email,"test.reader@example.com");assert.equal(posted.mobile,"+919876543210");assert.equal(posted.consent,true);assert.equal(posted.newsletter,true);
 let actions=0;
 await page.route("**/api/hiring/alerts/action",async route=>{actions++;await route.fulfill({json:{message:"Subscription updated."}});});
 for(const action of ["confirm","unsubscribe"]){
  const count=actions;await page.goto(`${base}/job-alerts/${action}#${"a".repeat(64)}`);
  const button=page.getByRole("button",{name:action==="confirm"?"Confirm subscription":"Unsubscribe",exact:true});await button.waitFor();
  assert.equal(actions,count,"Opening a link must not automatically change a subscription");
  await button.click();await page.getByRole("status").filter({hasText:"Subscription updated"}).waitFor();assert.equal(new URL(page.url()).hash,"");
 }
 assert.deepEqual(errors,[]);console.log("PASS: five social destinations, labeled signup, required consent, phone/email validation, failed-request recovery, normalized payload, newsletter opt-in, confirmation/unsubscribe, no automatic link actions, and 320–1440px layouts. No real emails sent.");
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
