"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, Lock } from "lucide-react";
import { erpSupabase, isErpSupabaseConfigured } from "@/lib/erpSupabase";
import { useHrSession } from "@/hooks/use-hr-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Sign-in for the HR-only pages under /hr. Uses the same ERP account HR already has for
// the ERP hiring admin panel — the resulting Supabase session token is what
// requireHR() checks on /api/hiring/* routes.
export default function HrLoginPage() {
  const router = useRouter();
  const { session, loading } = useHrSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) router.replace("/hr/applications");
  }, [loading, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isErpSupabaseConfigured) {
      toast.error("HR sign-in is not configured on this deployment yet.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await erpSupabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        toast.error(error.message || "Sign-in failed.");
        return;
      }
      router.push("/hr/applications");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-border-gray rounded-2xl shadow-sm p-8 flex flex-col gap-5"
      >
        <div>
          <h1 className="text-xl font-bold text-dark-100">HR sign-in</h1>
          <p className="text-xs text-soft-gray mt-1">Use your ERP account to manage one-on-one interviews.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-dark-100 flex items-center gap-1.5"><Mail size={13} /> Email</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@chirayupower.com" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-dark-100 flex items-center gap-1.5"><Lock size={13} /> Password</Label>
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
