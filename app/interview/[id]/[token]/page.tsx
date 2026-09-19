"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Landing page for the emailed interview link (/interview/[id]/[token]).
// It swaps the link for the candidate's credentials server-side, then sends
// them to the login form with the email and access code pre-filled -- they
// still press "Continue" themselves.
export default function InterviewLinkPage() {
  const { id, token } = useParams<{ id: string; token: string }>();
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${BASE_PATH}/api/interview-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, token }),
        });
        if (!response.ok) throw new Error("Invalid link");
        const data = (await response.json()) as { email: string; passwordId: string };
        if (cancelled) return;
        // The link is authoritative: drop any session for a different
        // candidate so the login form (not an auto-redirect) is what shows.
        ["candidate_email", "candidate_name", "password_id"].forEach((k) => localStorage.removeItem(k));
        sessionStorage.setItem("login_prefill", JSON.stringify({ email: data.email, passwordId: data.passwordId }));
        sessionStorage.setItem("interview_return_path", `/portal/interview/${id}`);
        router.replace("/login");
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, token, router]);

  return (
    <main className="min-h-screen grid place-items-center p-6 text-center" data-candidate-portal>
      {failed ? (
        <div className="max-w-md">
          <h1 className="text-2xl font-bold mb-3">This link isn’t valid</h1>
          <p className="mb-6 opacity-80">
            It may have been copied incorrectly or replaced by a newer invitation. You can still sign in with the email
            address and access code from your invitation email.
          </p>
          <Link href="/login" className="underline font-semibold">
            Go to sign in
          </Link>
        </div>
      ) : (
        <p role="status" className="opacity-80">
          Opening your interview invitation…
        </p>
      )}
    </main>
  );
}
