interface Feedback {
  id: string;
  interviewId: string;
  totalScore: number;
  categoryScores: Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  createdAt: string;
}

interface Interview {
  id: string;
  role: string;
  level: string;
  questions: string[];
  techstack: string[];
  createdAt: string;
  userId: string;
  type: string;
  finalized: boolean;
  job_description?: string;
  company_knowledge?: string;
  ai_model?: string;
  resume?: string;
  system_prompt?: string;
  mode?: "ai_assisted" | "one_on_one";
  interview_status?: "pending_schedule" | "scheduled" | "completed" | "no_show" | "cancelled";
  scheduled_at?: string | null;
  scheduled_by?: string | null;
  teams_join_url?: string | null;
  teams_meeting_id?: string | null;
  teams_event_id?: string | null;
  live_transcript?: { role: "hr" | "candidate" | "unknown"; content: string }[];
  ai_notes?: InterviewNotesShape | null;
  hr_notes?: InterviewNotesShape | null;
  notes_submitted_at?: string | null;
  notes_submitted_by?: string | null;
  notes_email_sent_at?: string | null;
}

interface InterviewNotesShape {
  summary: string;
  keyPoints: string[];
  strengths: string[];
  concerns: string[];
  followUps: string[];
  recommendation: "strong_yes" | "yes" | "needs_review" | "no";
}

interface CreateFeedbackParams {
  interviewId: string;
  userId: string;
  transcript: { role: string; content: string }[];
  feedbackId?: string;
}

interface User {
  name: string;
  email: string;
  id: string;
}

interface InterviewCardProps {
  interviewId?: string;
  userId?: string;
  role: string;
  type: string;
  techstack: string[];
  createdAt?: string;
  mode?: "ai_assisted" | "one_on_one";
  interviewStatus?: "pending_schedule" | "scheduled" | "completed" | "no_show" | "cancelled";
  scheduledAt?: string | null;
}

interface AgentProps {
  userName: string;
  userId?: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "interview";
  questions?: string[];
}

interface RouteParams {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
}

interface GetFeedbackByInterviewIdParams {
  interviewId: string;
  userId: string;
}

interface GetLatestInterviewsParams {
  userId: string;
  limit?: number;
}

interface SignInParams {
  email: string;
  idToken: string;
}

interface SignUpParams {
  uid: string;
  name: string;
  email: string;
  password: string;
}

type FormType = "sign-in" | "sign-up";

interface InterviewFormProps {
  interviewId: string;
  role: string;
  level: string;
  type: string;
  techstack: string[];
  amount: number;
}

interface TechIconProps {
  techStack: string[];
}
