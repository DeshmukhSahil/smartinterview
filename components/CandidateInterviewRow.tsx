import Link from "next/link";
import { ArrowRight, CalendarDays, Mic, Video } from "lucide-react";
import {
  CandidateInvitation,
  interviewDate,
  interviewState,
} from "@/lib/candidate-journey";
import s from "./CandidateJourney.module.css";

export default function CandidateInterviewRow({
  interview,
  hasReport,
  now,
}: {
  interview: CandidateInvitation;
  hasReport: boolean;
  now: number;
}) {
  const state = interviewState(interview, hasReport, now);
  const human = interview.mode === "one_on_one";
  const action =
    state.group === "completed"
      ? hasReport
        ? "Read feedback"
        : "View details"
      : state.label === "Ready when you are"
        ? "Prepare"
        : "View details";
  return (
    <article className={s.interviewRow}>
      <div className={s.interviewMark} aria-hidden="true">
        {human ? <Video size={21} /> : <Mic size={21} />}
      </div>
      <div className={s.interviewInfo}>
        <div className={s.rowMeta}>
          <span>
            {human ? "With the recruitment team" : "With Alex · AI interview"}
          </span>
          <span className={s.status} data-tone={state.tone}>
            {state.label}
          </span>
        </div>
        <h3>{interview.role}</h3>
        <p className={s.schedule}>
          <CalendarDays size={15} />
          {state.group === "closed"
            ? "This invitation is no longer active"
            : interview.scheduled_at
              ? interviewDate(interview.scheduled_at)
              : state.group === "completed"
                ? "Conversation completed"
                : human
                  ? "Your recruiter will confirm a time"
                  : "Self-paced · Start when you’re ready"}
        </p>
      </div>
      <div className={s.rowAction}>
        {state.group === "closed" ? (
          <span>Contact your recruiter for next steps.</span>
        ) : state.group === "completed" && !hasReport ? (
          <span>No saved feedback is available yet.</span>
        ) : (
          <Link
            href={
              hasReport && state.group === "completed"
                ? `/portal/interview/${interview.id}/feedback`
                : `/portal/interview/${interview.id}`
            }
            aria-label={`${action}: ${interview.role}`}
            className={s.textLink}
          >
            {action}
            <ArrowRight size={17} />
          </Link>
        )}
      </div>
    </article>
  );
}
