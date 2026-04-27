import { AgentWelcome } from "../convex/emails/templates/agentWelcome";

export default function AgentWelcomePreview() {
  return <AgentWelcome locale="en" variables={{ agentName: "Ahmed", orgName: "Acme Corp", appUrl: "#" }} />;
}
