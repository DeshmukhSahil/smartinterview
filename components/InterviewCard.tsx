"use client";

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";

import { Button } from "./ui/button";
import DisplayTechIcons from "./DisplayTechIcons";

import { cn } from "@/lib/utils";
import { getFeedbackByInterviewId } from "@/lib/actions/general.action";

const InterviewCard = ({
  interviewId,
  userId = "candidate-user",
  role,
  type,
  techstack,
  createdAt,
}: InterviewCardProps) => {
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      const resolvedUserId = userId || "candidate-user";
      if (!interviewId) {
        setLoading(false);
        return;
      }
      try {
        const data = await getFeedbackByInterviewId({
          interviewId,
          userId: resolvedUserId,
        });
        setFeedback(data);
      } catch (err) {
        console.error("Error fetching feedback for interview:", interviewId, err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [interviewId, userId]);

  const normalizedType = /mix/gi.test(type) ? "Mixed" : type;

  const badgeColor = {
    Behavioral: "bg-green-50 text-success-green border border-success-green/20",
    Mixed: "bg-amber-50 text-amber-600 border border-amber-200",
    Technical: "bg-blue-50 text-primary-blue border border-primary-blue/20",
  }[normalizedType] || "bg-gray-50 text-soft-gray border border-gray-200";

  const formattedDate = dayjs(
    feedback?.createdAt || createdAt || Date.now()
  ).format("MMM D, YYYY");

  return (
    <div className="w-[360px] max-sm:w-full min-h-[360px] rounded-2xl bg-white shadow-sm hover:shadow-md border border-border-gray hover:scale-[1.01] transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
      
      {/* Subtle border line accent on top */}
      <div className="h-1.5 w-full bg-primary-blue/10 absolute top-0 left-0" />

      <div className="p-6 flex flex-col justify-between h-full gap-5 relative pt-8">
        
        {/* Type Badge */}
        <div
          className={cn(
            "absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs",
            badgeColor
          )}
        >
          {normalizedType}
        </div>

        {/* Cover Icon - Rebranding to Solar EPC Symbol */}
        <div className="flex justify-center mt-2">
          <div className="size-16 rounded-full bg-primary-blue/5 border border-primary-blue/10 flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-primary-blue"
            >
              {/* Solar Panel grid cell icon */}
              <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M4 10H20M4 15H20M10 4V20M15 4V20" stroke="currentColor" strokeWidth="1" />
              <circle cx="12" cy="12" r="2" fill="#F4B400" />
            </svg>
          </div>
        </div>

        {/* Role Title */}
        <h3 className="text-center mt-1 text-lg font-bold capitalize text-dark-100">
          {role} Interview
        </h3>

        {/* Date & Score */}
        <div className="flex flex-row justify-center gap-6 text-xs text-soft-gray font-medium">
          <div className="flex items-center gap-1.5">
            <Image src="/calendar.svg" width={16} height={16} alt="calendar" className="opacity-70" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Image src="/star.svg" width={16} height={16} alt="star" className="opacity-70" />
            <span>Score: {loading ? "..." : (feedback?.totalScore || "---")}/100</span>
          </div>
        </div>

        {/* Assessment Summary */}
        <p className="text-center text-soft-gray text-xs leading-relaxed italic px-2 line-clamp-3">
          {loading ? "Loading assessment details..." : (feedback?.finalAssessment ||
            "Mock session pending. Initiate this assessment module to evaluate and analyze candidate knowledge.")}
        </p>

        {/* Tech Stack Footer & CTA Button */}
        <div className="flex justify-between items-center mt-2 pt-4 border-t border-border-gray">
          <div className="max-w-[60%] overflow-hidden">
            <DisplayTechIcons techStack={techstack} />
          </div>
          {loading ? (
            <Button disabled className="btn-primary !h-9 !px-4 !text-xs">
              Loading...
            </Button>
          ) : (
            <Button asChild className="btn-primary !h-9 !px-4 !text-xs">
              <Link
                href={
                  feedback
                    ? `/interview/${interviewId}/feedback`
                    : `/interview/${interviewId}`
                }
              >
                {feedback ? "Check Feedback" : "Start Mock"}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewCard;
