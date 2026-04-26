"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/context";
import { useMemberProfile, useMemberProfileMutations } from "@/hooks/use-member-profile";
import type { OrgRole } from "@/components/settings/team-member-list";
import { Crown, Shield, HeadphonesIcon, CalendarDays } from "lucide-react";
import { OverviewTab } from "./member-profile/overview-tab";
import { AnalyticsTab } from "./member-profile/analytics-tab";
import { HistoryTab } from "./member-profile/history-tab";
import { ManageTab } from "./member-profile/manage-tab";

interface MemberProfileModalProps {
  memberId: string;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

type Tab = "overview" | "analytics" | "history" | "manage";

function roleLabel(role: OrgRole, t: (en: string, ar: string) => string): string {
  switch (role) {
    case "org:admin":
      return t("Admin", "مدير");
    case "org:supervisor":
      return t("Supervisor", "مشرف");
    case "org:agent":
      return t("Agent", "وكيل");
  }
}

function roleBadgeVariant(role: OrgRole): "default" | "secondary" | "outline" {
  switch (role) {
    case "org:admin":
      return "default";
    case "org:supervisor":
      return "secondary";
    case "org:agent":
      return "outline";
  }
}

function roleIcon(role: OrgRole) {
  switch (role) {
    case "org:admin":
      return <Crown className="size-3" />;
    case "org:supervisor":
      return <Shield className="size-3" />;
    case "org:agent":
      return <HeadphonesIcon className="size-3" />;
  }
}

export function MemberProfileModal({
  memberId,
  open,
  onClose,
  onUpdated,
}: MemberProfileModalProps) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("overview");
  const { profile, profileLoading, analytics, recentConversations, auditLog, timeRange, setTimeRange, refetchProfile } =
    useMemberProfile(open ? memberId : null);

  const handleUpdated = useCallback(() => {
    refetchProfile();
    onUpdated?.();
  }, [refetchProfile, onUpdated]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-136 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pe-8">
          <DialogTitle>{t("Member Profile", "ملف العضو")}</DialogTitle>
        </DialogHeader>

        {profileLoading ? (
          <div className="flex-1 space-y-4 p-4">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-40 bg-muted rounded animate-pulse" />
                <div className="h-4 w-56 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ) : profile ? (
          <>
            <div className="flex items-start gap-4 px-4 pb-4 border-b">
              <Avatar className="size-14">
                {profile.imageUrl && <AvatarImage src={profile.imageUrl} />}
                <AvatarFallback className="text-lg">
                  {(profile.name ?? profile.email ?? "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-lg font-semibold truncate">
                  {profile.name ?? profile.email ?? t("Unknown", "غير معروف")}
                </h3>

                {profile.email && (
                  <p className="text-sm text-muted-foreground truncate" dir="ltr">
                    {profile.email}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <Badge variant={roleBadgeVariant(profile.role as OrgRole)} className="gap-1">
                    {roleIcon(profile.role as OrgRole)}
                    {roleLabel(profile.role as OrgRole, t)}
                  </Badge>

                  {profile.joinedAt && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="size-3" />
                      {t("Joined", "انضم في")}{" "}
                      {new Date(profile.joinedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-1 border-b pb-0">
              {([
                { id: "overview" as const, label: t("Overview", "نظرة عامة") },
                { id: "analytics" as const, label: t("Analytics", "تحليلات") },
                { id: "history" as const, label: t("History", "السجل") },
                { id: "manage" as const, label: t("Manage", "إدارة") },
              ]).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`px-3 py-1.5 text-sm rounded-t-md transition-colors ${
                    tab === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {tab === "overview" && (
                <OverviewTab
                  profile={profile}
                  analytics={analytics}
                  onViewAnalytics={() => setTab("analytics")}
                />
              )}
              {tab === "analytics" && (
                <AnalyticsTab
                  analytics={analytics}
                  timeRange={timeRange}
                  setTimeRange={setTimeRange}
                />
              )}
              {tab === "history" && (
                <HistoryTab
                  recentConversations={recentConversations}
                  auditLog={auditLog}
                />
              )}
              {tab === "manage" && (
                <ManageTab
                  memberId={memberId}
                  profile={profile}
                  onClose={onClose}
                  onUpdated={handleUpdated}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12 text-muted-foreground">
            {t("Member not found", "العضو غير موجود")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
