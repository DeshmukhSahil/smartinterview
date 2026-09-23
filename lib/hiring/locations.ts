// Maps a hiring campaign's approved location strings (public.hiring_campaigns.locations,
// free text set by HR) to a state, so the careers apply form can offer a State -> District
// picker instead of one flat list.
//
// Grounded in every distinct location string actually in use across hiring_campaigns as of
// 2026-09-23 (queried directly, not guessed). Two spellings exist for the same city --
// "Ch. Sambhaji Nagar" and "Chh. Sambhaji Nagar" (Chhatrapati Sambhaji Nagar) -- both are
// mapped rather than silently merged, since the underlying campaign rows use either one.
//
// HR can type any new city into a campaign's locations at any time (campaignSchema.locations
// is free text); a location not in this map falls into "Other" rather than crashing the
// apply form. When Chirayu expands hiring into a genuinely new state, add its cities here.
export const LOCATION_STATE: Record<string, string> = {
  // Maharashtra
  "Akola": "Maharashtra",
  "Amravati": "Maharashtra",
  "Buldana": "Maharashtra",
  "Butibori": "Maharashtra",
  "Ch. Sambhaji Nagar": "Maharashtra",
  "Chh. Sambhaji Nagar": "Maharashtra",
  "Khamgaon": "Maharashtra",
  "Kolhapur": "Maharashtra",
  "Mumbai": "Maharashtra",
  "Nagpur": "Maharashtra",
  "Nanded": "Maharashtra",
  "Nashik": "Maharashtra",
  "Pune": "Maharashtra",
  "Sangli": "Maharashtra",
  "Satara": "Maharashtra",
  "Shegaon": "Maharashtra",
  "Solapur": "Maharashtra",
  "Wardha": "Maharashtra",
  // Madhya Pradesh
  "Bhopal": "Madhya Pradesh",
  "Chhindwara": "Madhya Pradesh",
  "Gwalior": "Madhya Pradesh",
  "Indore": "Madhya Pradesh",
  "Jabalpur": "Madhya Pradesh",
  "Rewa": "Madhya Pradesh",
  "Satna": "Madhya Pradesh",
};

const OTHER_STATE = "Other";

export function stateForLocation(location: string): string {
  return LOCATION_STATE[location] || OTHER_STATE;
}

// Groups a campaign's own approved locations (c.locations) by state, sorted, for the
// State -> District picker. Only states actually present in `locations` show up --
// this never offers a state/district the role doesn't have.
export function groupLocationsByState(locations: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const loc of locations) {
    const state = stateForLocation(loc);
    (grouped[state] ||= []).push(loc);
  }
  for (const state of Object.keys(grouped)) grouped[state].sort((a, b) => a.localeCompare(b));
  return grouped;
}

// "Currently we have openings in X and Y." / "...in X, Y and Z." — used for the message
// shown when a candidate checks "open to relocate anywhere".
export function formatStateList(states: string[]): string {
  const sorted = [...states].sort((a, b) => a.localeCompare(b));
  if (sorted.length === 0) return "";
  if (sorted.length === 1) return sorted[0];
  if (sorted.length === 2) return `${sorted[0]} and ${sorted[1]}`;
  return `${sorted.slice(0, -1).join(", ")} and ${sorted[sorted.length - 1]}`;
}
