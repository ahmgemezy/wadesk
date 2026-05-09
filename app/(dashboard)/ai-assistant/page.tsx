"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-hooks";
import { useRouter } from "next/navigation";
import { AiAssistantSettings } from "@/components/ai-assistant/ai-assistant-settings";

export default function AiAssistantPage() {
  const { orgRole, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (orgRole === "org:agent") {
      router.replace("/inbox");
    }
  }, [orgRole, isLoaded, router]);

  if (!isLoaded) return null;
  if (orgRole === "org:agent") return null;

  return <AiAssistantSettings />;
}
