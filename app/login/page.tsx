"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Mic, Clock3 } from "lucide-react";
import styles from "@/components/InterviewRoom.module.css";
import { ChirayuLogo } from "@/components/ui/chirayu-logo";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

function invitationDestination() {
  const path = sessionStorage.getItem("interview_return_path");
  sessionStorage.removeItem("interview_return_path");
  return path && /^\/interview\/[^/]+$/.test(path) ? path : "/";
}

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
      router.replace(invitationDestination());
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
          router.push(invitationDestination());
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
      router.push(invitationDestination());
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return <div className={styles.room}>
    <header className={styles.header}><a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/`} className={styles.brand}><ChirayuLogo height={38}/></a><span className={styles.headerStatus}>Your invitation to what’s next</span></header>
    <main className={styles.loginMain}><section className={styles.welcome}><p className={styles.eyebrow}>Good people. Meaningful work.</p><h1>Your next chapter<br />starts with<br /><em>a conversation.</em></h1><p className={styles.intro}>We’re glad you’re here. Join your interview with Chirayu Power and tell us about the work that matters to you.</p><div className={styles.loginNotes}><p><Mic size={16}/>A natural conversation, in your own words.</p><p><Clock3 size={16}/>Time to think. Space to be yourself.</p></div></section>
    <section className={styles.loginForm}><p className={styles.eyebrow}>Your interview invitation</p><h2>Welcome to Chirayu.</h2><p>Use the email address and access code from your invitation to continue.</p><form onSubmit={handleLogin}><label htmlFor="email">Email address<input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></label><label htmlFor="passwordId">Invitation access code<input id="passwordId" name="passwordId" autoComplete="one-time-code" required placeholder="CP-XXXXXX" value={passwordId} onChange={e=>setPasswordId(e.target.value)}/></label><button type="submit" disabled={loading} className={styles.primary}>{loading ? "Checking your invitation…" : "Continue to your interview"}<ArrowRight size={17}/></button></form><p className={styles.loginHelp}>Can’t find your invitation?<br />Your recruiter can help with your access code.</p></section></main><footer className={styles.pageFooter}><span>Chirayu Power · People & possibilities</span><span>A thoughtful beginning.</span></footer>
  </div>;
}
