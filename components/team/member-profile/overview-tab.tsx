"use client";

import { useT } from "@/lib/i18n/context";
import { DT } from "@/lib/design-tokens";
import { Hash, Building2, Clock, Star, MessageSquare, CheckCircle2, BarChart3 } from "lucide-react";

type Profile = {
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

type AnalyticsSummary = {
  totalConversations: number;
  resolvedCount: number;
  avgFirstResponseTimeSeconds: number | null;
  avgCsatScore: number | null;
};

type OverviewTabProps = {
  profile: Profile;
  analytics: { summary: AnalyticsSummary } | undefined;
  onViewAnalytics: () => void;
};

export function OverviewTab({ profile, analytics, onViewAnalytics }: OverviewTabProps) {
  const t = useT();

  if (!analytics) return <OverviewSkeleton />;

  const s = analytics.summary;
  const responseTime = s.avgFirstResponseTimeSeconds != null
    ? (s.avgFirstResponseTimeSeconds / 60).toFixed(1)
    : "—";
  const csat = s.avgCsatScore != null ? s.avgCsatScore.toFixed(1) : "—";
  const resolutionRate =
    s.totalConversations > 0
      ? ((s.resolvedCount / s.totalConversations) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <section className={`${DT.CARD_SM} p-4`}>
        <h3 className={`mb-3 ${DT.H3}`}>
          {t("Contact Information", "معلومات التواصل")}
        </h3>
        <div className={`space-y-2 ${DT.BODY}`}>
          {profile.email && (
            <div>
              <span className={DT.MUTED}>{t("Email", "البريد الإلكتروني")}: </span>
              <span dir="ltr">{profile.email}</span>
            </div>
          )}
          {profile.phone && (
            <div>
              <span className={DT.MUTED}>{t("Phone", "الهاتف")}: </span>
              <span dir="ltr">{profile.phone}</span>
            </div>
          )}
          {profile.jobTitle && (
            <div>
              <span className={DT.MUTED}>{t("Job Title", "المسمى الوظيفي")}: </span>
              <span>{profile.jobTitle}</span>
            </div>
          )}
          {!profile.email && !profile.phone && !profile.jobTitle && (
            <span className={DT.MICRO}>
              {t("No contact information provided", "لم يتم توفير معلومات تواصل")}
            </span>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-6">
        <section>
          <h3 className={`mb-2 ${DT.SEC}`}>
            {t("Channels Assigned", "القنوات المخصصة")}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {profile.channels.length > 0
              ? profile.channels.map((ch) => (
                  <span key={ch.id} className={`${DT.BADGE_NEUTRAL} gap-1`}>
                    <Hash className="size-3" />
                    {ch.name}
                  </span>
                ))
              : <span className={DT.MUTED}>{t("None", "لا يوجد")}</span>}
          </div>
        </section>

        <section>
          <h3 className={`mb-2 ${DT.SEC}`}>
            {t("Departments", "الأقسام")}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {profile.departments.length > 0
              ? profile.departments.map((dept) => (
                  <span key={dept.id} className={`${DT.BADGE_PURPLE} gap-1`}>
                    <Building2 className="size-3" />
                    {dept.name}
                  </span>
                ))
              : <span className={DT.MUTED}>{t("None", "لا يوجد")}</span>}
          </div>
        </section>
      </div>

      <section>
        <h3 className={`mb-3 ${DT.SEC}`}>
          {t("Quick Performance Snapshot", "نظرة سريعة على الأداء")}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label={t("Response Time", "وقت الاستجابة")}
            value={`${responseTime} ${t("min", "د")}`}
            icon={<Clock className="size-4 text-[#6E6E73] dark:text-white/50" />}
          />
          <StatCard
            label={t("CSAT Score", "درجة رضا العملاء")}
            value={`${csat} / 5`}
            icon={<Star className="size-4 text-[#6E6E73] dark:text-white/50" />}
          />
          <StatCard
            label={t("Conversations Handled", "المحادثات المُعالجة")}
            value={String(s.totalConversations)}
            icon={<MessageSquare className="size-4 text-[#6E6E73] dark:text-white/50" />}
          />
          <StatCard
            label={t("Resolution Rate", "نسبة الحل")}
            value={`${resolutionRate}%`}
            icon={<CheckCircle2 className="size-4 text-[#6E6E73] dark:text-white/50" />}
          />
        </div>
      </section>

      <button
        onClick={onViewAnalytics}
        className={`inline-flex items-center gap-1.5 ${DT.MUTED} ${DT.MUTED_HOVER} transition-colors`}
      >
        <BarChart3 className="size-3.5" />
        {t("View full analytics", "عرض التحليلات الكاملة")}
      </button>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className={`${DT.CARD_SM} p-3`}>
      <div className={`mb-1 flex items-center gap-1.5 ${DT.MICRO}`}>
        {icon}
        {label}
      </div>
      <p className="text-[17px] font-semibold text-[#1D1D1F] dark:text-white">{value}</p>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="mb-2 h-3 w-24 rounded bg-black/[0.06] dark:bg-white/[0.08]" />
          <div className="flex gap-1.5">
            <div className="h-5 w-16 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
            <div className="h-5 w-20 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
          </div>
        </div>
        <div>
          <div className="mb-2 h-3 w-20 rounded bg-black/[0.06] dark:bg-white/[0.08]" />
          <div className="flex gap-1.5">
            <div className="h-5 w-14 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
          </div>
        </div>
      </div>
      <div>
        <div className="mb-3 h-3 w-40 rounded bg-black/[0.06] dark:bg-white/[0.08]" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[72px] rounded-2xl bg-black/[0.06] dark:bg-white/[0.08]" />
          ))}
        </div>
      </div>
    </div>
  );
}
