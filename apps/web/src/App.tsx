import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  client,
  type Candidate,
  type Entity,
  type Mailbox,
  type ScanJob,
  type User,
} from "./api";

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("reviewer@example.com");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await client.login(email);
      onLogin(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="panel login-card stack" onSubmit={submit}>
        <div className="brand">
          <h1>Email Task Agent</h1>
          <p>
            Prototype review console for compliance tasks extracted from mailbox
            scans. Nothing becomes a CiviSight task until a human approves it.
          </p>
        </div>
        {error && <div className="banner error">{error}</div>}
        <label>
          Work email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </label>
        <button className="btn" disabled={busy} type="submit">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function CandidateDetail({
  candidateId,
  entities,
  onChanged,
}: {
  candidateId: string;
  entities: Entity[];
  onChanged: () => void;
}) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [duplicates, setDuplicates] = useState<
    Array<{ id: string; title: string; status: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    deadline: "",
    submittedTo: "",
    portalLink: "",
    priority: "medium",
    entityHint: "",
    countyId: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await client.candidate(candidateId);
        if (cancelled) return;
        setCandidate(res.candidate);
        setDuplicates(res.possibleDuplicates);
        setForm({
          title: res.candidate.title,
          description: res.candidate.description,
          deadline: res.candidate.deadline
            ? new Date(res.candidate.deadline).toISOString().slice(0, 16)
            : "",
          submittedTo: res.candidate.submitted_to ?? "",
          portalLink: res.candidate.portal_link ?? "",
          priority: res.candidate.priority,
          entityHint: res.candidate.entity_hint ?? "",
          countyId: res.candidate.county_id ?? "",
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  async function approve() {
    if (!candidate) return;
    setBusy(true);
    setError(null);
    try {
      await client.approve(candidate.id, {
        title: form.title,
        description: form.description,
        deadline: form.deadline
          ? new Date(form.deadline).toISOString()
          : null,
        submittedTo: form.submittedTo,
        portalLink: form.portalLink || null,
        priority: form.priority,
        entityHint: form.entityHint,
        countyId: form.countyId,
      });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  if (!candidate) {
    return <div className="panel">{error ?? "Loading candidate…"}</div>;
  }

  return (
    <div className="panel drawer">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>Review candidate</h2>
        <span className="pill">{candidate.status}</span>
      </div>
      {error && <div className="banner error">{error}</div>}

      <div className="meta">
        Source: {candidate.source_subject} · {candidate.source_sender} ·{" "}
        {fmtDate(candidate.source_sent_at)} · confidence{" "}
        {(candidate.confidence * 100).toFixed(0)}%
      </div>

      {(candidate.missing_fields?.length ?? 0) > 0 && (
        <div className="banner error">
          Missing fields: {candidate.missing_fields.join(", ")}
        </div>
      )}

      {duplicates.length > 0 && (
        <div className="banner">
          Possible duplicates:{" "}
          {duplicates.map((d) => `${d.title} (${d.status})`).join("; ")}
        </div>
      )}

      <div className="evidence">
        {(candidate.evidence ?? []).map((e, idx) => (
          <blockquote key={idx}>
            “{e.quote}”
            <div className="meta">{e.reason}</div>
          </blockquote>
        ))}
      </div>

      <label>
        Title
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </label>
      <label>
        Description
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </label>
      <div className="row">
        <label style={{ flex: 1 }}>
          Deadline
          <input
            type="datetime-local"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          />
        </label>
        <label style={{ flex: 1 }}>
          Priority
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
      </div>
      <label>
        Submitted to
        <input
          value={form.submittedTo}
          onChange={(e) => setForm({ ...form, submittedTo: e.target.value })}
        />
      </label>
      <label>
        Portal link
        <input
          value={form.portalLink}
          onChange={(e) => setForm({ ...form, portalLink: e.target.value })}
        />
      </label>
      <label>
        Entity hint
        <input
          value={form.entityHint}
          onChange={(e) => setForm({ ...form, entityHint: e.target.value })}
        />
      </label>
      <label>
        CiviSight county / entity
        <select
          value={form.countyId}
          onChange={(e) => setForm({ ...form, countyId: e.target.value })}
        >
          <option value="">Select entity…</option>
          {entities.map((ent) => (
            <option key={ent.id} value={ent.id}>
              {ent.name} ({ent.type})
            </option>
          ))}
        </select>
      </label>

      <div className="row">
        <button className="btn" disabled={busy} onClick={approve} type="button">
          Edit & approve
        </button>
        <button
          className="btn secondary"
          disabled={busy}
          type="button"
          onClick={async () => {
            await client.ignore(candidate.id);
            onChanged();
          }}
        >
          Ignore
        </button>
        <button
          className="btn warn"
          disabled={busy}
          type="button"
          onClick={async () => {
            await client.markDuplicate(candidate.id);
            onChanged();
          }}
        >
          Mark duplicate
        </button>
        {candidate.sourceDeepLink && (
          <a
            className="btn secondary"
            href={candidate.sourceDeepLink}
            target="_blank"
            rel="noreferrer"
          >
            Open source email
          </a>
        )}
      </div>
    </div>
  );
}

function Dashboard({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedMailbox, setSelectedMailbox] = useState("");
  const [days, setDays] = useState(30);
  const [queryPreview, setQueryPreview] = useState("newer_than:30d");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("needs_review");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activeMailbox = useMemo(
    () => mailboxes.find((m) => m.id === selectedMailbox),
    [mailboxes, selectedMailbox],
  );

  async function refresh() {
    const [mb, sc, cand, ents] = await Promise.all([
      client.mailboxes(),
      client.scans(),
      client.candidates(filter || undefined),
      client.entities(),
    ]);
    setMailboxes(mb.mailboxes);
    setJobs(sc.jobs);
    setCandidates(cand.candidates);
    setEntities(ents.entities);
    if (!selectedMailbox && mb.mailboxes[0]) {
      setSelectedMailbox(mb.mailboxes[0].id);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth") === "success") {
      setMessage("Gmail mailbox connected.");
      window.history.replaceState({}, "", "/");
    } else if (params.get("oauth") === "error") {
      setError(params.get("message") || "OAuth failed");
      window.history.replaceState({}, "", "/");
    }
  }, []);

  useEffect(() => {
    refresh().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const mailbox = mailboxes.find((m) => m.id === selectedMailbox);
    if (!mailbox) return;
    if (mailbox.provider === "gmail") {
      setQueryPreview(`newer_than:${days}d`);
    } else {
      setQueryPreview(`last_${days}_days`);
    }
  }, [selectedMailbox, days, mailboxes]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (jobs.some((j) => j.status === "queued" || j.status === "running")) {
        refresh().catch(() => undefined);
      }
    }, 2500);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>Email Task Agent</h1>
          <p>
            Connect a mailbox, scan a bounded window, review extracted compliance
            candidates, then export CiviSight-compatible JSON. No silent task
            creation.
          </p>
        </div>
        <div className="row">
          <span className="pill muted">{user.email}</span>
          <button
            className="btn secondary"
            type="button"
            onClick={async () => {
              await client.logout();
              onLogout();
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {message && <div className="banner">{message}</div>}
      {error && <div className="banner error">{error}</div>}

      <div className="grid grid-2">
        <section className="panel stack">
          <h2>Mailbox & scan</h2>
          <div className="row">
            <button
              className="btn"
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const { url } = await client.startGmailOAuth();
                  window.location.href = url;
                } catch (err) {
                  setError(err instanceof Error ? err.message : "OAuth failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Connect Gmail (readonly)
            </button>
            <button
              className="btn secondary"
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await client.connectFixture();
                  setMessage("Fixture mailbox connected.");
                  await refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Use fixture mailbox
            </button>
          </div>

          <label>
            Connected mailbox
            <select
              value={selectedMailbox}
              onChange={(e) => setSelectedMailbox(e.target.value)}
            >
              <option value="">Select…</option>
              {mailboxes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.provider} · {m.email_address} ({m.status})
                </option>
              ))}
            </select>
          </label>

          <div className="row">
            <label style={{ flex: 1 }}>
              Scan window (days)
              <input
                type="number"
                min={1}
                max={90}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </label>
            <label style={{ flex: 2 }}>
              Provider query preview
              <input value={queryPreview} readOnly />
            </label>
          </div>

          <button
            className="btn"
            type="button"
            disabled={!selectedMailbox || busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const res = await client.startScan(
                  selectedMailbox,
                  days,
                  activeMailbox?.provider === "gmail" ? queryPreview : undefined,
                );
                setMessage(`Scan started (${res.jobId}) with query ${res.query}`);
                await refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Scan failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Start scan
          </button>

          <h3>Scan history</h3>
          {jobs.length === 0 ? (
            <div className="empty">No scans yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Query</th>
                  <th>Seen</th>
                  <th>Candidates</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <span className="pill muted">{j.status}</span>
                      {j.error_message && (
                        <div className="meta">{j.error_message}</div>
                      )}
                    </td>
                    <td>{j.query}</td>
                    <td>{j.messages_seen}</td>
                    <td>{j.candidates_created}</td>
                    <td>{fmtDate(j.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel stack">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2>Review queue</h2>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="needs_review">needs_review</option>
              <option value="approved">approved</option>
              <option value="ignored">ignored</option>
              <option value="duplicate">duplicate</option>
              <option value="exported">exported</option>
              <option value="">all</option>
            </select>
          </div>

          <div className="row">
            <button
              className="btn secondary"
              type="button"
              onClick={async () => {
                try {
                  const res = await client.exportApproved();
                  setExportJson(JSON.stringify(res.exported, null, 2));
                  setMessage(
                    `Exported ${res.exported.length} payload(s)${
                      res.errors.length ? `, ${res.errors.length} error(s)` : ""
                    }.`,
                  );
                  await refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Export failed");
                }
              }}
            >
              Export approved JSON
            </button>
          </div>

          {exportJson && <pre className="export-box">{exportJson}</pre>}

          <div className="candidate-list">
            {candidates.length === 0 ? (
              <div className="empty">No candidates in this filter.</div>
            ) : (
              candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`candidate-card ${selectedId === c.id ? "active" : ""}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <h3>{c.title}</h3>
                  <div className="meta">
                    {c.submitted_to || "submittedTo missing"} · deadline{" "}
                    {fmtDate(c.deadline)} · {c.priority}
                  </div>
                  <div className="meta">
                    {c.entity_hint || "no entity hint"} ·{" "}
                    {(c.confidence * 100).toFixed(0)}% · {c.source_subject}
                  </div>
                  <div className="row" style={{ marginTop: 8 }}>
                    <span className="pill">{c.status}</span>
                    {(c.missing_fields?.length ?? 0) > 0 && (
                      <span className="pill warn">missing fields</span>
                    )}
                    {(c.possible_duplicate_ids?.length ?? 0) > 0 && (
                      <span className="pill warn">possible duplicate</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <div style={{ marginTop: 18 }}>
        {selectedId ? (
          <CandidateDetail
            candidateId={selectedId}
            entities={entities}
            onChanged={async () => {
              setSelectedId(null);
              await refresh();
            }}
          />
        ) : (
          <div className="panel empty">
            Select a candidate to review evidence, edit fields, and approve.
          </div>
        )}
      </div>
    </div>
  );
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="login-wrap">Loading…</div>;
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
