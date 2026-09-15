"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, UserRound } from "lucide-react";
import s from "@/components/CandidateDashboard.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const [identity, setIdentity] = useState({ name: "", email: "" });
  const [form, setForm] = useState({
    phone: "",
    location: "",
    availability: "",
  });
  const [message, setMessage] = useState("");
  useEffect(() => {
    const email = (localStorage.getItem("candidate_email") || "")
      .trim()
      .toLowerCase();
    setIdentity({ name: localStorage.getItem("candidate_name") || "", email });
    try {
      const saved = JSON.parse(
        localStorage.getItem(`chirayu_profile:${email}`) || "{}",
      );
      setForm({
        phone: typeof saved.phone === "string" ? saved.phone : "",
        location: typeof saved.location === "string" ? saved.location : "",
        availability:
          typeof saved.availability === "string" ? saved.availability : "",
      });
    } catch {
      /* Empty preferences remain editable. */
    }
  }, []);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const clean = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value.trim()]),
      );
      localStorage.setItem(
        `chirayu_profile:${identity.email}`,
        JSON.stringify(clean),
      );
      setForm(clean as typeof form);
      setMessage("Preferences saved in this browser.");
    } catch {
      setMessage(
        "Your browser couldn’t save these preferences. Please check its storage settings.",
      );
    }
  };
  const logout = () => {
    ["candidate_email", "candidate_name", "password_id"].forEach((k) =>
      localStorage.removeItem(k),
    );
    router.replace("/login");
  };
  return (
    <div className={s.dashboard} style={{ maxWidth: 1000 }}>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>YOUR DETAILS</p>
          <h1>
            Your profile<span>.</span>
          </h1>
          <p>
            Review your invitation identity and keep your preferences ready.
          </p>
        </div>
      </div>
      <div className={s.columns}>
        <section className={s.panel}>
          <div className={s.panelHeader}>
            <h2>Contact & preferences</h2>
            <UserRound size={20} />
          </div>
          <form onSubmit={save} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                { label: "Full name", value: identity.name },
                { label: "Invitation email", value: identity.email },
              ].map((field) => (
                <div key={field.label}>
                  <span className="block text-xs text-slate-500 mb-2">
                    {field.label}
                  </span>
                  <p className="text-sm font-medium break-all">
                    {field.value || "Not provided"}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your recruitment team manages invitation details. The preferences
              below are stored only in this browser and are not sent to HR.
            </p>
            {(
              [
                {
                  key: "phone",
                  label: "Phone number",
                  placeholder: "Include your country code",
                },
                {
                  key: "location",
                  label: "Preferred work location",
                  placeholder: "City or location preference",
                },
                {
                  key: "availability",
                  label: "Interview availability",
                  placeholder: "Days, time window and timezone",
                },
              ] as const
            ).map((field) => (
              <label
                className="block text-xs font-medium text-slate-700"
                key={field.key}
              >
                {field.label}
                <input
                  type={field.key === "phone" ? "tel" : "text"}
                  maxLength={field.key === "availability" ? 300 : 100}
                  value={form[field.key]}
                  onChange={(e) => {
                    setForm({ ...form, [field.key]: e.target.value });
                    setMessage("");
                  }}
                  placeholder={field.placeholder}
                  className="block mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
              </label>
            ))}
            <button className={s.primary} type="submit">
              Save preferences <Check size={16} />
            </button>
            <p role="status" className="text-xs text-slate-600">
              {message}
            </p>
          </form>
        </section>
        <aside className={s.rail}>
          <section className={`${s.panel} ${s.prepare}`}>
            <h2>Your candidate access</h2>
            <p>
              Your invitation connects you to both AI and one-on-one interviews.
              Use the dashboard to find your next conversation and saved
              assessments.
            </p>
            <button className={s.secondary} onClick={logout}>
              <LogOut size={15} /> Sign out
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
