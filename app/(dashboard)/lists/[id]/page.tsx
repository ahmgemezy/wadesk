import { cookies } from "next/headers";
import { ListDetail } from "@/components/lists/list-detail";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export default async function ListDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="h-full overflow-y-auto">
      <ListDetail listId={id as Id<"contactLists">} locale={locale} />
    </div>
  );
}
