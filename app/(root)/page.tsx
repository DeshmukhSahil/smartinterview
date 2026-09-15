"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  Mic,
  Sparkles,
  UserRound,
  Video,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import PortalLoading from "@/components/PortalLoading";
import s from "@/components/CandidateDashboard.module.css";

type Invitation = {
  id: string;
  role: string;
  mode: string;
  interview_status: string | null;
  scheduled_at: string | null;
  created_at: string;
};
type Report = {
  id: string;
  interview_id: string;
  created_at: string;
  analysis: {
    categoryScores?: { name: string; score: number; comment?: string }[];
    strengths?: string[];
    areasForImprovement?: string[];
    finalAssessment?: string;
  };
};
const date = (value: string | null) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(value))
    : "Schedule pending";

export default function Home() {
  const [name, setName] = useState("Candidate");
  const [email, setEmail] = useState("");
  const [interviews, setInterviews] = useState<Invitation[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportError, setReportError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState("");
  const [profile, setProfile] = useState<Record<string, string>>({});
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const candidateEmail = (localStorage.getItem("candidate_email") || "")
      .trim()
      .toLowerCase();
    setName(localStorage.getItem("candidate_name") || "Candidate");
    setEmail(candidateEmail);
    try {
      setProfile(
        JSON.parse(
          localStorage.getItem(`chirayu_profile:${candidateEmail}`) || "{}",
        ),
      );
    } catch {
      setProfile({});
    }
    setLoading(true);
    setError("");
    setReportError(false);
    setReports([]);
    const timeout = setTimeout(() => controller.abort(), 10000);
    void (async () => {
      try {
        if (!isSupabaseConfigured)
          throw new Error("The interview service is not configured yet.");
        if (!candidateEmail) return;
        const { data, error: queryError } = await supabase
          .from("interviews")
          .select("id,role,mode,interview_status,scheduled_at,created_at")
          .eq("candidate_email", candidateEmail)
          .order("created_at", { ascending: false })
          .abortSignal(controller.signal);
        if (queryError) throw queryError;
        if (disposed) return;
        const rows = (data || []) as Invitation[];
        setInterviews(rows);
        setLoading(false);
        clearTimeout(timeout);
        if (!rows.length) return;
        setReportLoading(true);
        const reportTimer = setTimeout(() => controller.abort(), 8000);
        try {
          const { data: feedback, error: feedbackError } = await supabase
            .from("feedback")
            .select("id,interview_id,created_at,analysis")
            .in(
              "interview_id",
              rows.map((r) => r.id),
            )
            .eq("user_id", "candidate-user")
            .order("created_at", { ascending: false })
            .abortSignal(controller.signal);
          if (feedbackError) throw feedbackError;
          if (!disposed) {
            const seen = new Set<string>();
            const latest = ((feedback || []) as Report[])
              .map((r) => ({ ...r, analysis: r.analysis || {} }))
              .filter((r) => {
                if (seen.has(r.interview_id)) return false;
                seen.add(r.interview_id);
                return true;
              });
            setReports(latest);
            setSelected(latest[0]?.interview_id || "");
          }
        } catch {
          if (!disposed) setReportError(true);
        } finally {
          clearTimeout(reportTimer);
          if (!disposed) setReportLoading(false);
        }
      } catch {
        if (!disposed)
          setError("We couldn’t load your interviews. Please try again.");
      } finally {
        clearTimeout(timeout);
        if (!disposed) setLoading(false);
      }
    })();
    return () => {
      disposed = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);
  const completed = (i: Invitation) =>
    i.interview_status === "completed" ||
    reports.some((r) => r.interview_id === i.id);
  const scheduled = interviews
    .filter(
      (i) =>
        i.interview_status === "scheduled" &&
        i.scheduled_at &&
        Date.parse(i.scheduled_at) > Date.now(),
    )
    .sort(
      (a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!),
    )[0];
  const next =
    scheduled ||
    interviews.find(
      (i) =>
        !completed(i) &&
        !["cancelled", "no_show"].includes(i.interview_status || ""),
    );
  const report = reports.find((r) => r.interview_id === selected);
  const reportInterview = interviews.find((i) => i.id === selected);
  const checks = [
    { label: "Full name", done: name !== "Candidate" && !!name.trim() },
    { label: "Email address", done: !!email },
    { label: "Phone number", done: !!profile.phone },
    { label: "Preferred location", done: !!profile.location },
    { label: "Interview availability", done: !!profile.availability },
  ];
  const percent = checks.filter((c) => c.done).length * 20;
  const status = (i: Invitation) =>
    completed(i)
      ? "Completed"
      : i.interview_status === "cancelled"
        ? "Cancelled"
        : i.interview_status === "no_show"
          ? "Not attended"
          : i.interview_status === "scheduled"
            ? "Scheduled"
            : i.mode === "one_on_one"
              ? "Awaiting schedule"
              : "Ready to start";
  return (
    <div className={s.dashboard}>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>YOUR CANDIDATE WORKSPACE</p>
          <h1>
            Welcome back, {name.split(" ")[0]}
            <span>.</span>
          </h1>
          <p>Your conversations, progress and next steps. All in one place.</p>
        </div>
        <Link className={s.textLink} href="/allinterviews">
          All interviews <ArrowUpRight size={16} />
        </Link>
      </div>
      <section className={s.hero} aria-label="Chirayu Power interview portal">
        <Image
          src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/brand/solar-hero.webp`}
          alt="Aerial view of the solar installation featured on Chirayu Power’s website"
          fill
          priority
          sizes="(max-width:760px) 100vw, 80vw"
          className={s.heroImage}
        />
        <div className={s.heroCopy}>
          <span className={s.heroLabel}>
            CHIRAYU HIRE <span /> ENERGY WITH INTEGRITY
          </span>
          <h2>
            Good conversations.
            <br />
            <em>Brighter possibilities.</em>
          </h2>
          <p>A place for your experience, ideas and ambition.</p>
        </div>
        <div className={s.nextCard}>
          <span className={s.eyebrow}>
            {loading
              ? "YOUR INTERVIEWS"
              : next
                ? "YOUR NEXT STEP"
                : "YOUR WORKSPACE"}
          </span>
          <h3>
            {loading
              ? "Finding your invitations…"
              : error
                ? "Your invitations are unavailable"
                : next?.role || "Ready for what comes next"}
          </h3>
          <p>
            {next ? (
              <>
                {next.mode === "one_on_one" ? (
                  <Video size={14} />
                ) : (
                  <Mic size={14} />
                )}{" "}
                {next.mode === "one_on_one"
                  ? "One-on-one interview"
                  : "AI interview"}
              </>
            ) : (
              "Your invitations and results will appear here."
            )}
          </p>
          {next?.scheduled_at && (
            <p>
              <CalendarDays size={14} />
              {date(next.scheduled_at)}
            </p>
          )}
          <Link
            className={s.primary}
            href={next ? `/interview/${next.id}` : "/allinterviews"}
          >
            {next
              ? next.mode === "one_on_one"
                ? "View interview details"
                : "Prepare for interview"
              : "View interviews"}
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <div className={s.quickLinks}>
        <span>
          <Check size={15} /> AI & one-on-one interviews
        </span>
        <a
          href="https://chirayupower.com/about-us/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Get to know Chirayu <ArrowUpRight size={14} />
        </a>
        <a
          href="https://chirayupower.com/services-solutions/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Explore our work <ArrowUpRight size={14} />
        </a>
      </div>
      <div className={s.columns}>
        <div className={s.mainColumn}>
          <section className={s.panel} aria-labelledby="insights-title">
            <div className={s.panelHeader}>
              <div>
                <span className={s.eyebrow}>AFTER THE CONVERSATION</span>
                <h2 id="insights-title">Your interview insights</h2>
              </div>
              <Sparkles size={20} />
            </div>
            {reportLoading ? (
              <p className={s.empty} role="status">
                Loading your saved assessment…
              </p>
            ) : reportError ? (
              <div className={s.empty}>
                <p>Your assessment couldn’t be loaded.</p>
                <button
                  className={s.textLink}
                  onClick={() => setAttempt((a) => a + 1)}
                >
                  Retry
                </button>
              </div>
            ) : report ? (
              <>
                <div className={s.reportMeta}>
                  <label>
                    Interview
                    <select
                      aria-label="Select assessment"
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      {reports.map((r) => (
                        <option key={r.id} value={r.interview_id}>
                          {interviews.find((i) => i.id === r.interview_id)
                            ?.role || "Interview"}{" "}
                          · {new Date(r.created_at).toLocaleDateString("en-IN")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className={s.badge}>AI assessment</span>
                </div>
                <div
                  className={s.chart}
                  aria-label={`Competency scores for ${reportInterview?.role || "interview"}`}
                >
                  {(report.analysis.categoryScores || [])
                    .filter(
                      (c) =>
                        typeof c.score === "number" && Number.isFinite(c.score),
                    )
                    .map((c, index) => (
                      <details
                        key={`${report.id}-${index}`}
                        className={s.chartRow}
                      >
                        <summary>
                          <span>{c.name}</span>
                          <span className={s.track}>
                            <span
                              className={s.bar}
                              style={{
                                width: `${Math.max(0, Math.min(100, c.score))}%`,
                              }}
                            />
                          </span>
                          <b>
                            {c.score}
                            <small>/100</small>
                          </b>
                        </summary>
                        <p>
                          {c.comment ||
                            "No additional assessment comment was saved for this competency."}
                        </p>
                      </details>
                    ))}
                  {!report.analysis.categoryScores?.length && (
                    <p className={s.empty}>
                      This report has no competency scores yet.
                    </p>
                  )}
                </div>
                <p className={s.chartHint}>
                  Select a competency to read its assessment. Scores use the
                  saved interview rubric.
                </p>
                <div className={s.findings}>
                  <div>
                    <span className={s.eyebrow}>STRENGTH</span>
                    <p>
                      {report.analysis.strengths?.[0] ||
                        "No strength summary recorded."}
                    </p>
                  </div>
                  <div>
                    <span className={s.eyebrow}>AREA TO DEVELOP</span>
                    <p>
                      {report.analysis.areasForImprovement?.[0] ||
                        "No improvement summary recorded."}
                    </p>
                  </div>
                </div>
                <Link
                  className={s.textLink}
                  href={`/interview/${selected}/feedback`}
                >
                  Read full assessment <ArrowRight size={15} />
                </Link>
              </>
            ) : (
              <div className={s.empty}>
                <div className={s.emptyChart} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <h3>Your experience deserves a closer look.</h3>
                <p>
                  After an AI interview, your saved assessment will show
                  competency scores, strengths and areas to develop here.
                </p>
                {next && (
                  <Link className={s.textLink} href={`/interview/${next.id}`}>
                    View your next interview <ArrowRight size={15} />
                  </Link>
                )}
              </div>
            )}
          </section>
          <section className={s.panel}>
            <div className={s.panelHeader}>
              <div>
                <span className={s.eyebrow}>YOUR CONVERSATIONS</span>
                <h2>Interview activity</h2>
              </div>
              <Link className={s.textLink} href="/allinterviews">
                View all <ArrowUpRight size={14} />
              </Link>
            </div>
            {loading ? (
              <PortalLoading variant="list" />
            ) : error ? (
              <div className={s.empty} role="alert">
                <p>{error}</p>
                <button
                  className={s.textLink}
                  onClick={() => setAttempt((a) => a + 1)}
                >
                  Retry
                </button>
              </div>
            ) : interviews.length ? (
              <div className={s.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Role / interview</th>
                      <th>Schedule</th>
                      <th>Status</th>
                      <th>
                        <span className="sr-only">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {interviews.slice(0, 5).map((i) => (
                      <tr key={i.id}>
                        <td>
                          <strong>{i.role}</strong>
                          <small>
                            {i.mode === "one_on_one"
                              ? "One-on-one"
                              : "AI interview"}
                          </small>
                        </td>
                        <td>
                          {i.scheduled_at
                            ? date(i.scheduled_at)
                            : i.mode === "one_on_one"
                              ? "To be scheduled"
                              : "Self-paced"}
                        </td>
                        <td>
                          <span
                            className={s.status}
                            data-complete={completed(i)}
                          >
                            {status(i)}
                          </span>
                        </td>
                        <td>
                          <Link
                            aria-label={`Open ${i.role}`}
                            href={`/interview/${i.id}`}
                          >
                            <ArrowUpRight size={18} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={s.empty}>
                No invitations are assigned to {email} yet. Return here when
                your recruitment team invites you.
              </p>
            )}
          </section>
        </div>
        <aside className={s.rail}>
          <section className={s.panel}>
            <div className={s.panelHeader}>
              <h2>Profile essentials</h2>
              <UserRound size={18} />
            </div>
            <div className={s.profileSummary}>
              <div
                className={s.ring}
                style={{
                  background: `conic-gradient(#084d91 ${percent}%, #eaf0f6 0)`,
                }}
              >
                <strong>{percent}%</strong>
              </div>
              <div>
                <strong>
                  {checks.filter((c) => c.done).length} of 5 details
                </strong>
                <p>Keep your contact details and preferences ready.</p>
              </div>
            </div>
            <ul className={s.checks}>
              {checks.map((c) => (
                <li key={c.label}>
                  <span>{c.label}</span>
                  {c.done ? (
                    <Check size={16} aria-label="Complete" />
                  ) : (
                    <span className={s.missing}>Add</span>
                  )}
                </li>
              ))}
            </ul>
            <Link className={s.secondary} href="/profile">
              Update profile <ArrowRight size={15} />
            </Link>
            <p className={s.fine}>Preferences are saved in this browser.</p>
          </section>
          <section className={`${s.panel} ${s.prepare}`}>
            <div className={s.wave} aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <i key={n} />
              ))}
            </div>
            <h2>Ready when you are.</h2>
            <p>
              Check your microphone, camera and speaker before your AI
              interview.
            </p>
            {next && next.mode !== "one_on_one" ? (
              <Link className={s.textLink} href={`/interview/${next.id}`}>
                Open device check <ArrowRight size={15} />
              </Link>
            ) : (
              <Link className={s.textLink} href="/allinterviews">
                View available interviews <ArrowRight size={15} />
              </Link>
            )}
          </section>
          <div className={s.note}>
            <Clock3 size={16} />
            <p>
              Schedules use your device’s timezone. Your interview details
              contain the joining instructions.
            </p>
          </div>
        </aside>
      </div>
      <footer className={s.footer}>
        <span>CHIRAYU HIRE</span>
        <p>One workspace. Every conversation.</p>
        <a
          href="https://chirayupower.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Chirayu Power <ArrowUpRight size={13} />
        </a>
      </footer>
    </div>
  );
}
