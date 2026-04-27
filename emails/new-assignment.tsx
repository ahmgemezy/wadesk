import { NewAssignment } from "../convex/emails/templates/newAssignment";

export default function NewAssignmentPreview() {
  return <NewAssignment locale="en" variables={{ contactName: "Sara Ali", channelName: "WhatsApp Business", conversationId: "conv_123", assignedByName: "Admin", appUrl: "#" }} />;
}
