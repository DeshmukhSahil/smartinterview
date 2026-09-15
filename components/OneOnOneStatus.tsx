"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Calendar, Clock, ExternalLink, CheckCircle2, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

// Renders the candidate-facing side of a one-on-one (HR-conducted, Teams-based)
// interview: scheduling status and a join link. There is no AI Agent for this mode —
// the actual interview happens in Teams; this page just gets the candidate there.
const OneOnOneStatus = ({ interview }: { interview: any }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const status: string = interview.interview_status || "pending_schedule";
  const scheduledAt: string | null = interview.scheduled_at || null;
  const joinUrl: string | null = interview.teams_join_url || null;

  const scheduledMs = scheduledAt ? new Date(scheduledAt).getTime() : null;
  // Join link opens 10 minutes early and stays available for 2 hours after start.
  const joinWindowOpen = scheduledMs !== null && now >= scheduledMs - 10 * 60000 && now <= scheduledMs + 2 * 3600000;

  return (
    <div className="max-w-xl mx-auto bg-white border border-border-gray rounded-2xl shadow-sm p-8 flex flex-col items-center text-center gap-5">
      {status === "completed" ? (
        <>
          <div className="size-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
            <CheckCircle2 className="size-8 text-success-green" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-dark-100">Interview complete</h2>
            <p className="text-sm text-soft-gray mt-1">
              Thanks for taking the time to speak with our HR team. A summary of your interview has been emailed to you.
            </p>
          </div>
        </>
      ) : status === "scheduled" && scheduledMs !== null ? (
        <>
          <div className="size-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
            <Calendar className="size-8 text-primary-blue" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-dark-100">Your interview is scheduled</h2>
            <p className="text-sm text-soft-gray mt-1 flex items-center justify-center gap-1.5">
              <Clock size={14} />
              {dayjs(scheduledAt).format("dddd, MMM D, YYYY [at] h:mm A")}
            </p>
          </div>
          {joinWindowOpen && joinUrl ? (
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-success-green hover:bg-success-green/90 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-xs"
            >
              Join Interview
              <ExternalLink size={15} />
            </a>
          ) : (
            <div className="flex items-center gap-2 bg-gray-50 border border-border-gray text-soft-gray text-xs font-semibold px-4 py-2.5 rounded-xl">
              <Hourglass size={14} />
              The join link will appear here 10 minutes before your interview
            </div>
          )}
        </>
      ) : (
        <>
          <div className="size-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <Hourglass className="size-8 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-dark-100">Interview not yet scheduled</h2>
            <p className="text-sm text-soft-gray mt-1">
              This role is filled through a one-on-one interview with our HR team. Once a time is confirmed, it will appear here and you&apos;ll get an email.
            </p>
          </div>
        </>
      )}
      <div
        className={cn(
          "text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border mt-2",
          status === "completed" ? "bg-green-50 border-green-200 text-success-green"
            : status === "scheduled" ? "bg-blue-50 border-blue-200 text-primary-blue"
            : "bg-amber-50 border-amber-200 text-amber-600"
        )}
      >
        {status.replace(/_/g, " ")}
      </div>
    </div>
  );
};

export default OneOnOneStatus;
