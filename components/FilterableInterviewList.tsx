"use client";

import { useState } from "react";
import InterviewCard from "./InterviewCard";

interface Interview {
  id: string;
  role: string;
  type: string;
  techstack: string[];
  createdAt: string;
}

interface Props {
  interviews: Interview[];
}

export default function FilterableInterviewList({ interviews }: Props) {
  const [typeFilter, setTypeFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [techFilter, setTechFilter] = useState("All");

  const unique = (key: keyof Interview) =>
    ["All", ...new Set(interviews.map((i) => i[key]).flat())];

  const filtered = interviews.filter((i) => {
    return (
      (typeFilter === "All" || i.type === typeFilter) &&
      (roleFilter === "All" || i.role === roleFilter) &&
      (techFilter === "All" || i.techstack.includes(techFilter))
    );
  });

  return (
    <div className="space-y-8">
      {/* Search & Filter Options Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-border-gray shadow-sm">
        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-soft-gray pl-1">Interview Type</span>
          <select
            onChange={(e) => setTypeFilter(e.target.value)}
            value={typeFilter}
            className="p-2.5 bg-white border border-border-gray text-dark-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue shadow-xs font-semibold cursor-pointer hover:bg-gray-50 transition-all"
          >
            {unique("type").map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-soft-gray pl-1">Role Title</span>
          <select
            onChange={(e) => setRoleFilter(e.target.value)}
            value={roleFilter}
            className="p-2.5 bg-white border border-border-gray text-dark-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue shadow-xs font-semibold cursor-pointer hover:bg-gray-50 transition-all"
          >
            {unique("role").map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-soft-gray pl-1">Tech Stack</span>
          <select
            onChange={(e) => setTechFilter(e.target.value)}
            value={techFilter}
            className="p-2.5 bg-white border border-border-gray text-dark-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue shadow-xs font-semibold cursor-pointer hover:bg-gray-50 transition-all"
          >
            {["All", ...new Set(interviews.flatMap((i) => i.techstack))].map((tech) => (
              <option key={tech}>{tech}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Results */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((interview) => (
            <InterviewCard
              key={interview.id}
              interviewId={interview.id}
              role={interview.role}
              type={interview.type}
              techstack={interview.techstack}
              createdAt={interview.createdAt}
            />
          ))}
        </div>
      ) : (
        <div className="text-center bg-white border border-border-gray p-12 rounded-2xl text-soft-gray shadow-sm font-semibold">
          No mock interviews match the selected search filters.
        </div>
      )}
    </div>
  );
}
