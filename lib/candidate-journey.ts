export type CandidateInvitation = {
  id: string;
  role: string;
  mode: string;
  type?: string;
  techstack?: string[];
  interview_status: string | null;
  scheduled_at: string | null;
  created_at: string;
};

export type CandidateReport = {
  id: string;
  interview_id: string;
  created_at: string;
  analysis: {
    totalScore?: number;
    strengths?: string[];
    areasForImprovement?: string[];
    finalAssessment?: string;
    categoryScores?: { name: string; score: number; comment?: string }[];
  };
};

export function interviewState(
  invitation: CandidateInvitation,
  hasReport: boolean,
  now: number,
) {
  const status = invitation.interview_status;
  if (status === "cancelled")
    return { label: "Cancelled", tone: "muted", group: "closed" } as const;
  if (status === "no_show")
    return { label: "Not attended", tone: "muted", group: "closed" } as const;
  if (status === "completed" || hasReport)
    return { label: "Completed", tone: "success", group: "completed" } as const;
  const scheduled = invitation.scheduled_at
    ? Date.parse(invitation.scheduled_at)
    : NaN;
  if (status === "scheduled" && Number.isFinite(scheduled)) {
    if (now > scheduled + 2 * 60 * 60 * 1000)
      return {
        label: "Awaiting update",
        tone: "waiting",
        group: "upcoming",
      } as const;
    if (now >= scheduled - 10 * 60 * 1000)
      return {
        label: "Starting now",
        tone: "ready",
        group: "upcoming",
      } as const;
    return { label: "Scheduled", tone: "ready", group: "upcoming" } as const;
  }
  if (invitation.mode === "one_on_one")
    return {
      label: "Awaiting schedule",
      tone: "waiting",
      group: "upcoming",
    } as const;
  return {
    label: "Ready when you are",
    tone: "ready",
    group: "upcoming",
  } as const;
}

export function interviewDate(value: string | null, withTime = true) {
  if (!value || !Number.isFinite(Date.parse(value)))
    return "Time to be confirmed";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime
      ? ({ hour: "numeric", minute: "2-digit", timeZoneName: "short" } as const)
      : {}),
  }).format(new Date(value));
}

export function nextInvitation(
  invitations: CandidateInvitation[],
  reports: CandidateReport[],
  now: number,
) {
  const upcoming = invitations.filter(
    (i) =>
      interviewState(
        i,
        reports.some((r) => r.interview_id === i.id),
        now,
      ).group === "upcoming",
  );
  const scheduled = upcoming
    .filter(
      (i) =>
        i.interview_status === "scheduled" &&
        i.scheduled_at &&
        Date.parse(i.scheduled_at) + 2 * 60 * 60 * 1000 >= now,
    )
    .sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!));
  return (
    scheduled[0] ||
    upcoming.find(
      (i) => i.mode !== "one_on_one" && i.interview_status !== "scheduled",
    ) ||
    upcoming[0]
  );
}
