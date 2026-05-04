# Notification Prefs — Stage 6: Execution Prompt for GLM 5.1

> **This is the prompt GLM 5.1 reads to ship the feature.** It references
> `01-foundation.md` through `05-email-templates.md` for the literal code; this
> document provides the orchestration layer only — no new code is introduced here.
>
> Implementer: GLM 5.1.
> Reviewer: Claude Code (after each stage commit).
> Approver: Ahmed.
>
> Apply order: Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5 → PROGRESS.md commit.
> Stop on the first failed gate. Push back rather than adapt silently.

---

## Pre-flight — what GLM must verify before starting

Run this checklist exactly once, in order, before applying any code. Paste the literal output of each command inline in the pre-flight report.

- [ ] **Branch** — confirm you are on the correct branch:
  ```
  git branch --show-current
  ```
  Expected: `feat/013-departments`. If not, STOP and report.

- [ ] **Working tree** — inspect pre-existing dirty state:
  ```
  git status
  ```
  Acknowledge the pre-existing dirty paths (`hooks/use-presence.ts`, `skills-lock.json`) and confirm you will NOT touch them at any stage.

- [ ] **Plan docs exist** — verify all five plan docs are present with expected line counts:
  ```
  ls docs/superpowers/plans/notification-prefs/0{1,2,3,4,5}-*.md
  wc -l docs/superpowers/plans/notification-prefs/0{1,2,3,4,5}-*.md
  ```
  Expected approximate line counts: `01` ≈ 1034, `02` ≈ 1155, `03` ≈ 660, `04` ≈ 817, `05` ≈ 1032. If any file is missing or differs by more than 30 lines from these counts, STOP and report.

- [ ] **Baseline tsc** — confirm the repo is type-clean before any changes:
  ```
  npx tsc --noEmit
  echo "TSC_EXIT=$?"
  ```
  Expected: empty stdout, `TSC_EXIT=0`. If non-zero, STOP and report the full error output.

- [ ] **Baseline build** — confirm Next.js builds clean:
  ```
  npm run build 2>&1 | tail -50
  ```
  Expected: `✓ Compiled successfully` and a routes table. If failing, STOP and report.

- [ ] **Baseline Convex** — confirm schema is accepted:
  ```
  npx convex dev --once --typecheck=disable
  ```
  Expected: `Convex functions ready!` with no migration warning.

- [ ] **Resend key** — verify the Convex environment has `RESEND_API_KEY` set:
  ```
  npx convex env list | grep RESEND_API_KEY
  ```
  If absent, email sends will silently no-op (`[EMAIL_SKIP] RESEND_API_KEY not configured`) for the entire feature. This is NOT a blocker — in-app notifications fire regardless. Report the gap in the Stage 5 commit body so Ahmed can set it post-deploy.

- [ ] **Scope acknowledgement** — confirm explicitly before proceeding:
  - No production deploy (`npx convex deploy`)
  - No PR opened
  - No merge to `main` or `origin/002-agent-roles`
  - All commits push only to `feat/013-departments`

---

## Apply Order — the 5 implementation stages

Each stage is a single GLM session. Do NOT start a stage until the prior stage's commit is confirmed on `feat/013-departments` (verify with `git log --oneline -3`).

The plan docs contain the literal code. This document provides the order, gates, and protocol.

---

### Stage 1 — Foundation (`01-foundation.md`)

**Goal:** schema additions, helper files, and the two new Convex functions (`notifyDispatch`, `notifySend`). No call sites touched yet.

**Section apply order:** 1 → 2 → 3 → 4 → 7 → 5 → 6

Section 7 must come before Section 5 because `notifyDispatch` (§5) calls `notifySend` (§7) via `ctx.scheduler`; TypeScript infers the reference at compile time.

