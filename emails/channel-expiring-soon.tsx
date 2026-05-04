import { ChannelExpiringSoon } from "../convex/emails/templates/channelExpiringSoon";

export default function ChannelExpiringSoonPreview() {
  return <ChannelExpiringSoon locale="en" variables={{ channelName: "+966 55 123 4567", daysLeft: "3", deleteDate: "May 1, 2026", appUrl: "#" }} />;
}
