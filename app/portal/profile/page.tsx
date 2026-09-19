"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Info, Mail, ShieldCheck } from "lucide-react";
import CandidatePageFooter from "@/components/CandidatePageFooter";
import s from "@/components/CandidateJourney.module.css";

const empty = { phone: "", location: "", availability: "" };
export default function ProfilePage() {
  const [identity, setIdentity] = useState({ name: "", email: "" });
  const [form, setForm] = useState(empty);
  const [saved, setSaved] = useState(empty);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  useEffect(() => {
    try {
      const email = (localStorage.getItem("candidate_email") || "")
        .trim()
        .toLowerCase();
      setIdentity({
        name: localStorage.getItem("candidate_name") || "",
        email,
      });
      const stored =
        JSON.parse(localStorage.getItem(`chirayu_profile:${email}`) || "{}") ||
        {};
      const preferences = {
        phone: typeof stored.phone === "string" ? stored.phone : "",
        location: typeof stored.location === "string" ? stored.location : "",
        availability:
          typeof stored.availability === "string" ? stored.availability : "",
      };
      setForm(preferences);
      setSaved(preferences);
    } catch {
      setMessage(
        "Saved notes couldn’t be read. You can enter them again below.",
      );
      setSaveError(true);
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const update = (key: keyof typeof empty, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setMessage("");
    setSaveError(false);
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!identity.email) return;
    try {
      const clean = {
        phone: form.phone.trim(),
        location: form.location.trim(),
        availability: form.availability.trim(),
      };
      localStorage.setItem(
        `chirayu_profile:${identity.email}`,
        JSON.stringify(clean),
      );
      setForm(clean);
      setSaved(clean);
      setSaveError(false);
      setMessage("Your notes are saved in this browser.");
    } catch {
      setSaveError(true);
      setMessage(
        "We couldn’t save your notes. Your entries are still here. Check your browser storage settings and try again.",
      );
    }
  };
  return (
    <div className={`${s.page} hire-page-enter`}>
      <header className={s.pageHeading}>
        <p className="hire-eyebrow">A little about you</p>
        <h1>Your profile.</h1>
        <p>
          Your invitation details and a place to keep your preferences handy.
        </p>
      </header>
      <div className={s.profileGrid}>
        <div className={s.mainColumn}>
          <section className={s.identity} aria-labelledby="identity-title">
            <div className={s.identityHeader}>
              <span className={s.largeAvatar} aria-hidden="true">
                {identity.name
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("") || "—"}
              </span>
              <div>
                <p className="hire-eyebrow">Your invitation</p>
                <h2 id="identity-title">
                  {identity.name || "Your candidate details"}
                </h2>
              </div>
              <ShieldCheck
                size={23}
                aria-label="Invitation details managed by your recruitment team"
              />
            </div>
            <dl className={s.identityDetails}>
              <div>
                <dt>Full name</dt>
                <dd>{identity.name || "Not provided"}</dd>
              </div>
              <div>
                <dt>Invitation email</dt>
                <dd>{identity.email || "Not provided"}</dd>
              </div>
            </dl>
            <p className={s.identityFootnote}>
              <Mail size={16} />
              These details come from your invitation. Contact your recruiter if
              something needs correcting.
            </p>
          </section>
          <section
            className={s.preferences}
            aria-labelledby="preferences-title"
          >
            <div className={s.sectionTop}>
              <h2 id="preferences-title">Your personal notes</h2>
              <span className={s.optional}>Optional</span>
            </div>
            <p>Keep a few details ready for your next conversation.</p>
            <div className={s.storageNotice}>
              <Info size={18} />
              <p>
                Saved on this browser only. These notes aren’t sent to your
                recruiter and won’t change your interview schedule.
              </p>
            </div>
            <form onSubmit={save}>
              <div className={s.formColumns}>
                <label htmlFor="candidate-phone">
                  Phone number
                  <input
                    id="candidate-phone"
                    type="tel"
                    autoComplete="tel"
                    maxLength={100}
                    placeholder="+91"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    disabled={!ready}
                  />
                </label>
                <label htmlFor="candidate-location">
                  Preferred work location
                  <input
                    id="candidate-location"
                    autoComplete="address-level2"
                    maxLength={100}
                    placeholder="City or region"
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    disabled={!ready}
                  />
                </label>
              </div>
              <label htmlFor="candidate-availability">
                Interview availability
                <textarea
                  id="candidate-availability"
                  rows={3}
                  maxLength={300}
                  placeholder="e.g. Weekdays, 10 AM–1 PM IST"
                  value={form.availability}
                  onChange={(e) => update("availability", e.target.value)}
                  aria-describedby="availability-hint"
                  disabled={!ready}
                />
              </label>
              <p id="availability-hint" className={s.fieldHint}>
                Include your timezone. Share this with your recruiter when
                arranging a time.
              </p>
              <div className={s.saveBar}>
                <button
                  className="hire-button"
                  type="submit"
                  disabled={!ready || !identity.email || !dirty}
                >
                  Save notes <Check size={17} />
                </button>
                {dirty && (
                  <button
                    className={s.textLink}
                    type="button"
                    onClick={() => {
                      setForm(saved);
                      setMessage("");
                      setSaveError(false);
                    }}
                  >
                    Discard changes
                  </button>
                )}
                <span>
                  {!ready
                    ? "Loading your notes…"
                    : dirty
                      ? "You have unsaved changes"
                      : "Up to date on this browser"}
                </span>
              </div>
              {message && (
                <p
                  role={saveError ? "alert" : "status"}
                  className={s.saveMessage}
                  data-error={saveError}
                >
                  {!saveError && <Check size={17} />} {message}
                </p>
              )}
            </form>
          </section>
        </div>
        <aside className={s.aside}>
          <section className={s.profileNote}>
            <p className="hire-eyebrow">Your details, explained</p>
            <h2>
              Clarity at
              <br />
              <em>every step.</em>
            </h2>
            <p>
              Your invitation connects you to your interviews. Your personal
              notes are simply here to help you prepare.
            </p>
            <div>
              <h3>Need to change a time?</h3>
              <p>
                Contact the recruiter in your invitation email. Updating these
                notes doesn’t notify the team.
              </p>
            </div>
            <div>
              <h3>Using another device?</h3>
              <p>
                Your interviews will be available after signing in. These notes
                stay in this browser.
              </p>
            </div>
          </section>
          <Link href="/portal/allinterviews" className={s.asideAction}>
            Back to your interviews <ArrowRight size={17} />
          </Link>
        </aside>
      </div>
      <CandidatePageFooter />
    </div>
  );
}
