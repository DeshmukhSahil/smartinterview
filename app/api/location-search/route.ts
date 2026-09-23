// Proxies the free, key-less India Post pincode API so the careers page's
// city search isn't limited to cities where a role already exists --
// candidates from any city, town, or village in India can find and select
// their own location, even where Chirayu Power isn't hiring yet (see the
// "currently hiring in" fallback on the careers page for that case).
// Server-side so the external call isn't exposed directly to the browser
// and a slow/down upstream can't hang the page.
const POSTOFFICE_API = "https://api.postalpincode.in/postoffice";

interface PostOffice {
  Name?: string;
  District?: string;
  State?: string;
}
type LocationResult = { name: string; district: string; state: string };

export const dynamic = "force-dynamic";

// India Post's own response time scales with match count, not query
// length, and is inconsistent under this alone -- a short, common
// fragment like "wadi" matches 600+ post offices and was observed taking
// anywhere from ~6s to 9s+ to transfer. This is a background, debounced
// search with its own "Searching..." state in the UI, so it can afford to
// wait well past what a request in the main page-load path would.
const UPSTREAM_TIMEOUT_MS = 15000;

// A plain in-process cache: this server is a single Node instance (not
// serverless/multi-region), and India Post has no documented rate limit
// but is slow enough that repeat/overlapping keystrokes for the same
// prefix are worth not re-fetching. Small and unbounded is fine here --
// query strings are short and this process restarts on every deploy.
const cache = new Map<string, { at: number; locations: LocationResult[] }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() || "";
  if (q.length < 2) return Response.json({ locations: [] });

  const cached = cache.get(q);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return Response.json({ locations: cached.locations });
  }

  try {
    const r = await fetch(`${POSTOFFICE_API}/${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!r.ok) return Response.json({ locations: [] });
    const data = await r.json();
    const postOffices: PostOffice[] | undefined = data?.[0]?.PostOffice;
    if (!Array.isArray(postOffices)) return Response.json({ locations: [] });

    const seen = new Set<string>();
    const locations: LocationResult[] = [];
    for (const po of postOffices) {
      const name = typeof po.Name === "string" ? po.Name.trim() : "";
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      locations.push({ name, district: po.District || "", state: po.State || "" });
      if (locations.length >= 20) break;
    }
    cache.set(q, { at: Date.now(), locations });
    return Response.json({ locations }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch {
    // Upstream down/slow/malformed -- degrade to "no extra suggestions"
    // rather than breaking the city search entirely. Not cached, so the
    // next attempt (e.g. after the upstream recovers) can succeed.
    return Response.json({ locations: [] });
  }
}
