"use client";

import { CreateOrganization } from "@clerk/nextjs";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <CreateOrganization afterCreateOrganizationUrl="/inbox" />
    </div>
  );
}
