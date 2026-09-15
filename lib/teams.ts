import { env } from "./hiring/server";

// Meetings are created on a single shared organizer mailbox (TEAMS_ORGANIZER_UPN) via
// Microsoft Graph application permissions (client-credentials auth) so any HR user can
// schedule one without needing their own delegated Graph consent. Requires an Azure AD
// app registration with admin-consented OnlineMeetings.ReadWrite.All + Calendars.ReadWrite.

let cachedToken: { token: string; expiresAt: number } | null = null;

async function graphToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30000) return cachedToken.token;
  const tenant = env("MS_GRAPH_TENANT_ID");
  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST", signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("MS_GRAPH_CLIENT_ID"),
      client_secret: env("MS_GRAPH_CLIENT_SECRET"),
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!response.ok) throw new Error("Failed to authenticate with Microsoft Graph");
  const json = await response.json();
  cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in || 3600) * 1000 };
  return cachedToken.token;
}

export async function createTeamsMeeting(params: {
  subject: string;
  startISO: string;
  endISO: string;
  timeZone: string;
  candidateEmail: string;
  candidateName: string;
  hrEmail: string;
  bodyText: string;
}): Promise<{ eventId: string; joinUrl: string }> {
  const token = await graphToken();
  const organizer = env("TEAMS_ORGANIZER_UPN");
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizer)}/events`, {
    method: "POST", signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: params.subject,
      body: { contentType: "Text", content: params.bodyText },
      start: { dateTime: params.startISO, timeZone: params.timeZone },
      end: { dateTime: params.endISO, timeZone: params.timeZone },
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness",
      attendees: [
        { emailAddress: { address: params.candidateEmail, name: params.candidateName }, type: "required" },
        { emailAddress: { address: params.hrEmail, name: params.hrEmail }, type: "required" },
      ],
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Failed to create Teams meeting${errText ? `: ${errText}` : ""}`);
  }
  const json = await response.json();
  const joinUrl = json.onlineMeeting?.joinUrl;
  if (!joinUrl) throw new Error("Teams meeting was created without a join link");
  return { eventId: json.id, joinUrl };
}

export async function cancelTeamsMeeting(eventId: string): Promise<void> {
  const token = await graphToken();
  const organizer = env("TEAMS_ORGANIZER_UPN");
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizer)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE", signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 404) throw new Error("Failed to cancel Teams meeting");
}
