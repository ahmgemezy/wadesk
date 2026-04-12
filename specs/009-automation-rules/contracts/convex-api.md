# Convex API Contracts: Automation Rules (009)

All functions live in `convex/automations.ts` unless noted.  
All mutations require `org:admin` or `org:supervisor` role (enforced via `assertAdminOrSupervisor`).

---

## Queries

### `automations.listRules`
Returns all automation rules for the caller's tenant, ordered by priority ascending.

```ts
// args
{}

// returns
Array<{
  _id: Id<"automationRules">;
  name: string;
  enabled: boolean;
  priority: number;
  triggerType: TriggerType;
  keywordList?: string[];
  timeoutMinutes?: number;
  responseTemplate: string;
  createdAt: number;
  updatedAt: number;
}>
```

**Access**: Admin + Supervisor  
**Subscription**: Live query (Convex real-time)

---

### `automations.getBusinessHours`
Returns the business hours config for the caller's tenant, or `null` if not configured.

```ts
// args
{}

// returns
{
  timezone: string;
  schedule: BusinessHoursSchedule;
} | null
```

**Access**: Admin + Supervisor

---

## Mutations

### `automations.createRule`

```ts
// args
{
  name: string;
  triggerType: TriggerType;
  keywordList?: string[];        // required if triggerType = "keyword"
  timeoutMinutes?: number;       // required if triggerType = "no_reply_timeout"
  responseTemplate: string;
}

// returns
Id<"automationRules">

// throws
ConvexError("PLAN_LIMIT_REACHED")    — if at plan limit
ConvexError("BUSINESS_HOURS_REQUIRED") — if outside_hours trigger but no businessHours doc
ConvexError("FORBIDDEN")             — if caller is org:agent
```

**Access**: Admin + Supervisor  
**Side effects**: New rule appended to end of priority list (priority = current max + 1)

---

### `automations.updateRule`

```ts
// args
{
  ruleId: Id<"automationRules">;
  name?: string;
  triggerType?: TriggerType;
  keywordList?: string[];
  timeoutMinutes?: number;
  responseTemplate?: string;
}

// throws
ConvexError("NOT_FOUND")   — ruleId not found or belongs to different tenant
ConvexError("FORBIDDEN")   — caller is org:agent
```

**Access**: Admin + Supervisor

---

### `automations.deleteRule`

```ts
// args
{ ruleId: Id<"automationRules"> }

// throws
ConvexError("NOT_FOUND")
ConvexError("FORBIDDEN")
```

**Access**: Admin + Supervisor  
**Side effects**: Deletes rule and re-sequences priority for remaining rules

---

### `automations.toggleRule`

```ts
// args
{
  ruleId: Id<"automationRules">;
  enabled: boolean;
}

// throws
ConvexError("NOT_FOUND")
ConvexError("FORBIDDEN")
```

**Access**: Admin + Supervisor  
**Note**: Takes effect immediately for all subsequent messages

---

### `automations.reorderRules`

```ts
// args
{
  orderedIds: Id<"automationRules">[];  // All rule IDs in new desired order
}

// throws
ConvexError("FORBIDDEN")
ConvexError("INVALID_ORDER")  — if IDs don't match exact set of tenant's rules
```

**Access**: Admin + Supervisor  
**Side effects**: Rewrites priority values (0…N-1) for all rules atomically

---

### `automations.saveBusinessHours`

```ts
// args
{
  timezone: string;
  schedule: BusinessHoursSchedule;
}

// throws
ConvexError("FORBIDDEN")  — caller is not Admin
ConvexError("INVALID_TIMEZONE")  — timezone string is not a valid IANA zone
```

**Access**: Admin only (not Supervisor — business hours is a settings-level change)

---

## Internal Mutations (not callable from client)

### `internal.automations.evaluateAndFireAutomations`

```ts
// args
{
  tenantId: string;
  channelId: Id<"channels">;
  conversationId: Id<"conversations">;
  messageContent: string;
  isNewConversation: boolean;
}
// Called from http.ts after createInbound
```

### `internal.automations.checkNoReplyTimeouts`

```ts
// args: none
// Called by cron every 1 minute
```
