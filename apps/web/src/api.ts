export type User = {
  id: string;
  email: string;
  displayName: string | null;
};

export type Mailbox = {
  id: string;
  provider: string;
  email_address: string;
  scope: string;
  status: string;
  last_scan_at: string | null;
};

export type ScanJob = {
  id: string;
  mailbox_connection_id: string;
  status: string;
  query: string;
  window_start: string | null;
  window_end: string | null;
  messages_seen: number;
  candidates_created: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

export type Candidate = {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  submitted_to: string | null;
  portal_link: string | null;
  priority: string;
  entity_hint: string | null;
  county_id: string | null;
  confidence: number;
  status: string;
  source_subject: string;
  source_sender: string;
  source_sent_at: string | null;
  provider_message_id: string;
  source_thread_id: string | null;
  evidence: Array<{ quote: string; reason: string }>;
  missing_fields: string[];
  possible_duplicate_ids: string[];
  provider?: string;
  sourceDeepLink?: string | null;
  assigned_role_hints?: string[];
};

export type Entity = {
  id: string;
  name: string;
  type: string;
  code: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export type ProviderInfo = {
  id: string;
  label: string;
  scope?: string;
  configured: boolean;
  note?: string;
};

export const client = {
  me: () => api<{ user: User }>("/api/auth/me"),
  login: (email: string) =>
    api<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  logout: () => api<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  mailboxes: () => api<{ mailboxes: Mailbox[] }>("/api/mailboxes"),
  providers: () =>
    api<{ providers: ProviderInfo[] }>("/api/mailboxes/providers"),
  connectFixture: () =>
    api<{ mailboxId: string; email: string }>("/api/mailboxes/fixture/connect", {
      method: "POST",
    }),
  disconnectMailbox: (id: string) =>
    api<{ ok: boolean }>(`/api/mailboxes/${id}`, { method: "DELETE" }),
  startGmailOAuth: () =>
    api<{ url: string }>("/api/mailboxes/oauth/gmail/start"),
  startScan: (mailboxId: string, days: number, query?: string) =>
    api<{ jobId: string; query: string }>("/api/scans", {
      method: "POST",
      body: JSON.stringify({ mailboxId, days, query }),
    }),
  scans: () => api<{ jobs: ScanJob[] }>("/api/scans"),
  candidates: (status?: string) =>
    api<{ candidates: Candidate[] }>(
      status ? `/api/candidates?status=${encodeURIComponent(status)}` : "/api/candidates",
    ),
  candidate: (id: string) =>
    api<{
      candidate: Candidate;
      entities: Entity[];
      possibleDuplicates: Array<{ id: string; title: string; status: string }>;
    }>(`/api/candidates/${id}`),
  approve: (id: string, body: Record<string, unknown>) =>
    api<{ candidate: Candidate }>(`/api/candidates/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  ignore: (id: string) =>
    api<{ candidate: Candidate }>(`/api/candidates/${id}/ignore`, {
      method: "POST",
    }),
  markDuplicate: (id: string) =>
    api<{ candidate: Candidate }>(`/api/candidates/${id}/duplicate`, {
      method: "POST",
    }),
  exportApproved: (ids?: string[]) =>
    api<{ exported: unknown[]; errors: Array<{ id: string; error: string }> }>(
      "/api/candidates/export",
      {
        method: "POST",
        body: JSON.stringify(ids ? { ids } : {}),
      },
    ),
  entities: () => api<{ entities: Entity[] }>("/api/entities"),
};
