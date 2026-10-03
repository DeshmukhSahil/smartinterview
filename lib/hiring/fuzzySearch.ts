import Fuse, { type IFuseOptions } from "fuse.js";

// threshold 0.35 catches a couple of typo'd/transposed characters ("egnineer",
// "slaes") without drifting so loose that unrelated words start matching;
// ignoreLocation -- the typo can be anywhere in the word, not just near the
// start. Fuse's own minMatchCharLength would silently drop 1-char queries
// entirely, so those are instead handled below by a plain substring fallback
// (matching what every one of these call sites did before fuzzy matching).
const FUZZY_OPTIONS = {
  threshold: 0.35,
  ignoreLocation: true,
} satisfies IFuseOptions<unknown>;

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]), obj);
}

function valueIncludes(value: unknown, needle: string): boolean {
  if (typeof value === "string") return value.toLowerCase().includes(needle);
  if (Array.isArray(value)) return value.some(v => valueIncludes(v, needle));
  return false;
}

/** Typo-tolerant version of `text.toLowerCase().includes(query.toLowerCase())`. */
export function fuzzyTextMatches(text: string, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  if (q.length === 1) return text.toLowerCase().includes(q.toLowerCase());
  return new Fuse([text], FUZZY_OPTIONS).search(q).length > 0;
}

/** Typo-tolerant search over a flat list of strings (e.g. an autocomplete pool). */
export function fuzzySearchStrings(pool: string[], query: string, limit?: number): string[] {
  const q = query.trim();
  if (!q) return [];
  const results =
    q.length === 1
      ? pool.filter(s => s.toLowerCase().includes(q.toLowerCase()))
      : new Fuse(pool, FUZZY_OPTIONS).search(q).map(r => r.item);
  return typeof limit === "number" ? results.slice(0, limit) : results;
}

/**
 * Typo-tolerant search over a list of objects by one or more text keys
 * (dot-paths into each item, e.g. "campaign.role"; array-valued fields like
 * a role's `locations` are matched element-wise). An empty query returns
 * every item unfiltered, matching how the plain-substring filters this
 * replaces always behaved when nothing had been typed yet.
 */
export function fuzzySearchObjects<T>(items: T[], keys: string[], query: string): T[] {
  const q = query.trim();
  if (!q) return items;
  if (q.length === 1) {
    const ql = q.toLowerCase();
    return items.filter(item => keys.some(key => valueIncludes(getByPath(item, key), ql)));
  }
  return new Fuse(items, { ...FUZZY_OPTIONS, keys }).search(q).map(r => r.item);
}
