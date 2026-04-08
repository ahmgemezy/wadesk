"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Only renders in development mode — safe to ship to production (returns null)
export function SeedButton() {
  const [loading, setLoading] = useState(false);
  const seed = useMutation(api.inbox.seed);

  if (process.env.NODE_ENV !== "development") return null;

  const handleSeed = async () => {
    setLoading(true);
    try {
      await seed({});
      toast.success("Seed data created — refresh inbox");
    } catch (e) {
      toast.error("Seed failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSeed}
      disabled={loading}
      className="text-xs border-dashed border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
    >
      {loading ? "Seeding..." : "🌱 Seed Dev Data"}
    </Button>
  );
}
