import { SlaBreach } from "../convex/emails/templates/slaBreach";

export default function SlaBreachArPreview() {
  return <SlaBreach locale="ar" variables={{ contactName: "محمد", channelName: "واتساب", thresholdMinutes: "30", conversationId: "conv_456", appUrl: "#" }} />;
}
