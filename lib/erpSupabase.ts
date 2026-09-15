import { createClient } from "@supabase/supabase-js";

// Client-side auth against the ERP's Supabase project, used only by the HR pages under
// /hr so an HR user can sign in with the same account they use for the ERP hiring admin
// panel and call this app's requireHR-gated /api/hiring/* routes with the resulting
// bearer token. Separate from lib/supabase.ts, which talks to the Interview DB.
const erpSupabaseUrl = process.env.NEXT_PUBLIC_ERP_SUPABASE_URL || "https://placeholder.supabase.co";
const erpSupabaseAnonKey = process.env.NEXT_PUBLIC_ERP_SUPABASE_ANON_KEY || "placeholder";

export const isErpSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_ERP_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_ERP_SUPABASE_URL.includes("placeholder") &&
  !!process.env.NEXT_PUBLIC_ERP_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_ERP_SUPABASE_ANON_KEY !== "placeholder";

export const erpSupabase = createClient(erpSupabaseUrl, erpSupabaseAnonKey);
