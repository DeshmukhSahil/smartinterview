"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { interviewDate } from "@/lib/candidate-journey";
import CandidatePageFooter from "@/components/CandidatePageFooter";
import CandidateJourneySteps from "@/components/CandidateJourneySteps";
import s from "@/components/CandidateAssessment.module.css";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import PortalLoading from "@/components/PortalLoading";

type Assessment = {
  id: string;
  interviewId: string;
  totalScore: number | null;
  categoryScores: { name: string; score?: number; comment?: string }[];
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  createdAt: string;
};

export default function FeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [interview, setInterview] = useState<{ role: string } | null>(null);
  const [feedback, setFeedback] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeedbackData = async () => {
      try {
        if (!isSupabaseConfigured) {
          // Fallback mock data for local testing
          setInterview({
            role: "Solar Design Engineer",
          });
          setFeedback({
            id: "mock-feedback-id",
            interviewId: id,
            totalScore: 85,
            categoryScores: [
              {
                name: "Communication Skills",
                score: 80,
                comment: "Clear, articulated replies with logical structure.",
              },
              {
                name: "Technical Knowledge",
                score: 90,
                comment:
                  "Demonstrated strong grasp of solar engineering principles.",
              },
              {
                name: "Problem-Solving",
                score: 85,
                comment: "Able to outline a structured sizing approach.",
              },
              {
                name: "Cultural Fit",
                score: 85,
                comment:
                  "Aligns well with Chirayu's engineering precision focus.",
              },
              {
                name: "Confidence and Clarity",
                score: 85,
                comment: "Maintained a professional, positive tone.",
              },
            ],
            strengths: [
              "Excellent comprehension of shading reduction techniques",
              "Solid understanding of PVsyst sizing simulation workflows",
              "Great communication structure",
            ],
            areasForImprovement: [
              "Could elaborate more on electrical safety standards (e.g. IEC)",
              "Mention more details on inverter sizing ratio limits",
            ],
            finalAssessment:
              "Overall, the candidate is a strong fit for a project designer role at Chirayu Power.",
            createdAt: new Date().toISOString(),
          });
          setLoading(false);
          return;
        }

        // Fetch interview details
        const { data: interviewData, error: interviewErr } = await supabase
          .from("interviews")
          .select("role")
          .eq("id", id)
          .single();

        if (interviewErr || !interviewData) {
          console.error("Failed to load interview:", interviewErr);
          router.replace("/portal");
          return;
        }
        setInterview(interviewData);

        // Fetch feedback details
        const { data: feedbackData, error: feedbackErr } = await supabase
          .from("feedback")
          .select("*")
          .eq("interview_id", id)
          .limit(1);

        if (feedbackErr) {
          console.error("Failed to load feedback:", feedbackErr);
        } else if (feedbackData && feedbackData.length > 0) {
          const raw = feedbackData[0];
          const analysis = raw.analysis || {};
          setFeedback({
            id: raw.id,
            interviewId: raw.interview_id,
            totalScore:
              typeof analysis.totalScore === "number"
                ? analysis.totalScore
                : null,
            categoryScores: analysis.categoryScores || [],
            strengths: analysis.strengths || [],
            areasForImprovement: analysis.areasForImprovement || [],
            finalAssessment: analysis.finalAssessment || "",
            createdAt: raw.created_at,
          });
        }
      } catch (err) {
        console.error("Failed to load feedback view:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadFeedbackData();
    }
  }, [id, router]);

  if (loading) return <PortalLoading />;
  if (!interview) return null;
  const score =
    typeof feedback?.totalScore === "number" &&
    Number.isFinite(feedback.totalScore)
      ? feedback.totalScore
      : null;
  return (
    <div className={s.page + " hire-page-enter"}>
      <Link className={s.back} href="/portal/allinterviews">
        <ArrowLeft size={16} /> Your interviews
      </Link>
      <header className={s.heading}>
        <p className="hire-eyebrow">After the conversation</p>
        <h1>
          A clearer view
          <br />
          <em>of your strengths.</em>
        </h1>
        <p>
          {interview.role}
          {feedback?.createdAt && (
            <> · {interviewDate(feedback.createdAt, false)}</>
          )}
        </p>
      </header>
      {feedback && <CandidateJourneySteps current="feedback" />}
      {feedback ? (
        <>
          <section className={s.summary} aria-labelledby="assessment-summary">
            <div>
              <p className="hire-eyebrow">Your assessment</p>
              <h2 id="assessment-summary">The conversation, reflected.</h2>
              <p>
                {feedback.finalAssessment ||
                  "Your saved assessment is available below. Read the observations alongside each rating."}
              </p>
            </div>
            <div className={s.score}>
              <span>Overall assessment</span>
              <strong>
                {score === null ? "—" : score}
                <small>{score !== null && "/ 100"}</small>
              </strong>
              <p>
                {score === null
                  ? "No overall rating recorded."
                  : "Read alongside the feedback below."}
              </p>
            </div>
          </section>
          <div className={s.content}>
            <section aria-labelledby="detail-title">
              <div className={s.sectionHeading}>
                <span>01</span>
                <h2 id="detail-title">A closer look.</h2>
              </div>
              <p className={s.intro}>
                The observations behind your assessment.
              </p>
              {feedback.categoryScores?.length ? (
                <div className={s.categories}>
                  {feedback.categoryScores.map(
                    (
                      category: {
                        name: string;
                        score?: number;
                        comment?: string;
                      },
                      index: number,
                    ) => (
                      <article key={index} className={s.category}>
                        <div>
                          <h3>{category.name}</h3>
                          <p>
                            {category.comment ||
                              "No additional observation was recorded."}
                          </p>
                        </div>
                        <span className={s.rating}>
                          {typeof category.score === "number" &&
                          Number.isFinite(category.score) ? (
                            <>
                              {category.score}
                              <small>/100</small>
                            </>
                          ) : (
                            "Not rated"
                          )}
                        </span>
                      </article>
                    ),
                  )}
                </div>
              ) : (
                <p className={s.unavailable}>
                  Detailed ratings haven’t been recorded for this conversation.
                </p>
              )}
            </section>
            <aside className={s.next}>
              <p className="hire-eyebrow">What comes next</p>
              <h2>
                Keep the{" "}
                <br />
                <em>conversation going.</em>
              </h2>
              <p>
                Your recruiter will share any next steps. Contact the team in
                your invitation email if you have a question about this
                assessment.
              </p>
              <Link href="/portal/allinterviews">
                View interview history <ArrowRight size={16} />
              </Link>
            </aside>
            <section
              className={s.reflections}
              aria-labelledby="reflection-title"
            >
              <div className={s.sectionHeading}>
                <span>02</span>
                <h2 id="reflection-title">Take it forward.</h2>
              </div>
              <div className={s.reflectionColumns}>
                <div>
                  <h3>What came through</h3>
                  {feedback.strengths?.length ? (
                    <ul>
                      {feedback.strengths.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No specific strengths were recorded.</p>
                  )}
                </div>
                <div>
                  <h3>Room to develop</h3>
                  {feedback.areasForImprovement?.length ? (
                    <ul>
                      {feedback.areasForImprovement.map(
                        (item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <p>No specific development points were recorded.</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </>
      ) : (
        <section className={s.pending}>
          <p className="hire-eyebrow">No saved assessment</p>
          <h2>Your feedback isn’t available yet.</h2>
          <p>
            Check back here for a saved assessment, or contact your recruiter
            for an update.
          </p>
        </section>
      )}
      <div className={s.actions}>
        <Link className="hire-button" href="/portal/allinterviews">
          Back to interviews <ArrowRight size={17} />
        </Link>
        <Link className={s.back} href={"/portal/interview/" + id}>
          <RotateCcw size={16} /> {feedback ? "Retake interview" : "View interview"}
        </Link>
      </div>
      <CandidatePageFooter />
    </div>
  );
}
