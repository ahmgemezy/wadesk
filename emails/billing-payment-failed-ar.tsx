import { BillingPaymentFailed } from "../convex/emails/templates/billingPaymentFailed";

export default function BillingPaymentFailedArPreview() {
  return <BillingPaymentFailed locale="ar" variables={{ orgName: "شركة النخبة", planName: "الاحترافية", appUrl: "#" }} />;
}
