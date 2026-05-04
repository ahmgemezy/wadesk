import { BillingSubscriptionExpired } from "../convex/emails/templates/billingSubscriptionExpired";

export default function BillingSubscriptionExpiredArPreview() {
  return <BillingSubscriptionExpired locale="ar" variables={{ orgName: "شركة النخبة", planName: "الاحترافية", appUrl: "#" }} />;
}
