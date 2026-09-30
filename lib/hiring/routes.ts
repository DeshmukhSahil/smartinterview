export function careerSlug(label: string): string {
  return label.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const departmentPath = (department: string) => `/departments/${careerSlug(department)}`;
export const rolePath = (role: string) => `/roles/${careerSlug(role)}`;
export const jobPath = (id: string, apply = false) => `/jobs/${encodeURIComponent(id)}${apply ? "/apply" : ""}`;
export function searchPath(query: string, city: string): string {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (city) params.set("city", city);
  return params.size ? `/?${params}` : "/";
}

export type CareersRoute = {
  kind: "listing" | "department" | "role" | "job" | "invalid";
  department: string | null;
  role: string;
  jobId: string;
  stage: "detail" | "form";
  query: string;
  city: string;
};

/** IDs identify jobs; role URLs can intentionally contain several campaigns. */
export function parseCareersRoute(pathname: string, search = "", basePath = ""): CareersRoute {
  const route: CareersRoute = { kind: "listing", department: null, role: "", jobId: "", stage: "detail", query: "", city: "" };
  const path = basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`)) ? pathname.slice(basePath.length) : pathname;
  let parts: string[];
  try { parts = path.split("/").filter(Boolean).map(decodeURIComponent); }
  catch { return { ...route, kind: "invalid" }; }
  if (!parts.length || (parts.length === 1 && parts[0] === "apply")) {
    const params = new URLSearchParams(search);
    return { ...route, query: params.get("q") || "", city: params.get("city") || "" };
  }
  if (parts[0] === "departments" && parts.length === 2) {
    // Resolve against the fetched department list, never a compiled allowlist.
    return { ...route, kind: "department", department: parts[1] };
  }
  if (parts[0] === "roles" && parts.length === 2) return { ...route, kind: "role", role: parts[1] };
  if (parts[0] === "jobs" && (parts.length === 2 || (parts.length === 3 && parts[2] === "apply"))) {
    return { ...route, kind: "job", jobId: parts[1], stage: parts[2] === "apply" ? "form" : "detail" };
  }
  return { ...route, kind: "invalid" };
}
