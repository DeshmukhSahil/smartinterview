"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dayjs from "dayjs";
import { Loader2, Users, ArrowRight } from "lucide-react";
import { useHrSession } from "@/hooks/use-hr-session";
import { hrFetch } from "@/lib/hrApi";

export default function HrApplicationsPage() {
  const router = useRouter();
  const { session, loading, accessToken } = useHrSession();
  const [items, setItems] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) router.replace("/hr/login");
  }, [loading, session, router]);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const json = await hrFetch(accessToken, "/api/hiring/admin");
        const campaignsById = new Map<string, any>((json.campaigns || []).map((c: any) => [c.id, c]));
        const filtered = (json.applications || [])
          .filter((a: any) => campaignsById.get(a.campaign_id)?.interview_mode === "one_on_one" && a.interview_id)
          .map((a: any) => ({ ...a, campaign: campaignsById.get(a.campaign_id) }));
        setItems(filtered);
      } catch (e: any) {
        setError(e.message || "Failed to load applications");
      } finally {
        setFetching(false);
      }
    })();
  }, [accessToken]);

  if (loading || (session && fetching)) {
    return (
      <div className="flex justify-center py-40">
        <Loader2 className="animate-spin text-primary-blue size-8" />
      </div>
    );
  }
  if (!session) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <Users className="text-primary-blue" />
        <h1 className="text-xl font-bold text-dark-100">One-on-one interviews</h1>
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {items.length === 0 && !error ? (
        <p className="text-sm text-soft-gray">No one-on-one applications yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Link
              key={a.id}
              href={`/hr/interview/${a.interview_id}/schedule`}
              className="flex items-center justify-between bg-white border border-border-gray rounded-xl p-4 hover:border-primary-blue transition-colors"
            >
              <div>
                <p className="font-semibold text-dark-100 text-sm">{a.candidate?.name}</p>
                <p className="text-xs text-soft-gray">{a.campaign?.role} · {a.candidate?.email}</p>
                <p className="text-[10px] text-soft-gray mt-1">Submitted {dayjs(a.submitted_at).format("MMM D, YYYY")}</p>
              </div>
              <ArrowRight size={16} className="text-soft-gray shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
