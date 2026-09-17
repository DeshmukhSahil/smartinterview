"use client";
import { useState } from "react";
import { Search, X } from "lucide-react";
import {
  CandidateInvitation,
  CandidateReport,
  interviewState,
} from "@/lib/candidate-journey";
import CandidateInterviewRow from "./CandidateInterviewRow";
import s from "./CandidateJourney.module.css";
const filters = [
  { value: "all", label: "All interviews" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
] as const;
export default function FilterableInterviewList({
  interviews,
  reports,
  now,
}: {
  interviews: CandidateInvitation[];
  reports: CandidateReport[];
  now: number;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const items = interviews.map((interview) => ({
    interview,
    hasReport: reports.some((r) => r.interview_id === interview.id),
    state: interviewState(
      interview,
      reports.some((r) => r.interview_id === interview.id),
      now,
    ),
  }));
  const query = search.trim().toLowerCase();
  const visible = items.filter(
    (i) =>
      (filter === "all" || i.state.group === filter) &&
      (!query ||
        i.interview.role.toLowerCase().includes(query) ||
        (i.interview.techstack || []).some((t) =>
          t.toLowerCase().includes(query),
        )),
  );
  return (
    <section aria-label="Interview invitations">
      <div className={s.listToolbar}>
        <div
          className={s.filters}
          role="group"
          aria-label="Filter interviews by status"
        >
          {filters
            .filter(
              (f) =>
                f.value !== "closed" ||
                items.some((i) => i.state.group === "closed"),
            )
            .map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
                <span>
                  {f.value === "all"
                    ? items.length
                    : items.filter((i) => i.state.group === f.value).length}
                </span>
              </button>
            ))}
        </div>
        {interviews.length > 5 && (
          <div className={s.search}>
            <Search size={18} />
            <input
              type="search"
              aria-label="Search interviews"
              placeholder="Search role or skill"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>
      <p className={s.resultCount} role="status" aria-live="polite">
        {visible.length}{" "}
        {visible.length === 1 ? "conversation" : "conversations"}
        {filter !== "all"
          ? ` · ${filters.find((f) => f.value === filter)?.label}`
          : ""}
      </p>
      <div className={s.interviewList}>
        {visible.length ? (
          visible.map((i) => (
            <CandidateInterviewRow
              key={i.interview.id}
              interview={i.interview}
              hasReport={i.hasReport}
              now={now}
            />
          ))
        ) : (
          <div className={s.emptyState}>
            <h2>
              {query
                ? "No conversations match that search."
                : filter === "completed"
                  ? "Your story is still unfolding."
                  : "Nothing here just yet."}
            </h2>
            <p>
              {filter === "completed" && !query
                ? "After you finish an interview, you’ll find it here."
                : "Try another status or clear your search to see your invitations."}
            </p>
            <button
              type="button"
              className="hire-button"
              data-variant="secondary"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              Show all interviews
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
