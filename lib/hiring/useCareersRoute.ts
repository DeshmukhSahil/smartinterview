"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { parseCareersRoute, type CareersRoute } from "./routes";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Next rewrites serve the same page. Native history keeps the mounted SPA and draft. */
export function useCareersRoute() {
  const pathname = usePathname();
  const [route, setRoute] = useState<CareersRoute | null>(null);
  const readLocation = useCallback(() => {
    setRoute(parseCareersRoute(window.location.pathname, window.location.search, basePath));
  }, []);
  useEffect(() => {
    readLocation();
    window.addEventListener("popstate", readLocation);
    return () => window.removeEventListener("popstate", readLocation);
  }, [pathname, readLocation]);

  const navigate = useCallback((href: string) => {
    const target = `${basePath}${href}`;
    if (`${window.location.pathname}${window.location.search}` !== target) window.history.pushState(null, "", target);
    readLocation();
  }, [readLocation]);
  return { route, navigate };
}