```
Step 1a — Apply Sections 1, 2, 3, 4 in order
  Section 1: schema additions to convex/schema.ts
    § 1a — split channel_expiring_soon literal (rename to channel_token_expired;
            add channel_expiring_soon back as a distinct literal)
    § 1b-1 — new notificationPreferences table
    § 1b-2 — add conversation_assigned literal to notifications.type union
  Section 2: convex/lib/notificationEvents.ts (new file)
  Section 3: add tryConsumeQuota to convex/lib/rateLimit.ts
  Section 4: add readPlan to convex/lib/tenants.ts

  After each file: npx tsc --noEmit && echo "TSC_EXIT=$?"
  Expected: TSC_EXIT=0 after each.

Step 1b — tsc gate
  npx tsc --noEmit
  echo "TSC_EXIT=$?"

Step 1c — convex dev gate
  npx convex dev --once --typecheck=disable
  Expected: "Convex functions ready!" — no migration warning.
  The schema changes are additive (new table, new literals appended to existing
  unions). If a migration warning appears for any of them, STOP and report —
  this is unexpected and requires Ahmed's decision before continuing.

Step 1d — Apply Section 7 (notifySend in convex/actions/notifyEmail.ts)
  This is the notifySend internalAction. Apply it before Section 5.
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 1e — tsc gate
  npx tsc --noEmit
  echo "TSC_EXIT=$?"

Step 1f — Apply Section 5 (convex/notifications.ts changes)
  Apply sub-section 5a first (fix internalCreate validator), then tsc.
  Apply sub-section 5b second (add notifyDispatch), then tsc.
  npx tsc --noEmit && echo "TSC_EXIT=$?" after each sub-section.

Step 1g — tsc gate
  npx tsc --noEmit
  echo "TSC_EXIT=$?"

Step 1h — Apply Section 6 (getPreferences + updatePreference CRUD in convex/notifications.ts)
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 1i — Final gates for Stage 1
  npx tsc --noEmit && echo "TSC_EXIT=$?"
  npm run build 2>&1 | tail -50
  Expected: TSC_EXIT=0 and "✓ Compiled successfully"

Step 1j — Commit & push
  git add convex/schema.ts \
          convex/lib/notificationEvents.ts \
          convex/lib/rateLimit.ts \
          convex/lib/tenants.ts \
          convex/actions/notifyEmail.ts \
          convex/notifications.ts
  git status   # verify: only these 6 paths are staged;
               # hooks/use-presence.ts and skills-lock.json must NOT appear as staged
  git commit   # (see Commit cadence section for message template)
  git push origin feat/013-departments
  git log --oneline -1   # paste output to confirm commit landed
```

**Files created/modified in Stage 1:** `convex/schema.ts`, `convex/lib/notificationEvents.ts` (new), `convex/lib/rateLimit.ts`, `convex/lib/tenants.ts`, `convex/actions/notifyEmail.ts`, `convex/notifications.ts`

---

### Stage 2 — Call Sites (`02-call-sites.md`)

**Goal:** migrate 9 existing notification call sites to `notifyDispatch`; add 3 new call sites; correct 1 misnamed literal; remove 3 unused `*Email` internalAction exports from `notifyEmail.ts`.

**Dependency:** Stage 1 commit must be confirmed on `feat/013-departments` before starting.

**Important:** `slaBreachEmail`, `followupDueEmail`, and `newAssignmentEmail` are named `internalAction` exports inside `convex/actions/notifyEmail.ts` — they are NOT separate files. Removing them means deleting their function bodies from that file. No `git rm` is needed.

