"use client";
import JobAlertsSignup from "@/components/JobAlertsSignup";
import Image from "next/image";
import { Suspense, useEffect, useRef, useState, useMemo } from "react";
import {
  Search,
  MapPin,
  Briefcase,
  TrendingUp,
  Wrench,
  Store,
  HardHat,
  Calculator,
  Database,
  GraduationCap,
  Headset,
  Laptop,
  Code2,
  Landmark,
  ArrowLeft,
  Building2,
  Building,
  Factory,
  Warehouse,
  Castle,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  PencilRuler,
  Settings,
  Handshake,
  FileText,
  ShoppingCart,
  Users,
  ShieldCheck,
  Sun,
  Loader2,
  Share2,
  Check,
} from "lucide-react";
import type { Campaign } from "@/lib/hiring/schema";
import { normalizeCoreFields, conditionMet, isCoreFieldId } from "@/lib/hiring/schema";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber } from "libphonenumber-js";
import type { HiringDepartment } from "@/lib/hiring/hiringDepartments";
import { stateForLocation } from "@/lib/hiring/locations";
import { careerSlug, departmentPath, rolePath, jobPath, searchPath } from "@/lib/hiring/routes";
import { useCareersRoute } from "@/lib/hiring/useCareersRoute";
import Navbar from "@/components/Navbar";
import "./hiring.css";
import { solarFonts } from "./SolarIntro";
import "./solar-grid.css";
import "./apply-minimal.css";
import "./job-hero.css";
import "./job-detail.css";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

type PublicCampaign = Pick<
  Campaign,
  | "department_id"
  | "role"
  | "locations"
  | "description"
  | "min_years"
  | "max_years"
  | "fields"
  | "workplace_type"
  | "employment_type"
  | "experience_level"
  | "salary_range"
  | "skills"
  | "responsibilities"
  | "qualifications"
  | "benefits"
  | "job_code"
  | "is_open"
> & { id: string };

// Best-effort icon per role title, purely decorative -- keyword match against
// the role name, falling back to a generic briefcase.
const ROLE_ICONS: [RegExp, typeof Briefcase][] = [
  [/sales|marketing|business development|bdm/i, TrendingUp],
  [/mechanic|technician|maintenance/i, Wrench],
  [/retail|store/i, Store],
  [/engineer|site|project|installation/i, HardHat],
  [/account|finance/i, Calculator],
  [/data entry|back office/i, Database],
  [/management trainee|graduate|intern/i, GraduationCap],
  [/bpo|customer|support/i, Headset],
  [/it hardware|it software|developer|software/i, Code2],
  [/it |tech/i, Laptop],
];
function roleIcon(role: string) {
  return ROLE_ICONS.find(([pattern]) => pattern.test(role))?.[1] || Briefcase;
}

// One distinct icon per real department, for the top-level department
// picker -- roleIcon()'s keyword match is too generic for department names
// themselves (most would just fall back to the plain briefcase).
const DEPARTMENT_ICONS: Record<string, typeof Briefcase> = {
  Finance: Calculator,
  Marketing: Megaphone,
  Sales: TrendingUp,
  Designing: PencilRuler,
  "O&M": Settings,
  Stores: Warehouse,
  Liaisoning: Handshake,
  Tendering: FileText,
  Purchase: ShoppingCart,
  Project: HardHat,
  HR: Users,
  Safety: ShieldCheck,
  "Admin & Support": Building2,
  "Solar I&C": Sun,
  Other: Briefcase,
};

// Purely decorative variety for the city tiles -- deterministic per city name
// (not random) so the same city always gets the same icon across renders.
const CITY_ICONS = [Landmark, Building2, Factory, Warehouse, Building, Castle];
function cityIcon(city: string) {
  let hash = 0;
  for (let i = 0; i < city.length; i++) hash = (hash * 31 + city.charCodeAt(i)) >>> 0;
  return CITY_ICONS[hash % CITY_ICONS.length];
}

