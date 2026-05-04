import { AgentWelcome } from "../convex/emails/templates/agentWelcome";

export default function AgentWelcomeArPreview() {
  return <AgentWelcome locale="ar" variables={{ agentName: "أحمد", orgName: "شركة النخبة", appUrl: "#" }} />;
}
