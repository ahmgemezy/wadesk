"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Inbox,
  AtSign,
  Building2,
  Folder,
  CornerUpRight,
  CheckCircle2,
} from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { useSelectedChannel } from "@/lib/hooks/channel-context";

function Count({ n }: { n: number }) {
  return (
    <span className="ms-auto text-xs tabular-nums text-muted-foreground">
      {n > 0 ? n : "—"}
    </span>
  );
}

export function InboxQueueTree() {
  const t = useT();
  const { channelId: selectedChannelId } = useSelectedChannel();
  const data = useQuery(api.inbox.queueCounts);
  const params = useSearchParams();
  const scope = params.get("scope") ?? "";

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(
        localStorage.getItem("wabdesk:queue-tree:expanded") ?? "{}"
      );
    } catch {
      return {};
    }
  });

  const [sectionCollapsed, setSectionCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return JSON.parse(
        localStorage.getItem("wabdesk:queue-tree:section:collapsed") ?? "false"
      );
    } catch {
      return false;
    }
  });

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(
        "wabdesk:queue-tree:expanded",
        JSON.stringify(next)
      );
      return next;
    });
  };

  const toggleSection = () => {
    setSectionCollapsed((prev: boolean) => {
      const next = !prev;
      localStorage.setItem(
        "wabdesk:queue-tree:section:collapsed",
        JSON.stringify(next)
      );
      return next;
    });
  };

  const isActive = (s: string) => scope === s;
  const linkClass = (s: string) =>
    `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors ${
      isActive(s) ? "bg-primary/10 text-primary font-semibold" : ""
    }`;

  return (
    <div className="border-b">
      {/* Section header — always visible */}
      <button
        type="button"
        onClick={toggleSection}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{t("Views", "العروض")}</span>
        {sectionCollapsed
          ? <ChevronDown className="size-3.5" />
          : <ChevronUp className="size-3.5" />
        }
      </button>

      {/* Collapsible content */}
      {!sectionCollapsed && (
        <>
          {!data ? (
            <div className="px-3 pb-3 text-sm text-muted-foreground">
              {t("Loading…", "جارٍ التحميل…")}
            </div>
          ) : (
            <nav className="flex flex-col gap-0.5 px-2 pb-2 text-sm">
              <Link href="/inbox?scope=mine" className={linkClass("mine")}>
                <Inbox className="size-4 shrink-0" />
                <span>{t("Mine", "محادثاتي")}</span>
                <Count n={data.mine} />
              </Link>
              <Link href="/inbox?scope=notifications" className={linkClass("notifications")}>
                <AtSign className="size-4 shrink-0" />
                <span>{t("Notifications", "التنبيهات")}</span>
                <Count n={data.mentions} />
              </Link>

              <div className="my-1.5 border-t border-border" />

              {(selectedChannelId
                ? data.channels.filter((c) => c._id === selectedChannelId)
                : data.channels
              ).map((c) => {
                const channelKey = `ch:${c._id}`;
                const open = expanded[channelKey] ?? false;
                return (
                  <div key={c._id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                      onClick={() => toggle(channelKey)}
                    >
                      {open ? (
                        <ChevronDown className="size-4 shrink-0" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 rtl:rotate-180" />
                      )}
                      <Building2 className="size-4 shrink-0" />
                      <span className="font-medium truncate">{c.displayName}</span>
                      <Count n={c.total} />
                    </button>
                    {open && (
                      <div className="ms-6 flex flex-col gap-0.5">
                        <Link
                          href={`/inbox?scope=channel:${c._id}:unassigned`}
                          className={linkClass(`channel:${c._id}:unassigned`)}
                        >
                          <span>{t("Unassigned", "بدون تعيين")}</span>
                          <Count n={c.unassigned} />
                        </Link>
                        {c.departments.map((d) => {
                          const deptKey = `dept:${d._id}`;
                          const dOpen = expanded[deptKey] ?? false;
                          return (
                            <div key={d._id}>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                                onClick={() => toggle(deptKey)}
                              >
                                {dOpen ? (
                                  <ChevronDown className="size-4 shrink-0" />
                                ) : (
                                  <ChevronRight className="size-4 shrink-0 rtl:rotate-180" />
                                )}
                                <Folder className="size-4 shrink-0" />
                                <span className="truncate">{d.name}</span>
                                {d.isDefault && (
                                  <span className="shrink-0 rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-medium leading-none">
                                    {t("default", "افتراضي")}
                                  </span>
                                )}
                                <Count n={d.total} />
                              </button>
                              {dOpen && (
                                <div className="ms-6 flex flex-col gap-0.5">
                                  {data.isPrivileged && (
                                    <Link
                                      href={`/inbox?scope=dept:${d._id}:all`}
                                      className={linkClass(`dept:${d._id}:all`)}
                                    >
                                      <span>{t("All in dept", "الكل بالإدارة")}</span>
                                      <Count n={d.total} />
                                    </Link>
                                  )}
                                  <Link
                                    href={`/inbox?scope=dept:${d._id}:unassigned`}
                                    className={linkClass(`dept:${d._id}:unassigned`)}
                                  >
                                    <span>
                                      {t(
                                        "Unassigned in dept",
                                        "بدون تعيين بالإدارة"
                                      )}
                                    </span>
                                    <Count n={d.unassignedInDept} />
                                  </Link>
                                  <Link
                                    href={`/inbox?scope=dept:${d._id}:mine`}
                                    className={linkClass(`dept:${d._id}:mine`)}
                                  >
                                    <span>
                                      {t("Mine in dept", "محادثاتي بالإدارة")}
                                    </span>
                                    <Count n={d.mineInDept} />
                                  </Link>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="my-1.5 border-t border-border" />

              <Link href="/inbox?scope=forwarded" className={linkClass("forwarded")}>
                <CornerUpRight className="size-4 shrink-0" />
                <span>{t("Forwarded", "محوَّلة")}</span>
                <Count n={data.forwarded} />
              </Link>
              <Link href="/inbox?scope=resolved" className={linkClass("resolved")}>
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{t("Resolved", "محلولة")}</span>
                <Count n={data.resolved} />
              </Link>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