```
Step 2a — Verify Section 0 match (read-only, no code written)
  Before applying anything: read 02-call-sites.md Section 0 (§0a + §0b).
  Compare the specified signatures for notifyDispatch and notifySend against
  what actually landed in Stage 1.
  If any parameter name, field name, or call signature differs from what
  Section 0 specifies, STOP and report. Do NOT reconcile silently.
  If they match, this step is a no-op — proceed to Step 2b.

Step 2b — Apply Section 0 patches if any delta was found in 2a
  Apply §0a (notifyDispatch patch in convex/notifications.ts) if needed.
  Apply §0b (notifySend patch in convex/actions/notifyEmail.ts) if needed.
  npx tsc --noEmit && echo "TSC_EXIT=$?"
  (If no delta was found in Step 2a, skip to Step 2c.)

Step 2c — Apply Section 0.5 — schema literal addition
  MANDATORY before any M5, A1, or A2 site. Without the conversation_assigned
  literal in the schema, those sites reference an undeclared type and fail
  runtime validation. Apply §0.5 to convex/schema.ts.
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 2d — convex dev gate (after Section 0.5)
  npx convex dev --once --typecheck=disable
  Expected: no migration warning (additive literal to existing union).

Step 2e — Site M1 — convex/sla.ts (sla_breach)
  Apply § M1 exactly as written.
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 2f — Sites M2, M3 — convex/followUps.ts (followup_due sent + failed)
  Apply M2, then npx tsc --noEmit && echo "TSC_EXIT=$?"
  Apply M3, then npx tsc --noEmit && echo "TSC_EXIT=$?"
  One at a time; do not batch.

Step 2g — Sites M4, M5, A1, A2 — convex/conversations.ts
  Apply M4, then npx tsc --noEmit && echo "TSC_EXIT=$?"
  Apply M5, then npx tsc --noEmit && echo "TSC_EXIT=$?"
  Apply A1, then npx tsc --noEmit && echo "TSC_EXIT=$?"
  Apply A2, then npx tsc --noEmit && echo "TSC_EXIT=$?"
  One at a time; do not batch. M5, A1, A2 use conversation_assigned —
  confirm Section 0.5 is applied (Step 2c) before this step.

Step 2h — Site M6 — convex/messages.ts (conversation_reopened)
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 2i — Site A3 — convex/csat.ts (checkAndRecordResponse)
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 2j — Site T4 literal correction — convex/followUps.ts
  Change the type literal from channel_expiring_soon to channel_token_expired
  at the location specified in §T4 of 02-call-sites.md.
  This is a semantic correction: the prior literal was a copy-paste from the
  channel retention warning path; the actual event is a token expiry.
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 2k — Final cleanup — remove 3 unused *Email exports from notifyEmail.ts
  First, verify zero callers:
    grep -r "slaBreachEmail\|followupDueEmail\|newAssignmentEmail" \
      convex/ --include="*.ts" --include="*.tsx" -l
  Expected output: empty (no files listed).
  If any file is listed, STOP and report — do NOT delete with live callers.
  If zero callers confirmed: remove the slaBreachEmail, followupDueEmail, and
  newAssignmentEmail internalAction exports from convex/actions/notifyEmail.ts.
  Remove any associated imports that become unused as a result.
  Do NOT touch agentWelcomeEmail, billingPaymentFailedEmail, or
  billingSubscriptionExpiredEmail — those are transactional and must remain.
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 2l — Final gates for Stage 2
  npx tsc --noEmit && echo "TSC_EXIT=$?"
  npm run build 2>&1 | tail -50
  npx convex dev --once --typecheck=disable

Step 2m — Commit & push
  git add convex/schema.ts \
          convex/sla.ts \
          convex/followUps.ts \
          convex/conversations.ts \
          convex/messages.ts \
          convex/csat.ts \
          convex/actions/notifyEmail.ts
  git status   # verify: only these paths staged
  git commit   # (see Commit cadence section)
  git push origin feat/013-departments
  git log --oneline -1
```

**Files modified in Stage 2:** `convex/schema.ts` (§0.5 literal), `convex/sla.ts`, `convex/followUps.ts`, `convex/conversations.ts`, `convex/messages.ts`, `convex/csat.ts`, `convex/actions/notifyEmail.ts` (call sites migrated + 3 dead exports removed)

---

### Stage 3 — Data Contract (`03-data-contract.md`)

**Goal:** frontend-side event labels, the `useNotificationPreferences` hook, and the tabbed settings page wrapper + skeleton shell component (Stage 4 fills the skeleton body).

**Dependency:** Stage 2 commit must be confirmed on `feat/013-departments`.

```
Step 3a — Apply Section 1 (lib/notifications/eventLabels.ts — new file)
  Sections §1a (location decision) and §1b (full file body).
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 3b — Apply Section 2 (hooks/use-notification-preferences.ts — new file)
  Sections §2a through §2c (type signatures + full hook body).
  The optimistic update pattern in §2d is part of the hook body — include it.
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 3c — Apply Section 3
  §3b — updated app/(dashboard)/settings/notifications/page.tsx wrapper
  §3c — components/settings/notifications-tab-shell.tsx (skeleton only;
         Stage 4 Section 1b replaces this entire file with the full body)
  Apply page.tsx first, then tsc. Apply tab shell, then tsc.
  npx tsc --noEmit && echo "TSC_EXIT=$?"
  npm run build 2>&1 | tail -50

Step 3d — Commit & push
  git add lib/notifications/eventLabels.ts \
          hooks/use-notification-preferences.ts \
          app/(dashboard)/settings/notifications/page.tsx \
          components/settings/notifications-tab-shell.tsx
  git status   # verify
  git commit   # (see Commit cadence section)
  git push origin feat/013-departments
  git log --oneline -1
```

