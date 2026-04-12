# UI Contracts: Automation Rules (009)

## Page: `/dashboard/automations`

**File**: `app/dashboard/automations/page.tsx`  
**Type**: Server Component (Clerk `auth()` for role check, passes role to client shell)

### Access Control
- `org:admin` → full access (create, edit, delete, toggle, reorder)
- `org:supervisor` → full access
- `org:agent` → redirect to `/dashboard` with no access

### Layout
- RTL (`dir="rtl"`) container
- Page title: "قواعد الردود التلقائية" (Automation Rules)
- Subtitle: rule count + plan limit, e.g. "٣ من أصل ١٠ قواعد"
- "+ إضافة قاعدة" button (opens `AutomationRuleForm` in a Sheet/Dialog)
- List of `AutomationRuleCard` components, sortable via drag-and-drop
- Empty state: illustration + CTA to create first rule

### Plan Limit Banner
When tenant is at limit: amber warning banner above list, "وصلت للحد الأقصى. ارقِّ خطتك لإضافة المزيد."

---

## Component: `AutomationRuleCard`

**File**: `components/automations/AutomationRuleCard.tsx`  
**Type**: Client Component

### Props
```ts
interface AutomationRuleCardProps {
  rule: {
    _id: Id<"automationRules">;
    name: string;
    enabled: boolean;
    priority: number;
    triggerType: TriggerType;
    keywordList?: string[];
    timeoutMinutes?: number;
    responseTemplate: string;
  };
  onEdit: (ruleId: Id<"automationRules">) => void;
  onDelete: (ruleId: Id<"automationRules">) => void;
  isDragging?: boolean;
}
```

### Visual Elements
- Drag handle (≡ icon) on the right (RTL) or left — whichever is the trailing side in LTR; in RTL, drag handle appears on the inline-start side
- Rule name (bold)
- Trigger type badge: e.g. "كلمة مفتاحية" / "خارج ساعات العمل" / "رسالة أولى" / "تأخر في الرد"
- Response preview (truncated to 80 chars)
- Toggle switch (shadcn/ui `Switch`) — calls `automations.toggleRule`
- Edit button → opens `AutomationRuleForm` pre-filled
- Delete button → confirmation dialog before calling `automations.deleteRule`

---

## Component: `AutomationRuleForm`

**File**: `components/automations/AutomationRuleForm.tsx`  
**Type**: Client Component  
**Container**: Rendered inside shadcn/ui `Sheet` (slide-in panel from the side)

### Props
```ts
interface AutomationRuleFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<AutomationRule>;
  onSuccess: () => void;
  onCancel: () => void;
}
```

### Form Fields (rendered in RTL)

| Field | Component | Validation |
|-------|-----------|-----------|
| Rule name | `Input` | Required, max 100 chars |
| Trigger type | `Select` (radio-style) | Required |
| Keywords (if keyword) | Tag input (multi-value) | Min 1 keyword |
| Timeout minutes (if no_reply) | `Input type="number"` | 1–1440 |
| Response text | `Textarea` | Required, max 1000 chars, variable hints shown below |
| Preview | Read-only rendered text | Shows resolved variables with sample data |

### Variable Hints
Below the response textarea, display clickable chips for each variable:
`{{customer_name}}` `{{business_name}}` `{{agent_name}}` `{{current_time}}`
Clicking a chip inserts it at cursor position.

### Trigger-Specific Validation
- `outside_hours` selected → if no `businessHours` configured: show inline warning "يجب ضبط ساعات العمل أولاً" with link to settings; Save button disabled.

### Preview Panel
Live-updated as user types. Shows interpolated output using sample values:
- `customer_name` → "أحمد محمد"
- `business_name` → actual tenant name from context
- `agent_name` → "فريق الدعم"
- `current_time` → current local time

### Submission
- Create: calls `useMutation(api.automations.createRule)`
- Edit: calls `useMutation(api.automations.updateRule)`
- On `PLAN_LIMIT_REACHED` error: show upgrade prompt toast
- On success: close Sheet, list auto-updates via live subscription
