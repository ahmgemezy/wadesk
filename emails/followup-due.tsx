import { FollowupDue } from "../convex/emails/templates/followupDue";

export default function FollowupDueSentPreview() {
  return <FollowupDue locale="en" variables={{ contactName: "Layla", status: "sent", appUrl: "#" }} />;
}
