"use client";

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import Link from "next/link";
import {
  Code2, MessageCircle, Users, Sparkles,
  PlayCircle, Award, CalendarClock, Clock3, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DisplayTechIcons from "@/components/DisplayTechIcons";
import { getCardFeedback, type CardFeedback } from "@/lib/interview-card-feedback";

const TYPE_ICON: Record<string, typeof Code2> = {
  Technical: Code2,
  Behavioral: MessageCircle,
};

const InterviewCard = ({
  interviewId,
  userId = "candidate-user",
  role,
  type,
  techstack,
  createdAt,
  mode,
  interviewStatus,
  scheduledAt,
}: InterviewCardProps) => {
  const [feedback, setFeedback] = useState<CardFeedback | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    const fetchFeedback = async () => {
      const resolvedUserId = userId || "candidate-user";
      if (!interviewId || mode === "one_on_one") {
        setLoading(false);
        return;
      }
      try {
        const data = await getCardFeedback(interviewId, resolvedUserId);
        if (!disposed) setFeedback(data);
      } catch (err) {
        console.error("Error fetching feedback for interview:", interviewId, err);
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    void fetchFeedback();
    return () => { disposed = true; };
  }, [interviewId, userId, mode]);

  const isOneOnOne = mode === "one_on_one";
  const normalizedType = /mix/gi.test(type) ? "Mixed" : type;
  const formattedDate = dayjs(feedback?.createdAt || createdAt || Date.now()).format("MMM D, YYYY");

  // Status badge + CTA are derived up front so there is always a clear, single
  // action button — never a bare "maybe open this" text link.
  let badge: { label: string; className: string };
  let cta: { label: string; href: string; icon: typeof ArrowRight };
  let meta = `${normalizedType} · ${formattedDate}`;

  if (isOneOnOne) {
    if (interviewStatus === "completed") {
      badge = { label: "Completed", className: "bg-green-50 border-green-200 text-success-green" };
      cta = { label: "View Summary", href: `/interview/${interviewId}`, icon: Award };
    } else if (interviewStatus === "scheduled") {
      badge = { label: "Scheduled", className: "bg-blue-50 border-blue-200 text-primary-blue" };
      cta = { label: "View & Join", href: `/interview/${interviewId}`, icon: CalendarClock };
      if (scheduledAt) meta = `One-on-one · ${dayjs(scheduledAt).format("MMM D, h:mm A")}`;
    } else {
      badge = { label: "Awaiting Schedule", className: "bg-amber-50 border-amber-200 text-amber-600" };
      cta = { label: "View Status", href: `/interview/${interviewId}`, icon: Clock3 };
      meta = `One-on-one · Applied ${formattedDate}`;
    }
  } else if (feedback) {
    badge = { label: "Completed", className: "bg-green-50 border-green-200 text-success-green" };
    cta = { label: "View Feedback", href: `/interview/${interviewId}/feedback`, icon: Award };
  } else {
    badge = { label: "Not Started", className: "bg-amber-50 border-amber-200 text-amber-600" };
    cta = { label: "Take Interview", href: `/interview/${interviewId}`, icon: PlayCircle };
  }

  const Icon = isOneOnOne ? Users : TYPE_ICON[normalizedType] || Sparkles;
  const CtaIcon = cta.icon;

  return (
    <article className="hire-card hire-interview-card flex flex-col gap-6 h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="size-11 rounded-full bg-primary-blue/10 border border-primary-blue/15 flex items-center justify-center shrink-0">
          <Icon size={19} className="text-primary-blue" />
        </div>
        <span className={cn("text-xs font-medium px-2.5 py-1 rounded border shrink-0", loading ? "bg-gray-50 border-border-gray text-soft-gray" : badge.className)}>
          {loading ? "Checking…" : badge.label}
        </span>
      </div>

      <div className="flex-1 space-y-1.5">
        <p className="text-sm font-semibold text-soft-gray uppercase tracking-wide">{meta}</p>
        <h3 className="text-xl font-medium text-dark-100 leading-snug">{role}</h3>
        <p className="text-sm text-soft-gray leading-relaxed line-clamp-2">
          {feedback
            ? feedback.finalAssessment || "Your interview feedback is ready."
            : isOneOnOne
              ? "This role is filled through a one-on-one interview with our HR team."
              : "Meet your interviewer, check your devices, and begin when you're ready."}
        </p>
      </div>

      {techstack?.length > 0 && (
        <div className="flex items-center gap-2">
          <DisplayTechIcons techStack={techstack} />
          <span className="text-xs text-soft-gray truncate">{techstack.join(" · ")}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border-gray">
        {feedback && <span className="text-xs font-bold text-dark-100">{feedback.totalScore ?? "—"}<span className="text-soft-gray font-medium">/100</span></span>}
        <Link
          href={cta.href}
          className={cn(
            "hire-button inline-flex items-center gap-2",
            !feedback && !isOneOnOne && "ml-auto"
          )}
        >
          <CtaIcon size={14} />
          {cta.label}
        </Link>
      </div>
    </article>
  );
};
export default InterviewCard;
