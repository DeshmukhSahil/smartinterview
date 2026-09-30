// Exercise the real route and schemas with a deterministic database/auth boundary.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const id = "11111111-1111-4111-8111-111111111111";
let permission, writes = [], duplicate = false, exists = true;
const server = {
  cors: () => ({}),
  requireHR: async (r, right) => {
    permission = right;
    const role = r.headers.get("authorization");
    if (role !== "editor" && !(role === "viewer" && right === "view")) throw new Error("Forbidden");
  },
  failure: e => Response.json({ error: e.message }, { status: 403 }),
  erp: () => ({ from(table) {
    let payload;
    const query = {
      insert(value) { payload = value; writes.push({ table, value }); return query; },
      update(value) { payload = value; writes.push({ table, value }); return query; },
      select() { return query; }, eq() { return query; },
      maybeSingle: async () => ({ data: exists ? { id } : null, error: null }),
      single: async () => ({ data: { id, ...payload, slug: "new-department" }, error: duplicate ? { code: "23505" } : null }),
    };
    return query;
  } }),
};
function load(file) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, Response, Request, Date, require(name) {
    if (name === "@/lib/hiring/server") return server;
    if (name === "@/lib/hiring/link") return {};
    if (name.startsWith("@/")) return load(path.join(process.cwd(), name.slice(2) + ".ts"));
    return require(name);
  } }, { filename: file });
  return exports;
}
const { POST } = load("app/api/hiring/admin/route.ts");
const post = (body, role = "editor") => POST(new Request("http://localhost/api/hiring/admin", { method: "POST", headers: { authorization: role, "Content-Type": "application/json" }, body: JSON.stringify(body) }));
(async () => {
  assert.equal((await post({ create_department: "Research" }, "viewer")).status, 403);
  assert.equal(writes.length, 0);
  assert.equal((await post({ create_department: "Research", link_ids: [] }, "viewer")).status, 403);
  assert.equal(permission, "edit", "Mixed payload cannot downgrade creation authorization");
  assert.equal((await post({ create_department: " " })).status, 400);
  assert.equal((await post({ create_department: "x".repeat(101) })).status, 400);
  const response = await post({ create_department: " Research ", slug: "caller-controlled" });
  assert.equal(response.status, 201);
  assert.deepEqual(JSON.parse(JSON.stringify(writes.at(-1).value)), { name: "Research" });
  duplicate = true;
  assert.equal((await post({ create_department: "RESEARCH" })).status, 409);
  duplicate = false;
  const campaign = { id, department_id: id, role: "Unrelated arbitrary title", active: false, locations: [], description: "Configured description", knowledge: "Enough configured interview knowledge", min_years: 0, max_years: null, fields: [], questions: ["Configured question"], company_knowledge: "", system_prompt: "", ai_model: "test" };
  exists = false;
  const count = writes.length;
  assert.equal((await post(campaign)).status, 400);
  assert.equal(writes.length, count, "Unknown departments cannot reach campaign writes");
  exists = true;
  assert.equal((await post(campaign)).status, 200);
  assert.equal(writes.at(-1).value.department_id, id);
  const { department_id, ...legacy } = campaign;
  assert.equal((await post(legacy)).status, 200);
  assert.equal(Object.hasOwn(writes.at(-1).value, "department_id"), false, "Older clients must preserve existing assignments");
  console.log("PASS: creation permissions, mixed payloads, name validation, duplicate feedback, server-owned URLs, assignment validation and legacy compatibility.");
})().catch(e => { console.error(e); process.exitCode = 1; });
