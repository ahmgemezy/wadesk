import type { Metadata } from "next";
import { LegalPageWrapper } from "@/components/marketing/legal-page-wrapper";
import { TermsContent } from "@/components/marketing/terms-content";

export const metadata: Metadata = {
  title: "Terms of Service | WABDesk",
  description:
    "WABDesk Terms of Service — your rights and obligations when using our WhatsApp multi-agent inbox platform.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPageWrapper currentPage="terms">
      <TermsContent />
    </LegalPageWrapper>
  );
}
