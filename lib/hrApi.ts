export async function hrFetch(accessToken: string, path: string, init?: RequestInit) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || "Request failed");
  return json;
}
