"use client";

import { PhoneIcon, ExternalLinkIcon, CornerDownLeftIcon } from "lucide-react";

export type TemplateComponent = {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION";
  text?: string;
  buttons?: Array<{
    type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
    text: string;
    url?: string;
    phone_number?: string;
  }>;
};

type Props = {
  name: string;
  components: TemplateComponent[];
};

function renderBody(text: string) {
  // Bold: *text*, Italic: _text_, Strikethrough: ~text~, Mono: ```text```, Variables: {{var}}
  const parts = text.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~|```[^`]+```|\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*"))
      return <strong key={i}>{part.slice(1, -1)}</strong>;
    if (part.startsWith("_") && part.endsWith("_"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("~") && part.endsWith("~"))
      return <s key={i}>{part.slice(1, -1)}</s>;
    if (part.startsWith("```") && part.endsWith("```"))
      return <code key={i} className="font-mono text-xs">{part.slice(3, -3)}</code>;
    if (part.startsWith("{{") && part.endsWith("}}"))
      return <strong key={i}>{part}</strong>;
    return <span key={i}>{part}</span>;
  });
}

export function WhatsAppTemplatePreview({ name, components }: Props) {
  const header = components.find((c) => c.type === "HEADER");
  const body = components.find((c) => c.type === "BODY");
  const footer = components.find((c) => c.type === "FOOTER");
  const buttonsComp = components.find((c) => c.type === "BUTTONS");

  return (
    <div className="flex flex-col items-center">
      {/* Screen only — no phone frame, iPhone 16 Pro Max proportions */}
      <div
        className="overflow-hidden shadow-2xl"
        style={{
          width: "360px",
          borderRadius: "50px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
        }}
      >
        {/* Dynamic Island area */}
        <div className="bg-[#075E54] flex justify-center items-start pt-3 pb-0">
          <div
            className="bg-black rounded-full"
            style={{ width: "126px", height: "36px" }}
          />
        </div>

        {/* WhatsApp header */}
        <div className="bg-[#075E54] h-14 flex items-center px-4 gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-400 shrink-0" />
          <div className="flex-1">
            <div className="text-white text-sm font-semibold">Business</div>
            <div className="text-green-200 text-xs">online</div>
          </div>
        </div>

        {/* Chat area */}
        <div
          className="min-h-130 p-4 flex flex-col justify-end gap-1"
          style={{ backgroundColor: "#e5ddd5" }}
        >
          {/* Message bubble */}
          <div className="self-start max-w-[90%]">
            <div className="bg-white rounded-xl rounded-tl-none shadow-sm overflow-hidden">
              {/* Header */}
              {header && (
                <>
                  {header.format === "IMAGE" && (
                    <div className="bg-gray-200 h-36 flex items-center justify-center text-gray-400 text-sm">
                      📷 Image
                    </div>
                  )}
                  {header.format === "VIDEO" && (
                    <div className="bg-gray-800 h-36 flex items-center justify-center text-white text-sm gap-1">
                      ▶ Video
                    </div>
                  )}
                  {header.format === "DOCUMENT" && (
                    <div className="bg-gray-100 h-20 flex items-center justify-center text-gray-500 text-sm gap-1 border-b">
                      📄 Document
                    </div>
                  )}
                  {(header.format === "TEXT" || !header.format) && header.text && (
                    <div className="px-4 pt-3 text-[15px] font-semibold text-gray-900 leading-snug">
                      {header.text}
                    </div>
                  )}
                </>
              )}

              {/* Body */}
              {body?.text && (
                <div className="px-4 py-2.5 text-[14px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {renderBody(body.text)}
                </div>
              )}

              {/* Footer */}
              {footer?.text && (
                <div className="px-4 pb-2 text-[12px] text-gray-400 leading-snug">
                  {footer.text}
                </div>
              )}

              {/* Timestamp */}
              <div className="px-4 pb-2 flex justify-end">
                <span className="text-[11px] text-gray-400">10:30 AM ✓✓</span>
              </div>
            </div>

            {/* Buttons */}
            {buttonsComp?.buttons && buttonsComp.buttons.length > 0 && (
              <div className="mt-1.5 flex flex-col gap-1.5">
                {buttonsComp.buttons.map((btn, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl shadow-sm py-2.5 px-4 flex items-center justify-center gap-2 text-[#00A884] text-[13px] font-medium"
                  >
                    {btn.type === "URL" && <ExternalLinkIcon className="size-3.5" />}
                    {btn.type === "PHONE_NUMBER" && <PhoneIcon className="size-3.5" />}
                    {btn.type === "QUICK_REPLY" && <CornerDownLeftIcon className="size-3.5" />}
                    {btn.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3 font-mono">{name}</p>
    </div>
  );
}
