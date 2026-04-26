"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useMemo, useCallback } from "react";

type TimeRange = "week" | "month" | "90days" | "alltime";

function getTimeRangeBounds(range: TimeRange) {
  const now = Date.now();
  const msPerDay = 86_400_000;

  switch (range) {
    case "week":
      return { startTs: now - 7 * msPerDay, endTs: now };
    case "month":
      return { startTs: now - 30 * msPerDay, endTs: now };
    case "90days":
      return { startTs: now - 90 * msPerDay, endTs: now };
    case "alltime":
      return { startTs: 0, endTs: now };
  }
}

type MemberProfile = {
  name: string | null;
  email: string | null;
  imageUrl: string | null;
  role: string;
  joinedAt: number | null;
  phone: string | null;
  jobTitle: string | null;
  bio: string | null;
  channels: { id: string; name: string }[];
  departments: { id: string; name: string }[];
};

export function useMemberProfile(memberId: string | null) {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSeq, setProfileSeq] = useState(0);

  const { startTs, endTs } = useMemo(() => getTimeRangeBounds(timeRange), [timeRange]);

  const fetchProfile = useAction(api.members.getMemberProfile);

  const refetchProfile = useCallback(() => {
    setProfileSeq((s) => s + 1);
  }, []);

  useEffect(() => {
    if (!memberId) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    let cancelled = false;
    fetchProfile({ memberId })
      .then((result) => {
        if (!cancelled) setProfile(result as MemberProfile ?? null);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => { cancelled = true; };
  }, [memberId, fetchProfile, profileSeq]);

  const analytics = useQuery(
    api.memberQueries.getMemberAnalytics,
    memberId ? { memberId, startTs, endTs } : "skip",
  );

  const recentConversations = useQuery(
    api.memberQueries.getMemberRecentConversations,
    memberId ? { memberId, limit: 10 } : "skip",
  );

  const auditLog = useQuery(
    api.memberQueries.getMemberAuditLog,
    memberId ? { memberId } : "skip",
  );

  return { profile, profileLoading, analytics, recentConversations, auditLog, timeRange, setTimeRange, refetchProfile };
}

export function useMemberProfileMutations() {
  const updateRole = useAction(api.members.updateMemberRole);
  const removeMember = useAction(api.members.removeMemberFromOrganization);
  const updateChannels = useAction(api.members.updateMemberChannels);
  const updateDepartments = useAction(api.members.updateMemberDepartments);
  const updateContact = useAction(api.members.updateMemberContact);
  const disableAccount = useAction(api.members.disableAccount);
  const enableAccount = useAction(api.members.enableAccount);

  return {
    updateRole,
    removeMember,
    updateChannels,
    updateDepartments,
    updateContact,
    disableAccount,
    enableAccount,
  };
}
