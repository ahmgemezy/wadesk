import { ChannelDeleted } from "../convex/emails/templates/channelDeleted";

export default function ChannelDeletedPreview() {
  return <ChannelDeleted locale="en" variables={{ channelName: "+966 55 123 4567", appUrl: "#" }} />;
}