**Files created/modified in Stage 3:** `lib/notifications/eventLabels.ts` (new), `hooks/use-notification-preferences.ts` (new), `app/(dashboard)/settings/notifications/page.tsx` (updated), `components/settings/notifications-tab-shell.tsx` (new skeleton)

---

### Stage 4 — UI Components (`04-ui-components.md`)

**Goal:** replace the Stage 3 tab shell skeleton with the full body; add preferences component, row component, error boundary; update the bell badge; update page.tsx with the final wrapper.

**Dependency:** Stage 3 commit must be confirmed on `feat/013-departments`.

```
Step 4a — Apply Section 1b (notifications-tab-shell.tsx — full body)
  This REPLACES the skeleton written in Stage 3. Apply §1b exactly.
  The file already exists — overwrite it entirely.
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 4b — Apply Section 2 (components/settings/notifications-preferences.tsx — new file)
  Apply §2a (full file body) + §2c (free-plan banner JSX) + §2d (three-way
  loading guard). §2b (skeleton state JSX) is embedded in the full body.
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 4c — Apply Section 3 (components/settings/notifications-preferences-row.tsx — new file)
  Apply §3a (full file body). The plan-pill JSX (§3b) and toggle groups (§3c)
  are part of the full body — do not apply them separately.
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 4d — Apply Section 4 (components/settings/notifications-error-boundary.tsx — new file)
  Apply §4a (full class component). The wrapping pattern in §4b is used inside
  the tab shell (already applied in Step 4a) — no separate apply needed here.
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 4e — Apply Section 5 (bell badge update)
  Locate the shell component that renders the notification bell. If unsure:
    grep -r "NotificationBell\|bell.*badge\|unreadCount" \
      components/shell/ --include="*.tsx" -l
  Apply §5b (AFTER block) exactly. The BEFORE block (§5a) is for reference only.
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 4f — Apply Section 6 (updated page.tsx wrapper)
  This is a second update to app/(dashboard)/settings/notifications/page.tsx.
  Apply §Section 6 exactly as written in 04-ui-components.md.
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 4g — Final gates for Stage 4
  npx tsc --noEmit && echo "TSC_EXIT=$?"
  npm run build 2>&1 | tail -50

Step 4h — Commit & push
  # Find the bell badge file with the grep from Step 4e; add it explicitly
  BELL_FILE=$(grep -r "NotificationBell\|bell.*badge\|unreadCount" \
    components/shell/ --include="*.tsx" -l | head -1)
  git add components/settings/notifications-tab-shell.tsx \
          components/settings/notifications-preferences.tsx \
          components/settings/notifications-preferences-row.tsx \
          components/settings/notifications-error-boundary.tsx \
          app/(dashboard)/settings/notifications/page.tsx \
          "$BELL_FILE"
  git status   # verify: only the listed paths staged
  git commit   # (see Commit cadence section)
  git push origin feat/013-departments
  git log --oneline -1
```

**Files created/modified in Stage 4:** `components/settings/notifications-tab-shell.tsx` (full body replacement), `components/settings/notifications-preferences.tsx` (new), `components/settings/notifications-preferences-row.tsx` (new), `components/settings/notifications-error-boundary.tsx` (new), `app/(dashboard)/settings/notifications/page.tsx` (second update), the shell component holding the notification bell badge

---

### Stage 5 — Email Templates (`05-email-templates.md`)

**Goal:** 3 new email template files; wire them into `sendEmail.ts` (SUBJECTS entries + imports + buildElement switch cases); close the `mapEventToTemplateKey` gap in `notifyEmail.ts`.

**Dependency:** Stage 4 commit must be confirmed on `feat/013-departments`.

**Critical ordering constraint:** the 3 template files (Steps 5a–5c) MUST exist on disk before applying Section 4's `mapEventToTemplateKey` update (Step 5f). `notifySend` imports those files; TypeScript resolves the imports at compile time. Applying Step 5f before Steps 5a–5c guarantees a tsc failure.

