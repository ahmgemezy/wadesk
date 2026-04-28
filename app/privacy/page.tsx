import type { Metadata } from "next";
import { LegalPageWrapper } from "@/components/marketing/legal-page-wrapper";
import { PrivacyContent } from "@/components/marketing/privacy-content";

export const metadata: Metadata = {
  title: "Privacy Policy | WABDesk",
  description:
    "WABDesk Privacy Policy — how we collect, use, and protect your personal data across all global jurisdictions.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageWrapper currentPage="privacy">
      <PrivacyContent />
    </LegalPageWrapper>
  );
}
