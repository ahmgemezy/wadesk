import { ChannelExpiringSoon } from "../convex/emails/templates/channelExpiringSoon";

export default function ChannelExpiringSoonArPreview() {
  return <ChannelExpiringSoon locale="ar" variables={{ channelName: "+966 55 123 4567", daysLeft: "3", deleteDate: "1 مايو 2026", appUrl: "#" }} />;
}
