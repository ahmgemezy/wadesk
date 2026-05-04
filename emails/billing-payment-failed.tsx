import { BillingPaymentFailed } from "../convex/emails/templates/billingPaymentFailed";

export default function BillingPaymentFailedPreview() {
  return <BillingPaymentFailed locale="en" variables={{ orgName: "Acme Corp", planName: "Pro", appUrl: "#" }} />;
}
