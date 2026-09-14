"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Key, Mail, ShieldAlert, Check } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChirayuLogo } from "@/components/ui/chirayu-logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [passwordId, setPasswordId] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to home
  useEffect(() => {
    const storedEmail = localStorage.getItem("candidate_email");
    const storedPass = localStorage.getItem("password_id");
    if (storedEmail && storedPass) {
      router.replace("/");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !passwordId.trim()) {
      toast.error("Please fill in both email and access password ID.");
      return;
    }

    try {
      setLoading(true);

      // 1. Check if Supabase is unconfigured (for local mock testing)
      if (!isSupabaseConfigured) {
        if (email.trim().toLowerCase() === "candidate@mock.com" && passwordId.trim().toUpperCase() === "CP-MOCK") {
          localStorage.setItem("candidate_email", "candidate@mock.com");
          localStorage.setItem("password_id", "CP-MOCK");
          localStorage.setItem("candidate_name", "Sahil Deshmukh (Mock)");
          toast.success("Logged in with local mock credentials!");
          router.push("/");
          return;
        }
        toast.error("Database unconfigured. Use email 'candidate@mock.com' and access code 'CP-MOCK' to sign in locally.");
        return;
      }

      // 2. Perform DB check
      const cleanEmail = email.trim().toLowerCase();
      const cleanPass = passwordId.trim().toUpperCase();

      const { data, error } = await supabase
        .from("interviews")
        .select("candidate_name, candidate_email, password_id")
        .eq("candidate_email", cleanEmail)
        .eq("password_id", cleanPass)
        .limit(1);

      if (error) {
        toast.error(error.message || "Failed to authenticate against the database.");
        console.error("Auth error:", error);
        return;
      }

      if (!data || data.length === 0) {
        toast.error("Invalid credentials. Please verify your email and access code.");
        return;
      }

      const candidate = data[0];
      localStorage.setItem("candidate_email", candidate.candidate_email || cleanEmail);
      localStorage.setItem("password_id", candidate.password_id || cleanPass);
      localStorage.setItem("candidate_name", candidate.candidate_name || "Candidate");

      toast.success(`Welcome back, ${candidate.candidate_name || "Candidate"}!`);
      router.push("/");
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-border-gray shadow-sm relative overflow-hidden">
        {/* Brand accent bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary-blue via-solar-yellow to-success-green" />

        {/* Logo and title */}
        <div className="flex flex-col items-center text-center space-y-4">
          <ChirayuLogo height={50} />
          <div>
            <h2 className="text-xl font-bold tracking-tight text-dark-100">
              Candidate Mock Portal
            </h2>
            <p className="text-xs text-soft-gray mt-1 max-w-[260px] mx-auto">
              Log in with the Access Password ID sent by your HR administrator to access your assigned mock interviews.
            </p>
          </div>
        </div>

        {/* Login form */}
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            {/* Email input */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-soft-gray flex items-center gap-1.5">
                <Mail size={14} className="text-primary-blue" />
                Candidate Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="e.g. candidate@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>

            {/* Access Code Input */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="passwordId" className="text-xs font-semibold text-soft-gray flex items-center gap-1.5">
                <Key size={14} className="text-primary-blue" />
                Access Password ID
              </Label>
              <Input
                id="passwordId"
                name="passwordId"
                type="text"
                required
                placeholder="e.g. CP-XXXXXX"
                value={passwordId}
                onChange={(e) => setPasswordId(e.target.value)}
                className="h-10 rounded-xl text-xs font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white font-bold h-10 rounded-xl text-xs uppercase tracking-wider gap-2 cursor-pointer"
            >
              {loading ? "Authenticating..." : (
                <>
                  <Check size={16} />
                  Access Portal
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Footer info/help */}
        <div className="text-[10px] text-center text-soft-gray border-t border-border-gray pt-4 mt-6">
          <p>Don't have credentials? Contact your HR manager for your Access Code.</p>
          <p className="mt-1">© 2026 Chirayu Power Pvt. Ltd. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
