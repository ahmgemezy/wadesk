import { BillingSubscriptionExpired } from "../convex/emails/templates/billingSubscriptionExpired";

export default function BillingSubscriptionExpiredPreview() {
  return <BillingSubscriptionExpired locale="en" variables={{ orgName: "Acme Corp", planName: "Pro", appUrl: "#" }} />;
}