```
Step 5a — Apply Section 5a (convex/emails/templates/conversationTransferred.tsx — new file)
  Apply the full file body from §5a of 05-email-templates.md.
  Verify it follows the canonical structure from Section 1:
    - named export (not default export)
    - two JSX return blocks (ar/en) inside a locale switch
    - WaEmailLayout with previewText prop
    - no "use node" directive
    - variables injected from props, not process.env
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 5b — Apply Section 5b (convex/emails/templates/conversationReopened.tsx — new file)
  Apply the full file body from §5b of 05-email-templates.md. Same pattern.
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 5c — Apply Section 5c (convex/emails/templates/csatReceived.tsx — new file)
  Apply the full file body from §5c of 05-email-templates.md. Same pattern.
  Tone is informational for low scores — no alarm framing. Verify this.
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 5d — Apply Section 3 (SUBJECTS additions to convex/actions/sendEmail.ts)
  Apply §3b (AFTER block): add 3 new entries to the SUBJECTS Record —
  conversation_transferred, conversation_reopened, csat_received.
  Do not touch any existing SUBJECTS entries.
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 5e — Apply Section 5d (import lines + buildElement cases in convex/actions/sendEmail.ts)
  Apply §5d (AFTER block): add 3 import lines at the top of the file and
  3 case branches inside the buildElement switch.
  Without these, buildElement throws TEMPLATE_NOT_FOUND at runtime for the
  3 new template keys.
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 5f — Apply Section 4 (mapEventToTemplateKey + null guard in convex/actions/notifyEmail.ts)
  Apply §4b (AFTER block):
    - 3 null returns become real templateKey strings
    - return type narrowed from string | null to string
    - the now-dead null guard in notifySend (which handled null from
      mapEventToTemplateKey) is removed explicitly
  npx tsc --noEmit && echo "TSC_EXIT=$?"

Step 5g — Final gates for Stage 5
  npx tsc --noEmit && echo "TSC_EXIT=$?"
  npm run build 2>&1 | tail -50
  npx convex dev --once --typecheck=disable
  # Optional render preview (if the script exists):
  ls scripts/test-email.ts 2>/dev/null && echo "preview script exists" || echo "no preview script"

Step 5h — Commit & push
  git add convex/emails/templates/conversationTransferred.tsx \
          convex/emails/templates/conversationReopened.tsx \
          convex/emails/templates/csatReceived.tsx \
          convex/actions/sendEmail.ts \
          convex/actions/notifyEmail.ts
  git status   # verify
  git commit   # (see Commit cadence section)
  git push origin feat/013-departments
  git log --oneline -1
```

**Files created/modified in Stage 5:** `convex/emails/templates/conversationTransferred.tsx` (new), `convex/emails/templates/conversationReopened.tsx` (new), `convex/emails/templates/csatReceived.tsx` (new), `convex/actions/sendEmail.ts` (SUBJECTS + imports + buildElement cases), `convex/actions/notifyEmail.ts` (mapEventToTemplateKey update + null guard removal)

---

### Final commit — PROGRESS.md entry

After all 5 implementation commits are pushed and all gates have passed:

```
Step 6a — Count changed files (needed for the PROGRESS.md entry)
  # Replace <stage1-commit> with the SHA of the Stage 1 commit
  git log --oneline | grep "feat(convex): add notification preferences foundation"
  # Then:
  git diff --name-only <stage1-commit>^..HEAD | sort -u | wc -l
  Note the count. It goes into the PROGRESS.md entry as <count>.

Step 6b — Append the PROGRESS.md entry
  Edit PROGRESS.md. Prepend the entry (from the "PROGRESS.md entry" section
  below) immediately after the first --- separator in the Recent Changes
  section, so the newest entry appears at the top of the list.
  Substitute:
    2026-MM-DD → the date this commit lands (today's date)
    <count>    → the file count from Step 6a

Step 6c — Commit & push (PROGRESS.md ONLY)
  git add PROGRESS.md
  git status   # verify: ONLY PROGRESS.md is staged — no other file
  git commit -m "$(cat <<'COMMITEOF'
docs: notification preferences feature complete — PROGRESS.md entry

Adds the Recent Changes entry for the notification preferences feature.
No source-file changes in this commit.
COMMITEOF
)"
  git push origin feat/013-departments
  git log --oneline -1
```

---

## Verification gates

### tsc gate (after every individual section)