const GENERAL_APPLICATION_JOB_CODE = "GENERAL";

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onBlur?: () => void;
  id?: string;
  ariaLabel?: string;
  // When set, typing also queries this (debounced) and merges the results
  // in below the local `options` -- used only for the city filter, so a
  // candidate can find their own city/town/village even where it has no
  // open role yet, instead of being limited to `options` alone.
  asyncSearch?: (query: string) => Promise<string[]>;
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
  ariaLabel,
  asyncSearch,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [asyncOptions, setAsyncOptions] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!asyncSearch) return;
    const q = search.trim();
    if (q.length < 2) {
      setAsyncOptions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const handle = setTimeout(() => {
      asyncSearch(q)
        .then(results => { if (!cancelled) setAsyncOptions(results); })
        .catch(() => { if (!cancelled) setAsyncOptions([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [search, asyncSearch]);

  const filteredOptions = useMemo(() => {
    const q = search.toLowerCase().trim();
    const local = !q ? options : options.filter(opt => opt.toLowerCase().includes(q));
    if (!asyncSearch || !asyncOptions.length) return local;
    const merged = [...local];
    for (const loc of asyncOptions) {
      if (!merged.some(m => m.toLowerCase() === loc.toLowerCase())) merged.push(loc);
    }
    return merged;
  }, [options, search, asyncOptions, asyncSearch]);

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
      } else if (!filteredOptions.length && !searching && asyncSearch && search.trim()) {
        handleSelect(search.trim());
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
        aria-label={ariaLabel}
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
            searching ? (
              <li className="searchable-select-no-results">Searching…</li>
            ) : asyncSearch && search.trim() ? (
              // No database (neither existing campaigns nor the India Post
              // search) has this place -- rather than dead-ending someone
              // from a village too small to have its own post office
              // record, let them use exactly what they typed.
              <li
                role="option"
                aria-selected={false}
                className="searchable-select-option searchable-select-freetext"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(search.trim());
                }}
              >
                <span>
                  Use &ldquo;{search.trim()}&rdquo; as my city
                  <span className="searchable-select-option-hint">Not in our records yet -- no open roles yet</span>
                </span>
              </li>
            ) : (
              <li className="searchable-select-no-results">No matches found for &ldquo;{search}&rdquo;</li>
            )
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = opt === value;
              const isHighlighted = idx === highlightedIndex;
              const hasNoRolesYet = !!asyncSearch && !options.includes(opt);
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
                  <span>
                    {opt}
                    {hasNoRolesYet && <span className="searchable-select-option-hint">No open roles yet</span>}
                  </span>
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

function HiringApplication() {
  const [departments, setDepartments] = useState<HiringDepartment[]>([]);
  const referenceRoles = useMemo(() => departments.flatMap(d => d.reference_roles), [departments]);
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  // Applied filters -- what actually narrows the role grid below. Kept
  // separate from the hero search bar's own draft state (roleQueryDraft /
  // cityFilterDraft) so typing a role and picking a city doesn't filter
  // anything until the candidate hits SEARCH, applying both together.
  const { route, navigate } = useCareersRoute();
  const roleQuery = route?.query ?? "";
  const cityFilter = route?.city ?? "";
  const [roleQueryDraft, setRoleQueryDraft] = useState("");
  const [cityFilterDraft, setCityFilterDraft] = useState("");
  // Top-level department picker: null shows a grid of configured departments;
  // picking one narrows the page down to just that department's roles.
  // Running a text/city search (runSearch) drops back out of this view.
  const selectedDepartment = route?.department ?? null;
  // Autocomplete dropdown under the role-search input -- open state is
  // separate from whether there's anything to show so Escape/click-outside
  // can close it without fighting a query that still has matches.
  const [roleSuggestOpen, setRoleSuggestOpen] = useState(false);
  const roleFieldRef = useRef<HTMLDivElement>(null);
  const [fetching, setLoading] = useState(true);
  const loading = fetching || !route;
  const selected = route?.jobId ?? "";
  // Which open-role card's description shows in the preview panel beside a
  // department's tiles -- hovering/focusing a card updates it; defaults to
  // the first open role in that department when nothing's been hovered yet.
  const [previewRoleId, setPreviewRoleId] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [candidate, setCandidate] = useState({ name: "", email: "", phone: "", location: "", years: "", consent: false, work_location_preference: "" as "" | "near_current" | "open_to_relocate", comfortable_locations: [] as string[] });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasResume, setHasResume] = useState(false);
  const [receipt, setReceipt] = useState<{ reference: string; email_status: string } | null>(null);
  // Brief "Copied!" confirmation after the clipboard fallback below --
  // navigator.share() itself needs no extra UI state, the OS share sheet is
  // its own confirmation.
  const [shareCopied, setShareCopied] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cityBarRef = useRef<HTMLDivElement>(null);
  const [canScrollCitiesLeft, setCanScrollCitiesLeft] = useState(false);
  const [canScrollCitiesRight, setCanScrollCitiesRight] = useState(false);

  const c = campaigns.find(c => c.id === selected);
  const viewStage = route?.stage === "form" && c?.is_open ? "form" : "detail";
  const roleTitle = useMemo(() => route?.kind === "role"
    ? [...referenceRoles.map(role => role.title), ...campaigns.map(item => item.role)]
      .find(title => careerSlug(title) === route.role) || ""
    : "", [route?.kind, route?.role, campaigns, referenceRoles]);
  const routeUnavailable = !loading && !error && (route?.kind === "invalid" || (route?.kind === "department" && !departments.some(d => d.slug === route.department)) || (route?.kind === "job" && !c) || (route?.kind === "role" && !roleTitle));
  function setViewStage(stage: "detail" | "form") { if (c) navigate(jobPath(c.id, stage === "form")); }
  function setSelected(id: string) { navigate(id ? jobPath(id) : "/"); }
  function followLink(event: React.MouseEvent<HTMLAnchorElement>, href: string, action?: () => void) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (busy) return;
    navigate(href);
    action?.();
  }
  useEffect(() => {
    setRoleQueryDraft(route?.query ?? "");
    setCityFilterDraft(route?.city ?? "");
  }, [route?.query, route?.city]);
  const lastJob = useRef("");
  useEffect(() => {
    if (!selected) { setReceipt(null); return; }
    if (lastJob.current === selected) return;
    lastJob.current = selected;
    setCandidate(value => ({ ...value, comfortable_locations: [] }));
    setTouched({});
    setHasResume(false);
    setReceipt(null);
    // Direct navigation/back to another job must not reuse its custom answers.
    setAnswers((previous): Record<string, string> => c?.job_code === GENERAL_APPLICATION_JOB_CODE ? { desired_role: previous.desired_role || "" } : {});
  }, [selected, c?.job_code]);
  // The campaign's own `fields` array is the literal source of truth for
  // what appears on its apply form -- a field renders only if it's actually
  // present here (see migrations/20260930_seed_core_hiring_fields.sql for
  // how every campaign gets its core fields seeded in). normalizeCoreFields
  // only locks type/options for any core-id entry that IS present; it never
  // adds one that's missing. One source of truth for both rendering and the
  // errors computation below, so they can never drift apart.
  const resolvedFields = useMemo(() => (c ? normalizeCoreFields(c.fields) : []), [c]);
  // The job's own approved locations, shown as plain read-only text (never a
  // candidate-selectable dropdown) -- see the "Location" / "Preferred
  // locations" display below. "City, State" per entry, joined with " · " for
  // roles open in more than one place.
  const jobLocationText = useMemo(
    () => (c?.locations || []).map(loc => `${loc}, ${stateForLocation(loc)}`).join(" · "),
    [c],
  );
  const allCities = useMemo(
    () => [...new Set(campaigns.flatMap(role => role.locations))].sort(),
    [campaigns]
  );
  // The one seeded catch-all campaign for roles the company doesn't have a
  // specific listing for -- found by job_code rather than by role text so
  // renaming its display title later doesn't break the lookup. Undefined
  // until it's actually seeded, in which case every CTA that depends on it
  // just doesn't render (see the "no results" empty state below).
  const generalApplicationCampaign = campaigns.find(camp => camp.job_code === GENERAL_APPLICATION_JOB_CODE);
  // Full autocomplete pool for the role-search box: every department name
  // and document role title (static) plus every live campaign's own title
  // (changes as campaigns load), deduped case-insensitively.
  const roleSuggestionPool = useMemo(() => {
    const seen = new Set<string>();
    const pool: string[] = [];
    for (const title of [...departments.map(d => d.name), ...referenceRoles.map(r => r.title), ...campaigns.map(role => role.role)]) {
      const key = title.toLowerCase();
      if (!seen.has(key)) { seen.add(key); pool.push(title); }
    }
    return pool;
  }, [campaigns, departments, referenceRoles]);
  function matchRoleSuggestions(query: string, limit = 8): string[] {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return roleSuggestionPool.filter(t => t.toLowerCase().includes(q)).slice(0, limit);
  }
  const roleSuggestions = useMemo(
    () => matchRoleSuggestions(roleQueryDraft),
    [roleQueryDraft, roleSuggestionPool]
  );
  // Safety net on the general-application form's "desired role" field: if
  // what's typed there strongly matches a real open campaign, surface it
  // so the candidate can redirect themselves to that specific role's own
  // apply flow (correct campaign_id, tailored screening) instead of
  // landing in the generic bucket for something that's already listed.
  function matchOpenCampaigns(query: string, limit = 3): PublicCampaign[] {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return campaigns.filter(camp =>
      camp.job_code !== GENERAL_APPLICATION_JOB_CODE && camp.is_open && camp.role.toLowerCase().includes(q)
    ).slice(0, limit);
  }

  useEffect(() => {
    function handleClickOutsideRoleField(e: MouseEvent) {
      if (roleFieldRef.current && !roleFieldRef.current.contains(e.target as Node)) {
        setRoleSuggestOpen(false);
      }
    }
    if (roleSuggestOpen) {
      document.addEventListener("mousedown", handleClickOutsideRoleField);
      return () => document.removeEventListener("mousedown", handleClickOutsideRoleField);
    }
  }, [roleSuggestOpen]);

  // Applies a role text + city together and jumps to the results -- shared
  // by the SEARCH button/Enter key (using the current drafts) and clicking
  // an autocomplete suggestion (using that suggestion directly, so it
  // doesn't wait on the draft state update landing first).
  function applySearch(role: string, city: string) {
    navigate(searchPath(role, city));
    document.getElementById("role-tiles")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function runSearch() {
    applySearch(roleQueryDraft, cityFilterDraft);
  }

  // Native share sheet when available (mobile browsers, mostly); falls back
  // to copying the link for desktop browsers that don't implement
  // navigator.share at all.
  async function shareJob(job: PublicCampaign) {
    const url = `${window.location.origin}${BASE_PATH}${jobPath(job.id)}`;
    const shareData = { title: `${job.role} at Chirayu Power`, text: `Check out this opening at Chirayu Power: ${job.role}`, url };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled -- not an error */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Clipboard API blocked/unavailable too -- last resort.
      window.prompt("Copy this link:", url);
    }
  }

  // Opens the one catch-all campaign's apply form, pre-filling its
  // "desired role" field with whatever text produced zero real matches --
  // only reachable from a genuinely empty search result (see the "no
  // results" panel below), so it can never be used for a role that
  // already has a real, specific campaign to apply through instead.
  function openGeneralApplication(desiredRole: string) {
    if (!generalApplicationCampaign) return;
    navigate(jobPath(generalApplicationCampaign.id, true));
    // Not touching candidate.location/work_location_preference here -- those
    // describe the candidate, not the job, so switching roles must not reset
    // or auto-fill them from the newly selected campaign's own locations.
    // comfortable_locations DOES reset -- it's which of THIS job's own
    // locations the candidate accepts, meaningless once the job changes.
    setCandidate(v => ({ ...v, comfortable_locations: [] }));
    setAnswers({ desired_role: desiredRole });
    setTouched({});
    invalidate();
  }

  function updateCityBarScrollState() {
    const el = cityBarRef.current;
    if (!el) return;
    setCanScrollCitiesLeft(el.scrollLeft > 4);
    setCanScrollCitiesRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }
  function scrollCityBar(direction: 1 | -1) {
    cityBarRef.current?.scrollBy({ left: direction * cityBarRef.current.clientWidth * 0.85, behavior: "smooth" });
  }
  function handleCityBarKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight") { e.preventDefault(); scrollCityBar(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); scrollCityBar(-1); }
  }
  useEffect(() => {
    updateCityBarScrollState();
  }, [allCities]);
  // Backs the city filter's searchable dropdown so it isn't limited to
  // cities that already have a role -- queries India Post's public postal
  // API (any city/town/village in the country) via our own proxy route.
  async function searchLocations(query: string): Promise<string[]> {
    const r = await fetch(`${BASE_PATH}/api/location-search?q=${encodeURIComponent(query)}`);
    if (!r.ok) return [];
    const body = await r.json();
    return (body.locations as { name: string }[] | undefined)?.map(l => l.name) || [];
  }
  // A city picked from the India Post search (see asyncSearch below) may
  // not be one anyone's hiring in yet -- in that case the filter is
  // informational only (see the banner near the role grid) rather than
  // hiding every role, since "no roles match" would otherwise dead-end a
  // candidate from a place Chirayu Power just doesn't have a listing for.
  const cityFilterHasRoles = !cityFilter || allCities.includes(cityFilter);
  const visibleCampaigns = useMemo(() => {
    const q = roleQuery.trim().toLowerCase();
    return campaigns
      .filter(role => {
        const matchesQuery =
          !q ||
          role.role.toLowerCase().includes(q) ||
          role.locations.some(l => l.toLowerCase().includes(q)) ||
          (departments.find(d => d.id === role.department_id)?.name || "").toLowerCase().includes(q);
        const matchesCity = !cityFilterHasRoles || !cityFilter || role.locations.includes(cityFilter);
        return matchesQuery && matchesCity && (!route?.role || careerSlug(role.role) === route.role);
      })
      // Open roles first, closed roles last; alphabetical order (already the
      // fetch order) is preserved within each group since sort is stable.
      .sort((a, b) => Number(b.is_open) - Number(a.is_open));
  }, [campaigns, departments, roleQuery, cityFilter, cityFilterHasRoles, route?.role]);
  // Explicit campaign assignments and database metadata determine every group.
  const groupedByDepartment = useMemo(() => {
    const q = roleQuery.trim().toLowerCase();
    return departments.map(department => {
      const openRoles = visibleCampaigns.filter(role => role.department_id === department.id);
      const directoryRoles = cityFilter && cityFilterHasRoles ? [] : department.reference_roles.filter(r =>
        (!route?.role || careerSlug(r.title) === route.role) &&
        (!q || r.title.toLowerCase().includes(q) || department.name.toLowerCase().includes(q)));
      return { department, openRoles, directoryRoles };
    }).filter(g => g.openRoles.length || g.directoryRoles.length ||
      (!route?.role && !cityFilter && (!q || g.department.name.toLowerCase().includes(q))));
  }, [departments, visibleCampaigns, roleQuery, cityFilter, cityFilterHasRoles, route?.role]);
  // No active search and no department picked yet -- the top-level
  // department picker grid, not the role listing, is what's shown.
  const isBrowsingAllDepartments = !selectedDepartment && !roleQuery && !cityFilter && !route?.role;
  const departmentsToRender = selectedDepartment
    ? groupedByDepartment.filter(g => g.department.slug === selectedDepartment)
    : groupedByDepartment;
  const totalActiveJobs = campaigns.filter(role => role.is_open).length;
  const yearsLabel = (role: Pick<PublicCampaign, "min_years" | "max_years">) =>
    `${role.min_years}${role.max_years !== null ? ` - ${role.max_years}` : "+"} years`;
  const locationLabel = (role: Pick<PublicCampaign, "locations">) =>
    role.locations.length === 1 ? role.locations[0] : `${role.locations.length} locations`;

  useEffect(() => {
    if (selected) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selected, viewStage]);

  useEffect(() => {
    fetch(`${BASE_PATH}/api/hiring`, { cache: "no-store" }).then(async r => {
      const body = await r.json(); if (!r.ok) throw new Error(body.error);
      setCampaigns(body.campaigns);
      setDepartments(body.departments || []);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  function invalidate() {
    setError("");
  }

  const markTouched = (fieldKey: string) => {
    setTouched(prev => (prev[fieldKey] ? prev : { ...prev, [fieldKey]: true }));
  };

  // Bridges the core answer shape (named `candidate` properties) and HR's
  // custom questions (the generic `answers` map) into one accessor, so the
  // unified field-rendering loop and conditionMet() work identically for
  // both -- mirrors coreOrCustomAnswer() server-side in lib/hiring/schema.ts.
  const getFieldValue = (fieldId: string): string | string[] => {
    switch (fieldId) {
      case "name": return candidate.name;
      case "email": return candidate.email;
      case "phone": return candidate.phone;
      case "location": return candidate.location;
      case "work_location_preference": return candidate.work_location_preference;
      case "comfortable_locations": return candidate.comfortable_locations;
      case "years": return candidate.years;
      case "consent": return candidate.consent ? "true" : "";
      case "resume": return hasResume ? "true" : "";
      default: return answers[fieldId] || "";
    }
  };

  // A custom field that becomes hidden (its condition no longer met, e.g.
  // the candidate changed an earlier answer) shouldn't leave a stale value
  // sitting in `answers` to be silently submitted -- validateAnswers()
  // already ignores it server-side, but there's no reason to send it at
  // all. Only touches answers whose field is genuinely hidden right now;
  // guarded so it only ever fires once per actual change, not every render.
  useEffect(() => {
    if (!c) return;
    const hiddenIds = resolvedFields
      .filter(f => !isCoreFieldId(f.id) && !conditionMet(f, getFieldValue))
      .map(f => f.id);
    if (hiddenIds.length === 0) return;
    setAnswers(prev => {
      const next = { ...prev };
      let changed = false;
      for (const id of hiddenIds) {
        if (id in next) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, resolvedFields, answers]);

  // Real-time field errors calculation
  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    const locationField = resolvedFields.find(f => f.id === "location");
    const workPrefField = resolvedFields.find(f => f.id === "work_location_preference");
    const comfortableField = resolvedFields.find(f => f.id === "comfortable_locations");

    // 1. Location
    if (locationField && conditionMet(locationField, getFieldValue) && locationField.required && !candidate.location) {
      errs.location = "Please enter your current location.";
    }
    if (workPrefField && conditionMet(workPrefField, getFieldValue) && workPrefField.required && !candidate.work_location_preference) {
      errs.work_location_preference = "Please select your work location preference.";
    }
    if (
      comfortableField && conditionMet(comfortableField, getFieldValue) && comfortableField.required &&
      c && c.locations.length > 1 && candidate.comfortable_locations.length === 0
    ) {
      errs.comfortable_locations = "Choose at least one location you're comfortable working at.";
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

    // 4. Phone Number -- real per-country validation (libphonenumber-js),
    // not a one-size-fits-all digit-count check. candidate.phone is the
    // E.164 string react-phone-number-input produces (e.g. "+919876543210"
    // for a 10-digit Indian number).
    if (!candidate.phone) {
      errs.phone = "Phone number is required.";
    } else if (!isValidPhoneNumber(candidate.phone)) {
      errs.phone = "Enter a valid phone number for the selected country.";
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

    // 6. Dynamic role-specific fields (HR's own custom questions only --
    // resolvedFields also carries the 9 core fields, already handled above
    // and via name/email/phone/years/consent below; a campaign-stored
    // override entry for one of those ids must not be treated as a second,
    // separate custom question here).
    for (const field of resolvedFields) {
      if (isCoreFieldId(field.id)) continue;
      if (!conditionMet(field, getFieldValue)) continue;
      {
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
      work_location_preference: true,
      comfortable_locations: true,
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

  // Screening and submission happen together, both only once the candidate
  // presses "Submit application" -- the resume is attached but never sent
  // (and never scanned) before that. The candidate never sees the AI fit
  // assessment; it's stored for HR review only (screen/route.ts).
  async function submit() {
    markAllTouched();
    const file = fileInput.current?.files?.[0];
    if (!c || !file) {
      setError("Please attach your resume before submitting.");
      return;
    }
    if (hasFormErrors) {
      setError("Please ensure all fields are valid before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("candidate", JSON.stringify({ ...candidate, years: Number(candidate.years), campaign_id: c.id, answers }));
      body.append("resume", file);
      const screened = await fetch(`${BASE_PATH}/api/hiring/screen`, { method: "POST", body });
      const screenData = await screened.json();
      if (!screened.ok) throw new Error(screenData.error);
      const r = await fetch(`${BASE_PATH}/api/hiring/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: screenData.token }),
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
      {receipt ? (
        <section className="hiring-panel" aria-live="polite">
          <span className="hiring-eyebrow">APPLICATION RECEIVED</span>
          <h2>Thank you, {candidate.name}.</h2>
          <p>
            {`We've received your application. A confirmation email will be sent to ${candidate.email} shortly — please check your inbox and spam folder. You do not need to apply again.`}
          </p>
          {/* Same short form as {application_reference} in the ERP's thank-you email. */}
          <p>Reference: {String(receipt.reference).slice(0, 8).toUpperCase()}</p>
          <p>HR will review your experience. Interview access does not confirm selection.</p>
          <a href={`${BASE_PATH}/login`}>Go to interview login →</a>
        </section>
      ) : (
        <>
          {route && !c && !routeUnavailable && route.kind !== "job" && (
            <section className="job-hero" id="opportunities">
              <img
                src={`${BASE_PATH}/brand/hero-hex-corner.png`}
                alt=""
                aria-hidden="true"
                className="job-hero-hex-corner job-hero-hex-top-left"
              />
              <img
                src={`${BASE_PATH}/brand/hero-hex-corner.png`}
                alt=""
                aria-hidden="true"
                className="job-hero-hex-corner job-hero-hex-bottom-right"
              />
              <div className="job-hero-grid">
                <div className="job-hero-text">
                  <h1>Find your next role at Chirayu Power</h1>
                  {loading ? (
                    <p role="status">
                      <span className="skeleton-block skeleton-line job-hero-count-skeleton" />
                      <span className="visually-hidden">Loading open roles…</span>
                    </p>
                  ) : (
                    <p>
                      <strong>{totalActiveJobs}+</strong> active {totalActiveJobs === 1 ? "role" : "roles"} to grab
                    </p>
                  )}
                  <div className="job-hero-search">
                    <div className="job-hero-field job-hero-role" ref={roleFieldRef}>
                      <Search size={18} aria-hidden="true" />
                      <input
                        type="search"
                        value={roleQueryDraft}
                        onChange={e => { setRoleQueryDraft(e.target.value); setRoleSuggestOpen(true); }}
                        onFocus={() => setRoleSuggestOpen(true)}
                        onKeyDown={e => {
                          if (e.key === "Enter") { setRoleSuggestOpen(false); runSearch(); }
                          else if (e.key === "Escape") setRoleSuggestOpen(false);
                        }}
                        placeholder="Job title or role"
                        aria-label="Search job title or role"
                        role="combobox"
                        aria-expanded={roleSuggestOpen && roleSuggestions.length > 0}
                        aria-autocomplete="list"
                        autoComplete="off"
                      />
                      {roleSuggestOpen && roleSuggestions.length > 0 && (
                        <ul className="job-hero-suggestions" role="listbox">
                          {roleSuggestions.map(s => (
                            <li key={s} role="option" aria-selected={false}>
                              <button
                                type="button"
                                onClick={() => {
                                  setRoleQueryDraft(s);
                                  setRoleSuggestOpen(false);
                                  applySearch(s, cityFilterDraft);
                                }}
                              >
                                {s}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="job-hero-divider" aria-hidden="true" />
                    <div className="job-hero-field job-hero-city">
                      <MapPin size={18} aria-hidden="true" />
                      <SearchableSelect
                        options={allCities}
                        value={cityFilterDraft}
                        onChange={setCityFilterDraft}
                        placeholder="Select City"
                        ariaLabel="Select city"
                        className="job-hero-city-select"
                        asyncSearch={searchLocations}
                      />
                    </div>
                    <button
                      type="button"
                      className="job-hero-search-btn"
                      onClick={runSearch}
                    >
                      SEARCH
                    </button>
                  </div>
                </div>
                <div className="job-hero-image">
                  {/* This is the page's LCP element (largest above-the-fold
                      image) -- next/image + priority emits a <link
                      rel="preload"> for it in the document head and skips
                      lazy-loading, instead of discovering it only after the
                      JS bundle parses like a plain <img> would. Explicit
                      width/height (already correct, matching the source
                      asset's real aspect ratio) is what actually prevents
                      the image's own CLS once the section is visible. */}
                  <Image
                    src={`${BASE_PATH}/brand/hero-hiring-illustration.webp`}
                    alt=""
                    aria-hidden="true"
                    width={514}
                    height={356}
                    priority
                    fetchPriority="high"
                  />
                </div>
              </div>
            </section>
          )}

          <nav className="hiring-steps" aria-label="Application progress">
            <button type="button" className={!c ? "current" : ""} onClick={() => setSelected("")}>
              01 · Departments / Roles
            </button>
            <button
              type="button"
              className={c && viewStage === "detail" ? "current" : ""}
              disabled={!c}
              onClick={() => setViewStage("detail")}
            >
              02 · Job details
            </button>
            <button
              type="button"
              className={c && viewStage === "form" ? "current" : ""}
              disabled={!c || !c.is_open}
              onClick={() => setViewStage("form")}
            >
              03 · Your application
            </button>
          </nav>

          {loading && (
            <section className="role-tiles-panel" aria-busy="true">
              <div className="role-tiles-tabs">
                <span className="current">Departments & Roles</span>
              </div>
              <div className="role-tiles-grid">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={i} className="role-tile role-tile-plain role-tile-skeleton" aria-hidden="true">
                    <span className="role-tile-card">
                      <span className="skeleton-block skeleton-circle" />
                      <span className="skeleton-block skeleton-line skeleton-line-title" />
                      <span className="skeleton-block skeleton-line skeleton-line-sub" />
                    </span>
                  </div>
                ))}
              </div>
              <p role="status" className="visually-hidden">Loading opportunities…</p>
            </section>
          )}
          {routeUnavailable && <section className="no-results-panel" role="status"><h1>This opportunity is unavailable</h1><p>The link may be incorrect, or the job may no longer be published.</p><a href={`${BASE_PATH}/`} onClick={event => followLink(event, "/")}>Browse all departments and jobs</a></section>}

          {!c && !loading && cityFilter && !cityFilterHasRoles && (
            <p className="city-no-roles-banner" role="status">
              We don&rsquo;t have open roles in <strong>{cityFilter}</strong> right now.
              {allCities.length > 0 && <> We&rsquo;re currently hiring in: {allCities.join(", ")}.</>} Browse all open roles below.
            </p>
          )}

          {!c && !loading && !routeUnavailable && (
            <section className="role-tiles-panel" id="role-tiles">
              <div className="role-tiles-tabs">
                <span className="current">{roleTitle || "Departments & Roles"}</span>
              </div>

              {roleTitle && <div className="career-role-summary">
                <h1>{roleTitle}</h1>
                {referenceRoles.filter(role => careerSlug(role.title) === route?.role).slice(0, 1).map(role => (
                  <div key={role.title}><p>{role.task}</p><p>{role.duration}</p></div>
                ))}
                {!visibleCampaigns.length && <p>No published jobs for this role right now. Browse the department for other opportunities.</p>}
                {groupedByDepartment.map(({ department }) => <a key={department.id} href={`${BASE_PATH}${departmentPath(department.slug)}`} onClick={event => followLink(event, departmentPath(department.slug))}>View all roles in {department.name}</a>)}
              </div>}

              {isBrowsingAllDepartments ? (
                <div className="role-tiles-grid">
                  {groupedByDepartment.map(({ department, openRoles }) => {
                    const Icon = DEPARTMENT_ICONS[department.icon_key || ""] || Briefcase;
                    const total = new Set([...department.reference_roles.map(r => r.title), ...openRoles.map(r => r.role)]).size;
                    return (
                      <a
                        href={`${BASE_PATH}${departmentPath(department.slug)}`}
                        key={department.id}
                        className="role-tile role-tile-plain"
                        onClick={event => followLink(event, departmentPath(department.slug), () => {
                          document.getElementById("role-tiles")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        })}
                      >
                        <span className="role-tile-card">
                          <span className="role-tile-icon"><Icon size={26} /></span>
                          <strong>{department.name}</strong>
                          <span className="role-tile-count">
                            {total} {total === 1 ? "role" : "roles"}{openRoles.length > 0 ? ` · ${openRoles.filter(role => role.is_open).length} open` : ""}
                          </span>
                        </span>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <>
                  {selectedDepartment && (
                    <button
                      type="button"
                      className="dept-back-btn"
                      onClick={() => navigate("/")}
                    >
                      <ArrowLeft size={15} aria-hidden="true" /> All departments
                    </button>
                  )}

                  {!departmentsToRender.length && (
                    <div className="no-results-panel" role="status">
                      <p>
                        No departments or roles match{roleQuery ? ` "${roleQuery}"` : " your search"}.
                      </p>
                      {generalApplicationCampaign && (
                        <>
                          <p>Don&rsquo;t see the exact role you&rsquo;re looking for? You can still apply and tell us what you&rsquo;re interested in.</p>
                          <button
                            type="button"
                            className="no-results-apply-btn"
                            onClick={() => openGeneralApplication(roleQuery)}
                          >
                            Submit a general application →
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {departmentsToRender.map(({ department, openRoles, directoryRoles }) => (
                <div className="dept-group" key={department.id}>
                  <h2 className="dept-group-title">
                    {department.name}
                    {openRoles.length > 0 && (
                      <span className="dept-group-count">{openRoles.filter(role => role.is_open).length} open</span>
                    )}
                  </h2>

                  {!openRoles.length && <p role="status">No published jobs in this department right now.</p>}
                  {openRoles.length > 0 && (() => {
                    const previewRole = openRoles.find(r => r.id === previewRoleId) || openRoles[0];
                    const canonicalMatch = previewRole ? department.reference_roles.find(r => careerSlug(r.title) === careerSlug(previewRole.role)) : null;
                    return (
                      <div className="role-tiles-grid">
                        {previewRole && (
                          <div className="dept-role-preview" aria-live="polite">
                            <h3>{previewRole.role}</h3>
                            <div className="dept-role-preview-meta">
                              <span><MapPin size={13} aria-hidden="true" /> {locationLabel(previewRole)}</span>
                              <span><Briefcase size={13} aria-hidden="true" /> {yearsLabel(previewRole)}</span>
                              <span><Building2 size={13} aria-hidden="true" /> {previewRole.workplace_type}</span>
                            </div>
                            {canonicalMatch ? (
                              <div className="dept-role-preview-doc">
                                <p><strong>Task:</strong> {canonicalMatch.task}</p>
                                <p>📅 <strong>Duration:</strong> {canonicalMatch.duration}</p>
                              </div>
                            ) : (
                              <>
                                <p className="dept-role-preview-desc">{previewRole.description}</p>
                                {previewRole.responsibilities.length > 0 && (
                                  <ul>
                                    {previewRole.responsibilities.slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}
                                  </ul>
                                )}
                              </>
                            )}
                            <a
                              href={`${BASE_PATH}${jobPath(previewRole.id)}`}
                              className="dept-role-preview-link"
                              onClick={event => followLink(event, jobPath(previewRole.id))}
                            >
                              View full details →
                            </a>
                          </div>
                        )}

                        {openRoles.map(role => {
                          const Icon = roleIcon(role.role);
                          return (
                            <a
                              href={`${BASE_PATH}${jobPath(role.id)}`}
                              aria-disabled={busy || undefined}
                              key={role.id}
                              onMouseEnter={() => setPreviewRoleId(role.id)}
                              onFocus={() => setPreviewRoleId(role.id)}
                              onClick={event => followLink(event, jobPath(role.id))}
                              className={`role-tile ${selected === role.id ? "selected" : ""} ${role.is_open ? "is-open" : "is-closed"}`}
                            >
                              <span className="role-tile-card">
                                <span className="role-tile-icon"><Icon size={26} /></span>
                                <strong>{role.role}</strong>
                                <span className="role-tile-count">
                                  {role.locations.length === 1 ? role.locations[0] : `${role.locations.length} locations`}
                                </span>
                              </span>
                              <span className={role.is_open ? "role-tile-ribbon role-tile-ribbon-open" : "role-tile-ribbon role-tile-ribbon-closed"}>
                                {role.is_open ? "Open" : "Closed"}
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {directoryRoles.length > 0 && (
                    <>
                      <p className="dept-directory-label">Full role structure at Chirayu Power</p>
                      <ul className="dept-directory-list">
                        {directoryRoles.map(r => (
                          <li key={r.title} className="dept-directory-item"><a href={`${BASE_PATH}${rolePath(r.title)}`} onClick={event => followLink(event, rolePath(r.title))}>{r.title}</a></li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
                  ))}
                </>
              )}
            </section>
          )}

          {!c && !loading && !routeUnavailable && allCities.length > 0 && (
            <section className="city-bar-panel">
              <div className="role-tiles-tabs">
                <span className="current">Browse roles by city</span>
              </div>
              <div className="city-bar-slider">
                <button
                  type="button"
                  className="city-bar-arrow city-bar-arrow-left"
                  aria-label="Scroll cities left"
                  disabled={!canScrollCitiesLeft}
                  onClick={() => scrollCityBar(-1)}
                >
                  <ChevronLeft size={20} />
                </button>
                <div
                  className="city-bar"
                  ref={cityBarRef}
                  tabIndex={0}
                  role="group"
                  aria-label="Browse roles by city. Use the left and right arrow keys to scroll."
                  onScroll={updateCityBarScrollState}
                  onKeyDown={handleCityBarKeyDown}
                >
                  {allCities.map(city => {
                    const Icon = cityIcon(city);
                    return (
                      <button
                        type="button"
                        key={city}
                        className={`city-tile ${cityFilter === city ? "selected" : ""}`}
                        aria-pressed={cityFilter === city}
                        onClick={() => {
                          const next = cityFilter === city ? "" : city;
                          navigate(searchPath(roleQuery, next));
                          setCityFilterDraft(next);
                          document.getElementById("role-tiles")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      >
                        <span className="city-tile-icon"><Icon size={24} /></span>
                        <span>{city}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="city-bar-arrow city-bar-arrow-right"
                  aria-label="Scroll cities right"
                  disabled={!canScrollCitiesRight}
                  onClick={() => scrollCityBar(1)}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </section>
          )}

          {!c && !loading && !routeUnavailable && (
            <section className="job-alerts-panel">
              <div className="job-alerts-text">
                <h2>
                  Never miss out on the latest <span>career opportunities</span>
                </h2>
                <p>Sign up for new job openings and choose whether to receive career newsletters.</p>
                <JobAlertsSignup />
              </div>
              <div className="job-alerts-image">
                <img
                  src={`${BASE_PATH}/brand/job-alerts-guy.png`}
                  alt=""
                  aria-hidden="true"
                />
              </div>
            </section>
          )}

          {c && viewStage === "detail" && (
            <section className="job-detail" id="job-detail">
              <div className="job-detail-header">
                <div className="job-detail-title-row">
                  <span className="job-detail-icon">{(() => { const Icon = roleIcon(c.role); return <Icon size={26} />; })()}</span>
                  <div>
                    <div className="job-detail-title-line">
                      <h1>{c.role}</h1>
                      <span className="job-detail-jobid">Job ID: {c.job_code || c.id.slice(0, 8).toUpperCase()}</span>
                      <span className={c.is_open ? "job-detail-open-badge" : "job-detail-closed-badge"} role="status">
                        {c.is_open ? "Open" : "Closed"}
                      </span>
                    </div>
                    <div className="job-detail-meta">
                      <span><Building2 size={14} aria-hidden="true" /> {c.workplace_type}</span>
                      <span className="job-detail-dot" aria-hidden="true" />
                      <span><MapPin size={14} aria-hidden="true" /> {locationLabel(c)}</span>
                      <span className="job-detail-dot" aria-hidden="true" />
                      <span><Briefcase size={14} aria-hidden="true" /> {yearsLabel(c)}</span>
                    </div>
                  </div>
                </div>
                <div className="job-detail-actions">
                  <button type="button" className="job-detail-back" onClick={() => setSelected("")}>
                    <ArrowLeft size={15} aria-hidden="true" /> See all jobs
                  </button>
                  <button type="button" className="job-detail-share" onClick={() => void shareJob(c)}>
                    {shareCopied ? (
                      <>
                        <Check size={15} aria-hidden="true" /> Link copied
                      </>
                    ) : (
                      <>
                        <Share2 size={15} aria-hidden="true" /> Share
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="job-detail-apply"
                    disabled={!c.is_open}
                    aria-disabled={!c.is_open}
                    title={c.is_open ? undefined : "This position is no longer accepting applications"}
                    onClick={() => c.is_open && setViewStage("form")}
                  >
                    {c.is_open ? "Apply" : "Position Closed"}
                  </button>
                </div>
              </div>

              <div className="job-detail-body">
                <div className="job-detail-main">
                  <p className="job-detail-description">{c.description}</p>

                  {c.responsibilities.length > 0 && (
                    <>
                      <h3>Key Responsibilities</h3>
                      <ul>{c.responsibilities.map((item, i) => <li key={i}>{item}</li>)}</ul>
                    </>
                  )}

                  {c.qualifications.length > 0 && (
                    <>
                      <h3>Qualifications</h3>
                      <ul>{c.qualifications.map((item, i) => <li key={i}>{item}</li>)}</ul>
                    </>
                  )}

                  {c.benefits.length > 0 && (
                    <>
                      <h3>Benefits</h3>
                      <ul>{c.benefits.map((item, i) => <li key={i}>{item}</li>)}</ul>
                    </>
                  )}
                </div>

                <aside className="job-detail-sidebar">
                  <div className="job-detail-sidebar-item">
                    <h4>Workplace Type</h4>
                    <p>{c.workplace_type}</p>
                  </div>
                  <div className="job-detail-sidebar-item">
                    <h4>Employment Type</h4>
                    <p>{c.employment_type}</p>
                  </div>
                  <div className="job-detail-sidebar-item">
                    <h4>Experience Level</h4>
                    <p>{c.experience_level}</p>
                  </div>
                  {c.salary_range && (
                    <div className="job-detail-sidebar-item">
                      <h4>Annual Compensation</h4>
                      <p>{c.salary_range}</p>
                    </div>
                  )}
                  <div className="job-detail-sidebar-item">
                    <h4>Work Experience (years)</h4>
                    <p>{yearsLabel(c)}</p>
                  </div>
                  {c.skills.length > 0 && (
                    <div className="job-detail-sidebar-item">
                      <h4>Skills</h4>
                      <div className="job-detail-skills">
                        {c.skills.map(skill => <span key={skill}>{skill}</span>)}
                      </div>
                    </div>
                  )}
                </aside>
              </div>
            </section>
          )}

          {c && viewStage === "form" && (
            <section className="hiring-panel" id="apply-form">
              <div className="hiring-panel-title">
                <div>
                  <button type="button" className="job-detail-backlink" onClick={() => setViewStage("detail")}>
                    <ArrowLeft size={13} aria-hidden="true" /> Back to job details
                  </button>
                  <p className="hiring-eyebrow">YOUR NEXT OPPORTUNITY</p>
                  <h2>{c.role}</h2>
                  {/* The job's own location(s) -- informational text pulled
                      straight from this campaign's own configured locations
                      (never a hardcoded/global list). */}
                  <p className="job-location-static">
                    This role is currently open in: <strong>{jobLocationText}</strong>
                  </p>
                </div>
                <span className="hiring-tag">Solar & renewable energy</span>
              </div>

              <form key={c.id} ref={form} onSubmit={e => { e.preventDefault(); void submit(); }}>
                <fieldset disabled={busy}>
                  <div className="hiring-fields">
                    {/* One loop, real stored order -- resolvedFields is
                        exactly c.fields (core ids normalized in place, never
                        reordered/re-synthesized). HR can now interleave core
                        fields and custom questions freely via the ERP's
                        editor, so position in that array is what actually
                        renders; nothing here is hardcoded to come first. */}
                    {resolvedFields.filter(f => conditionMet(f, getFieldValue)).map(f => {
                      const isFieldTouched = !!touched[f.id];
                      const fieldError = errors[f.id];
                      const inputClass = isFieldTouched ? (fieldError ? "is-invalid" : "is-valid") : "";

                      // Consent: distinct styling/structure (full-width,
                      // its own CSS class), not the shared label+input
                      // layout every other field type uses below.
                      if (f.id === "consent") {
                        return (
                          <label key={f.id} className={`hiring-consent ${isFieldTouched && fieldError ? "is-invalid" : ""}`}>
                            <input
                              type="checkbox"
                              required={f.required}
                              checked={candidate.consent}
                              onChange={e => {
                                setCandidate({ ...candidate, consent: e.target.checked });
                                markTouched("consent");
                                invalidate();
                              }}
                            />
                            <span>
                              {f.label}{f.required ? " *" : ""}
                            </span>
                            {isFieldTouched && fieldError && (
                              <span className="field-error-msg" style={{ marginTop: "4px", display: "block" }}>{fieldError}</span>
                            )}
                          </label>
                        );
                      }

                      // Resume: a file input (its real value never flows
                      // through `answers`/`candidate` -- see fileInput ref).
                      if (f.id === "resume") {
                        return (
                          <label key={f.id} className="hiring-upload">
                            <strong>{f.label}{f.required ? " *" : ""}</strong>
                            <span>PDF or TXT · up to 4 MB</span>
                            <input
                              ref={fileInput}
                              type="file"
                              accept=".pdf,.txt"
                              onChange={() => {
                                setHasResume(!!fileInput.current?.files?.length);
                                invalidate();
                              }}
                            />
                          </label>
                        );
                      }

                      // Current location: free, searchable entry (any city/
                      // town/village via India Post, not limited to this
                      // role's own locations) -- the candidate's own city,
                      // separate from the job's location shown above.
                      if (f.id === "location") {
                        return (
                          <label key={f.id}>
                            {f.label}{f.required ? " *" : ""}
                            <SearchableSelect
                              options={allCities}
                              value={candidate.location}
                              placeholder="Search your city or town..."
                              ariaLabel={f.label}
                              className={inputClass}
                              asyncSearch={searchLocations}
                              onBlur={() => markTouched("location")}
                              onChange={val => {
                                setCandidate({ ...candidate, location: val });
                                markTouched("location");
                                invalidate();
                              }}
                            />
                            {isFieldTouched && fieldError && (
                              <span className="field-error-msg">{fieldError}</span>
                            )}
                          </label>
                        );
                      }

                      // Work location preference: fixed two-option radio --
                      // the candidate's own willingness to relocate, not an
                      // agreement to any specific Chirayu location.
                      if (f.id === "work_location_preference") {
                        return (
                          <div key={f.id} className="field-group">
                            {f.label}{f.required ? " *" : ""}
                            <label className="relocate-checkbox-row">
                              <input
                                type="radio"
                                name="work_location_preference"
                                checked={candidate.work_location_preference === "near_current"}
                                onChange={() => {
                                  setCandidate({ ...candidate, work_location_preference: "near_current" });
                                  markTouched("work_location_preference");
                                  invalidate();
                                }}
                              />
                              I prefer to work near my current location
                            </label>
                            <label className="relocate-checkbox-row">
                              <input
                                type="radio"
                                name="work_location_preference"
                                checked={candidate.work_location_preference === "open_to_relocate"}
                                onChange={() => {
                                  setCandidate({ ...candidate, work_location_preference: "open_to_relocate" });
                                  markTouched("work_location_preference");
                                  invalidate();
                                }}
                              />
                              I&apos;m open to relocating for this role
                            </label>
                            {isFieldTouched && fieldError && (
                              <span className="field-error-msg">{fieldError}</span>
                            )}
                          </div>
                        );
                      }

                      // Comfortable locations: only meaningful for a role
                      // open in more than one place -- which of the job's
                      // OWN locations the candidate would accept. Options
                      // come from c.locations, never f.options.
                      if (f.id === "comfortable_locations") {
                        if (c.locations.length <= 1) return null;
                        return (
                          <div key={f.id} className="field-group">
                            {f.label}{f.required ? " *" : ""}
                            {c.locations.map(loc => {
                              const checked = candidate.comfortable_locations.includes(loc);
                              return (
                                <label key={loc} className="relocate-checkbox-row">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setCandidate({
                                        ...candidate,
                                        comfortable_locations: checked
                                          ? candidate.comfortable_locations.filter(l => l !== loc)
                                          : [...candidate.comfortable_locations, loc],
                                      });
                                      markTouched("comfortable_locations");
                                      invalidate();
                                    }}
                                  />
                                  {loc}, {stateForLocation(loc)}
                                </label>
                              );
                            })}
                            {isFieldTouched && fieldError && (
                              <span className="field-error-msg">{fieldError}</span>
                            )}
                          </div>
                        );
                      }

                      // Phone: a real country-code-aware input (react-phone-
                      // number-input + libphonenumber-js), defaulting to
                      // India, storing/validating the full E.164 string --
                      // not a hand-rolled length/character check.
                      if (f.id === "phone") {
                        return (
                          <label key={f.id}>
                            {f.label}{f.required ? " *" : ""}
                            <PhoneInput
                              international
                              defaultCountry="IN"
                              countryCallingCodeEditable={false}
                              className={inputClass}
                              value={candidate.phone || undefined}
                              onBlur={() => markTouched("phone")}
                              onChange={val => {
                                setCandidate({ ...candidate, phone: val || "" });
                                markTouched("phone");
                                invalidate();
                              }}
                            />
                            {isFieldTouched && fieldError && (
                              <span className="field-error-msg">{fieldError}</span>
                            )}
                          </label>
                        );
                      }

                      // name/email/years: plain typed inputs bound to their
                      // own candidate.* property; everything else (HR's own
                      // custom questions) binds to answers[f.id].
                      const isCoreTextField = f.id === "name" || f.id === "email" || f.id === "years";
                      const coreValue = f.id === "name" ? candidate.name
                        : f.id === "email" ? candidate.email
                        : f.id === "years" ? candidate.years
                        : "";
                      const setCoreValue = (v: string) => {
                        if (f.id === "name") setCandidate({ ...candidate, name: v });
                        else if (f.id === "email") setCandidate({ ...candidate, email: v });
                        else if (f.id === "years") setCandidate({ ...candidate, years: v });
                      };
                      const value = isCoreTextField ? coreValue : (answers[f.id] || "");
                      const setValue = isCoreTextField
                        ? setCoreValue
                        : (v: string) => setAnswers({ ...answers, [f.id]: v });
                      const htmlType = f.id === "email" ? "email" : f.id === "years" ? "number" : f.type === "number" ? "number" : "text";
                      const hint = f.id === "email" ? "Your interview access details will be sent here." : null;

                      return (
                        <label key={f.id}>
                          {f.label}{f.required ? " *" : ""}
                          {f.type === "select" ? (
                            f.options.length > 3 ? (
                              <SearchableSelect
                                options={f.options}
                                value={value}
                                placeholder={`Search or select ${f.label.toLowerCase()}...`}
                                className={inputClass}
                                onBlur={() => markTouched(f.id)}
                                onChange={val => {
                                  setValue(val);
                                  markTouched(f.id);
                                  invalidate();
                                }}
                              />
                            ) : (
                              <select
                                required={f.required}
                                className={inputClass}
                                value={value}
                                onBlur={() => markTouched(f.id)}
                                onChange={e => {
                                  setValue(e.target.value);
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
                              value={value}
                              onBlur={() => markTouched(f.id)}
                              onChange={e => {
                                setValue(e.target.value);
                                markTouched(f.id);
                                invalidate();
                              }}
                            />
                          ) : (
                            <input
                              required={f.required}
                              type={htmlType}
                              min={htmlType === "number" ? 0 : undefined}
                              max={f.id === "years" ? 60 : htmlType === "number" ? 60 : undefined}
                              step={htmlType === "number" ? "0.1" : undefined}
                              maxLength={f.id === "email" ? 254 : f.id === "name" ? 150 : 2000}
                              minLength={f.id === "name" ? 2 : undefined}
                              autoComplete={f.id === "name" ? "name" : f.id === "email" ? "email" : undefined}
                              placeholder={f.id === "name" ? "e.g. John Doe" : f.id === "email" ? "e.g. name@example.com" : f.id === "years" ? "e.g. 3.5" : f.type === "number" ? "e.g. 2" : ""}
                              className={inputClass}
                              value={value}
                              onBlur={() => markTouched(f.id)}
                              onChange={e => {
                                setValue(e.target.value);
                                markTouched(f.id);
                                invalidate();
                              }}
                            />
                          )}
                          {isFieldTouched && fieldError ? (
                            <span className="field-error-msg">{fieldError}</span>
                          ) : hint ? (
                            <span className="field-hint">{hint}</span>
                          ) : null}
                          {f.id === "desired_role" && c.job_code === GENERAL_APPLICATION_JOB_CODE && (() => {
                            const matches = matchOpenCampaigns(answers[f.id] || "");
                            if (!matches.length) return null;
                            return (
                              <div className="desired-role-nudge">
                                <p>We have {matches.length === 1 ? "an open role" : "open roles"} matching this:</p>
                                {matches.map(m => (
                                  <button
                                    type="button"
                                    key={m.id}
                                    onClick={() => {
                                      navigate(jobPath(m.id));
                                      setCandidate(v => ({ ...v, comfortable_locations: [] }));
                                      setAnswers({});
                                      setTouched({});
                                      invalidate();
                                    }}
                                  >
                                    {m.role} — apply to this specific role instead →
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {busy && (
                  <p role="status" className="hiring-submitting-status">
                    <Loader2 size={16} className="hiring-spinner" aria-hidden="true" />
                    Submitting your application and resume…
                  </p>
                )}

                <button className="hiring-submit" type="submit" disabled={!hasResume || busy || hasFormErrors}>
                  {busy ? (
                    <>
                      <Loader2 size={16} className="hiring-spinner" aria-hidden="true" />
                      Please wait…
                    </>
                  ) : (
                    "Submit application →"
                  )}
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

// useCareersRoute() uses useSearchParams(), which Next requires a Suspense
// boundary for (otherwise it forces a client-side-only bailout at build
// time). The fallback is never actually visible in practice -- campaigns
// are also fetched client-side, so this component already renders its own
// "Loading open roles…" state immediately on mount.
export default function HiringApplicationPage() {
  return (
    <Suspense fallback={null}>
      <HiringApplication />
    </Suspense>
  );
}



