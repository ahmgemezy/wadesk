"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  XIcon,
  SendIcon,
  SaveIcon,
  CheckIcon,
  SmileIcon,
  PaperclipIcon,
  ImageIcon,
  VideoIcon,
  FileIcon,
  CalendarIcon,
  ClockIcon,
  ChevronDownIcon,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return "W";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function charCount(body: string): string {
  const len = body.length;
  const msgs = Math.max(1, Math.ceil(len / 1600));
  return `${len} chars · ${msgs} message${msgs > 1 ? "s" : ""}`;
}

// Highlight {{variable}} tokens in the preview bubble
function renderPreviewBody(body: string): React.ReactNode {
  if (!body) return null;
  return body.split(/(\{\{[^}]+\}\})/g).map((part, i) =>
    /^\{\{[^}]+\}\}$/.test(part) ? (
      <span key={i} className="text-[#2563EB] font-semibold">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// ─── iPhone 17 Pro Max–style WhatsApp mockup ──────────────────────────────────

function WaPhoneMockup({
  channelName,
  channelPictureUrl,
  body,
  mediaPreview,
}: {
  channelName: string | null;
  channelPictureUrl: string | null;
  body: string;
  mediaPreview: string | null;
}) {
  const initials = getInitials(channelName);
  const displayName = channelName ?? "WABDesk";
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Phone dimensions — 260 px wide, ~2.1:1 aspect ratio (iPhone 17 Pro Max)
  const W = 260;
  const frameR = 52;   // outer frame border-radius
  const pad = 12;      // frame padding (bezel thickness)
  const screenR = 42;  // inner screen border-radius

  return (
    <div className="relative mx-auto select-none" style={{ width: `${W}px` }}>

      {/* ── Side buttons ─────────────────────────────────────────────────── */}
      {/* Action button (left, top) */}
      <div className="absolute" style={{ left: "-5px", top: "96px",  width: "5px", height: "30px", background: "linear-gradient(to right,#5a5a5c,#3a3a3c)", borderRadius: "3px 0 0 3px" }} />
      {/* Volume up */}
      <div className="absolute" style={{ left: "-5px", top: "138px", width: "5px", height: "44px", background: "linear-gradient(to right,#5a5a5c,#3a3a3c)", borderRadius: "3px 0 0 3px" }} />
      {/* Volume down */}
      <div className="absolute" style={{ left: "-5px", top: "190px", width: "5px", height: "44px", background: "linear-gradient(to right,#5a5a5c,#3a3a3c)", borderRadius: "3px 0 0 3px" }} />
      {/* Power / sleep-wake */}
      <div className="absolute" style={{ right: "-5px", top: "158px", width: "5px", height: "72px", background: "linear-gradient(to left,#5a5a5c,#3a3a3c)", borderRadius: "0 3px 3px 0" }} />

      {/* ── Phone frame ──────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: `${frameR}px`,
        padding: `${pad}px`,
        background: "linear-gradient(145deg, #636366 0%, #48484a 30%, #2c2c2e 70%, #1c1c1e 100%)",
        boxShadow: [
          "0 0 0 1px rgba(255,255,255,0.15)",
          "inset 0 1px 0 rgba(255,255,255,0.18)",
          "inset 0 -1px 0 rgba(0,0,0,0.5)",
          "0 40px 80px rgba(0,0,0,0.55)",
          "0 8px 24px rgba(0,0,0,0.4)",
        ].join(","),
      }}>

        {/* ── Screen ───────────────────────────────────────────────────── */}
        <div className="overflow-hidden flex flex-col" style={{
          borderRadius: `${screenR}px`,
          height: "488px",
          background: "#000",
        }}>

          {/* Status bar — Dynamic Island centered, time left, icons right */}
          <div className="relative flex items-center shrink-0" style={{
            height: "50px",
            background: "#075E54",
            paddingLeft: "20px",
            paddingRight: "16px",
          }}>
            {/* Time — left of DI */}
            <span className="text-white font-semibold z-10" style={{ fontSize: "11px", letterSpacing: "-0.2px" }}>
              {now}
            </span>

            {/* Dynamic Island — absolutely centered */}
            <div className="absolute left-1/2 top-1/2" style={{
              transform: "translate(-50%, -58%)",
              width: "88px",
              height: "28px",
              background: "#000",
              borderRadius: "20px",
              boxShadow: "0 0 0 1.5px rgba(255,255,255,0.06)",
              zIndex: 10,
            }} />

            {/* Status icons — right of DI */}
            <div className="ms-auto flex items-center gap-1 z-10">
              {/* Signal bars */}
              <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                <rect x="0"  y="7" width="3" height="4" rx="0.6" fill="white" fillOpacity="0.4"/>
                <rect x="4"  y="5" width="3" height="6" rx="0.6" fill="white" fillOpacity="0.6"/>
                <rect x="8"  y="2" width="3" height="9" rx="0.6" fill="white" fillOpacity="0.8"/>
                <rect x="12" y="0" width="3" height="11" rx="0.6" fill="white"/>
              </svg>
              {/* WiFi */}
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                <circle cx="7" cy="9.5" r="1.3" fill="white"/>
                <path d="M3.5 6.5a5 5 0 0 1 7 0" stroke="white" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
                <path d="M0.5 3.5a9 9 0 0 1 13 0" stroke="white" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.5"/>
              </svg>
              {/* Battery */}
              <div className="flex items-center">
                <div style={{ width: "22px", height: "11px", border: "1.5px solid rgba(255,255,255,0.55)", borderRadius: "3px", padding: "1.5px", position: "relative" }}>
                  <div style={{ width: "75%", height: "100%", background: "white", borderRadius: "1px" }} />
                </div>
                <div style={{ width: "2px", height: "5px", background: "rgba(255,255,255,0.4)", marginLeft: "1px", borderRadius: "0 1px 1px 0" }} />
              </div>
            </div>
          </div>

          {/* WhatsApp chat header */}
          <div className="flex items-center gap-2 shrink-0" style={{
            backgroundColor: "#075E54",
            paddingInline: "12px",
            paddingBottom: "10px",
          }}>
            {/* Back arrow */}
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none" style={{ opacity: 0.9 }}>
              <path d="M8 2L2 8l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>

            {/* Avatar */}
            <div style={{ width: "34px", height: "34px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.2)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {channelPictureUrl
                ? <img src={channelPictureUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: "12px", fontWeight: 700, color: "white" }}>{initials}</span>
              }
            </div>

            {/* Name + status */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "white", fontSize: "12px", fontWeight: 600, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</p>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "9px", lineHeight: 1.3 }}>Business Account</p>
            </div>

            {/* Action icons */}
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.37 2 2 0 0 1 3.6 1.17h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
                <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
              </svg>
            </div>
          </div>

          {/* Chat wallpaper */}
          <div className="flex-1 flex flex-col justify-end gap-2 overflow-hidden" style={{
            backgroundColor: "#ECE5DD",
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)",
            backgroundSize: "16px 16px",
            padding: "10px 10px 8px",
          }}>
            {/* Date pill */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "9px", background: "rgba(255,255,255,0.75)", color: "#667781", borderRadius: "100px", padding: "2px 8px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                TODAY
              </span>
            </div>

            {/* Message bubble */}
            <div style={{ alignSelf: "flex-start", maxWidth: "88%" }}>
              <div style={{
                background: "white",
                borderRadius: "8px 8px 8px 0px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                padding: "7px 9px 5px",
                fontSize: "10px",
                lineHeight: "1.5",
                color: "#111b21",
              }}>
                {mediaPreview && (
                  <div style={{ marginBottom: "6px", borderRadius: "6px", overflow: "hidden" }}>
                    <img src={mediaPreview} alt="attachment" style={{ width: "100%", objectFit: "cover", maxHeight: "80px", display: "block" }} />
                  </div>
                )}
                {body ? renderPreviewBody(body) : (
                  <span style={{ color: "#aaa", fontStyle: "italic" }}>Your message will appear here…</span>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "3px" }}>
                  <span style={{ fontSize: "8px", color: "#8696a0" }}>{now} ✓✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Input bar */}
          <div style={{
            backgroundColor: "#f0f2f5",
            padding: "6px 8px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#54656f" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/></svg>
            <div style={{ flex: 1, background: "white", borderRadius: "24px", height: "28px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }} />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#54656f" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          </div>

          {/* Home indicator */}
          <div style={{ backgroundColor: "#f0f2f5", display: "flex", justifyContent: "center", paddingBottom: "8px", paddingTop: "4px", flexShrink: 0 }}>
            <div style={{ width: "80px", height: "4px", background: "rgba(0,0,0,0.18)", borderRadius: "4px" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Variable insertion popover ────────────────────────────────────────────────

const COMMON_VARIABLES = ["Name", "OrderId", "Amount", "Date", "ProductName", "TrackingNumber"];

function VariablePopover({
  onInsert,
  onClose,
}: {
  onInsert: (variable: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-full mb-1 start-0 z-20 bg-popover border rounded-lg shadow-lg p-2 min-w-[180px]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1.5">
        Insert Variable
      </p>
      {COMMON_VARIABLES.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => { onInsert(v); onClose(); }}
          className="w-full text-start text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors font-mono text-blue-600"
        >
          {`{{${v}}}`}
        </button>
      ))}
    </div>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "ar" | "en";
};

// ─── Main modal ───────────────────────────────────────────────────────────────

export function CreateBroadcastModal({ open, onOpenChange, locale }: Props) {
  const isAr = locale === "ar";

  const lists = useQuery(api.contactLists.listForTenant);
  const channels = useQuery(api.channels.listForTenant);

  // Mutations
  const createBroadcast = useMutation(api.broadcasts.create);
  const sendBroadcast = useAction(api.broadcasts.send);

  // Form state
  const [selectedListIds, setSelectedListIds] = useState<Id<"contactLists">[]>([]);
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<Id<"channels"> | undefined>();
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const [body, setBody] = useState("");
  const [showVarPopover, setShowVarPopover] = useState(false);

  // Media
  const fileRef = useRef<HTMLInputElement>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  // Scheduling
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function resetForm() {
    setSelectedListIds([]);
    setSelectedChannelId(undefined);
    setBody("");
    setMediaFile(null);
    setMediaPreview(null);
    setShowSchedule(false);
    setScheduledDate("");
    setScheduledTime("");
    setSubmitting(false);
    setDone(false);
    setShowVarPopover(false);
  }

  function handleOpenChange(v: boolean) {
    if (!v) resetForm();
    onOpenChange(v);
  }

  function insertVariable(varName: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setBody((b) => b + `{{${varName}}}`);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const token = `{{${varName}}}`;
    setBody((b) => b.slice(0, start) + token + b.slice(end));
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  }

  function handleMediaFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    if (file.type.startsWith("image/")) {
      setMediaPreview(URL.createObjectURL(file));
    } else {
      setMediaPreview(null);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function toggleList(id: Id<"contactLists">) {
    setSelectedListIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const selectedLists = lists?.filter((l) => selectedListIds.includes(l._id)) ?? [];
  const selectedChannel = channels?.find((c) => c._id === selectedChannelId);

  const isScheduled = !!(scheduledDate && scheduledTime);
  const scheduledAt = (): number | undefined => {
    if (!scheduledDate || !scheduledTime) return undefined;
    const dt = new Date(`${scheduledDate}T${scheduledTime}`);
    return isNaN(dt.getTime()) ? undefined : dt.getTime();
  };

  const canSubmit = selectedListIds.length > 0 && selectedChannelId && body.trim() && !submitting;

  async function handleSubmit(mode: "send" | "schedule" | "draft") {
    if (!canSubmit) return;
    const sa = mode === "schedule" ? scheduledAt() : undefined;
    if (mode === "schedule" && !sa) return;

    setSubmitting(true);
    try {
      // Use the first selected list as primary (broadcast schema takes one listId)
      const broadcastId = await createBroadcast({
        name: `Broadcast ${new Date().toLocaleDateString()}`,
        listId: selectedListIds[0],
        channelId: selectedChannelId!,
        templateName: body.slice(0, 40),
        templateLanguage: isAr ? "ar" : "en",
        scheduledAt: sa,
      });

      if (mode === "send") {
        await sendBroadcast({ broadcastId });
      }

      setDone(true);
      setTimeout(() => handleOpenChange(false), 1400);
    } catch {
      // Convex surfaces errors via its own error boundary in production
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden rounded-2xl">
        <div className="flex" style={{ height: "min(90vh, 780px)" }}>

          {/* ── Left panel: form ────────────────────────────────────────── */}
          <div className="flex flex-col flex-1 overflow-hidden min-w-0">

            {/* Header */}
            <div className="px-6 py-4 border-b shrink-0">
              <DialogTitle className="text-lg font-bold">
                {isAr ? "رسالة بث جديدة" : "New Broadcast Message"}
              </DialogTitle>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {done ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckIcon className="size-7 text-emerald-700" />
                  </div>
                  <p className="font-semibold">
                    {isScheduled
                      ? (isAr ? "تم جدولة الحملة!" : "Campaign scheduled!")
                      : (isAr ? "تم إرسال الحملة!" : "Campaign sent!")}
                  </p>
                </div>
              ) : (
                <>
                  {/* RECIPIENTS */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      {isAr ? "المستلمون" : "Recipients"}
                    </p>
                    <div
                      className="flex flex-wrap items-center gap-1.5 p-2 border rounded-lg min-h-[44px] cursor-text"
                      onClick={() => setShowListDropdown((v) => !v)}
                    >
                      {selectedLists.map((l) => (
                        <span
                          key={l._id}
                          className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium"
                        >
                          {l.name}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleList(l._id); }}
                            className="hover:text-destructive"
                          >
                            <XIcon className="size-3" />
                          </button>
                        </span>
                      ))}
                      <span className="text-sm text-muted-foreground flex-1 min-w-[120px] flex items-center justify-between">
                        {selectedListIds.length === 0 && (isAr ? "اختر قوائم جهات الاتصال..." : "Search groups or contacts...")}
                        <ChevronDownIcon className="size-4 ms-auto shrink-0 text-muted-foreground" />
                      </span>
                    </div>

                    {/* Dropdown */}
                    {showListDropdown && lists && lists.length > 0 && (
                      <div className="mt-1 border rounded-lg shadow-md bg-popover overflow-hidden">
                        {lists.map((l) => (
                          <button
                            key={l._id}
                            type="button"
                            onClick={() => toggleList(l._id)}
                            className="w-full text-start text-sm px-3 py-2.5 hover:bg-muted flex items-center justify-between"
                          >
                            <span>{l.name}</span>
                            {selectedListIds.includes(l._id) && (
                              <CheckIcon className="size-4 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CHANNEL */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      {isAr ? "رقم واتساب" : "WhatsApp Number"}
                    </p>
                    <div
                      className="flex items-center justify-between p-2.5 border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setShowChannelDropdown((v) => !v)}
                    >
                      <span className="text-sm text-muted-foreground">
                        {selectedChannel
                          ? `${selectedChannel.displayName} · ${selectedChannel.displayPhone ?? selectedChannel.phoneNumberId}`
                          : (isAr ? "اختر رقم واتساب..." : "Select a WhatsApp number...")}
                      </span>
                      <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
                    </div>

                    {showChannelDropdown && channels && channels.length > 0 && (
                      <div className="mt-1 border rounded-lg shadow-md bg-popover overflow-hidden">
                        {channels.map((ch) => (
                          <button
                            key={ch._id}
                            type="button"
                            onClick={() => { setSelectedChannelId(ch._id); setShowChannelDropdown(false); }}
                            className="w-full text-start text-sm px-3 py-2.5 hover:bg-muted flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium">{ch.displayName}</div>
                              <div className="text-xs text-muted-foreground">{ch.displayPhone ?? ch.phoneNumberId}</div>
                            </div>
                            {selectedChannelId === ch._id && (
                              <CheckIcon className="size-4 text-primary shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* MESSAGE BODY */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {isAr ? "نص الرسالة" : "Message Body"}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {isAr
                          ? "يدعم تنسيق واتساب (*عريض*, _مائل_, ~شطب~)"
                          : "Supports WhatsApp formatting (*bold*, _italic_, ~strikethrough~)"}
                      </span>
                    </div>
                    <div className="border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                      <textarea
                        ref={textareaRef}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder={isAr ? "مرحباً {{Name}}،\n\nاكتب رسالتك هنا..." : "Hi {{Name}},\n\nWrite your message here..."}
                        rows={7}
                        dir={isAr ? "rtl" : "ltr"}
                        className="w-full resize-none px-3 py-3 text-sm bg-background focus:outline-none placeholder:text-muted-foreground"
                      />
                      {/* Toolbar */}
                      <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
                        <div className="flex items-center gap-3 relative">
                          <button
                            type="button"
                            onClick={() => setShowVarPopover((v) => !v)}
                            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            <span className="font-mono text-base leading-none">{"{}"}</span>
                            <span>{isAr ? "إدراج متغير" : "Insert Variable"}</span>
                          </button>
                          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                            <SmileIcon className="size-4" />
                          </button>
                          {showVarPopover && (
                            <VariablePopover
                              onInsert={insertVariable}
                              onClose={() => setShowVarPopover(false)}
                            />
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {charCount(body)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* MEDIA ATTACHMENT */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      {isAr ? "مرفق وسائط (اختياري)" : "Media Attachment (Optional)"}
                    </p>
                    {mediaFile ? (
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                        {mediaPreview ? (
                          <img src={mediaPreview} alt="preview" className="size-12 rounded object-cover shrink-0" />
                        ) : (
                          <div className="size-12 rounded bg-muted flex items-center justify-center shrink-0">
                            <FileIcon className="size-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{mediaFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        >
                          <XIcon className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <ImageIcon className="size-5" />
                          <VideoIcon className="size-5" />
                          <FileIcon className="size-5" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {isAr ? "انقر للرفع أو اسحب وأفلت" : "Click to upload or drag & drop"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isAr
                            ? "صورة (JPG، PNG) أو فيديو (MP4) أو مستند (PDF) · الحد الأقصى 16 ميجابايت"
                            : "Image (JPG, PNG), Video (MP4) or Document (PDF) up to 16MB"}
                        </p>
                      </button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,video/mp4,application/pdf"
                      className="hidden"
                      onChange={handleMediaFile}
                    />
                  </div>

                  {/* SCHEDULING (collapsible) */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowSchedule((v) => !v)}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <CalendarIcon className="size-3.5" />
                      {isAr ? "جدولة الإرسال (اختياري)" : "Schedule for later (optional)"}
                      <ChevronDownIcon
                        className={`size-3.5 transition-transform ${showSchedule ? "rotate-180" : ""}`}
                      />
                    </button>
                    {showSchedule && (
                      <div className="flex gap-2 mt-2">
                        <div className="relative flex-1">
                          <CalendarIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                          <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="h-9 w-full rounded-md border bg-background ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            dir="ltr"
                          />
                        </div>
                        <div className="relative flex-1">
                          <ClockIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                          <input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="h-9 w-full rounded-md border bg-background ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!done && (
              <div className="border-t px-6 py-4 flex items-center justify-between gap-3 shrink-0 bg-background">
                <Button
                  variant="outline"
                  onClick={() => handleSubmit("draft")}
                  disabled={!canSubmit}
                  className="gap-1.5"
                >
                  <SaveIcon className="size-4" />
                  {isAr ? "حفظ كمسودة" : "Save Draft"}
                </Button>

                <Button
                  onClick={() => handleSubmit(isScheduled ? "schedule" : "send")}
                  disabled={!canSubmit}
                  className="gap-1.5 px-6"
                >
                  <SendIcon className="size-4" />
                  {submitting
                    ? (isAr ? "جاري الإرسال..." : "Sending...")
                    : isScheduled
                      ? (isAr ? "جدولة الحملة" : "Schedule Broadcast")
                      : (isAr ? "إرسال الحملة" : "Send Broadcast")}
                </Button>
              </div>
            )}
          </div>

          {/* ── Right panel: live WhatsApp preview ──────────────────────── */}
          <div className="w-72 border-s bg-muted/20 flex flex-col shrink-0">
            <div className="px-4 py-3.5 border-b shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "معاينة مباشرة" : "Preview"}
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
              <WaPhoneMockup
                channelName={selectedChannel?.displayName ?? null}
                channelPictureUrl={selectedChannel?.profilePictureUrl ?? null}
                body={body}
                mediaPreview={mediaPreview}
              />
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
