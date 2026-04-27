import { NewAssignment } from "../convex/emails/templates/newAssignment";

export default function NewAssignmentArPreview() {
  return <NewAssignment locale="ar" variables={{ contactName: "سارة علي", channelName: "واتساب بزنس", conversationId: "conv_123", assignedByName: "المدير", appUrl: "#" }} />;
}