```
npx tsc --noEmit
echo "TSC_EXIT=$?"
```

**Expected:** empty stdout, `TSC_EXIT=0`.

**On failure:** paste the full error output verbatim — file path, line number, error code, error message. Do NOT attempt to fix without reporting first. Use the escalation protocol.

### convex dev gate (only at steps 1c, 2d, 5g)

```
npx convex dev --once --typecheck=disable
```

**Expected:** `Convex functions ready!` with no migration warning.

**On migration warning:** both schema changes (new literals, new table) are additive. A migration warning is unexpected. If shown, STOP and report before proceeding.

**On other errors:** STOP and report.

### npm run build gate (only at steps 1i, 2l, 3c, 4g, 5g)

```
npm run build 2>&1 | tail -50
```

**Expected:** `✓ Compiled successfully` and routes table.

**On failure:** first try clearing the cache:

```
rm -rf .next && npm run build 2>&1 | tail -50
```

If still failing after cache clear, STOP and report. Do not auto-investigate.

---

## Commit cadence

Six commits total: five implementation commits + one PROGRESS.md commit. All push to `feat/013-departments`. No PRs, no merges, no `npx convex deploy`.

Always use explicit file paths in `git add` — never `git add -A` or `git add .`.

Use a HEREDOC to pass the commit message:

```bash
git commit -m "$(cat <<'COMMITEOF'
<subject line>

<body — see below>
COMMITEOF
)"
```

| Stage | Subject line |
|---|---|
| 1 | `feat(convex): add notification preferences foundation` |
| 2 | `refactor(convex): migrate notification call sites to notifyDispatch` |
| 3 | `feat(notifications): add prefs data contract and hook` |
| 4 | `feat(notifications): preferences UI with plan-gated toggles` |
| 5 | `feat(notifications): email templates for transferred/reopened/csat` |
| PROGRESS.md | `docs: notification preferences feature complete — PROGRESS.md entry` |

**Each implementation commit body must include:**

1. Which plan doc sections were applied (e.g., `01-foundation.md §§1, 2, 3, 4, 7, 5, 6`)
2. tsc exit code and npm run build outcome (paste inline)
3. Explicit list of all files modified / created / deleted

Example body (Stage 1):

```
Applied 01-foundation.md §§1, 2, 3, 4, 7, 5, 6.

tsc: TSC_EXIT=0
npm run build: ✓ Compiled successfully

Files:
  M  convex/schema.ts                  (schema additions: notificationPreferences table,
                                         conversation_assigned + channel_token_expired literals)
  A  convex/lib/notificationEvents.ts  (new — event type definitions + defaults + plan gates)
  M  convex/lib/rateLimit.ts           (added tryConsumeQuota helper)
  M  convex/lib/tenants.ts             (added readPlan helper)
  M  convex/actions/notifyEmail.ts     (added notifySend internalAction)
  M  convex/notifications.ts           (fixed internalCreate validator; added notifyDispatch + CRUD)
```

---

## Anti-instructions

