"use client";
import { ArrowRight, Mail } from "lucide-react";
import { useCandidateJourney } from "@/hooks/use-candidate-journey";
import FilterableInterviewList from "@/components/FilterableInterviewList";
import CandidatePageFooter from "@/components/CandidatePageFooter";
import PortalLoading from "@/components/PortalLoading";
import s from "@/components/CandidateJourney.module.css";
export default function AllInterviewsPage() {
  const journey = useCandidateJourney();
  return (
    <div className={`${s.page} hire-page-enter`}>
      <header className={s.pageHeading}>
        <p className="hire-eyebrow">One step at a time</p>
        <h1>Your interviews.</h1>
        <p>Every invitation, every conversation. Find your next step here.</p>
      </header>
      {journey.loading ? (
        <PortalLoading variant="list" />
      ) : journey.error ? (
        <section className={s.emptyState} role="alert">
          <h2>Let’s try that again.</h2>
          <p>{journey.error}</p>
          <button className="hire-button" onClick={journey.retry}>
            Retry loading
          </button>
        </section>
      ) : journey.interviews.length ? (
        <FilterableInterviewList
          interviews={journey.interviews}
          reports={journey.reports}
          now={journey.now}
        />
      ) : (
        <section className={s.emptyState}>
          <Mail size={28} />
          <h2>Your next conversation starts here.</h2>
          <p>
            No invitations are assigned to {journey.email || "your account"}{" "}
            yet. If you’re expecting one, check the email address on your
            invitation or contact your recruiter.
          </p>
        </section>
      )}
      {journey.feedbackError && (
        <div className={s.inlineNotice} role="status">
          <p>
            Saved feedback couldn’t be loaded. Interview statuses may update
            when it’s available.
          </p>
          <button className={s.textLink} onClick={journey.retry}>
            Try again <ArrowRight size={16} />
          </button>
        </div>
      )}
      {journey.feedbackLoading && (
        <p className={s.sectionNote} role="status">
          Checking for saved feedback…
        </p>
      )}
      <div className={s.listHelp}>
        <span>Plans can change.</span>
        <p>
          Need another time or help joining? Contact the recruiter in your
          invitation email.
        </p>
        <p>Times are shown in your device’s timezone.</p>
      </div>
      <CandidatePageFooter />
    </div>
  );
}
