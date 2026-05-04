# Notification Prefs — Stage 2: Per-Call-Site Migration

> Implementer: GLM 5.1.
> Reviewer: Claude Code.
> Approver: Ahmed.
>
> Apply this stage AFTER Stage 1 ([01-foundation.md](01-foundation.md)) is fully landed and `npx tsc --noEmit` is clean.
>
> Apply order: **Section 0 (Stage 1.5 amendment) first → all M sites → all A sites → all T sites → final cleanup.**
>
> Run `npx tsc --noEmit` after **EVERY site is migrated**. Stop on the first error and report.
>
> **Read this entire document once before applying anything.**

---

## Pre-flight checklist

| File | Expected lines | Sites touched |
| --- | --- | --- |
| [convex/notifications.ts](convex/notifications.ts) | ~245 (175 base + Stage 1 additions ≈245) | Section 0 |
| [convex/actions/notifyEmail.ts](convex/actions/notifyEmail.ts) | ~250 (199 base + Stage 1 ≈250) | Section 0, Cleanup |
| [convex/sla.ts](convex/sla.ts) | 115 | M1 |
| [convex/followUps.ts](convex/followUps.ts) | 513 | M2, M3, T4 |
| [convex/conversations.ts](convex/conversations.ts) | 980 | M4, M5, A1, A2 |
| [convex/messages.ts](convex/messages.ts) | 921 | M6 |
| [convex/csat.ts](convex/csat.ts) | 729 | A3 |
| [convex/billing.ts](convex/billing.ts) | (unchanged) | T5, T6 (verify-only) |
| [convex/actions/validateInvite.ts](convex/actions/validateInvite.ts) | (unchanged) | T7 (verify-only) |
| [convex/actions/channelRetentionAction.ts](convex/actions/channelRetentionAction.ts) | 106 | T2, T3 (verify-only / deferred) |
| [convex/broadcastTemplates.ts](convex/broadcastTemplates.ts) | 494 | T9 (verify-only) |
| [convex/metaTemplates.ts](convex/metaTemplates.ts) | 304 | T10 (verify-only) |
| [convex/webhooks/processors/templates.ts](convex/webhooks/processors/templates.ts) | 76 | T8 (verify-only) |

**Verify line numbers before applying** — the per-site BEFORE blocks below were captured against the line numbers shown. If a file's line count differs by >5 lines from the table above, find the actual current line range with `grep -n` before pasting.

Site count: **6 M-verdict + 3 A-verdict + 10 T-verdict (most verify-only) = 19 sites in scope.** Six wrapper functions in `notifyEmail.ts` are deleted in the final cleanup if no remaining caller exists.

---

## Section 0 — Stage 1.5 Amendment (REQUIRED BEFORE ANY SITE MIGRATION)

**Why this amendment is needed (architectural finding from Stage 2 analysis):**

Stage 1's `notifyDispatch` accepts `email: v.optional(v.string())` and passes it to `notifySend`. But `resolveUserEmail` lives in `convex/lib/emailHelpers.ts` which has the `"use node"` directive (it imports Clerk's Node SDK). **Mutations run in the V8 runtime, not Node, and therefore cannot resolve a userId → email synchronously.** Every M-verdict caller in this stage runs in a mutation/internalMutation context (verified by reading the file headers: `sla.checkBreaches`, `messages.createInbound`, `conversations.assign/assignInternal/transferToDepartment`, `csat.checkAndRecordResponse`, `followUps.recordFollowUpResult` are all mutations or internalMutations).

If we apply Stage 2 against the as-shipped Stage 1 contract, every mutation-context caller would have to pass `email: undefined`, and the email channel preference would be silently ignored for them. The fix is simple: pass `userId` (which the dispatcher already has) to `notifySend`, and resolve the email inside the action where Clerk is available.

This Section 0 amendment **must land before** any site migration in Sections M, A, T below.

### 0a — Patch `notifyDispatch` in [convex/notifications.ts](convex/notifications.ts)

**BEFORE** — the `args` block of `notifyDispatch` as Stage 1 shipped it:

```ts
  args: {
    tenantId: v.string(),
    userId: v.string(),
    eventType: toggleableEventTypeValidator,
    referenceId: v.string(),
    contactName: v.optional(v.string()),
    message: v.string(),
    // Email-only fields. Required when emailEnabled may be true; ignored otherwise.
    email: v.optional(v.string()),
    emailVariables: v.optional(v.any()),
  },
```

**AFTER** — drop `email`, keep `emailVariables`. The dispatcher always has `userId`, so the email-channel branch always has a recipient candidate.

```ts
  args: {
    tenantId: v.string(),
    userId: v.string(),
    eventType: toggleableEventTypeValidator,
    referenceId: v.string(),
    contactName: v.optional(v.string()),
    message: v.string(),
    // Optional template variables forwarded to notifySend (via React Email render).
    emailVariables: v.optional(v.any()),
  },
```

**BEFORE** — step 3 (`emailGateOpen`/`wantsEmail`) and step 5 (the email-scheduling branch) of `notifyDispatch.handler` as Stage 1 shipped:

```ts
    // 3. Email channel plan-gate: Free plan has no email channel.
    const emailGateOpen = plan !== "free";
    const wantsEmail = emailEnabledByPref && emailGateOpen && Boolean(args.email);

    // 4. In-app row — write if enabled.
    if (inAppEnabled) {
      await ctx.db.insert("notifications", {
        tenantId: args.tenantId,
        userId: args.userId,
        type: args.eventType,
        referenceId: args.referenceId,
        contactName: args.contactName,
        message: args.message,
        read: false,
        createdAt: Date.now(),
      });
    }

    // 5. Email — if enabled and under daily cap, schedule the send.
    if (wantsEmail) {
      const cap = EMAIL_DAILY_CAP_BY_PLAN[plan];
      if (cap !== null) {
        const key = makeEmailDailyKey(args.tenantId, todayYmd());
        const slotConsumed = await tryConsumeQuota(ctx, key, cap);
        if (slotConsumed) {
          await ctx.scheduler.runAfter(0, internal.actions.notifyEmail.notifySend, {
            to: args.email!,
            eventType: args.eventType,
            tenantId: args.tenantId,
            variables: args.emailVariables ?? {},
          });
        }
        // If !slotConsumed, silently drop the email — in-app row still went out.
      }
    }
```

**AFTER** — `wantsEmail` no longer depends on `args.email`; the scheduled action receives `userId` instead of `to`:

```ts
    // 3. Email channel plan-gate: Free plan has no email channel.
    const emailGateOpen = plan !== "free";
    const wantsEmail = emailEnabledByPref && emailGateOpen;

    // 4. In-app row — write if enabled.
    if (inAppEnabled) {
      await ctx.db.insert("notifications", {
        tenantId: args.tenantId,
        userId: args.userId,
        type: args.eventType,
        referenceId: args.referenceId,
        contactName: args.contactName,
        message: args.message,
        read: false,
        createdAt: Date.now(),
      });
    }

    // 5. Email — if enabled and under daily cap, schedule the send.
    //    notifySend resolves userId → email via Clerk in node runtime.
    if (wantsEmail) {
      const cap = EMAIL_DAILY_CAP_BY_PLAN[plan];
      if (cap !== null) {
        const key = makeEmailDailyKey(args.tenantId, todayYmd());
        const slotConsumed = await tryConsumeQuota(ctx, key, cap);
        if (slotConsumed) {
          await ctx.scheduler.runAfter(0, internal.actions.notifyEmail.notifySend, {
            userId: args.userId,
            eventType: args.eventType,
            tenantId: args.tenantId,
            variables: args.emailVariables ?? {},
          });
        }
        // If !slotConsumed, silently drop the email — in-app row still went out.
      }
    }
```

