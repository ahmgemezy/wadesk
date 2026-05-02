// Maps a notification type to the in-app destination it should open when
// clicked. Kept as a pure function so the bell popover and the settings log
// page stay in sync — change one place, both update.
//
// `referenceId` semantics depend on the type:
//   - sla_breach, conversation_transferred, followup_due  → conversation id
//   - channel_expiring_soon, channel_deleted              → channel id
//   - template_approved, template_rejected                → template name
//   - agent_welcome, billing_*                            → opaque (unused for routing)
export function notificationRoute(type: string, referenceId: string): string {
  switch (type) {
    case "sla_breach":
    case "conversation_transferred":
    case "conversation_reopened":
    case "followup_due":
      return `/inbox?c=${referenceId}`;
    case "channel_expiring_soon":
    case "channel_deleted":
      return "/settings/channels";
    case "template_approved":
    case "template_rejected":
      return "/settings/templates";
    case "billing_payment_failed":
    case "billing_subscription_expired":
      return "/settings/billing";
    case "agent_welcome":
      return "/inbox";
    default:
      return "/inbox";
  }
}
