"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { WABusinessProfile } from "@/components/settings/wa-business-profile";
import { useT } from "@/lib/i18n/context";

export default function WABusinessProfilePage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const t = useT();
  const { channelId: rawChannelId } = use(params);
  if (!rawChannelId || typeof rawChannelId !== "string") notFound();
  const channelId = rawChannelId as Id<"channels">;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        {t("Business Profile", "الملف التجاري")}
      </h1>
      <WABusinessProfile channelId={channelId} />
    </div>
  );
}
