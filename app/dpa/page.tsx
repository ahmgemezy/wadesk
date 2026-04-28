import type { Metadata } from "next";
import { LegalPageWrapper } from "@/components/marketing/legal-page-wrapper";
import { DpaContent } from "@/components/marketing/dpa-content";

export const metadata: Metadata = {
  title: "Data Processing Agreement (DPA) | WABDesk",
  description:
    "WABDesk Data Processing Agreement — GDPR Article 28 compliant contract governing how WABDesk processes personal data on behalf of its customers.",
};

export default function DpaPage() {
  return (
    <LegalPageWrapper currentPage="dpa">
      <DpaContent />
    </LegalPageWrapper>
  );
}
