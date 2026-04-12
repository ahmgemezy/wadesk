import { cookies } from "next/headers";
import { CreateBroadcastWizard } from "@/components/broadcasts/create-broadcast-wizard";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export default async function NewBroadcastRoute({
  searchParams,
}: {
  searchParams: Promise<{ listId?: string }>;
}) {
  const { listId } = await searchParams;
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="h-full overflow-y-auto">
      <CreateBroadcastWizard
        locale={locale}
        initialListId={listId as Id<"contactLists"> | undefined}
      />
    </div>
  );
}
