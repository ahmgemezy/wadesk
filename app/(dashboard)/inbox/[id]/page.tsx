import { redirect } from "next/navigation";

export default async function ConversationRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/inbox?c=${id}`);
}