### 0b — Patch `notifySend` in [convex/actions/notifyEmail.ts](convex/actions/notifyEmail.ts)

**BEFORE** — the action body as Stage 1 shipped (Section 7's AFTER block):

```ts
export const notifySend = internalAction({
  args: {
    to: v.string(),
    eventType: toggleableEventTypeValidator,
    tenantId: v.string(),
    variables: v.any(),
  },
  handler: async (ctx, args) => {
    const locale = await ctx.runQuery(internal.lib.tenants.getEmailLocale, {
      tenantId: args.tenantId,
    });
    const templateKey = mapEventToTemplateKey(args.eventType);
    if (!templateKey) {
      // Event has no email template yet (e.g. csat_received before Stage 6).
      // Silent skip — in-app row already fired.
      return;
    }
    await ctx.runAction(internal.actions.sendEmail.sendEmail, {
      to: args.to,
      templateKey,
      locale,
      variables: args.variables,
    });
  },
});
```

**AFTER** — accept `userId`, resolve email via the existing `resolveUserEmail` helper (which is already imported elsewhere in this `"use node"` file), silent-skip if Clerk has no email for the user:

```ts
export const notifySend = internalAction({
  args: {
    userId: v.string(),
    eventType: toggleableEventTypeValidator,
    tenantId: v.string(),
    variables: v.any(),
  },
  handler: async (ctx, args) => {
    const templateKey = mapEventToTemplateKey(args.eventType);
    if (!templateKey) {
      // Event has no email template yet (e.g. csat_received before Stage 6).
      // Silent skip — in-app row already fired.
      return;
    }
    const [email, locale] = await Promise.all([
      resolveUserEmail(args.userId),
      ctx.runQuery(internal.lib.tenants.getEmailLocale, { tenantId: args.tenantId }),
    ]);
    if (!email) {
      console.warn(`[NOTIFY_SEND] no email for user ${args.userId}`);
      return;
    }
    await ctx.runAction(internal.actions.sendEmail.sendEmail, {
      to: email,
      templateKey,
      locale,
      variables: args.variables,
    });
  },
});
```

`resolveUserEmail` is already imported at the top of this file (line 6: `import { resolveUserEmail, getAdminEmails, resolveOrgName } from "../lib/emailHelpers";`). No new import needed.

### Anti-instructions for Section 0

- **DO NOT** rename `userId` to `recipientUserId` — `userId` is the standard field name everywhere else.
- **DO NOT** remove the `"use node"` directive at the top of `notifyEmail.ts`.
- **DO NOT** move `resolveUserEmail` to `notifications.ts` or any non-node module — it requires the Clerk Node SDK.
- **DO NOT** swallow the `console.warn` for missing emails — it is the only signal that a recipient is unreachable.
- **DO NOT** change `mapEventToTemplateKey` in this section — it stays exactly as Stage 1 shipped it.

---

## Section 0.5 — Stage 1.5b Schema Amendment (REQUIRED before any M5/A1/A2 site)

**Why this amendment is needed (surfaced by Stage 2 schema probe, 2026-05-04):**

Stage 2's M5, A1, and A2 sites all call `notifyDispatch({ eventType: "conversation_assigned", ... })`. Inside `notifyDispatch`, step 4 inserts `type: args.eventType` into the `notifications` table. But the `notifications` table's `type` literal union in `convex/schema.ts` (lines 375-388) does **NOT** include `"conversation_assigned"` — only `"new_assignment"`. Convex runtime validation will reject the insert.

This Section 0.5 amendment must land **after** Section 0 and **before** any M5, A1, or A2 site is applied.

**Note for Stage 1 amendment:** this finding also requires an amendment to Stage 1's `notificationEvents.ts` — the `TOGGLEABLE_EVENT_TYPES` constant and `toggleableEventTypeValidator` in that file must include `"conversation_assigned"`. That Stage 1 amendment is a separate commit (Stage 1.5b, similar in shape to Stage 0's Section 0 amendment). Ahmed must decide on the Stage 1 amendment separately; this Section 0.5 covers only the schema table change.

### 0.5 — Patch `notifications.type` in [convex/schema.ts](convex/schema.ts)

**BEFORE** — current `notifications.type` literal union (schema.ts lines 375-388):

```ts
    type: v.union(
      v.literal("followup_due"),
      v.literal("sla_breach"),
      v.literal("template_approved"),
      v.literal("template_rejected"),
      v.literal("channel_expiring_soon"),
      v.literal("channel_deleted"),
      v.literal("agent_welcome"),
      v.literal("billing_payment_failed"),
      v.literal("billing_subscription_expired"),
      v.literal("conversation_transferred"),
      v.literal("conversation_reopened"),
      v.literal("new_assignment"),
    ),
```

**AFTER** — add `"conversation_assigned"` alongside the existing `"new_assignment"`:

```ts
    type: v.union(
      v.literal("followup_due"),
      v.literal("sla_breach"),
      v.literal("template_approved"),
      v.literal("template_rejected"),
      v.literal("channel_expiring_soon"),
      v.literal("channel_deleted"),
      v.literal("agent_welcome"),
      v.literal("billing_payment_failed"),
      v.literal("billing_subscription_expired"),
      v.literal("conversation_transferred"),
      v.literal("conversation_reopened"),
      v.literal("new_assignment"),
      v.literal("conversation_assigned"),
    ),
```

Both literals coexist. Pre-existing rows with `'new_assignment'` are **NOT** migrated. Future inserts via `notifyDispatch` use `'conversation_assigned'`. `'new_assignment'` remains in the union to keep existing rows valid.

### Apply order note

