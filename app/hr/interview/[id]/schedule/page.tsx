"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Calendar, ArrowRight } from "lucide-react";
import { useHrSession } from "@/hooks/use-hr-session";
import { hrFetch } from "@/lib/hrApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function HrScheduleInterviewPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { session, loading, accessToken } = useHrSession();

  const [interview, setInterview] = useState<any | null>(null);
  const [fetching, setFetching] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(45);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !session) router.replace("/hr/login");
  }, [loading, session, router]);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const json = await hrFetch(accessToken, `/api/hiring/interview/${id}`);
        setInterview(json.interview);
      } catch (e: any) {
        toast.error(e.message || "Failed to load interview");
      } finally {
        setFetching(false);
      }
    })();
  }, [accessToken, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !scheduledAt) return;
    setSubmitting(true);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await hrFetch(accessToken, "/api/hiring/schedule", {
        method: "POST",
        body: JSON.stringify({
          interview_id: id,
          scheduled_at: new Date(scheduledAt).toISOString(),
          duration_minutes: duration,
          time_zone: timeZone,
        }),
      });
      toast.success("Interview scheduled and Teams meeting created.");
      router.push(`/hr/interview/${id}/conduct`);
    } catch (e: any) {
      toast.error(e.message || "Failed to schedule interview");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (session && fetching)) {
    return (
      <div className="flex justify-center py-40">
        <Loader2 className="animate-spin text-primary-blue size-8" />
      </div>
    );
  }
  if (!session || !interview) return null;

  const alreadyScheduled = interview.interview_status !== "pending_schedule";

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="text-primary-blue" />
        <div>
          <h1 className="text-xl font-bold text-dark-100">Schedule interview</h1>
          <p className="text-xs text-soft-gray">{interview.role} · {interview.candidate_name}</p>
        </div>
      </div>

      {alreadyScheduled ? (
        <div className="bg-white border border-border-gray rounded-2xl p-6 space-y-4">
          <p className="text-sm text-dark-100">
            This interview is already <span className="font-semibold">{interview.interview_status.replace(/_/g, " ")}</span>.
          </p>
          <Link href={`/hr/interview/${id}/conduct`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-blue">
            Go to conduct page <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-border-gray rounded-2xl p-6 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-dark-100">Date & time</Label>
            <Input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-dark-100">Duration (minutes)</Label>
            <Input
              type="number"
              min={15}
              max={180}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Creating Teams meeting..." : "Schedule & create Teams meeting"}
          </Button>
        </form>
      )}
    </div>
  );
}
