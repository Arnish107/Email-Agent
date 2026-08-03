# Email Task Agent

Standalone reference prototype for scanning a user's mailbox, extracting actionable government-compliance tasks, requiring human review, and exporting CiviSight-compatible task payloads.

This is **not** a patch to CiviSight. It is an inspectable local implementation of the workflow and data model so the same seams can later move into CiviSight's Express backend.

## What it does

1. Sign in (demo email session for the prototype)
2. Connect a mailbox with **read-only** OAuth (`gmail.readonly`) or use bundled fixture emails
3. Start a bounded scan (for example last 7 / 30 days)
4. Extract candidate tasks (LLM if configured, otherwise deterministic fallback)
5. Review candidates with source evidence, confidence, and missing fields
6. Approve / edit / ignore / mark duplicate
7. Export approved items as CiviSight JSON  
   Optional posting to CiviSight is **off by default**

## Non-negotiable safety rules

- **No silent task creation.** Every candidate must be reviewed before export/post.
- **Least-privilege scopes:** Gmail `gmail.readonly`; Microsoft `Mail.Read` when enabled.
- **Tokens encrypted at rest** with AES-256-GCM (`TOKEN_ENCRYPTION_KEY`).
- **No full email body retention** in durable candidate records. Stored fields are metadata, short evidence snippets, and a body hash for duplicate detection.
- **We do not train or fine-tune models on user emails.** Email content may be sent to a configured LLM provider only for one-shot extraction during a scan. Prefer leaving `OPENAI_API_KEY` empty in sensitive environments to use the local fallback parser only.

## Stack

- API: Node.js, Express, TypeScript, Postgres (PGlite locally by default; Docker Postgres optional)
- Jobs: database-backed queue + in-process worker (BullMQ-ready shape later)
- Web: React + Vite
- Providers: Gmail OAuth, Microsoft/Outlook OAuth, generic IMAP (any mailbox), fixture provider for local demo

## Quick start

### 1. Prerequisites

- Node.js 20+
- Optional: Docker, if you want real Postgres instead of embedded PGlite

### 2. Install

```bash
cp .env.example .env
npm install
npm run migrate
```

By default `.env` uses embedded **PGlite** (`DATABASE_URL=pglite`) so you can demo without Docker.

To use Docker Postgres instead:

```bash
npm run db:up
# set DATABASE_URL=postgres://email_agent:email_agent@localhost:5433/email_task_agent
# set USE_PGLITE=false
npm run migrate
```

### 3. Run

```bash
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:4000/api/health

### 4. Local demo (no Google Cloud required)

1. Open the web app and sign in with any email
2. Click **Use fixture mailbox**
3. Set scan window to `30` days and **Start scan**
4. Open candidates in the review queue
5. Fill missing fields / select a CiviSight entity, then **Edit & approve**
6. Click **Export approved JSON**

### 5. Gmail OAuth demo

1. Create a Google Cloud OAuth client (Web application)
2. Add redirect URI `http://localhost:4000/api/oauth/gmail/callback`
3. Enable Gmail API
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
5. Click **Connect Gmail (readonly)** and consent

Requested scope: `https://www.googleapis.com/auth/gmail.readonly`

## Tests

```bash
npm test
```

Coverage includes:

- email normalization
- extraction schema validation
- FYI / newsletter produce no tasks
- missing fields surfaced
- approval export payload shape
- duplicate detection
- OAuth callback rejects invalid/expired state

Fixture emails live in `apps/api/fixtures/emails/`.

## Environment highlights

See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `TOKEN_ENCRYPTION_KEY` | 64-hex-char key for OAuth token encryption |
| `DATABASE_URL` | Postgres connection string |
| `GOOGLE_CLIENT_*` | Gmail OAuth |
| `GEMINI_API_KEY` | Preferred LLM for extraction (Google Gemini) |
| `GEMINI_MODEL` | Gemini model id (default `gemini-2.0-flash`) |
| `OPENAI_API_KEY` | Optional OpenAI-compatible extraction fallback |
| `ENABLE_CIVISIGHT_POSTING` | Must be `true` to POST tasks |
| `CIVISIGHT_API_BASE_URL` / `CIVISIGHT_ADMIN_TOKEN` | Optional upstream posting |

## Privacy & retention

- Candidate rows store provider message id, sender, subject, sent date, evidence snippets, and body hash — not full bodies.
- Audit log events: mailbox connected, scan started/completed, candidate created/approved/ignored, task exported, task posted to CiviSight.
- Do not use this prototype to persist production mailboxes without a security review.

## Limitations

- Microsoft Graph provider is scaffolded, not fully enabled
- Demo auth is not production identity
- In-process worker is single-instance only
- Entity catalog is a local JSON file, not live CiviSight data
- LLM extraction quality depends on the configured model

## Repo layout

```
apps/api   Express API, migrations, providers, extraction, tests
apps/web   React review UI
ARCHITECTURE.md   Tradeoffs and CiviSight adaptation notes
```

## CiviSight export shape

Approved candidates export as:

```json
[
  {
    "source": {
      "type": "email",
      "provider": "gmail",
      "messageId": "...",
      "threadId": "...",
      "subject": "...",
      "sender": "...",
      "sentAt": "..."
    },
    "task": {
      "title": "...",
      "description": "...",
      "countyId": "...",
      "deadline": "...",
      "submittedTo": "...",
      "portalLink": "...",
      "priority": "medium",
      "assignedRoles": [],
      "assignedContactIds": []
    },
    "review": {
      "approvedBy": "...",
      "approvedAt": "...",
      "confidence": 0.86,
      "evidence": []
    }
  }
]
```

Before adapting into CiviSight, review OAuth storage, scopes, access control, logs, and LLM data handling.
