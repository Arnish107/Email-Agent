# Architecture notes

## Why this shape

This prototype mirrors the seams CiviSight will need later:

1. **Mailbox connection** (OAuth, encrypted tokens, least-privilege scopes)
2. **Scan job** (bounded query window, async processing, audit events)
3. **Candidate** (reviewable extraction result, never an auto-created task)
4. **Export / optional post** (CiviSight payload validation before anything is written upstream)

Keeping those as separate tables and API resources makes it straightforward to lift the prototype into `/api/email-agent` routes inside CiviSight without rewriting the product rules.

## Tradeoffs

| Choice | Why | Cost |
| --- | --- | --- |
| Database-backed scan jobs + `setImmediate` worker | Fastest local MVP; no Redis required | Not multi-instance safe; swap for BullMQ later |
| Demo email login | Unblocks local UI without Identity/SSO | Must be replaced with real auth + admin role checks in CiviSight |
| Deterministic fallback extractor when no LLM key | Tests and demos work offline | Weaker recall/precision than a structured LLM call |
| Store evidence snippets + body hash, not full bodies | Privacy / retention posture from the brief | Re-open source email via provider deep link when needed |
| Fixture provider | Demo without Google Cloud setup | Not a substitute for real Gmail acceptance testing |
| AES-256-GCM token encryption at rest | Meets encrypted-token requirement with one env key | Key rotation / KMS still needed for production |
| Fuzzy entity matching with human confirmation | Avoid inventing `countyId` | Reviewer must always pick or confirm entity |

## Safety invariants

- Candidates start as `needs_review`.
- Approve requires `title`, `countyId`, `deadline`, and `submittedTo`.
- `ENABLE_CIVISIGHT_POSTING` defaults to `false`.
- Gmail auth requests `gmail.readonly` only.
- Audit log records connect / scan / candidate / export / post events.

## Suggested CiviSight adaptation path

1. Move schema into CiviSight migrations.
2. Replace demo auth with existing admin session + role gates.
3. Mount routes under `/api/email-agent`.
4. Replace in-process worker with the shared job infrastructure.
5. Add optional source metadata on tasks (column or comment).
6. Security-review OAuth storage, scopes, ACL, logs, and LLM data handling before merge.
