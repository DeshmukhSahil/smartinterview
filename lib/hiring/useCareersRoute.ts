"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { parseCareersRoute, type CareersRoute } from "./routes";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Next rewrites serve the same page. Native history keeps the mounted SPA and draft. */
export function useCareersRoute() {
  const pathname = usePathname();
  // usePathname() alone doesn't change when only the query string does --
  // navigating from "/?q=x&city=Y" to plain "/" (e.g. the navbar's Careers
  // link, going to the exact same pathname) would otherwise never re-parse,
  // leaving a stale route.query/route.city and the filters looking "stuck"
  // even though the URL bar is already clean.
  const searchParams = useSearchParams();
  // Lazy initializer, not useState(null) + a useEffect to fill it in: the
  // effect runs after the first paint, so route was null for that whole
  // first frame -- every route-gated section (the hero included) blinked
  // out of existence and back in on every single page load, a real,
  // measurable CLS hit for no reason, since window.location is already
  // available synchronously the moment this client component mounts.
  const [route, setRoute] = useState<CareersRoute | null>(() =>
    typeof window === "undefined" ? null : parseCareersRoute(window.location.pathname, window.location.search, basePath)
  );
  const readLocation = useCallback(() => {
    setRoute(parseCareersRoute(window.location.pathname, window.location.search, basePath));
  }, []);
  useEffect(() => {
    readLocation();
    window.addEventListener("popstate", readLocation);
    return () => window.removeEventListener("popstate", readLocation);
  }, [pathname, searchParams, readLocation]);

  const navigate = useCallback((href: string) => {
    const target = `${basePath}${href}`;
    if (`${window.location.pathname}${window.location.search}` !== target) window.history.pushState(null, "", target);
    readLocation();
  }, [readLocation]);
  return { route, navigate };
}
