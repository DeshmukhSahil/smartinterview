"use client";
import { useEffect, useRef, useState, useMemo } from "react";
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
  Clock3,
  Wallet,
  Building,
  Factory,
  Warehouse,
  Castle,
  ChevronLeft,
  ChevronRight,
  Bell,
  Megaphone,
  PencilRuler,
  Settings,
  Handshake,
  FileText,
  ShoppingCart,
  Users,
  ShieldCheck,
  Sun,
} from "lucide-react";
import type { Campaign } from "@/lib/hiring/schema";
import { departmentForRole, DEPARTMENT_ORDER, DEPARTMENT_ROLES, matchCanonicalRole, type Department } from "@/lib/hiring/departments";
import { groupLocationsByState, stateForLocation, formatStateList } from "@/lib/hiring/locations";
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
const DEPARTMENT_ICONS: Record<Department | "Other", typeof Briefcase> = {
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

// Static half of the role-search autocomplete's suggestion pool (the
// document's role titles + department names never change at runtime);
// live campaign titles are merged in per-render in the component, since
// those change as campaigns are fetched.
const CANONICAL_ROLE_TITLES: string[] = [
  ...DEPARTMENT_ORDER,
  ...Object.values(DEPARTMENT_ROLES).flatMap(roles => roles.map(r => r.title)),
];
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

export default function HiringApplication() {
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  // Applied filters -- what actually narrows the role grid below. Kept
  // separate from the hero search bar's own draft state (roleQueryDraft /
  // cityFilterDraft) so typing a role and picking a city doesn't filter
  // anything until the candidate hits SEARCH, applying both together.
  const [roleQuery, setRoleQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [roleQueryDraft, setRoleQueryDraft] = useState("");
  const [cityFilterDraft, setCityFilterDraft] = useState("");
  // Top-level department picker: null shows a grid of all 14 departments;
  // picking one narrows the page down to just that department's roles.
  // Running a text/city search (runSearch) drops back out of this view.
  const [selectedDepartment, setSelectedDepartment] = useState<Department | "Other" | null>(null);
  // Autocomplete dropdown under the role-search input -- open state is
  // separate from whether there's anything to show so Escape/click-outside
  // can close it without fighting a query that still has matches.
  const [roleSuggestOpen, setRoleSuggestOpen] = useState(false);
  const roleFieldRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  // Which open-role card's description shows in the preview panel beside a
  // department's tiles -- hovering/focusing a card updates it; defaults to
  // the first open role in that department when nothing's been hovered yet.
  const [previewRoleId, setPreviewRoleId] = useState("");
  const [viewStage, setViewStage] = useState<"detail" | "form">("detail");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [candidate, setCandidate] = useState({ name: "", email: "", phone: "", location: "", years: "", consent: false, open_to_relocate: false });
  // State half of the State -> District location picker. UI-only (not submitted) --
  // `candidate.location` (the district) is the field of record. Kept in sync below
  // whenever location changes from elsewhere (switching roles, a single-location role
  // auto-filling it), not just from this picker's own onChange.
  const [selectedState, setSelectedState] = useState("");
  useEffect(() => {
    if (candidate.open_to_relocate) { setSelectedState(""); return; }
    setSelectedState(candidate.location ? stateForLocation(candidate.location) : "");
  }, [candidate.location, candidate.open_to_relocate]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasResume, setHasResume] = useState(false);
  const [receipt, setReceipt] = useState<{ reference: string; email_status: string } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cityBarRef = useRef<HTMLDivElement>(null);
  const [canScrollCitiesLeft, setCanScrollCitiesLeft] = useState(false);
  const [canScrollCitiesRight, setCanScrollCitiesRight] = useState(false);

  const c = campaigns.find(c => c.id === selected);
  // State -> District grouping of the CURRENT role's approved locations, for the
  // "Preferred location" picker below. Never offers a state/district the role doesn't
  // actually have.
  const locationsByState = useMemo(() => groupLocationsByState(c?.locations || []), [c]);
  const districtsInState = locationsByState[selectedState] || [];
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
    for (const title of [...CANONICAL_ROLE_TITLES, ...campaigns.map(role => role.role)]) {
      const key = title.toLowerCase();
      if (!seen.has(key)) { seen.add(key); pool.push(title); }
    }
    return pool;
  }, [campaigns]);
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
    setRoleQuery(role);
    setCityFilter(city);
    setSelectedDepartment(null);
    document.getElementById("role-tiles")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function runSearch() {
    applySearch(roleQueryDraft, cityFilterDraft);
  }

  // Opens the one catch-all campaign's apply form, pre-filling its
  // "desired role" field with whatever text produced zero real matches --
  // only reachable from a genuinely empty search result (see the "no
  // results" panel below), so it can never be used for a role that
  // already has a real, specific campaign to apply through instead.
  function openGeneralApplication(desiredRole: string) {
    if (!generalApplicationCampaign) return;
    setSelected(generalApplicationCampaign.id);
    setViewStage("form");
    setCandidate(v => ({
      ...v,
      location: generalApplicationCampaign.locations.length === 1 ? generalApplicationCampaign.locations[0] : "",
      open_to_relocate: false,
    }));
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
          departmentForRole(role.role).toLowerCase().includes(q);
        const matchesCity = !cityFilterHasRoles || !cityFilter || role.locations.includes(cityFilter);
        return matchesQuery && matchesCity;
      })
      // Open roles first, closed roles last; alphabetical order (already the
      // fetch order) is preserved within each group since sort is stable.
      .sort((a, b) => Number(b.is_open) - Number(a.is_open));
  }, [campaigns, roleQuery, cityFilter, cityFilterHasRoles]);
  // Departments as the first layer, roles nested beneath -- ordered by the
  // company's real department list, with any unrecognized role titles
  // grouped under a trailing "Other" bucket instead of being dropped.
  //
  // Each department also carries the full reference role list from the
  // company's designation document (independent of whether any of those
  // exact titles currently have a live campaign -- HR's free-text campaign
  // titles don't reliably match the document's phrasing, so these are shown
  // as a separate "full structure" reference rather than merged 1:1 with the
  // open-role tiles above them). Hidden when a city filter is active since
  // the reference roles have no location data to filter by.
  const groupedByDepartment = useMemo(() => {
    const q = roleQuery.trim().toLowerCase();
    const openByDept = new Map<string, PublicCampaign[]>();
    for (const role of visibleCampaigns) {
      const dept = departmentForRole(role.role);
      if (!openByDept.has(dept)) openByDept.set(dept, []);
      openByDept.get(dept)!.push(role);
    }
    const order: (Department | "Other")[] = [...DEPARTMENT_ORDER, "Other"];
    return order
      .map(dept => {
        const openRoles = openByDept.get(dept) || [];
        const canonical = dept === "Other" ? [] : DEPARTMENT_ROLES[dept as Department];
        const directoryRoles = cityFilter && cityFilterHasRoles
          ? []
          : canonical.filter(r => !q || r.title.toLowerCase().includes(q) || dept.toLowerCase().includes(q));
        return { department: dept, openRoles, directoryRoles };
      })
      .filter(g => g.openRoles.length > 0 || g.directoryRoles.length > 0);
  }, [visibleCampaigns, roleQuery, cityFilter, cityFilterHasRoles]);
  // No active search and no department picked yet -- the top-level
  // department picker grid, not the role listing, is what's shown.
  const isBrowsingAllDepartments = !selectedDepartment && !roleQuery && !cityFilter;
  const departmentsToRender = selectedDepartment
    ? groupedByDepartment.filter(g => g.department === selectedDepartment)
    : groupedByDepartment;
  const totalActiveJobs = campaigns.length;
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
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  function invalidate() {
    setError("");
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
          {!c && (
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
                  <p>
                    {loading ? "Loading open roles…" : (
                      <><strong>{totalActiveJobs}+</strong> active {totalActiveJobs === 1 ? "role" : "roles"} to grab</>
                    )}
                  </p>
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
                        placeholder="Search Job Title, Role"
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
                  <img
                    src={`${BASE_PATH}/brand/hero-hiring-illustration.webp`}
                    alt=""
                    aria-hidden="true"
                    width={514}
                    height={356}
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
              disabled={!c}
              onClick={() => setViewStage("form")}
            >
              03 · Your application
            </button>
          </nav>

          {loading && <p role="status">Loading opportunities…</p>}

          {!c && !loading && cityFilter && !cityFilterHasRoles && (
            <p className="city-no-roles-banner" role="status">
              We don&rsquo;t have open roles in <strong>{cityFilter}</strong> right now.
              {allCities.length > 0 && <> We&rsquo;re currently hiring in: {allCities.join(", ")}.</>} Browse all open roles below.
            </p>
          )}

          {!c && !loading && (
            <section className="role-tiles-panel" id="role-tiles">
              <div className="role-tiles-tabs">
                <span className="current">Departments &amp; Roles</span>
              </div>

              {isBrowsingAllDepartments ? (
                <div className="role-tiles-grid">
                  {groupedByDepartment.map(({ department, openRoles }) => {
                    const Icon = DEPARTMENT_ICONS[department];
                    const total = department === "Other" ? openRoles.length : DEPARTMENT_ROLES[department].length;
                    return (
                      <button
                        type="button"
                        key={department}
                        className="role-tile role-tile-plain"
                        onClick={() => {
                          setSelectedDepartment(department);
                          document.getElementById("role-tiles")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      >
                        <span className="role-tile-card">
                          <span className="role-tile-icon"><Icon size={26} /></span>
                          <strong>{department}</strong>
                          <span className="role-tile-count">
                            {total} {total === 1 ? "role" : "roles"}{openRoles.length > 0 ? ` · ${openRoles.length} open` : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  {selectedDepartment && (
                    <button
                      type="button"
                      className="dept-back-btn"
                      onClick={() => setSelectedDepartment(null)}
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
                <div className="dept-group" key={department}>
                  <h2 className="dept-group-title">
                    {department}
                    {openRoles.length > 0 && (
                      <span className="dept-group-count">{openRoles.length} open</span>
                    )}
                  </h2>

                  {openRoles.length > 0 && (() => {
                    const previewRole = openRoles.find(r => r.id === previewRoleId) || openRoles[0];
                    const canonicalMatch = previewRole ? matchCanonicalRole(department, previewRole.role) : null;
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
                            <button
                              type="button"
                              className="dept-role-preview-link"
                              onClick={() => {
                                setSelected(previewRole.id);
                                setViewStage("detail");
                                setCandidate(v => ({ ...v, location: previewRole.locations.length === 1 ? previewRole.locations[0] : "", open_to_relocate: false }));
                                setAnswers({});
                                setTouched({});
                                invalidate();
                              }}
                            >
                              View full details →
                            </button>
                          </div>
                        )}

                        {openRoles.map(role => {
                          const Icon = roleIcon(role.role);
                          return (
                            <button
                              type="button"
                              disabled={busy}
                              aria-pressed={selected === role.id}
                              key={role.id}
                              onMouseEnter={() => setPreviewRoleId(role.id)}
                              onFocus={() => setPreviewRoleId(role.id)}
                              onClick={() => {
                                setSelected(role.id);
                                setViewStage("detail");
                                setCandidate(v => ({ ...v, location: role.locations.length === 1 ? role.locations[0] : "", open_to_relocate: false }));
                                setAnswers({});
                                setTouched({});
                                invalidate();
                              }}
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
                            </button>
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
                          <li key={r.title} className="dept-directory-item" title={`${r.task} Duration: ${r.duration}`}>{r.title}</li>
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

          {!c && !loading && allCities.length > 0 && (
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
                          setCityFilter(next);
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

          {!c && !loading && (
            <section className="job-alerts-panel">
              <div className="job-alerts-text">
                <h2>
                  Never miss out on the latest <span>career opportunities</span>
                </h2>
                <p>Get notified the moment a role that fits opens up.</p>
                <a
                  className="job-alerts-btn"
                  href="mailto:hr@chirayupower.com?subject=Job%20alerts%20sign-up"
                >
                  <Bell size={16} aria-hidden="true" />
                  Get Job Alerts
                </a>
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
                </div>
                <span className="hiring-tag">Solar & renewable energy</span>
              </div>

              <form ref={form} onSubmit={e => { e.preventDefault(); void submit(); }}>
                <fieldset disabled={busy}>
                  <div className="hiring-fields">
                    {/* Location: State -> District, or "open to relocate anywhere" */}
                    <label>
                      Preferred location *
                      <label className="relocate-checkbox-row">
                        <input
                          type="checkbox"
                          checked={candidate.open_to_relocate}
                          onChange={e => {
                            const checked = e.target.checked;
                            setCandidate({ ...candidate, open_to_relocate: checked, location: checked ? "Open to relocate" : "" });
                            markTouched("location");
                            invalidate();
                          }}
                        />
                        I am comfortable to relocate to any location
                      </label>

                      {candidate.open_to_relocate ? (
                        <p className="field-hint">
                          Currently we have openings in {formatStateList(Object.keys(locationsByState))}.
                        </p>
                      ) : (
                        <div className="location-select-row">
                          <select
                            required
                            aria-label="State"
                            className={touched.location ? (errors.location ? "is-invalid" : "is-valid") : ""}
                            value={selectedState}
                            onBlur={() => markTouched("location")}
                            onChange={e => {
                              setSelectedState(e.target.value);
                              setCandidate({ ...candidate, location: "" });
                              invalidate();
                            }}
                          >
                            <option value="">Select a state</option>
                            {Object.keys(locationsByState).sort((a, b) => a.localeCompare(b)).map(state => (
                              <option key={state} value={state}>{state}</option>
                            ))}
                          </select>

                          {districtsInState.length > 3 ? (
                            <SearchableSelect
                              options={districtsInState}
                              value={candidate.location}
                              disabled={!selectedState}
                              placeholder={selectedState ? "Search or select district..." : "Select a state first"}
                              ariaLabel="District"
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
                              aria-label="District"
                              disabled={!selectedState}
                              className={touched.location ? (errors.location ? "is-invalid" : "is-valid") : ""}
                              value={candidate.location}
                              onBlur={() => markTouched("location")}
                              onChange={e => {
                                setCandidate({ ...candidate, location: e.target.value });
                                markTouched("location");
                                invalidate();
                              }}
                            >
                              <option value="">{selectedState ? "Select a district" : "Select a state first"}</option>
                              {districtsInState.map(l => (
                                <option key={l} value={l}>{l}</option>
                              ))}
                            </select>
                          )}
                        </div>
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
                                      setSelected(m.id);
                                      setViewStage("detail");
                                      setCandidate(v => ({ ...v, location: m.locations.length === 1 ? m.locations[0] : "", open_to_relocate: false }));
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
                    <strong>Upload your resume *</strong>
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
                </fieldset>

                {busy && (
                  <p role="status">
                    Submitting your application and resume…
                  </p>
                )}

                <button className="hiring-submit" type="submit" disabled={!hasResume || busy || hasFormErrors}>
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



