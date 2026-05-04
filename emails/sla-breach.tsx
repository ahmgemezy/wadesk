import { SlaBreach } from "../convex/emails/templates/slaBreach";

export default function SlaBreachPreview() {
  return <SlaBreach locale="en" variables={{ contactName: "Mohammed", channelName: "WhatsApp", thresholdMinutes: "30", conversationId: "conv_456", appUrl: "#" }} />;
}
