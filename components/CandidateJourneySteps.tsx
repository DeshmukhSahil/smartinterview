import s from "./CandidateAssessment.module.css";

const stages = [
  "invitation",
  "preparation",
  "interview",
  "assessment",
  "feedback",
  "next step",
] as const;

export default function CandidateJourneySteps({
  current,
}: {
  current: (typeof stages)[number];
}) {
  const active = stages.indexOf(current);
  return (
    <ol className={s.journey} aria-label="Interview journey">
      {stages.map((stage, index) => (
        <li
          key={stage}
          aria-current={stage === current ? "step" : undefined}
          data-past={index < active || undefined}
        >
          <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <span>{stage}</span>
        </li>
      ))}
    </ol>
  );
}
