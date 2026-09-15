import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type CardFeedback = {
  id: string;
  totalScore: number;
  finalAssessment: string;
  createdAt: string;
};
type Job = {
  id: string;
  userId: string;
  resolve: (value: CardFeedback | null) => void;
};
let queued: Job[] = [];
let scheduled = false;
const inFlight = new Map<string, Promise<CardFeedback | null>>();

// React mounts a list's cards together. Batch their feedback into one read per user,
// avoiding a serialized server-action round trip (and full report) for every card.
async function flush() {
  const jobs = queued;
  queued = [];
  scheduled = false;
  const users = [...new Set(jobs.map((j) => j.userId))];
  await Promise.all(
    users.map(async (userId) => {
      const group = jobs.filter((j) => j.userId === userId);
      try {
        const { data, error } = await supabase
          .from("feedback")
          .select(
            "id,interview_id,created_at,totalScore:analysis->totalScore,finalAssessment:analysis->>finalAssessment",
          )
          .eq("user_id", userId)
          .in("interview_id", [...new Set(group.map((j) => j.id))])
          .order("created_at", { ascending: false })
          .abortSignal(AbortSignal.timeout(8000));
        if (error) throw error;
        for (const job of group) {
          const row = data?.find((r) => r.interview_id === job.id);
          job.resolve(
            row
              ? {
                  id: row.id,
                  totalScore: Number(row.totalScore || 0),
                  finalAssessment: row.finalAssessment || "",
                  createdAt: row.created_at,
                }
              : null,
          );
        }
      } catch {
        group.forEach((j) => j.resolve(null));
      }
    }),
  );
}
export function getCardFeedback(
  id: string,
  userId: string,
): Promise<CardFeedback | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  const key = `${userId}:${id}`;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = new Promise<CardFeedback | null>((resolve) => {
    queued.push({ id, userId, resolve });
  }).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  if (!scheduled) {
    scheduled = true;
    queueMicrotask(() => {
      void flush();
    });
  }
  return promise;
}
