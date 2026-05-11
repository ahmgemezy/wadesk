import { cookies } from "next/headers";
import { ContactList } from "@/components/contacts/contact-list";
import { DT } from "@/lib/design-tokens";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="h-full flex flex-col">
      <div className="border-b p-4">
        <h1 className={DT.H2}>
          {locale === "ar" ? "جهات الاتصال" : "Contacts"}
        </h1>
      </div>
      <div className="flex-1 min-h-0">
        <ContactList locale={locale} />
      </div>
    </div>
  );
}
