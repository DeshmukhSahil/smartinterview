import { ArrowUpRight } from "lucide-react";
import s from "./CandidateJourney.module.css";
export default function CandidatePageFooter() {
  return (
    <footer className={s.footer}>
      <span>Chirayu Hire</span>
      <p>Good people. Meaningful work.</p>
      <a
        href="https://chirayupower.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        Chirayu Power <ArrowUpRight size={14} />
      </a>
    </footer>
  );
}