- **DO NOT** apply stages out of order. Stage 1 first. Confirm each stage's commit is on `feat/013-departments` before starting the next.
- **DO NOT** apply Stage 2's M5, A1, or A2 sites before Section 0.5 (schema literal `conversation_assigned`) is applied and the convex dev gate passes. Without the literal, those call sites reference an undeclared type and fail runtime validation.
- **DO NOT** apply Stage 5's `mapEventToTemplateKey` update (Step 5f / Section 4) before the 3 template files exist on disk (Steps 5a–5c). `notifySend` imports those files; tsc fails if the files are absent.
- **DO NOT** use `git add -A` or `git add .`. Always specify file paths explicitly. Pre-existing dirty paths (`hooks/use-presence.ts`, `skills-lock.json`) must NOT appear in any commit.
- **DO NOT** open a PR. Do not merge to `main` or `origin/002-agent-roles`. Do not run `npx convex deploy`.
- **DO NOT** adapt the plan docs if they seem inconsistent with the codebase. If a plan section conflicts with current code, STOP and report.
- **DO NOT** add `// TODO` or `// FIXME` markers. Each stage produces complete code or stops and reports.
- **DO NOT** invent imports. If a plan section references a module that doesn't exist yet on disk, STOP and report.
- **DO NOT** wrap Convex mutation or action bodies in `try/catch`. Convex auto-rolls-back on throw; manual wrapping creates inconsistent error surfaces.
- **DO NOT** add `any` types. Use the smallest cast that satisfies the type system (`as unknown as <SpecificType>`), not `as any`.
- **DO NOT** modify schema literal unions beyond what the plan explicitly specifies per stage.
- **DO NOT** edit files in `convex/_generated/`. Convex regenerates them.
- **DO NOT** commit or push if any verification gate fails. STOP and report first.
- **DO NOT** use `git push --force` under any circumstance.
- **DO NOT** modify `CLAUDE.md`, `PROJECT_STATE.md`, or `AUDIT_REPORT.md`. Only `PROGRESS.md` changes, in its own dedicated commit.
- **DO NOT** add new helpers to `convex/lib/` beyond what the plan specifies. Every new lib file was explicitly planned.
- **DO NOT** add `console.log` without a bracketed prefix. New log lines must match the existing debug pattern: `[NOTIFY_DISPATCH]`, `[NOTIFY_SEND]`, etc.
- **DO NOT** delete `agentWelcomeEmail`, `billingPaymentFailedEmail`, or `billingSubscriptionExpiredEmail` from `notifyEmail.ts`. Only the three explicitly listed wrappers (`slaBreachEmail`, `followupDueEmail`, `newAssignmentEmail`) are removed.

---

## Escalation protocol

When any gate fails or any plan section is ambiguous, STOP. Do not adapt silently. Report using this exact structure:

```
ESCALATION REPORT

Stage:           <stage number and step, e.g. "Stage 2, step 2g (Site M4)">

Command run:
  <literal command, copied verbatim>

Output received:
  <literal output, no paraphrasing — paste in full>

Expected vs actual:
  Expected: <what the plan or gate specification says should happen>
  Actual:   <what happened>

Plan doc implicated:
  <file path>:<approximate line number> — <section header quoted>

Options (3 max, each with tradeoff):
  A) <option A description>
     Tradeoff: <what this gains vs risks>
  B) <option B description>
     Tradeoff: <what this gains vs risks>
  C) <option C description>
     Tradeoff: <what this gains vs risks>

Waiting for Ahmed or Claude Code decision before proceeding.
```

GLM does NOT choose an option autonomously. Execution is paused until Ahmed or Claude Code responds with a decision.

---

## Smoke check (post-deploy)

