"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import type { Campaign } from "@/lib/hiring/schema";
import Navbar from "@/components/Navbar";
import "./hiring.css";
import { solarFonts } from "./SolarIntro";
import "./solar-grid.css";
import BlockPlayground from "./BlockPlayground";
import "./block-playground.css";
import "./apply-minimal.css";

type PublicCampaign = Pick<Campaign, "role" | "locations" | "description" | "min_years" | "max_years" | "fields"> & { id: string };
type Assessment = { fit: string; reason: string; evidence: string[]; gaps: string[] };

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onBlur?: () => void;
  id?: string;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  disabled = false,
  onBlur,
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter(opt => opt.toLowerCase().includes(q));
  }, [options, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (open) {
          setOpen(false);
          onBlur?.();
        }
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, onBlur]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setHighlightedIndex(0);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [open]);

  const handleSelect = (option: string) => {
    onChange(option);
    setOpen(false);
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      onBlur?.();
    }
  };

  return (
    <div
      className={`searchable-select ${open ? "is-open" : ""}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
      onClick={e => e.stopPropagation()}
    >
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`searchable-select-trigger ${!value ? "is-placeholder" : ""} ${open ? "is-open" : ""} ${className}`}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(prev => !prev);
        }}
      >
        <span>{value || placeholder}</span>
        <span className={`searchable-select-arrow ${open ? "open" : ""}`}>▼</span>
      </button>

      <div
        className={`searchable-select-dropdown ${open ? "is-open" : ""}`}
        role="listbox"
        aria-hidden={!open}
      >
        <div className="searchable-select-search-wrap" onClick={e => e.stopPropagation()}>
          <input
            ref={searchInputRef}
            type="text"
            className="searchable-select-search-input"
            placeholder={`Search in ${options.length} options...`}
            value={search}
            tabIndex={open ? 0 : -1}
            onChange={e => {
              setSearch(e.target.value);
              setHighlightedIndex(0);
            }}
            onClick={e => e.stopPropagation()}
          />
          {search && (
            <button
              type="button"
              className="searchable-select-clear-btn"
              aria-label="Clear search"
              tabIndex={open ? 0 : -1}
              onClick={e => {
                e.stopPropagation();
                setSearch("");
                searchInputRef.current?.focus();
              }}
            >
              ✕
            </button>
          )}
        </div>

        <ul className="searchable-select-options">
          {filteredOptions.length === 0 ? (
            <li className="searchable-select-no-results">No matches found for &ldquo;{search}&rdquo;</li>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = opt === value;
              const isHighlighted = idx === highlightedIndex;
              return (
                <li
                  key={opt}
                  role="option"
                  aria-selected={isSelected}
                  className={`searchable-select-option ${isSelected ? "selected" : ""} ${isHighlighted ? "highlighted" : ""}`}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(opt);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <span>{opt}</span>
                  {isSelected && <span style={{ color: "#07549b", fontWeight: "bold" }}>✓</span>}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

export default function HiringApplication() {
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [candidate, setCandidate] = useState({ name: "", email: "", phone: "", location: "", years: "", consent: false });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [token, setToken] = useState("");
  const [receipt, setReceipt] = useState<{ reference: string; email_status: string } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const c = campaigns.find(c => c.id === selected);

  useEffect(() => {
    fetch("/api/hiring", { cache: "no-store" }).then(async r => {
      const body = await r.json(); if (!r.ok) throw new Error(body.error);
      setCampaigns(body.campaigns);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  function invalidate() {
    setToken("");
    setAssessment(null);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  const markTouched = (fieldKey: string) => {
    setTouched(prev => (prev[fieldKey] ? prev : { ...prev, [fieldKey]: true }));
  };

  // Real-time field errors calculation
  const errors = useMemo(() => {
    const errs: Record<string, string> = {};

    // 1. Location
    if (!candidate.location) {
      errs.location = "Please select a preferred location.";
    }

    // 2. Full Name
    const trimmedName = candidate.name.trim();
    if (!trimmedName) {
      errs.name = "Full name is required.";
    } else if (!/^[a-zA-Z\u00C0-\u024F\s.'\-]+$/.test(candidate.name)) {
      errs.name = "Full name should only contain letters, spaces, and hyphens.";
    } else if (trimmedName.length < 2) {
      errs.name = "Full name must be at least 2 characters.";
    } else if (trimmedName.length > 150) {
      errs.name = "Full name cannot exceed 150 characters.";
    }

    // 3. Email
    const trimmedEmail = candidate.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!trimmedEmail) {
      errs.email = "Email address is required.";
    } else if (!emailRegex.test(trimmedEmail)) {
      errs.email = "Please enter a valid email address (e.g. name@domain.com).";
    }

    // 4. Phone Number
    const rawPhone = candidate.phone.trim();
    const phoneDigits = rawPhone.replace(/\D/g, "");
    if (!rawPhone) {
      errs.phone = "Phone number is required.";
    } else if (/[^0-9+\s\-()]/.test(rawPhone)) {
      errs.phone = "Phone number contains invalid characters (numbers, +, -, () only).";
    } else if (phoneDigits.length < 10) {
      errs.phone = `Phone number requires at least 10 digits (currently ${phoneDigits.length}).`;
    } else if (phoneDigits.length > 15) {
      errs.phone = "Phone number cannot exceed 15 digits.";
    }

    // 5. Total Experience
    const totalExpStr = candidate.years;
    if (totalExpStr === "") {
      errs.years = "Total experience is required.";
    } else {
      const expNum = Number(totalExpStr);
      if (isNaN(expNum) || expNum < 0) {
        errs.years = "Total experience cannot be negative.";
      } else if (expNum > 60) {
        errs.years = "Total experience cannot exceed 60 years.";
      }
    }

    // 6. Dynamic role-specific fields
    if (c?.fields) {
      for (const field of c.fields) {
        const val = answers[field.id] !== undefined ? String(answers[field.id]).trim() : "";
        if (field.required && !val) {
          errs[field.id] = `${field.label} is required.`;
          continue;
        }
        if (val) {
          if (field.type === "number") {
            const numVal = Number(val);
            if (isNaN(numVal) || numVal < 0) {
              errs[field.id] = "Must be a valid positive number.";
            } else if (numVal > 60) {
              errs[field.id] = "Value cannot exceed 60.";
            } else if (
              candidate.years !== "" &&
              !isNaN(Number(candidate.years)) &&
              /solar|experience|industry/i.test(field.label) &&
              numVal > Number(candidate.years)
            ) {
              errs[field.id] = `Cannot exceed total experience (${candidate.years} years).`;
            }
          } else if (field.type === "textarea" && field.required && val.length < 10) {
            errs[field.id] = `Please provide more detail (minimum 10 characters, currently ${val.length}).`;
          } else if (field.type === "text" && field.required && val.length < 2) {
            errs[field.id] = "Please enter at least 2 characters.";
          }
        }
      }
    }

    // 7. Consent
    if (!candidate.consent) {
      errs.consent = "You must agree to the screening terms to proceed.";
    }

    return errs;
  }, [candidate, answers, c]);

  const hasFormErrors = Object.keys(errors).length > 0;

  function markAllTouched() {
    const all: Record<string, boolean> = {
      location: true,
      name: true,
      email: true,
      phone: true,
      years: true,
      consent: true,
    };
    if (c?.fields) {
      for (const f of c.fields) {
        all[f.id] = true;
      }
    }
    setTouched(all);
  }

  async function upload(file?: File) {
    if (!file || !c) return;
    markAllTouched();

    if (hasFormErrors) {
      setError("Please fix the highlighted fields in red before uploading your resume.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    setBusy(true);
    setError("");
    setToken("");
    setAssessment(null);
    try {
      const body = new FormData();
      body.append("candidate", JSON.stringify({ ...candidate, years: Number(candidate.years), campaign_id: c.id, answers }));
      body.append("resume", file);
      const r = await fetch("/api/hiring/screen", { method: "POST", body });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setAssessment(data.assessment);
      setToken(data.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Screening failed. Please try again.");
      if (fileInput.current) fileInput.current.value = "";
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    markAllTouched();
    if (hasFormErrors) {
      setError("Please ensure all fields are valid before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/hiring/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setReceipt(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed. You can safely retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className={`hiring-page solar-hiring ${solarFonts}`}>
        
        <BlockPlayground />
        

      {receipt ? (
        <section className="hiring-panel" aria-live="polite">
          <span className="hiring-eyebrow">APPLICATION RECEIVED</span>
          <h2>Thank you, {candidate.name}.</h2>
          <p>
            {receipt.email_status === "sent"
              ? `Your interview login details have been emailed to ${candidate.email}. Please check your inbox and spam folder.`
              : "Your application is saved. Your access email is awaiting delivery; HR can see and retry it. You do not need to apply again."}
          </p>
          <p>Reference: {receipt.reference}</p>
          <p>HR will review your experience. Interview access does not confirm selection.</p>
          <a href="/login">Go to interview login →</a>
        </section>
      ) : (
        <>
          <div className="opportunities-heading" id="opportunities"><div><h1>Open roles</h1></div><span aria-live="polite">{loading ? "LOADING ROLES" : `${campaigns.length} OPEN ${campaigns.length === 1 ? "ROLE" : "ROLES"}`}</span></div>
          <nav className="hiring-steps" aria-label="Application progress">
            <span className={!c ? "current" : ""}>01 · Select role</span>
            <span className={c && !assessment ? "current" : ""}>02 · Your application</span>
            <span className={assessment ? "current" : ""}>03 · Review & submit</span>
          </nav>

          {loading && <p role="status">Loading opportunities…</p>}
          {!loading && !campaigns.length && !error && (
            <section className="hiring-panel">There are no open campaigns right now. Please check back soon.</section>
          )}

          <div className="hiring-role-grid">
            {campaigns.map(role => (
              <button
                type="button"
                disabled={busy}
                aria-pressed={selected === role.id}
                key={role.id}
                onClick={() => {
                  setSelected(role.id);
                  setCandidate(v => ({ ...v, location: role.locations.length === 1 ? role.locations[0] : "" }));
                  setAnswers({});
                  setTouched({});
                  invalidate();
                }}
                className={`hiring-role ${selected === role.id ? "selected" : ""}`}
              >
                <span className="hiring-role-icon">↗</span>
                <h2>{role.role}</h2>
                <p>{role.min_years}{role.max_years !== null ? `–${role.max_years}` : "+"} years experience</p>
                <span className="solar-role-location">{role.locations.length === 1 ? role.locations[0] : `${role.locations.length} locations`} · Solar EPC</span>
                <span className="solar-role-action">{selected === role.id ? "Selected ✓" : "Explore role ↗"}</span>
              </button>
            ))}
          </div>

          {c && (
            <section className="hiring-panel">
              <div className="hiring-panel-title">
                <div>
                  <p className="hiring-eyebrow">YOUR NEXT OPPORTUNITY</p>
                  <h2>{c.role}</h2>
                </div>
                <span className="hiring-tag">Solar & renewable energy</span>
              </div>
              <p className="hiring-description">{c.description}</p>

              <form ref={form} onSubmit={e => { e.preventDefault(); if (token) void submit(); }}>
                <fieldset disabled={busy}>
                  <div className="hiring-fields">
                    {/* Location - Searchable if > 3 options */}
                    <label>
                      Preferred location *
                      {c.locations.length > 3 ? (
                        <SearchableSelect
                          options={c.locations}
                          value={candidate.location}
                          placeholder="Search or select location..."
                          className={touched.location ? (errors.location ? "is-invalid" : "is-valid") : ""}
                          onBlur={() => markTouched("location")}
                          onChange={val => {
                            setCandidate({ ...candidate, location: val });
                            markTouched("location");
                            invalidate();
                          }}
                        />
                      ) : (
                        <select
                          required
                          className={touched.location ? (errors.location ? "is-invalid" : "is-valid") : ""}
                          value={candidate.location}
                          onBlur={() => markTouched("location")}
                          onChange={e => {
                            setCandidate({ ...candidate, location: e.target.value });
                            markTouched("location");
                            invalidate();
                          }}
                        >
                          <option value="">Select a location</option>
                          {c.locations.map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      )}
                      {touched.location && errors.location && (
                        <span className="field-error-msg">{errors.location}</span>
                      )}
                    </label>

                    {/* Full Name */}
                    <label>
                      Full name *
                      <input
                        required
                        type="text"
                        minLength={2}
                        maxLength={150}
                        autoComplete="name"
                        placeholder="e.g. John Doe"
                        className={touched.name ? (errors.name ? "is-invalid" : "is-valid") : ""}
                        value={candidate.name}
                        onBlur={() => markTouched("name")}
                        onChange={e => {
                          setCandidate({ ...candidate, name: e.target.value });
                          markTouched("name");
                          invalidate();
                        }}
                      />
                      {touched.name && errors.name && (
                        <span className="field-error-msg">{errors.name}</span>
                      )}
                    </label>

                    {/* Email */}
                    <label>
                      Email address *
                      <input
                        required
                        type="email"
                        maxLength={254}
                        autoComplete="email"
                        placeholder="e.g. name@example.com"
                        className={touched.email ? (errors.email ? "is-invalid" : "is-valid") : ""}
                        value={candidate.email}
                        onBlur={() => markTouched("email")}
                        onChange={e => {
                          setCandidate({ ...candidate, email: e.target.value });
                          markTouched("email");
                          invalidate();
                        }}
                      />
                      {touched.email && errors.email ? (
                        <span className="field-error-msg">{errors.email}</span>
                      ) : (
                        <span className="field-hint">Your interview access details will be sent here.</span>
                      )}
                    </label>

                    {/* Phone Number - sanitized on input */}
                    <label>
                      Phone number *
                      <input
                        required
                        type="tel"
                        maxLength={25}
                        autoComplete="tel"
                        placeholder="e.g. +91 98765 43210"
                        className={touched.phone ? (errors.phone ? "is-invalid" : "is-valid") : ""}
                        value={candidate.phone}
                        onBlur={() => markTouched("phone")}
                        onChange={e => {
                          // Prevent typing invalid characters like letters
                          const cleaned = e.target.value.replace(/[^0-9+\s\-()]/g, "");
                          setCandidate({ ...candidate, phone: cleaned });
                          markTouched("phone");
                          invalidate();
                        }}
                      />
                      {touched.phone && errors.phone ? (
                        <span className="field-error-msg">{errors.phone}</span>
                      ) : (
                        <span className="field-hint">Include country code if applying from abroad.</span>
                      )}
                    </label>

                    {/* Total Experience */}
                    <label>
                      Total experience (years) *
                      <input
                        required
                        type="number"
                        min="0"
                        max="60"
                        step="0.1"
                        placeholder="e.g. 3.5"
                        className={touched.years ? (errors.years ? "is-invalid" : "is-valid") : ""}
                        value={candidate.years}
                        onBlur={() => markTouched("years")}
                        onChange={e => {
                          setCandidate({ ...candidate, years: e.target.value });
                          markTouched("years");
                          invalidate();
                        }}
                      />
                      {touched.years && errors.years && (
                        <span className="field-error-msg">{errors.years}</span>
                      )}
                    </label>

                    {/* Dynamic Campaign Custom Fields */}
                    {c.fields.map(f => {
                      const isFieldTouched = !!touched[f.id];
                      const fieldError = errors[f.id];
                      const inputClass = isFieldTouched ? (fieldError ? "is-invalid" : "is-valid") : "";

                      return (
                        <label key={f.id}>
                          {f.label}{f.required ? " *" : ""}
                          {f.type === "select" ? (
                            f.options.length > 3 ? (
                              <SearchableSelect
                                options={f.options}
                                value={answers[f.id] || ""}
                                placeholder={`Search or select ${f.label.toLowerCase()}...`}
                                className={inputClass}
                                onBlur={() => markTouched(f.id)}
                                onChange={val => {
                                  setAnswers({ ...answers, [f.id]: val });
                                  markTouched(f.id);
                                  invalidate();
                                }}
                              />
                            ) : (
                              <select
                                required={f.required}
                                className={inputClass}
                                value={answers[f.id] || ""}
                                onBlur={() => markTouched(f.id)}
                                onChange={e => {
                                  setAnswers({ ...answers, [f.id]: e.target.value });
                                  markTouched(f.id);
                                  invalidate();
                                }}
                              >
                                <option value="">Select an answer</option>
                                {f.options.map(o => (
                                  <option key={o} value={o}>{o}</option>
                                ))}
                              </select>
                            )
                          ) : f.type === "textarea" ? (
                            <textarea
                              required={f.required}
                              maxLength={2000}
                              placeholder={`Enter details for ${f.label.toLowerCase()}...`}
                              className={inputClass}
                              value={answers[f.id] || ""}
                              onBlur={() => markTouched(f.id)}
                              onChange={e => {
                                setAnswers({ ...answers, [f.id]: e.target.value });
                                markTouched(f.id);
                                invalidate();
                              }}
                            />
                          ) : (
                            <input
                              type={f.type}
                              min={f.type === "number" ? 0 : undefined}
                              max={f.type === "number" ? 60 : undefined}
                              step={f.type === "number" ? "0.1" : undefined}
                              maxLength={2000}
                              placeholder={f.type === "number" ? "e.g. 2" : ""}
                              required={f.required}
                              className={inputClass}
                              value={answers[f.id] || ""}
                              onBlur={() => markTouched(f.id)}
                              onChange={e => {
                                setAnswers({ ...answers, [f.id]: e.target.value });
                                markTouched(f.id);
                                invalidate();
                              }}
                            />
                          )}
                          {isFieldTouched && fieldError && (
                            <span className="field-error-msg">{fieldError}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {/* Consent Checkbox */}
                  <label className={`hiring-consent ${touched.consent && errors.consent ? "is-invalid" : ""}`}>
                    <input
                      type="checkbox"
                      required
                      checked={candidate.consent}
                      onChange={e => {
                        setCandidate({ ...candidate, consent: e.target.checked });
                        markTouched("consent");
                        invalidate();
                      }}
                    />
                    <span>
                      I agree to share my application and resume with Chirayu Power HR and to AI-assisted screening through OpenRouter and its model providers. I understand HR makes the final decision. *
                    </span>
                  </label>
                  {touched.consent && errors.consent && (
                    <span className="field-error-msg" style={{ marginBottom: "16px", display: "block" }}>{errors.consent}</span>
                  )}

                  {/* Resume Upload */}
                  <label className="hiring-upload">
                    <strong>Upload your resume to check role fit *</strong>
                    <span>PDF or TXT · up to 4 MB · complete your details first</span>
                    <input
                      ref={fileInput}
                      type="file"
                      accept=".pdf,.txt"
                      onChange={e => void upload(e.target.files?.[0])}
                    />
                  </label>
                </fieldset>

                {busy && (
                  <p role="status">
                    {token
                      ? "Saving your application and preparing your access email…"
                      : "Reading your resume and checking it against this role’s requirements…"}
                  </p>
                )}

                {assessment && (
                  <section className={`hiring-assessment ${assessment.fit}`} aria-live="polite">
                    <h3>
                      {assessment.fit === "suitable"
                        ? "Your experience appears suitable"
                        : assessment.fit === "not_suitable"
                        ? "This role may not be the right match"
                        : "Your application needs HR review"}
                    </h3>
                    <p>{assessment.reason}</p>
                    {assessment.evidence.length > 0 && (
                      <>
                        <h4>Relevant experience</h4>
                        <ul>
                          {assessment.evidence.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    {assessment.gaps.length > 0 && (
                      <>
                        <h4>Points to clarify</h4>
                        <ul>
                          {assessment.gaps.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    <small>This is an initial assessment. You can submit for HR review regardless of this result.</small>
                  </section>
                )}

                <button className="hiring-submit" type="submit" disabled={!token || busy || hasFormErrors}>
                  {busy ? "Please wait…" : "Submit application →"}
                </button>
              </form>
            </section>
          )}
        </>
      )}

      {error && <p className="hiring-error" role="alert">⚠ {error}</p>}
      <footer className="hiring-footer"><span>CHIRAYU POWER PVT. LTD. · ENERGY WITH INTEGRITY</span><span>BUILD SOMETHING THAT MATTERS. ↗</span></footer>
    </main>
  </>
  );
}



