"use client";

import { useState, useEffect } from "react";
import { LOCALE_CHANGE_EVENT } from "@/lib/events";

type Locale = "ar" | "en";
type MessageSender = "customer" | "system" | "agent";

interface ConvDef {
  id: string;
  name: string;
  initial: string;
  gradient: string;
  preview: string;
  time: string;
  badge?: string;
  unread: boolean;
  active?: boolean;
}

interface MsgDef {
  from: MessageSender;
  text: string;
  time: string;
}

interface LocaleContent {
  dir: "rtl" | "ltr";
  fontFamily: string;
  inboxLabel: string;
  onlineLabel: string;
  typingLabel: string;
  tagline: string;
  subtitle: string;
  inputPlaceholder: string;
  conversations: ConvDef[];
  openChat: {
    name: string;
    initial: string;
    gradient: string;
    agentInitial: string;
    messages: MsgDef[];
  };
  stats: { value: string; label: string }[];
}

// ─── Content ──────────────────────────────────────────────────────────────────

const CONTENT: Record<Locale, LocaleContent> = {
  ar: {
    dir: "rtl",
    fontFamily: "var(--font-arabic)",
    inboxLabel: "صندوق الوارد",
    onlineLabel: "٣ وكلاء نشطون",
    typingLabel: "يكتب الآن...",
    tagline: "فريقك كله في صندوق بريد واحد",
    subtitle: "صُمِّم لفِرَق العمل العربية",
    inputPlaceholder: "اكتب رسالة...",
    conversations: [
      {
        id: "1",
        name: "محمد حسام",
        initial: "م",
        gradient: "linear-gradient(135deg,#25d366,#128c7e)",
        preview: "ممكن أعرف سعر الباقة؟",
        time: "٣:٢٤ م",
        badge: "مبيعات",
        unread: true,
        active: true,
      },
      {
        id: "2",
        name: "سارة الأحمدي",
        initial: "س",
        gradient: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
        preview: "شكراً جزيلاً 😊",
        time: "٢:١٥ م",
        unread: false,
      },
      {
        id: "3",
        name: "خالد منصور",
        initial: "خ",
        gradient: "linear-gradient(135deg,#f59e0b,#d97706)",
        preview: "متى يتم الشحن؟",
        time: "١:٤٨ م",
        badge: "دعم",
        unread: true,
      },
    ],
    openChat: {
      name: "محمد حسام",
      initial: "م",
      gradient: "linear-gradient(135deg,#25d366,#128c7e)",
      agentInitial: "س",
      messages: [
        { from: "customer", text: "ممكن أعرف سعر الباقة؟", time: "٣:٢٤ م" },
        { from: "system", text: "سارة استلمت المحادثة", time: "" },
        {
          from: "agent",
          text: "أهلاً! الباقة المتقدمة بـ ٤٤.٩٩$ — وعندنا خصم ٢٠٪ للاشتراك السنوي 🎉",
          time: "٣:٢٦ م",
        },
        { from: "customer", text: "ممتاز! هشترك دلوقتي 🙌", time: "٣:٢٧ م" },
      ],
    },
    stats: [
      { value: "٩٢٪", label: "رضا العملاء" },
      { value: "٢.٤م", label: "متوسط الرد" },
      { value: "١٢", label: "وكيل نشط" },
    ],
  },

  en: {
    dir: "ltr",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
    inboxLabel: "Inbox",
    onlineLabel: "3 agents online",
    typingLabel: "typing...",
    tagline: "One WhatsApp inbox. Your whole team.",
    subtitle: "Designed for Arabic-speaking teams",
    inputPlaceholder: "Type a message...",
    conversations: [
      {
        id: "1",
        name: "Sarah Johnson",
        initial: "S",
        gradient: "linear-gradient(135deg,#25d366,#128c7e)",
        preview: "Can I know the pricing?",
        time: "3:24 PM",
        badge: "Sales",
        unread: true,
        active: true,
      },
      {
        id: "2",
        name: "Ahmed Kareem",
        initial: "A",
        gradient: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
        preview: "Thank you so much! 😊",
        time: "2:15 PM",
        unread: false,
      },
      {
        id: "3",
        name: "Maya Hassan",
        initial: "M",
        gradient: "linear-gradient(135deg,#f59e0b,#d97706)",
        preview: "When does it ship?",
        time: "1:48 PM",
        badge: "Support",
        unread: true,
      },
    ],
    openChat: {
      name: "Sarah Johnson",
      initial: "S",
      gradient: "linear-gradient(135deg,#25d366,#128c7e)",
      agentInitial: "S",
      messages: [
        {
          from: "customer",
          text: "Can I know the pricing for the advanced plan?",
          time: "3:24 PM",
        },
        { from: "system", text: "Sara took over the chat", time: "" },
        {
          from: "agent",
          text: "Hi! The Business plan is $44.99/mo — 20% off with annual billing 🎉",
          time: "3:26 PM",
        },
        { from: "customer", text: "Perfect! I'll subscribe now 🙌", time: "3:27 PM" },
      ],
    },
    stats: [
      { value: "92%", label: "CSAT Score" },
      { value: "2.4m", label: "Avg. Response" },
      { value: "12", label: "Active Agents" },
    ],
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

// Diagonal streak masks — each creates a different set of parallel lines
const STREAK_MASKS = [
  "linear-gradient(90deg,transparent 0%,#000 18%,transparent 30%,#000 52%,rgba(0,0,0,0.14) 65%,#000 76%,transparent 96%)",
  "linear-gradient(90deg,transparent 10%,#000 24%,rgba(0,0,0,0.50) 38%,rgba(0,0,0,0.14) 60%,#000 74%,transparent 96%)",
  "linear-gradient(90deg,transparent 8%,#000 19%,rgba(0,0,0,0.45) 28%,rgba(0,0,0,0.38) 40%,#000 47%,rgba(0,0,0,0.14) 72%,#000 86%,transparent 96%)",
  "linear-gradient(90deg,transparent 0%,#000 16%,rgba(0,0,0,0.50) 24%,#000 34%,transparent 44%,rgba(0,0,0,0.14) 66%,#000 77%,transparent 96%)",
];

function AmbientBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">

      {/* B: Aurora — slow-shifting repeating gradient bands */}
      <div
        style={{
          position: "absolute",
          inset: "-10px",
          backgroundImage:
            "repeating-linear-gradient(100deg," +
            "rgba(59,130,246,0) 0%,rgba(59,130,246,0) 7%," +
            "rgba(99,102,241,0.22) 12%,rgba(59,130,246,0) 18%," +
            "rgba(139,92,246,0.17) 23%,rgba(59,130,246,0) 29%," +
            "rgba(96,165,250,0.20) 34%,rgba(59,130,246,0) 40%" +
            ")",
          backgroundSize: "300% 300%",
          filter: "blur(14px)",
          animation: "wab-aurora-shift 22s ease infinite",
          opacity: 0.85,
        }}
      />

      {/* D: Diagonal light streaks — 4 masked layers, all skewed ~40° */}
      {STREAK_MASKS.map((mask, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "-40%",
            left: "-40%",
            right: "-40%",
            bottom: "-40%",
            background:
              i % 2 === 0
                ? "linear-gradient(rgba(0,150,255,0.85) 0%, rgba(0,150,255,0) 100%)"
                : "linear-gradient(rgba(99,102,241,0.80) 0%, rgba(99,102,241,0) 100%)",
            WebkitMaskImage: mask,
            maskImage: mask,
            transform: "skewX(40deg)",
            opacity: 0.16,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BrandPanel({ defaultLocale = "ar" }: { defaultLocale?: "ar" | "en" }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    // Sync with localStorage in case the cookie lagged behind the user's last selection
    try {
      const stored = localStorage.getItem("wabdesk-marketing-locale");
      if (stored === "en" || stored === "ar") setLocale(stored);
    } catch {}

    const handler = (e: Event) => {
      setLocale((e as CustomEvent<Locale>).detail);
    };
    window.addEventListener(LOCALE_CHANGE_EVENT, handler);
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, handler);
  }, []);

  const c = CONTENT[locale];
  const sysFontFamily =
    "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";

  return (
    <div
      className="hidden lg:flex lg:w-[58%] relative overflow-hidden flex-col items-center justify-center"
      style={{
        background: "linear-gradient(160deg, #09090d 0%, #0e1122 45%, #090b14 100%)",
      }}
    >
      <AmbientBackground />

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 inset-x-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(9,9,13,0.95), transparent)" }}
        aria-hidden="true"
      />

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center gap-7 px-10 w-full max-w-125">

        {/* Logo — always LTR */}
        <div className="flex items-center gap-3 self-start" dir="ltr">
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
                fill="white"
              />
              <path
                d="M8 10h8M8 14h5"
                stroke="rgba(0,113,227,0.85)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span
            style={{
              fontFamily: sysFontFamily,
              fontSize: 19,
              fontWeight: 600,
              color: "#ffffff",
              letterSpacing: "-0.3px",
            }}
          >
            WABDesk
          </span>
        </div>

        {/* ── Product mockup ── */}
        <div
          className="wab-float w-full"
          style={{
            borderRadius: 20,
            overflow: "hidden",
            background: "rgba(255,255,255,0.035)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.04) inset, 0 30px 80px rgba(0,0,0,0.55)",
          }}
        >
          {/* App bar */}
          <div
            dir={c.dir}
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(0,0,0,0.14)",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.88)",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: c.fontFamily,
              }}
            >
              {c.inboxLabel}
            </span>
            {/* Online pill — always LTR */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                direction: "ltr",
                background: "rgba(74,222,128,0.10)",
                border: "1px solid rgba(74,222,128,0.20)",
                borderRadius: 99,
                padding: "3px 10px",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#4ade80",
                  display: "inline-block",
                  boxShadow: "0 0 8px rgba(74,222,128,0.7)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: "rgba(74,222,128,0.85)",
                  fontSize: 11,
                  fontFamily: sysFontFamily,
                  whiteSpace: "nowrap",
                }}
              >
                {c.onlineLabel}
              </span>
            </div>
          </div>

          {/* ── Split pane ── */}
          {/*
            direction on the flex container swaps column order:
              RTL → sidebar (first child) renders on the RIGHT  ✓
              LTR → sidebar (first child) renders on the LEFT   ✓
          */}
          <div style={{ display: "flex", direction: c.dir, height: 360 }}>

            {/* Conversation sidebar */}
            <div
              style={{
                width: 172,
                flexShrink: 0,
                borderInlineEnd: "1px solid rgba(255,255,255,0.06)",
                overflowY: "hidden",
                background: "rgba(0,0,0,0.12)",
              }}
            >
              {c.conversations.map((conv) => (
                <div
                  key={conv.id}
                  dir={c.dir}
                  style={{
                    padding: "11px 10px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    background: conv.active
                      ? "rgba(0,113,227,0.12)"
                      : "transparent",
                    borderInlineStart: conv.active
                      ? "2px solid rgba(0,113,227,0.65)"
                      : "2px solid transparent",
                    cursor: "default",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    {/* Avatar */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: conv.gradient,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "white",
                        flexShrink: 0,
                      }}
                    >
                      {conv.initial}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "rgba(255,255,255,0.88)",
                            fontFamily: c.fontFamily,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                          }}
                        >
                          {conv.name}
                        </span>
                        {conv.unread && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: "#0071E3",
                              boxShadow: "0 0 6px rgba(0,113,227,0.6)",
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>

                      <span
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.36)",
                          fontFamily: c.fontFamily,
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginTop: 2,
                        }}
                      >
                        {conv.preview}
                      </span>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginTop: 4,
                        }}
                      >
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>
                          {conv.time}
                        </span>
                        {conv.badge && (
                          <span
                            style={{
                              background: "rgba(0,113,227,0.16)",
                              border: "1px solid rgba(0,113,227,0.28)",
                              borderRadius: 99,
                              padding: "1px 6px",
                              fontSize: 10,
                              color: "#93c5fd",
                              fontFamily: c.fontFamily,
                            }}
                          >
                            {conv.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Open conversation ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

              {/* Chat header */}
              <div
                dir={c.dir}
                style={{
                  padding: "11px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  background: "rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: c.openChat.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "white",
                    flexShrink: 0,
                  }}
                >
                  {c.openChat.initial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.90)",
                      fontFamily: c.fontFamily,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.openChat.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#4ade80" }}>
                    ● {c.typingLabel}
                  </div>
                </div>
                {/* Action icons */}
                <div style={{ display: "flex", gap: 10, color: "rgba(255,255,255,0.28)", flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                  </svg>
                </div>
              </div>

              {/* Messages — always LTR flex so agent=right, customer=left regardless of locale */}
              <div
                style={{
                  flex: 1,
                  padding: "12px 12px 8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  overflowY: "hidden",
                  direction: "ltr",
                }}
              >
                {c.openChat.messages.map((msg, idx) => {
                  if (msg.from === "system") {
                    return (
                      <div
                        key={idx}
                        className={`wab-bubble-${idx + 1}`}
                        style={{ alignSelf: "center" }}
                      >
                        <div
                          style={{
                            background: "rgba(0,113,227,0.12)",
                            border: "1px solid rgba(0,113,227,0.22)",
                            borderRadius: 99,
                            padding: "3px 11px",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              background: "linear-gradient(135deg,#0071E3,#4f46e5)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 7,
                              fontWeight: 700,
                              color: "white",
                              flexShrink: 0,
                            }}
                          >
                            {c.openChat.agentInitial}
                          </div>
                          <span
                            style={{
                              color: "#93c5fd",
                              fontSize: 11,
                              fontFamily: c.fontFamily,
                              whiteSpace: "nowrap",
                              direction: c.dir,
                            }}
                          >
                            {msg.text}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const isAgent = msg.from === "agent";
                  return (
                    <div
                      key={idx}
                      className={`wab-bubble-${idx + 1}`}
                      style={{ alignSelf: isAgent ? "flex-end" : "flex-start", maxWidth: "80%" }}
                    >
                      <div
                        style={{
                          background: isAgent
                            ? "linear-gradient(135deg, #0071E3 0%, #4338ca 100%)"
                            : "rgba(255,255,255,0.09)",
                          borderRadius: isAgent
                            ? "16px 4px 16px 16px"
                            : "4px 16px 16px 16px",
                          padding: "8px 11px",
                          color: "#fff",
                          fontSize: 12,
                          lineHeight: 1.5,
                          fontFamily: c.fontFamily,
                          direction: c.dir,
                          boxShadow: isAgent
                            ? "0 4px 14px rgba(0,113,227,0.28)"
                            : undefined,
                        }}
                      >
                        {msg.text}
                      </div>
                      <div
                        style={{
                          color: "rgba(255,255,255,0.22)",
                          fontSize: 10,
                          marginTop: 2,
                          textAlign: isAgent ? "right" : "left",
                          paddingLeft: isAgent ? 0 : 3,
                          paddingRight: isAgent ? 3 : 0,
                        }}
                      >
                        {msg.time}
                        {isAgent && " ✓✓"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Fake input bar */}
              <div
                dir={c.dir}
                style={{
                  padding: "9px 12px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  background: "rgba(0,0,0,0.10)",
                }}
              >
                {/* Attachment */}
                <div style={{ color: "rgba(255,255,255,0.22)", display: "flex", flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </div>
                {/* Input field */}
                <div
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: 99,
                    padding: "6px 13px",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.25)",
                    fontFamily: c.fontFamily,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.inputPlaceholder}
                </div>
                {/* Send button */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "#0071E3",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 0 12px rgba(0,113,227,0.4)",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              color: "rgba(255,255,255,0.90)",
              fontSize: 21,
              fontWeight: 700,
              fontFamily: c.fontFamily,
              direction: c.dir,
              lineHeight: 1.45,
              marginBottom: 5,
              letterSpacing: locale === "ar" ? "0" : "-0.3px",
            }}
          >
            {c.tagline}
          </p>
          <p
            style={{
              color: "rgba(180,197,255,0.42)",
              fontSize: 12,
              letterSpacing: "0.02em",
              fontFamily: c.fontFamily,
              direction: c.dir,
            }}
          >
            {c.subtitle}
          </p>
        </div>
      </div>

      {/* ── Stats row (absolute bottom) ── */}
      <div
        className="absolute bottom-7 left-0 right-0 flex justify-center gap-10 px-8"
        dir="ltr"
      >
        {c.stats.map((stat) => (
          <div key={stat.label} style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
                fontFamily: c.fontFamily,
                letterSpacing: locale === "ar" ? "0" : "-0.3px",
                lineHeight: 1.2,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(180,197,255,0.42)",
                marginTop: 2,
                fontFamily: sysFontFamily,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