Run manually after all 5 implementation commits are deployed (`npx convex deploy` + Vercel redeploy — separate manual decision by Ahmed, not part of GLM's scope).

```
## Smoke check — notification preferences feature

After this feature is deployed (npx convex deploy + Vercel), verify the following:

### 1. Preferences page renders
- Navigate to /settings/notifications
- Default tab "Log" shows the existing notifications log
- Click the "Preferences" tab; URL becomes /settings/notifications?tab=preferences
- All 7 toggleable events render with their labels (en/ar) and descriptions
- Each event has 2 toggles: in-app + email

### 2. Plan gating visual
- (As a Free plan user) sla_breach and csat_received toggles are disabled with a "Growth+" pill
- (As a Free plan user) all email-channel toggles are disabled (any plan, any event — Free has no email channel)
- Tooltip on disabled rows points to /settings/billing

### 3. Save behavior (per-toggle, optimistic)
- Click any toggle; the toggle state flips immediately (optimistic update)
- The mutation fires in the background (network tab shows the Convex POST)
- The change persists across page reload
- If the mutation fails (artificial: revoke Convex token), the toggle reverts and a toast appears

### 4. End-to-end notification
- Pick an event (e.g., conversation_transferred)
- Set in-app: ON, email: ON
- Trigger the event (transfer a conversation to another agent)
- Verify: bell shows the new notification with the correct badge
- Verify: an email is delivered to the agent's address
  (requires RESEND_API_KEY to be set in Convex env — see pre-flight Step 7)

### 5. Daily email cap (manual to test)
- Trigger the same event 51 times for a Starter tenant (artificial)
- Verify: emails are sent for the first 50; the 51st is silently dropped
- In-app rows continue to fire normally (cap applies to email channel only)

### 6. Free-plan banner
- (As a Free plan user) the preferences page shows the "Email notifications are available on Starter plans and above" banner
- The banner has an Upgrade link to /settings/billing

### Expected feature state after deploy

- All 5 implementation commits landed on feat/013-departments
- npx tsc --noEmit clean
- npm run build succeeds
- npx convex dev accepts the schema with no migration warning
- 7 toggleable events × 2 channels = 14 toggle states per user
- Email defaults: sla_breach ON, conversation_assigned ON, channel_expiring_soon ON, others OFF (per Stage 1 §2)
- slaBreachEmail, followupDueEmail, newAssignmentEmail are gone from notifyEmail.ts
- agentWelcomeEmail, billingPaymentFailedEmail, billingSubscriptionExpiredEmail remain intact

If any item above fails, capture the error and revert the offending commits.
Do not push hotfixes from a failed smoke check — escalate to Ahmed.
```

---

## PROGRESS.md entry (final integration)

GLM appends this entry verbatim to `PROGRESS.md` in the final commit. Substitute before writing:
- `2026-MM-DD` → the actual calendar date the PROGRESS.md commit lands
- `<count>` → total distinct files changed across all 5 implementation commits  
  (`git diff --name-only <stage1-commit>^..HEAD | sort -u | wc -l`)

Prepend the entry immediately after the first `---` separator in the Recent Changes section so it appears at the top (newest first), matching the existing ordering pattern.

---

```markdown
### Notification Preferences Feature (2026-MM-DD)

Adds per-user notification preferences with channel-specific toggles. Users can opt
out of in-app or email notifications for each event type independently. Free plans get
in-app notifications only; Starter+ plans unlock the email channel. Two events
(sla_breach, csat_received) are Growth+-only.

**New schema:**
- `notificationPreferences` table — per-user × event-type × channel preferences (~14 rows per user max)
- New literals: `conversation_assigned` and `channel_token_expired` added to `notifications.type` union (alongside the legacy `new_assignment` and `channel_expiring_soon`)

**New code:**
- `convex/notifications.ts` — `notifyDispatch` (central mutation; reads prefs, gates by plan, writes in-app, schedules email), `notifySend` (action; resolves email via Clerk Node, dispatches to Resend), `getPreferences` + `updatePreference` (CRUD)
- `convex/lib/notificationEvents.ts` — single source of truth for event types, defaults, plan-gating, and the daily-email-cap key builder
- `convex/lib/rateLimit.ts` — `tryConsumeQuota` helper (soft cap, never throws — counterpart to `enforceRateLimit`)
- `convex/lib/tenants.ts` — `readPlan` helper (sync plan-fetch for mutation context)
- `convex/emails/templates/{conversationTransferred,conversationReopened,csatReceived}.tsx` — 3 new React Email templates
- `app/(dashboard)/settings/notifications/page.tsx` — tabbed page (Log + Preferences)
- `components/settings/notifications-{tab-shell,preferences,preferences-row,error-boundary}.tsx` — UI components
- `hooks/use-notification-preferences.ts` — single hook with optimistic updates + plan-aware gating flags
- `lib/notifications/eventLabels.ts` — UI-side event labels with en/ar translations

**Refactored:**
- 9 existing notification call sites migrated from direct `ctx.db.insert("notifications", ...)` to `notifyDispatch`
- 3 new call sites added to close gaps: `assign` and `assignInternal` now write in-app rows; `csat.ts checkAndRecordResponse` now dispatches a notification
- 3 unused `*Email` internalAction exports removed from `notifyEmail.ts`: `slaBreachEmail`, `followupDueEmail`, `newAssignmentEmail`
- `followUps.ts` literal corrected from `channel_expiring_soon` (semantic mismatch — was actually a token-expiry event) to `channel_token_expired`

**Cost economics:**
- Resend free tier (3000/mo, 100/day) supports the launch phase; conservative email defaults keep ~30 emails/day per active tenant
- Per-plan daily cap: Starter 50, Growth 200, Business 1000; soft cap silently drops over-cap emails (in-app still fires)
- Upgrade Resend Pro at ~5 paying tenants

**Files: <count> files changed across 5 implementation commits + 1 PROGRESS.md commit (this commit).**

Implementer: GLM 5.1 (cheaper coding model). Reviewer: Claude Code. Approver: Ahmed. Planning artifacts at `docs/superpowers/plans/notification-prefs/01-foundation.md` through `06-execution.md`.
```

---
