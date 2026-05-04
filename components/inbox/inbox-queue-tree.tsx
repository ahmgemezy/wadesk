"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Inbox,
  AtSign,
  Building2,
  Folder,
} from "lucide-react";
import { useT } from "@/lib/i18n/context";

function Count({ n }: { n: number }) {
  return (
    <span className="ms-auto text-xs tabular-nums text-muted-foreground">
      {n > 0 ? n : "—"}
    </span>
  );
}

export function InboxQueueTree() {
  const t = useT();
  const data = useQuery(api.inbox.queueCounts);
  const params = useSearchParams();
  const scope = params.get("scope") ?? "mine";

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

  const isActive = (s: string) => scope === s;
  const linkClass = (s: string) =>
    `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted ${
      isActive(s) ? "bg-muted font-medium" : ""
    }`;

  if (!data) {
    return (
      <div className="p-3 text-sm text-muted-foreground">
        {t("Loading…", "جارٍ التحميل…")}
      </div>
    );
  }

  return (
    <nav className="flex flex-col gap-0.5 p-2 text-sm">
      <Link href="/inbox?scope=mine" className={linkClass("mine")}>
        <Inbox className="size-4" />
        <span>{t("Mine", "محادثاتي")}</span>
        <Count n={data.mine} />
      </Link>
      <Link href="/inbox?scope=notifications" className={linkClass("notifications")}>
        <AtSign className="size-4" />
        <span>{t("Notifications", "التنبيهات")}</span>
        <Count n={data.mentions} />
      </Link>

      <div className="my-2 border-t border-border" />

      {data.channels.map((c) => {
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
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              <Building2 className="size-4" />
              <span className="font-medium">{c.displayName}</span>
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
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                        <Folder className="size-4" />
                        <span>{d.name}</span>
                        <Count n={d.total} />
                      </button>
                      {dOpen && (
                        <div className="ms-6 flex flex-col gap-0.5">
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

      <div className="my-2 border-t border-border" />

      <Link href="/inbox?scope=forwarded" className={linkClass("forwarded")}>
        <span>{t("Forwarded", "محوَّلة")}</span>
        <Count n={data.forwarded} />
      </Link>
      <Link href="/inbox?scope=resolved" className={linkClass("resolved")}>
        <span>{t("Resolved", "محلولة")}</span>
        <Count n={data.resolved} />
      </Link>
    </nav>
  );
}
