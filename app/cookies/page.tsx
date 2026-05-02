import type { Metadata } from "next";
import { LegalPageWrapper } from "@/components/marketing/legal-page-wrapper";
import { CookiesContent } from "@/components/marketing/cookies-content";

export const metadata: Metadata = {
  title: "Cookie Policy | WABDesk — سياسة ملفات تعريف الارتباط",
  description:
    "How WABDesk uses cookies and tracking technologies — كيفية استخدام واب ديسك لملفات تعريف الارتباط",
};

export default function CookiesPage() {
  return (
    <LegalPageWrapper currentPage="cookies">
      <CookiesContent />
    </LegalPageWrapper>
  );
}
