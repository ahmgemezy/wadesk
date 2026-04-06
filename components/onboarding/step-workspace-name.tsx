"use client";

import { useEffect } from "react";
import { CreateOrganization } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function StepWorkspaceName() {
  const { orgId } = useAuth();
  const ensureCreated = useMutation(api.onboarding.ensureCreated);

  useEffect(() => {
    if (orgId) {
      ensureCreated({});
    }
  }, [orgId, ensureCreated]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">سمّي مساحة العمل</h2>
        <p className="text-muted-foreground mt-1">Choose a name for your workspace</p>
      </div>
      <CreateOrganization afterCreateOrganizationUrl="/onboarding" />
    </div>
  );
}
