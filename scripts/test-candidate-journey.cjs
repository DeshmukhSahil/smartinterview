const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const path = require("node:path");
const compiled = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, "../lib/candidate-journey.ts"), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  },
).outputText;
const context = { exports: {}, Intl, Date, Number };
vm.runInNewContext(compiled, context);
const { interviewState, nextInvitation, interviewDate } = context.exports;
const now = Date.parse("2026-09-17T10:00:00Z");
const base = {
  id: "ai",
  role: "Engineer",
  mode: "ai_assisted",
  interview_status: "pending_schedule",
  scheduled_at: null,
  created_at: "2026-09-15",
};
const human = { ...base, id: "human", mode: "one_on_one" };
const soon = {
  ...human,
  id: "soon",
  interview_status: "scheduled",
  scheduled_at: "2026-09-17T10:05:00Z",
};
const later = { ...soon, id: "later", scheduled_at: "2026-09-18T10:00:00Z" };
const past = { ...soon, id: "past", scheduled_at: "2026-09-17T07:00:00Z" };
assert.equal(interviewState(base, false, now).label, "Ready when you are");
assert.equal(interviewState(human, false, now).label, "Awaiting schedule");
assert.equal(interviewState(soon, false, now).label, "Starting now");
assert.equal(interviewState(later, false, now).label, "Scheduled");
assert.equal(interviewState(past, false, now).label, "Awaiting update");
assert.equal(
  interviewState({ ...soon, scheduled_at: "bad-date" }, false, now).label,
  "Awaiting schedule",
);
for (const status of ["cancelled", "no_show"]) {
  assert.equal(
    interviewState({ ...base, interview_status: status }, true, now).group,
    "closed",
  );
  assert.equal(
    nextInvitation([{ ...base, interview_status: status }], [], now),
    undefined,
  );
}
assert.equal(interviewState(base, true, now).group, "completed");
assert.equal(nextInvitation([past, base, later, soon], [], now).id, "soon");
assert.equal(nextInvitation([past, human, base], [], now).id, "ai");
assert.equal(nextInvitation([base], [{ interview_id: "ai" }], now), undefined);
assert.equal(nextInvitation([], [], now), undefined);
assert.equal(interviewDate("invalid"), "Time to be confirmed");
console.log(
  "PASS: scheduled windows, stale times, closed statuses, feedback completion, next invitation priority, invalid dates and empty states.",
);
