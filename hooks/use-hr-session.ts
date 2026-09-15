"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { erpSupabase, isErpSupabaseConfigured } from "@/lib/erpSupabase";

// HR pages (app/hr/**) sign in against the ERP's own Supabase project — the same
// account used for the ERP hiring admin panel — and use the resulting access token as
// the bearer token requireHR() already expects on /api/hiring/* routes.
export function useHrSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isErpSupabaseConfigured) {
      setLoading(false);
      return;
    }
    erpSupabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = erpSupabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  return { session, loading, accessToken: session?.access_token || null, configured: isErpSupabaseConfigured };
}
