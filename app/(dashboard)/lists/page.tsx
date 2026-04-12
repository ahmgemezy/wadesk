import { cookies } from "next/headers";
import { ListsPage } from "@/components/lists/lists-page";

export const dynamic = "force-dynamic";

export default async function ListsRoute() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="h-full flex flex-col">
      <ListsPage locale={locale} />
    </div>
  );
}