Apply Section 0.5 immediately after Section 0 (Section 0 changes `notifyDispatch`'s signature; Section 0.5 changes the schema). Both must land before any M5, A1, or A2 site migration. The updated overall sequence:

> **Section 0 → Section 0.5 → M1 → M2 → M3 → M4 → M5 → M6 → A1 → A2 → A3 → T4 → Final Cleanup**

### Anti-instructions for Section 0.5

- **DO NOT** remove `v.literal("new_assignment")` — pre-existing rows use it. Both literals must coexist.
- **DO NOT** touch any other field in the `notifications` table definition.
- **DO NOT** migrate existing `notifications` rows — this is a schema-only change.

---

## Verdict M — Migrate to `notifyDispatch`

Each M-site replaces its existing `ctx.db.insert("notifications", ...)` (or `ctx.runMutation(internal.notifications.internalCreate, ...)`) AND its companion `ctx.scheduler.runAfter(0, internal.actions.notifyEmail.<…>Email, …)` with a single `ctx.runMutation(internal.notifications.notifyDispatch, {...})`. The dispatcher handles in-app row + email scheduling + plan-gating + daily cap.

### Site M1 — [convex/sla.ts](convex/sla.ts) (sla_breach)

- **Containing function:** `checkBreaches` — `internalMutation` (cron-driven).
- **Function kind:** mutation context. `ctx.runMutation` works directly.
- **Recipient pattern:** loop `for (const supervisor of supervisors)` — channel-supervisor fan-out. Loop structure is preserved exactly; only the inner body changes.
- **eventType:** `sla_breach` (Growth+ only — handled automatically by `notifyDispatch`).
- **Email behavior:** previously called `internal.actions.notifyEmail.slaBreachEmail`. After migration, `notifyDispatch` schedules `notifySend` automatically. The `slaBreachEmail` wrapper becomes unused after this migration — see Final Cleanup.

#### BEFORE — lines 56–86 of `convex/sla.ts`

```ts
        // Notify channel supervisors
        const supervisors = await ctx.db
          .query("channelMembers")
          .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
          .filter((q) => q.eq(q.field("role"), "org:supervisor"))
          .collect();

        const contact = await ctx.db.get(conv.contactId);
        const contactName = contact?.customName ?? contact?.displayName ?? contact?.phone ?? "";

        for (const supervisor of supervisors) {
          await ctx.db.insert("notifications", {
            tenantId: channel.tenantId,
            userId: supervisor.userId,
            type: "sla_breach",
            referenceId: conv._id,
            contactName,
            message: `SLA breach: no reply to ${contactName} for over ${channel.slaThresholdMinutes} minutes`,
            read: false,
            createdAt: now,
          });

          await ctx.scheduler.runAfter(0, internal.actions.notifyEmail.slaBreachEmail, {
            supervisorUserId: supervisor.userId,
            contactName,
            channelName: channel.displayName,
            thresholdMinutes: channel.slaThresholdMinutes ?? 0,
            conversationId: conv._id,
            tenantId: channel.tenantId,
          });
        }
```

#### AFTER — same loop, single dispatcher call inside

```ts
        // Notify channel supervisors
        const supervisors = await ctx.db
          .query("channelMembers")
          .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
          .filter((q) => q.eq(q.field("role"), "org:supervisor"))
          .collect();

        const contact = await ctx.db.get(conv.contactId);
        const contactName = contact?.customName ?? contact?.displayName ?? contact?.phone ?? "";

        for (const supervisor of supervisors) {
          await ctx.runMutation(internal.notifications.notifyDispatch, {
            tenantId: channel.tenantId,
            userId: supervisor.userId,
            eventType: "sla_breach",
            referenceId: conv._id,
            contactName,
            message: `SLA breach: no reply to ${contactName} for over ${channel.slaThresholdMinutes} minutes`,
            emailVariables: {
              contactName,
              channelName: channel.displayName,
              thresholdMinutes: String(channel.slaThresholdMinutes ?? 0),
              conversationId: conv._id,
            },
          });
        }
```

#### Notes

- `referenceId: conv._id` — `conv._id` is `Id<"conversations">`. Convex accepts this where `v.string()` is expected because `Id<>` is a branded string. No cast needed.
- The `emailVariables` payload mirrors what `slaBreachEmail` previously passed to `sendEmail` (see [convex/actions/notifyEmail.ts:30-35](convex/actions/notifyEmail.ts#L30-L35)). All values are stringified to match the existing `Record<string, string>` shape that the React Email template expects.
- `internal` is already imported at [convex/sla.ts:16](convex/sla.ts#L16). No new imports required.

---

### Site M2 — [convex/followUps.ts](convex/followUps.ts) (followup_due — sent variant)

- **Containing function:** `recordFollowUpResult` — `internalMutation` (called by `processSingle`/`processDue` actions via `ctx.runMutation`).
- **Function kind:** mutation context.
- **Recipient pattern:** single — `followUp.assignedTo`. Block is gated on `if (followUp.assignedTo) { ... }`.
- **eventType:** `followup_due` (no plan gate).
- **Email behavior:** previously `followupDueEmail` with `status: "sent"` → `templateKey: "followup_due_sent"`. After migration, `notifyDispatch` schedules `notifySend` which resolves the template via `mapEventToTemplateKey` (returns `"followup_due_sent"` per Stage 1 Section 7).

#### BEFORE — lines 247–262

```ts
      if (followUp.assignedTo) {
        await ctx.runMutation(internal.notifications.internalCreate, {
          tenantId: followUp.tenantId,
          userId: followUp.assignedTo,
          type: "followup_due",
          referenceId: conversationId as unknown as string,
          contactName,
          message: `تم إرسال المتابعة إلى ${contactName}`,
        });
        await ctx.scheduler.runAfter(0, internal.actions.notifyEmail.followupDueEmail, {
          agentUserId: followUp.assignedTo,
          contactName,
          status: "sent",
          tenantId: followUp.tenantId,
        });
      }
```

#### AFTER

```ts
      if (followUp.assignedTo) {
        await ctx.runMutation(internal.notifications.notifyDispatch, {
          tenantId: followUp.tenantId,
          userId: followUp.assignedTo,
          eventType: "followup_due",
          referenceId: conversationId as unknown as string,
          contactName,
          message: `تم إرسال المتابعة إلى ${contactName}`,
          emailVariables: {
            contactName,
            status: "sent",
          },
        });
      }
```

#### Notes

- `referenceId: conversationId as unknown as string` — preserve the existing cast verbatim. `conversationId` is a typed Convex Id; the cast is pre-existing tech debt not in scope for this stage (CLAUDE.md §30.6 surgical changes).
- The Arabic message body is preserved verbatim — see Stage 0 Risk Flag 9 (codebase-wide Arabic-only bell text) is not in Stage 2 scope.
- `mapEventToTemplateKey("followup_due")` returns `"followup_due_sent"`. The "sent vs failed" distinction at the template level is lost in Stage 2 — both M2 (sent) and M3 (failed) route to the same template. This is a known limitation tracked for Stage 6 (template work). For Stage 2, the in-app row carries the correct Arabic message, so users still see the distinction in the bell.

---

### Site M3 — [convex/followUps.ts](convex/followUps.ts) (followup_due — failed variant)

- **Containing function:** `recordFollowUpResult` (failure branch, after `MAX_ATTEMPTS`).
- **Function kind:** mutation context.
- **Recipient pattern:** single — `followUp.assignedTo`.
- **eventType:** `followup_due`.
- **Email behavior:** previously `followupDueEmail` with `status: "failed"` → `templateKey: "followup_due_failed"`. After migration: see M2 notes — `notifySend` returns `"followup_due_sent"` (the only mapping). Stage 6 may add a per-event variant.

#### BEFORE — lines 297–326

```ts
        if (followUp.assignedTo) {
          // Resolve the most recent conversation for this contact on this
          // channel so the notification deep-links back to a real thread
          // (clicking the bell row should open the inbox, not /contacts).
          const candidates = await ctx.db
            .query("conversations")
            .withIndex("by_contact", (q) => q.eq("contactId", followUp.contactId))
            .collect();
          const latestConvId = candidates
            .filter(
              (c) =>
                c.tenantId === followUp.tenantId &&
                c.channelId === followUp.channelId,
            )
            .sort((a, b) => b.lastMessageAt - a.lastMessageAt)[0]?._id;
          await ctx.runMutation(internal.notifications.internalCreate, {
            tenantId: followUp.tenantId,
            userId: followUp.assignedTo,
            type: "followup_due",
            referenceId: (latestConvId as unknown as string) ?? args.followUpId,
            contactName,
            message: `فشل إرسال المتابعة إلى ${contactName} بعد ${MAX_ATTEMPTS} محاولات`,
          });
          await ctx.scheduler.runAfter(0, internal.actions.notifyEmail.followupDueEmail, {
            agentUserId: followUp.assignedTo,
            contactName,
            status: "failed",
            tenantId: followUp.tenantId,
          });
        }
```

#### AFTER

```ts
        if (followUp.assignedTo) {
          // Resolve the most recent conversation for this contact on this
          // channel so the notification deep-links back to a real thread
          // (clicking the bell row should open the inbox, not /contacts).
          const candidates = await ctx.db
            .query("conversations")
            .withIndex("by_contact", (q) => q.eq("contactId", followUp.contactId))
            .collect();
          const latestConvId = candidates
            .filter(
              (c) =>
                c.tenantId === followUp.tenantId &&
                c.channelId === followUp.channelId,
            )
            .sort((a, b) => b.lastMessageAt - a.lastMessageAt)[0]?._id;
          await ctx.runMutation(internal.notifications.notifyDispatch, {
            tenantId: followUp.tenantId,
            userId: followUp.assignedTo,
            eventType: "followup_due",
            referenceId: (latestConvId as unknown as string) ?? (args.followUpId as unknown as string),
            contactName,
            message: `فشل إرسال المتابعة إلى ${contactName} بعد ${MAX_ATTEMPTS} محاولات`,
            emailVariables: {
              contactName,
              status: "failed",
            },
          });
        }
```

#### Notes

- The `?? args.followUpId` fallback is `Id<"followUps">` — Convex's branded-string types reject the union with `string` without a cast. Adding `(args.followUpId as unknown as string)` matches the pre-existing `latestConvId as unknown as string` pattern in the same expression. This is the smallest type-safe fix.
- Verify after applying: `npx tsc --noEmit` — if a type error appears at this line, GLM has the cast wrong; do not paper over with `as any`.

---

### Site M4 — [convex/conversations.ts](convex/conversations.ts) (conversation_transferred — recipients fan-out)

- **Containing function:** `transferToDepartment` — `mutation`.
- **Function kind:** mutation context.
- **Recipient pattern:** array fan-out. Currently uses `Promise.all(recipients.map(userId => ctx.db.insert(...)))`. Convert to a sequential `for` loop because `notifyDispatch` includes scheduler calls that may benefit from sequential execution and easier error attribution. (`Promise.all` of `runMutation` works but is harder to debug.)
- **eventType:** `conversation_transferred`.
- **Email behavior:** none previously — this site only inserted in-app rows. After migration, the email channel becomes available for users who opt in (default OFF per Stage 1 Section 2). No template mapping yet (`mapEventToTemplateKey("conversation_transferred")` returns `null`), so Stage 6 will fill in the template; until then `notifySend` silent-skips email even when the user has opted in. **This is intentional** — the in-app row still fires.

#### BEFORE — lines 636–663

```ts
    const deptMembers = await ctx.db
      .query("departmentMembers")
      .withIndex("by_department", (q) => q.eq("departmentId", args.targetDepartmentId))
      .collect();

    const memberIds = deptMembers.map((m) => m.userId);
    const supervisorIds: string[] = (targetDept as any).supervisors ?? [];
    const recipients = [...new Set([...memberIds, ...supervisorIds])].filter(
      (id) => id !== callerId && id !== args.assignAgentId,
    );

    const contact = await ctx.db.get(conversation.contactId);
    const contactName = contact?.customName ?? contact?.displayName ?? "";

    await Promise.all(
      recipients.map((userId) =>
        ctx.db.insert("notifications", {
          tenantId,
          userId,
          type: "conversation_transferred",
          referenceId: args.conversationId,
          contactName,
          message: `${contactName} was transferred to ${toName} by ${actorName}`,
          read: false,
          createdAt: now,
        })
      )
    );
```

#### AFTER — same recipient computation, sequential dispatcher loop

```ts
    const deptMembers = await ctx.db
      .query("departmentMembers")
      .withIndex("by_department", (q) => q.eq("departmentId", args.targetDepartmentId))
      .collect();

    const memberIds = deptMembers.map((m) => m.userId);
    const supervisorIds: string[] = (targetDept as any).supervisors ?? [];
    const recipients = [...new Set([...memberIds, ...supervisorIds])].filter(
      (id) => id !== callerId && id !== args.assignAgentId,
    );

    const contact = await ctx.db.get(conversation.contactId);
    const contactName = contact?.customName ?? contact?.displayName ?? "";

    for (const userId of recipients) {
      await ctx.runMutation(internal.notifications.notifyDispatch, {
        tenantId,
        userId,
        eventType: "conversation_transferred",
        referenceId: args.conversationId,
        contactName,
        message: `${contactName} was transferred to ${toName} by ${actorName}`,
        emailVariables: {
          contactName,
          targetDept: toName,
          actorName,
          conversationId: args.conversationId,
        },
      });
    }
```

#### Notes

- The `(targetDept as any).supervisors` cast is pre-existing; do not "improve" it (CLAUDE.md §30.6).
- `internal` is already imported at the top of `conversations.ts` (verify with `grep -n '^import.*internal' convex/conversations.ts`).
- `referenceId: args.conversationId` — `Id<"conversations">` is a branded string, accepted by `v.string()`.

---

### Site M5 — [convex/conversations.ts](convex/conversations.ts) (conversation_assigned in transfer-with-assign branch)

- **Containing function:** `transferToDepartment` (same handler as M4, immediately after M4's loop).
- **Function kind:** mutation context.
- **Recipient pattern:** single — `args.assignAgentId`. Block is gated on `if (args.assignAgentId) { ... }`.
- **eventType:** `conversation_assigned` (Stage 1 Section 2's literal — was `new_assignment` in the schema's literal union, but Stage 1 Section 2's `TOGGLEABLE_EVENT_TYPES` uses `conversation_assigned`).
- **Email behavior:** none previously at this site. After migration, email becomes opt-in (default ON per Stage 1 Section 2 — `conversation_assigned` is one of the always-on email defaults). `mapEventToTemplateKey("conversation_assigned")` returns `"new_assignment"` so the existing template renders.

#### BEFORE — lines 665–676

```ts
    if (args.assignAgentId) {
      await ctx.db.insert("notifications", {
        tenantId,
        userId: args.assignAgentId,
        type: "new_assignment",
        referenceId: args.conversationId,
        contactName,
        message: `${contactName} was assigned to you by ${actorName}`,
        read: false,
        createdAt: now,
      });
    }
```

#### AFTER

```ts
    if (args.assignAgentId) {
      const channelForEmail = await ctx.db.get(conversation.channelId);
      await ctx.runMutation(internal.notifications.notifyDispatch, {
        tenantId,
        userId: args.assignAgentId,
        eventType: "conversation_assigned",
        referenceId: args.conversationId,
        contactName,
        message: `${contactName} was assigned to you by ${actorName}`,
        emailVariables: {
          contactName,
          channelName: channelForEmail?.displayName ?? "",
          conversationId: args.conversationId,
          assignedByName: actorName,
        },
      });
    }
```

#### Notes

- `eventType: "conversation_assigned"` — note this differs from the pre-existing `type: "new_assignment"` literal. The schema's notifications.type union still accepts `new_assignment`, but `notifyDispatch` writes `type: args.eventType` → `"conversation_assigned"`. This means **new in-app rows for assignments will use the new literal**, while pre-Stage-2 rows in the database keep `"new_assignment"`. The bell UI ([components/settings/notifications-settings.tsx:181-208](components/settings/notifications-settings.tsx#L181-L208)) does not currently render either of these literals — it only renders `sla_breach`, `channel_expiring_soon`, `channel_deleted`, `conversation_transferred`, `conversation_reopened` badges. Stage 5 (UI) will add a `conversation_assigned` badge. Until then, the message body still appears in the bell — only the icon is missing. **See Section 0.5 — both literals (`"new_assignment"` and `"conversation_assigned"`) must be in the schema's `notifications.type` union BEFORE this site is migrated; Section 0.5's schema amendment is a hard prerequisite.**
- The `channel` lookup is needed for the `channelName` email variable. Reuse `conversation.channelId` from the surrounding handler scope (`conversation` was loaded earlier in `transferToDepartment`). **Read the file first** to confirm `conversation` is still in scope at line 665 — it is, per the read above.

---

### Site M6 — [convex/messages.ts](convex/messages.ts) (conversation_reopened)

- **Containing function:** `createInbound` — `internalMutation`.
- **Function kind:** mutation context.
- **Recipient pattern:** single — `conversation.assignedAgentId`. Block is gated on `if (conversation.assignedAgentId) { ... }`.
- **eventType:** `conversation_reopened`.
- **Email behavior:** none previously. After migration, opt-in (default OFF). No template yet (`mapEventToTemplateKey("conversation_reopened")` → null). Email silent-skips even when user opts in until Stage 6.

#### BEFORE — lines 326–337

```ts
      if (conversation.assignedAgentId) {
        const channel = await ctx.db.get(args.channelId);
        const channelName = channel?.displayName ?? "";
        await ctx.runMutation(internal.notifications.internalCreate, {
          tenantId: args.tenantId,
          userId: conversation.assignedAgentId,
          type: "conversation_reopened",
          referenceId: conversation._id,
          contactName,
          message: `${contactName} replied to a resolved conversation${channelName ? ` on ${channelName}` : ""}`,
        });
      }
```

#### AFTER

```ts
      if (conversation.assignedAgentId) {
        const channel = await ctx.db.get(args.channelId);
        const channelName = channel?.displayName ?? "";
        await ctx.runMutation(internal.notifications.notifyDispatch, {
          tenantId: args.tenantId,
          userId: conversation.assignedAgentId,
          eventType: "conversation_reopened",
          referenceId: conversation._id,
          contactName,
          message: `${contactName} replied to a resolved conversation${channelName ? ` on ${channelName}` : ""}`,
          emailVariables: {
            contactName,
            channelName,
            conversationId: conversation._id,
          },
        });
      }
```

#### Notes

- The variable name `channel` shadows the outer scope — verify by reading the surrounding code (lines 326–328 don't reference any other `channel` binding, but earlier in the same handler at line 230 there's another `channel` lookup; both are local-scoped in their respective `if` blocks, so no shadow conflict). **Do not rename to dedupe** — pre-existing pattern.
- `referenceId: conversation._id` — `Id<"conversations">` accepted by `v.string()`.

---

## Verdict A — Add new call sites (3 sites)

### Site A1 — [convex/conversations.ts](convex/conversations.ts) (assign mutation — close the email-without-in-app gap)

- **Containing function:** `assign` — `mutation`. Lines 135–end-of-handler.
- **Function kind:** mutation context.
- **Current behavior (gap):** sends `newAssignmentEmail` via `ctx.scheduler.runAfter(0, ...)` but **does NOT write any in-app `notifications` row**. Per Stage 0 Risk Flag 1, this is a real bug — agents see emails but no bell pings.
- **Fix:** replace the scheduled email send with a `notifyDispatch` call. The dispatcher writes the in-app row AND schedules the email through `notifySend`.
- **eventType:** `conversation_assigned`.

#### BEFORE — lines 162–176

```ts
    if (args.agentId && args.agentId !== previousAgentId) {
      const contact = await ctx.db.get(conversation.contactId);
      const channel = await ctx.db.get(conversation.channelId);
      const contactName =
        contact?.customName ?? contact?.displayName ?? contact?.phone ?? "";
      const channelName = channel?.displayName ?? "";

      await ctx.scheduler.runAfter(0, internal.actions.notifyEmail.newAssignmentEmail, {
        agentUserId: args.agentId,
        contactName,
        channelName,
        conversationId: args.conversationId,
        tenantId,
      });
    }
```

#### AFTER

```ts
    if (args.agentId && args.agentId !== previousAgentId) {
      const contact = await ctx.db.get(conversation.contactId);
      const channel = await ctx.db.get(conversation.channelId);
      const contactName =
        contact?.customName ?? contact?.displayName ?? contact?.phone ?? "";
      const channelName = channel?.displayName ?? "";

      // Reorder: compute the actor's display name BEFORE the dispatch so the
      // email payload + in-app message body include "by ${actorName}" — parity
      // with M5 (transferToDepartment with-assign branch).
      const assignIdentity = await ctx.auth.getUserIdentity();
      const assignActorName = assignIdentity?.name ?? assignIdentity?.email ?? "Someone";

      await ctx.runMutation(internal.notifications.notifyDispatch, {
        tenantId,
        userId: args.agentId,
        eventType: "conversation_assigned",
        referenceId: args.conversationId,
        contactName,
        message: `${contactName} was assigned to you by ${assignActorName}`,
        emailVariables: {
          contactName,
          channelName,
          conversationId: args.conversationId,
          assignedByName: assignActorName,
        },
      });
    }
```

#### Notes

- **Reorder note:** the actor-name resolution (`ctx.auth.getUserIdentity()` → `assignActorName`) is moved from line 179 of the handler to immediately above the dispatch, so A1 has parity with M5 (`"<contact> was assigned to you by <actor>"`). The resolution itself is the same two-liner that already exists in the handler — only the line position changes. No new computation introduced. `ctx.auth.getUserIdentity()` is a standard Convex auth call available in any mutation context (not a Clerk Node SDK call); no `"use node"` constraint applies.
- This site closes Stage 0 Risk Flag 1.

---

### Site A2 — [convex/conversations.ts](convex/conversations.ts) (assignInternal — round-robin)

- **Containing function:** `assignInternal` — `internalMutation` (called by round-robin action).
- Same gap as A1: emails but no in-app row.
- **eventType:** `conversation_assigned`.

#### BEFORE — lines 475–489

```ts
    if (args.agentId !== previousAgentId) {
      const contact = await ctx.db.get(conversation.contactId);
      const channel = await ctx.db.get(conversation.channelId);
      const contactName =
        contact?.customName ?? contact?.displayName ?? contact?.phone ?? "";
      const channelName = channel?.displayName ?? "";

      await ctx.scheduler.runAfter(0, internal.actions.notifyEmail.newAssignmentEmail, {
        agentUserId: args.agentId,
        contactName,
        channelName,
        conversationId: args.conversationId,
        tenantId: args.tenantId,
      });
    }
```

#### AFTER

```ts
    if (args.agentId !== previousAgentId) {
      const contact = await ctx.db.get(conversation.contactId);
      const channel = await ctx.db.get(conversation.channelId);
      const contactName =
        contact?.customName ?? contact?.displayName ?? contact?.phone ?? "";
      const channelName = channel?.displayName ?? "";

      await ctx.runMutation(internal.notifications.notifyDispatch, {
        tenantId: args.tenantId,
        userId: args.agentId,
        eventType: "conversation_assigned",
        referenceId: args.conversationId,
        contactName,
        message: `${contactName} was assigned to you by System`,
        emailVariables: {
          contactName,
          channelName,
          conversationId: args.conversationId,
          assignedByName: "System",
        },
      });
    }
```

#### Notes

- Same pattern as A1. `tenantId` here comes from `args.tenantId` (this is `assignInternal` — the public `assign` reads it from `getCallerIdentity`).
- **Actor name for A2:** `assignInternal` is an `internalMutation` with no Clerk user context — `ctx.auth` is unavailable. The existing system-event message in the handler uses `actorName: "System"` (conversations.ts line 500). A2's dispatch uses the same constant: `assignedByName: "System"`. No reorder needed — `"System"` is resolved at compile time.

---

### Site A3 — [convex/csat.ts](convex/csat.ts) (checkAndRecordResponse — close the half-implementation gap)

- **Containing function:** `checkAndRecordResponse` — `internalMutation`. Insert point: immediately after the `system_event` message insertion at lines 240–252, before the `return true;` at line 254.
- **Function kind:** mutation context.
- **Current behavior (gap):** when a customer replies with a CSAT score (1–5), the code inserts a `system_event` message into the thread but does NOT create a `notifications` row and does NOT send an email. Per Stage 0 Risk Flag 3.
- **Fix:** add a `notifyDispatch` call. Recipient is the conversation's `assignedAgentId` if set; otherwise no recipient and we skip.
- **eventType:** `csat_received` (Growth+ only — handled by `notifyDispatch` plan-gate).

#### BEFORE — lines 230–256

```ts
    const conversation = await ctx.db.get(target.conversationId);
    if (!conversation) return false;

    const respondedAt = Date.now();
    await ctx.db.patch(metric._id, {
      csatScore: score,
      csatRespondedAt: respondedAt,
    });

    // Insert a system-event pill in the thread so the agent sees the rating.
    await ctx.db.insert("messages", {
      conversationId: conversation._id,
      tenantId: args.tenantId,
      direction: "outbound",
      content: "",
      contentType: "system_event",
      eventType: "csat_received",
      eventData: { csatScore: score },
      isInternalNote: false,
      status: "sent",
      timestamp: respondedAt,
      createdAt: respondedAt,
    });

    return true;
  },
});
```

#### AFTER

```ts
    const conversation = await ctx.db.get(target.conversationId);
    if (!conversation) return false;

    const respondedAt = Date.now();
    await ctx.db.patch(metric._id, {
      csatScore: score,
      csatRespondedAt: respondedAt,
    });

    // Insert a system-event pill in the thread so the agent sees the rating.
    await ctx.db.insert("messages", {
      conversationId: conversation._id,
      tenantId: args.tenantId,
      direction: "outbound",
      content: "",
      contentType: "system_event",
      eventType: "csat_received",
      eventData: { csatScore: score },
      isInternalNote: false,
      status: "sent",
      timestamp: respondedAt,
      createdAt: respondedAt,
    });

    if (conversation.assignedAgentId) {
      const csatContact = await ctx.db.get(conversation.contactId);
      const csatContactName =
        csatContact?.customName ?? csatContact?.displayName ?? csatContact?.phone ?? "";
      await ctx.runMutation(internal.notifications.notifyDispatch, {
        tenantId: args.tenantId,
        userId: conversation.assignedAgentId,
        eventType: "csat_received",
        referenceId: conversation._id,
        contactName: csatContactName,
        message: `${csatContactName} rated the conversation ${score}/5`,
        emailVariables: {
          contactName: csatContactName,
          score: String(score),
          conversationId: conversation._id,
        },
      });
    }

    return true;
  },
});
```

#### Notes

- `internal` is already imported at [convex/csat.ts:9](convex/csat.ts#L9).
- The contact lookup is needed because `checkAndRecordResponse`'s upper scope already loaded `contact` at line 180-186, but that variable shadows would conflict with the existing `contact` binding. Using a new `csatContact` local avoids shadowing and matches the surgical-change rule.
- `csat_received` has no email template yet (Stage 6). `notifySend` silent-skips when the user has opted in but no template exists. This is the documented behavior — in-app row still fires.
- This site closes Stage 0 Risk Flag 3.

---

## Verdict T — Transactional / verify-only sites

These sites are NOT migrated to `notifyDispatch`. They are either transactional (always-sent, not user-toggleable) or deferred. The required action per site is shown.

### Site T1 — [convex/actions/notifyEmail.ts](convex/actions/notifyEmail.ts) `agentWelcomeEmail` (agent_welcome)

- **Verdict:** leave alone. Transactional onboarding event, dedup mechanism is correct, not user-toggleable per Stage 1 Section 2 (`TOGGLEABLE_EVENT_TYPES` excludes `agent_welcome`).
- **Required change:** none. The Stage 1 Section 5a validator update kept `agent_welcome` in the literal union — verify by re-reading the AFTER block of Stage 1 Section 5a (the literal is at position 8 in the union after the update).
- **Verification step:** after Stage 2 is complete, run `grep -n 'agent_welcome' convex/notifications.ts convex/schema.ts`. Both files must still mention the literal.

### Site T2 — [convex/actions/channelRetentionAction.ts](convex/actions/channelRetentionAction.ts) lines 46–53 (channel_deleted)

- **Verdict:** leave alone. Transactional admin alert. Recipients are admins fetched via `getAdminEmails` (Clerk lookup). Migration is non-trivial and out of scope per Stage 1 Section 2 (`channel_deleted` is excluded from `TOGGLEABLE_EVENT_TYPES`).
- **Required change:** none.
- **Note:** the Stage 1 Section 5a validator update kept `channel_deleted` in the literal union. No regression.

### Site T3 — [convex/actions/channelRetentionAction.ts](convex/actions/channelRetentionAction.ts) lines 88–95 (channel_expiring_soon — retention warning)

- **Verdict:** leave alone for v1; **document as known follow-up.**
- **Why deferred:** the 30-day retention warning IS in `TOGGLEABLE_EVENT_TYPES` (per Stage 1 Section 2), so users SHOULD be able to opt out. However: (a) recipients are computed via `getAdminEmails(channel.tenantId)` which requires Clerk Node SDK — only available in actions; (b) migrating this site means converting the per-admin loop to call `notifyDispatch` per admin, which works (mutation can be called from action via `ctx.runMutation`), but the `channel_expiring_soon` template variables (`daysLeft`, `deleteDate`) are computed in the action and need to be passed through.
- **Required change for v1:** none. The site continues to work via the legacy direct-insert + sendEmail path. Users on Free/Starter cannot opt out of these warnings yet (everyone gets them by default; toggle is ineffective for this site only).
- **Follow-up task:** "Migrate channelRetentionAction.ts:88 warning fan-out to notifyDispatch" — track in a separate issue. Approx 30 LoC change; defer to post-Stage-6 because email template work is a prerequisite.

### Site T4 — [convex/followUps.ts](convex/followUps.ts) lines 467–485 (channel_token_expired — was misnamed channel_expiring_soon)

- **Verdict:** keep on legacy `internalCreate` path, but **change the literal** from `"channel_expiring_soon"` to `"channel_token_expired"` (the new literal added by Stage 1 Section 1a + 5a).
- **Why:** per Stage 0 Risk Flag 4, this site's semantic is "Meta API returned OAuth code 190 — channel token expired", NOT "30-day retention warning fired". They are different events. The Stage 1 schema split lets us separate them; this site is the call site that gets corrected.
- **Email behavior:** none currently and none added by Stage 2 — this is a transactional reconnect prompt. If/when Ahmed wants an email for token-expired, it goes through legacy `sendEmail` like the billing actions.

#### BEFORE — lines 475–484 (the `internalCreate` call inside `notifyTokenExpired`)

```ts
  for (const userId of recipients) {
    await ctx.runMutation(internal.notifications.internalCreate, {
      tenantId: followUp.tenantId,
      userId,
      type: "channel_expiring_soon",
      referenceId: followUp.channelId as unknown as string,
      message:
        "انتهت صلاحية ربط واتساب لهذه القناة — يرجى إعادة الربط لاستئناف إرسال المتابعات.",
    });
  }
```

#### AFTER — single literal change on the `type:` line; everything else is identical

```ts
  for (const userId of recipients) {
    await ctx.runMutation(internal.notifications.internalCreate, {
      tenantId: followUp.tenantId,
      userId,
      type: "channel_token_expired",
      referenceId: followUp.channelId as unknown as string,
      message:
        "انتهت صلاحية ربط واتساب لهذه القناة — يرجى إعادة الربط لاستئناف إرسال المتابعات.",
    });
  }
```

#### Notes

- This is a single-line semantic change. `internalCreate`'s validator includes `channel_token_expired` after Stage 1 Section 5a — confirm by re-reading that section's AFTER block.
- Pre-existing rows in the `notifications` table with `type: "channel_expiring_soon"` are NOT migrated. They keep their original literal forever. This is the correct behavior — they refer to retention warnings (true semantic for that literal); only future token-expired events get the new literal.
- The bell UI ([components/settings/notifications-settings.tsx:187-192](components/settings/notifications-settings.tsx#L187-L192)) currently renders a "Channel Expiring" badge for `type === "channel_expiring_soon"`. Stage 5 will add a separate "Token Expired — reconnect required" badge for `channel_token_expired`. Until Stage 5, the new-literal rows render with no badge, only the message body. This is acceptable for v1 (the message is self-explanatory in Arabic).

### Site T5 — [convex/billing.ts:248-258](convex/billing.ts#L248-L258) (billing_subscription_expired)

- **Verdict:** leave alone. Transactional/legal email; not user-toggleable per Stage 1 Section 2. The site only sends an email — no in-app row currently. Per Stage 0 Risk Flag 6, the schema literal `billing_subscription_expired` exists but is never inserted. Out of scope to add an in-app row in Stage 2.
- **Required change:** none.

### Site T6 — [convex/billing.ts:260-268](convex/billing.ts#L260-L268) (billing_payment_failed)

- **Verdict:** leave alone. Same as T5.
- **Required change:** none.

### Site T7 — [convex/actions/validateInvite.ts:55-71](convex/actions/validateInvite.ts#L55-L71) (agentWelcomeEmail caller)

- **Verdict:** leave alone. This is just the caller of `agentWelcomeEmail` (T1). Calling structure is `ctx.runAction(internal.actions.notifyEmail.agentWelcomeEmail, {...})` from inside an action. Both the call and the callee are correct.
- **Required change:** none.

### Site T8 — [convex/webhooks/processors/templates.ts:67](convex/webhooks/processors/templates.ts#L67) (template_approved/rejected via webhook — DEAD path)

- **Verdict:** leave alone per Stage 0 Risk Flag 5. The recipients fanout iterates `getAdminsForTenant` which returns `[]` unconditionally (placeholder). The whole `for (const admin of admins)` loop is a no-op.
- **Required change:** none.
- **Why not delete?** Out of scope. The placeholder is a deliberate marker for a future feature ("template approval admin alerts"). Deleting it loses the structural breadcrumb. CLAUDE.md §30.3 surgical changes — not our mess to clean.

### Site T9 — [convex/broadcastTemplates.ts:470-481](convex/broadcastTemplates.ts#L470-L481) (template_approved — broadcast template)

- **Verdict:** leave alone. The `template_approved` literal is NOT in `TOGGLEABLE_EVENT_TYPES` (Stage 1 Section 2 excludes it — template approval is creator-only, not a user preference). The site uses `internal.notifications.internalCreate` directly. Stage 1 Section 5a's validator update kept `template_approved` in the union.
- **Required change:** none.

### Site T10 — [convex/metaTemplates.ts:177-205](convex/metaTemplates.ts#L177-L205) (`getAdminsForTenant` placeholder + `insertNotification` helper)

- **Verdict:** leave alone. The `insertNotification` helper is only called from T8 (the dead-path webhook). Its validator is `v.union(v.literal("template_approved"), v.literal("template_rejected"))` — narrowly scoped, no migration needed.
- **Required change:** none.

---

## Final Cleanup — delete unused `*Email` wrappers

After M1, M2, M3, A1, A2 are applied, three wrapper functions in `convex/actions/notifyEmail.ts` should have zero remaining callers. Verify before deleting.

**Verification command** (run AFTER all M and A sites are migrated, BEFORE deletion):

```bash
grep -rn 'slaBreachEmail\|followupDueEmail\|newAssignmentEmail' convex/ --include='*.ts' | grep -v _generated
```

**Expected result:** the only matches should be the `export const slaBreachEmail = internalAction({...})`, `export const followupDueEmail = ...`, and `export const newAssignmentEmail = ...` definitions in `convex/actions/notifyEmail.ts` themselves. No external callers.

**If verification passes** — delete the three function blocks from `convex/actions/notifyEmail.ts`:
- `slaBreachEmail` (lines ~8–38 in the post-Stage-1 file)
- `followupDueEmail` (lines ~40–66)
- `newAssignmentEmail` (lines ~68–97)

**Do NOT delete:**
- `agentWelcomeEmail` (still called from `validateInvite.ts:63`)
- `sendWelcomeOnJoin` (public action, may have web callers)
- `billingPaymentFailedEmail` (called from `billing.ts:264`)
- `billingSubscriptionExpiredEmail` (called from `billing.ts:256`)
- `notifySend` (called from `notifyDispatch`)
- `mapEventToTemplateKey` (helper for `notifySend`)

**If verification finds remaining callers** — STOP. Report which callers exist. Do not delete any wrapper. The migration was incomplete; identify and migrate the missing call site first.

---

## Stage 2 — Verification per site

After each numbered site (M1, M2, M3, M4, M5, M6, A1, A2, A3, T4) is migrated, GLM must paste **all of the following** into the response before moving on:

1. **The literal `git diff <file>` output** for the file touched (or `git diff` if multiple files were touched in one site — only T4 + the Section 0 amendment touch two files).
2. **Literal `npx tsc --noEmit` output** (paste exactly — empty stdout + exit 0 means clean).
3. **Confirmation in plain text:**
   > "Site <ID> applied. Anti-instructions: confirmed none violated. tsc clean."

Order reminder: **Section 0 → M1 → M2 → M3 → M4 → M5 → M6 → A1 → A2 → A3 → T4 → Final Cleanup.** All other T-verdict sites are verify-only (no code change).

---

## Stage 2 — Completion criteria

- Section 0 amendment landed (notifyDispatch + notifySend signatures updated).
- All 6 M-verdict sites migrated to `notifyDispatch`.
- All 3 A-verdict sites added.
- T4 literal change applied (`channel_expiring_soon` → `channel_token_expired` at the followUps.ts:476 site only).
- All other T sites left alone (verified by re-reading; no-op).
- Final cleanup deleted exactly 3 wrappers (`slaBreachEmail`, `followupDueEmail`, `newAssignmentEmail`) — OR did not delete because verification found a remaining caller.
- `npx tsc --noEmit` clean at every checkpoint AND at the end.
- `git status` shows the following modified files and nothing else:
  - `M convex/notifications.ts` (Section 0a)
  - `M convex/actions/notifyEmail.ts` (Section 0b + Final Cleanup)
  - `M convex/sla.ts` (M1)
  - `M convex/followUps.ts` (M2 + M3 + T4)
  - `M convex/conversations.ts` (M4 + M5 + A1 + A2)
  - `M convex/messages.ts` (M6)
  - `M convex/csat.ts` (A3)
- No new files created in this stage. No `_generated/` files manually edited (Convex regenerates them).
- No `PROGRESS.md` / `CLAUDE.md` / `PROJECT_STATE.md` / `AUDIT_REPORT.md` edits.
- A `grep -rn 'notifyDispatch' convex/ --include='*.ts'` AFTER stage completion returns hits ONLY in:
  - `convex/notifications.ts` (definition)
  - `convex/sla.ts` (M1)
  - `convex/followUps.ts` (M2, M3)
  - `convex/conversations.ts` (M4, M5, A1, A2)
  - `convex/messages.ts` (M6)
  - `convex/csat.ts` (A3)
- A `grep -n 'channel_expiring_soon' convex/followUps.ts` returns ZERO matches after T4 lands. `grep -n 'channel_token_expired' convex/followUps.ts` returns 1 match.

---

## Stage 2 — Risk flags

1. **Section 0 is mandatory and must land first.** If GLM applies any M-site before Section 0, the AFTER blocks won't compile (they don't pass `email`, but Stage-1-as-shipped requires it conditionally — the type system won't catch this because `email` is optional, but the email channel will be silently broken). Run `npx tsc --noEmit` after Section 0 alone to confirm the amendment compiles.

2. **Loop sites M1 and M4 are inside `for...of` blocks.** Preserve loop structure exactly. The Promise.all → for-loop conversion in M4 is intentional (sequential dispatch is easier to debug and avoids potential write conflicts on `rateLimits`).

3. **The CSAT site A3 introduces a new dependency on `conversation.contactId`** — verify the `conversation` document exists at that point (yes, `if (!conversation) return false;` at line 231 guarantees it). Use a new local variable `csatContact` to avoid shadowing the upper-scope `contact` binding from line 181.

4. **The `followUps.ts:476` site (T4) is not user-toggleable** even though its post-rename literal `channel_token_expired` looks like it could be. It is excluded from `TOGGLEABLE_EVENT_TYPES` per Stage 1 Section 2. The change in T4 is purely semantic correctness (right literal for the event), not a routing change.

5. **The bell UI does not render a `conversation_assigned` badge** — only the message body. Stage 5 (UI) adds the badge. Until then, M5 + A1 + A2 produce in-app rows that look slightly less informative than `conversation_transferred` rows. Acceptable for v1.

6. **`mapEventToTemplateKey` returns `null` for `conversation_transferred`, `conversation_reopened`, `csat_received`.** This means `notifySend` silent-skips email for those events even when the user has opted in via the preferences UI. **This is intentional for Stage 2** — Stage 6 fills in the templates and removes the null returns. Anyone reviewing the deployment behavior should understand: M4, M6, A3 have working in-app notifications and ineffective email toggles until Stage 6.

7. **Stage 0 Risk Flag 9 is not addressed in Stage 2.** Hardcoded Arabic message bodies at M2/M3/T4 remain Arabic-only in the bell. English-locale users see Arabic for these events. Pre-existing tech debt; not in scope (CLAUDE.md §30.3).

8. **The Section 0 amendment changes `notifyDispatch`'s argument shape.** If GLM has already started writing UI code (Stages 3–5) against the old `email`-arg shape, that code must be updated. Stage 2's amendment lands before Stages 3–5 begin, so this should not occur — but flag if it does.

9. **`broadcastTemplates.ts:473` and `metaTemplates.ts:195` (T9, T10) use literals NOT in `TOGGLEABLE_EVENT_TYPES`.** Calling `notifyDispatch({ eventType: "template_approved", ... })` would fail validation. The Stage 2 plan correctly leaves these on `internalCreate`. Do not "improve" them by trying to migrate.

10. **Stage 1's `mapEventToTemplateKey` switch is exhaustive over `ToggleableEventType`.** If a future stage adds a new toggleable event without adding a `case` to the switch, TypeScript flags it. This is the desired behavior — do not add a `default:` case during Stage 2 to silence a future error.

11. **Schema literal union for `notifications.type`** (verified 2026-05-04): P2 — schema does NOT accept `"conversation_assigned"`; the literal union in `convex/schema.ts` lines 375-388 includes `"new_assignment"` but not `"conversation_assigned"`. M5 / A1 / A2 will hit a Convex runtime validation error when `notifyDispatch` tries to insert `type: "conversation_assigned"`. Section 0.5 adds the literal before any M5/A1/A2 site is applied.

---

*If you disagree with any decision above, explain before complying with the next stage.*
