"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  FileCheck2,
  ChartNoAxesColumnIncreasing,
  UserRound,
  Video,
  FileText,
  Check,
  Info,
  BookOpen,
  X,
} from "lucide-react";
import { useCandidateJourney } from "@/hooks/use-candidate-journey";
import {
  interviewDate,
  interviewState,
  nextInvitation,
  CandidateInvitation,
} from "@/lib/candidate-journey";
import PortalLoading from "@/components/PortalLoading";
import s from "@/components/CandidateOverview.module.css";

function downloadCalendar(invitation: CandidateInvitation) {
  if (
    !invitation.scheduled_at ||
    !Number.isFinite(Date.parse(invitation.scheduled_at))
  )
    return;
  const stamp = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  const escape = (text: string) =>
    text
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/[,;]/g, (m) => "\\" + m);
  const file = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chirayu Hire//Candidate interview//EN",
    "BEGIN:VEVENT",
    "UID:" + invitation.id + "@chirayu-hire",
    "DTSTAMP:" + stamp(new Date()),
    "DTSTART:" + stamp(new Date(invitation.scheduled_at)),
    "SUMMARY:" + escape(invitation.role + " — interview"),
    "DESCRIPTION:Check your invitation for joining instructions.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([file], { type: "text/calendar;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "chirayu-interview.ics";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const journey = useCandidateJourney();
  const { interviews, reports, now, loading, error } = journey;
  const [profile, setProfile] = useState(0);
  const assessmentDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try {
      const email = (localStorage.getItem("candidate_email") || "")
        .trim()
        .toLowerCase();
      const notes =
        JSON.parse(localStorage.getItem("chirayu_profile:" + email) || "{}") ||
        {};
      const fields = [
        localStorage.getItem("candidate_name"),
        email,
        notes.phone,
        notes.location,
        notes.availability,
      ];
      setProfile(
        fields.filter((v) => typeof v === "string" && v.trim()).length * 20,
      );
    } catch {
      setProfile(0);
    }
  }, []);
  const report = reports[0];
  const assessed = interviews.find((i) => i.id === report?.interview_id);
  const next = nextInvitation(interviews, reports, now);
  const upcoming = interviews.filter(
    (i) =>
      interviewState(
        i,
        reports.some((r) => r.interview_id === i.id),
        now,
      ).group === "upcoming",
  );
  const completed = interviews.filter(
    (i) =>
      interviewState(
        i,
        reports.some((r) => r.interview_id === i.id),
        now,
      ).group === "completed",
  );
  const categories = report?.analysis.categoryScores || [];
  const score = report?.analysis.totalScore;
  const hasScore = typeof score === "number" && Number.isFinite(score);
  return (
    <div className={s.page + " hire-page-enter"}>
      <header className={s.heading}>
        <h1>Your interview overview</h1>
        <p>
          Track your progress, prepare well and build your career with Chirayu
          Hire.
        </p>
      </header>
      {loading ? (
        <PortalLoading variant="list" />
      ) : error ? (
        <section className={s.panel} role="alert">
          <h2>Your invitations are taking a moment.</h2>
          <p>{error}</p>
          <button className="hire-button" onClick={journey.retry}>
            Retry loading
          </button>
        </section>
      ) : (
        <>
          <div className={s.stats}>
            <div className={s.stat}>
              <div
                className={s.ring}
                style={{ "--completion": profile + "%" } as React.CSSProperties}
              >
                <span>{profile}%</span>
              </div>
              <div>
                <h2>Profile {profile}%</h2>
                <Link href="/profile">
                  Review your details <ArrowRight size={15} />
                </Link>
                <small>Includes browser-only notes</small>
              </div>
            </div>
            <div className={s.stat}>
              <span className={s.statIcon}>
                <CalendarDays />
              </span>
              <div>
                <h2>
                  {upcoming.length} upcoming{" "}
                  {upcoming.length === 1 ? "interview" : "interviews"}
                </h2>
                <p>
                  {next?.scheduled_at
                    ? interviewDate(next.scheduled_at)
                    : next
                      ? "Your next invitation is ready"
                      : "No upcoming interviews"}
                </p>
              </div>
            </div>
            <div className={s.stat}>
              <span className={s.statIcon}>
                <FileCheck2 />
              </span>
              <div>
                <h2>
                  {completed.length} completed{" "}
                  {completed.length === 1 ? "interview" : "interviews"}
                </h2>
                <p>
                  {completed.length
                    ? "Your interview history is below"
                    : "Your journey starts here"}
                </p>
              </div>
            </div>
            <div className={s.stat}>
              <span className={s.statIcon}>
                <ChartNoAxesColumnIncreasing />
              </span>
              <div>
                <h2>{reports.length ? "Feedback ready" : "Feedback"}</h2>
                <p>
                  {journey.feedbackLoading
                    ? "Checking saved assessments…"
                    : journey.feedbackError
                      ? "Couldn’t load assessments"
                      : reports.length +
                        (reports.length === 1 ? " assessment" : " assessments")}
                </p>
              </div>
            </div>
          </div>
          {journey.feedbackError && (
            <p className={s.notice} role="status">
              We couldn’t load saved feedback.{" "}
              <button onClick={journey.retry}>Try again</button>
            </p>
          )}
          <div className={s.grid}>
            <section className={s.panel + " " + s.assessment}>
              <div className={s.sectionTop}>
                <div>
                  <h2>
                    Latest assessment{assessed ? " · " + assessed.role : ""}
                  </h2>
                  <p>
                    {report
                      ? "Recorded on " + interviewDate(report.created_at, false)
                      : "Your saved assessment will appear here."}
                  </p>
                </div>
                {report && (
                  <Link
                    href={"/interview/" + report.interview_id + "/feedback"}
                  >
                    View feedback <ArrowRight size={15} />
                  </Link>
                )}
              </div>
              {report ? (
                <div className={s.assessmentBody}>
                  <div className={s.bars}>
                    {categories.length ? (
                      categories.slice(0, 4).map((c, index) => (
                        <div className={s.barRow} key={index}>
                          <span>{c.name}</span>
                          <div className={s.track} aria-hidden="true">
                            <span
                              style={{
                                width:
                                  Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      Number.isFinite(c.score) ? c.score : 0,
                                    ),
                                  ) + "%",
                              }}
                            />
                          </div>
                          <strong>
                            {Number.isFinite(c.score) ? c.score : "—"}
                            <small> / 100</small>
                          </strong>
                        </div>
                      ))
                    ) : (
                      <p>
                        Detailed ratings are not available for this assessment.
                      </p>
                    )}
                  </div>
                  <div className={s.overall}>
                    <h3>Overall assessment</h3>
                    <strong>
                      {hasScore ? score : "—"}
                      <small>{hasScore ? " / 100" : ""}</small>
                    </strong>
                    <p className={s.overallText}>
                      {report.analysis.finalAssessment ||
                        "Read the full feedback for observations and next steps."}
                    </p>
                    {(report.analysis.finalAssessment?.length || 0) > 220 && (
                      <button
                        type="button"
                        className={s.readMore}
                        onClick={() => assessmentDialog.current?.showModal()}
                      >
                        Read more <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className={s.empty}>
                  <FileCheck2 size={28} />
                  <h3>
                    {journey.feedbackLoading
                      ? "Checking your assessment…"
                      : "A clearer picture after your conversation."}
                  </h3>
                  <p>
                    Once feedback is available, you’ll find your ratings and
                    observations here.
                  </p>
                </div>
              )}
            </section>
            <dialog
              ref={assessmentDialog}
              className="hire-dialog"
              aria-labelledby="overall-assessment-title"
            >
              <button
                type="button"
                className="hire-icon-button hire-dialog-close"
                aria-label="Close"
                onClick={() => assessmentDialog.current?.close()}
              >
                <X size={20} />
              </button>
              <p className="hire-eyebrow">Overall assessment</p>
              <h2 id="overall-assessment-title">
                {hasScore ? score + " / 100" : "Your assessment"}
              </h2>
              <p>{report?.analysis.finalAssessment}</p>
            </dialog>
            <section className={s.panel + " " + s.next}>
              <div className={s.nextTitle}>
                <span className={s.statIcon}>
                  <CalendarDays />
                </span>
                <div>
                  <p>Your next interview</p>
                  <h2>{next?.role || "You’re all caught up."}</h2>
                  <p>
                    {next
                      ? next.scheduled_at
                        ? interviewDate(next.scheduled_at)
                        : next.mode === "one_on_one"
                          ? "Time to be confirmed"
                          : "Start when you’re ready"
                      : "Your recruiter will share any next steps."}
                  </p>
                </div>
              </div>
              {next && (
                <>
                  <dl className={s.details}>
                    <div>
                      <dt>
                        <UserRound size={18} />
                        Interviewer
                      </dt>
                      <dd>
                        {next.mode === "one_on_one"
                          ? "Your recruitment team"
                          : "Alex · AI interviewer"}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <Video size={18} />
                        Mode
                      </dt>
                      <dd>
                        {next.mode === "one_on_one"
                          ? "One-on-one conversation"
                          : "Self-paced AI interview"}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <FileText size={18} />
                        Focus areas
                      </dt>
                      <dd>
                        {next.techstack?.length
                          ? next.techstack.join(", ")
                          : next.type || "See your invitation for details"}
                      </dd>
                    </div>
                  </dl>
                  <div className={s.buttons}>
                    <Link
                      className="hire-button"
                      href={"/interview/" + next.id}
                    >
                      Check details <ArrowRight size={16} />
                    </Link>
                    {next.scheduled_at &&
                      Number.isFinite(Date.parse(next.scheduled_at)) && (
                        <button
                          className="hire-button"
                          data-variant="secondary"
                          onClick={() => downloadCalendar(next)}
                        >
                          <CalendarDays size={16} />
                          Add to calendar
                        </button>
                      )}
                  </div>
                </>
              )}
            </section>
            <section className={s.panel + " " + s.takeaways}>
              <h2>Key takeaways from your assessment</h2>
              <div className={s.takeawayGrid}>
                <div>
                  <span className={s.success}>
                    <Check size={18} />
                  </span>
                  <div>
                    <h3>Strength</h3>
                    <p>
                      {report?.analysis.strengths?.[0] ||
                        "Your strengths will appear with your feedback."}
                    </p>
                  </div>
                </div>
                <div>
                  <span className={s.followup}>
                    <Info size={18} />
                  </span>
                  <div>
                    <h3>Follow-up area</h3>
                    <p>
                      {report?.analysis.areasForImprovement?.[0] ||
                        "Development points will appear when available."}
                    </p>
                  </div>
                </div>
              </div>
            </section>
            <section className={s.panel + " " + s.preparation}>
              <h2>
                <BookOpen size={20} />
                Prepare for success
              </h2>
              <div className={s.resource}>
                <div className={s.resourceImage}>
                  <Image
                    src={
                      (process.env.NEXT_PUBLIC_BASE_PATH || "") +
                      "/brand/solar-array-small.webp"
                    }
                    alt="Solar farm"
                    fill
                    sizes="120px"
                  />
                </div>
                <div>
                  <h3>Get to know Chirayu Power</h3>
                  <p>The company and the work behind your next conversation.</p>
                  <a
                    href="https://chirayupower.com/about-us/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Explore the company <ArrowRight size={15} />
                  </a>
                </div>
              </div>
            </section>
            <section
              className={s.panel + " " + s.history}
              id="interview-history"
            >
              <div className={s.sectionTop}>
                <h2>Your interviews</h2>
                <Link href="/allinterviews">
                  View all interviews <ArrowRight size={15} />
                </Link>
              </div>
              {interviews.length ? (
                <div className={s.tableWrap}>
                  <table>
                    <thead>
                      <tr>
                        <th>Role</th>
                        <th>Mode</th>
                        <th>Date &amp; time</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interviews.slice(0, 5).map((i) => {
                        const hasReport = reports.some(
                          (r) => r.interview_id === i.id,
                        );
                        const state = interviewState(i, hasReport, now);
                        return (
                          <tr key={i.id}>
                            <td data-label="Role">{i.role}</td>
                            <td data-label="Mode">
                              {i.mode === "one_on_one"
                                ? "One-on-one"
                                : "AI interview"}
                            </td>
                            <td data-label="Date & time">
                              {i.scheduled_at
                                ? interviewDate(i.scheduled_at)
                                : hasReport
                                  ? interviewDate(
                                      reports.find(
                                        (r) => r.interview_id === i.id,
                                      )?.created_at || null,
                                    )
                                  : state.group !== "upcoming"
                                    ? "Not recorded"
                                    : i.mode !== "one_on_one"
                                      ? "Self-paced"
                                      : "To be confirmed"}
                            </td>
                            <td data-label="Status">
                              <span className={s.status} data-tone={state.tone}>
                                {state.label}
                              </span>
                            </td>
                            <td data-label="Action">
                              {hasReport ? (
                                <Link href={"/interview/" + i.id + "/feedback"}>
                                  View feedback <ArrowRight size={14} />
                                </Link>
                              ) : state.group === "upcoming" ? (
                                <Link href={"/interview/" + i.id}>
                                  Check details <ArrowRight size={14} />
                                </Link>
                              ) : (
                                <span className={s.muted}>
                                  {state.group === "closed"
                                    ? "Contact recruiter"
                                    : "Feedback pending"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={s.notice}>
                  No invitations yet. Check your invitation email or contact
                  your recruiter.
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
