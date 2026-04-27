import { ChannelDeleted } from "../convex/emails/templates/channelDeleted";

export default function ChannelDeletedArPreview() {
  return <ChannelDeleted locale="ar" variables={{ channelName: "+966 55 123 4567", appUrl: "#" }} />;
}
