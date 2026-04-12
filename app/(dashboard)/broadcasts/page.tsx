import { cookies } from "next/headers";
import { BroadcastsPage } from "@/components/broadcasts/broadcasts-page";

export const dynamic = "force-dynamic";

export default async function BroadcastsRoute() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="h-full overflow-y-auto">
      <BroadcastsPage locale={locale} />
    </div>
  );
}
