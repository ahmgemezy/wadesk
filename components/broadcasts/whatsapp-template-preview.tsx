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
  // Bold: *text*, Italic: _text_, Strikethrough: ~text~, Mono: ```text```
  const parts = text.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~|```[^`]+```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*"))
      return <strong key={i}>{part.slice(1, -1)}</strong>;
    if (part.startsWith("_") && part.endsWith("_"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("~") && part.endsWith("~"))
      return <s key={i}>{part.slice(1, -1)}</s>;
    if (part.startsWith("```") && part.endsWith("```"))
      return <code key={i} className="font-mono text-xs">{part.slice(3, -3)}</code>;
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
      {/* Phone shell */}
      <div className="w-[260px] rounded-[2rem] border-4 border-gray-800 bg-gray-800 shadow-xl overflow-hidden">
        {/* Status bar */}
        <div className="bg-[#075E54] h-12 flex items-center px-4 gap-3">
          <div className="w-7 h-7 rounded-full bg-gray-400 shrink-0" />
          <div className="flex-1">
            <div className="text-white text-xs font-semibold">Business</div>
            <div className="text-green-200 text-[10px]">online</div>
          </div>
        </div>

        {/* Chat area */}
        <div
          className="min-h-[280px] p-3 flex flex-col justify-end gap-1"
          style={{
            background:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23e5ddd5'/%3E%3C/svg%3E\")",
          }}
        >
          {/* Message bubble */}
          <div className="self-start max-w-[90%]">
            <div className="bg-white rounded-lg rounded-tl-none shadow-sm overflow-hidden">
              {/* Header */}
              {header && (
                <>
                  {header.format === "IMAGE" && (
                    <div className="bg-gray-200 h-28 flex items-center justify-center text-gray-400 text-xs">
                      📷 Image
                    </div>
                  )}
                  {header.format === "VIDEO" && (
                    <div className="bg-gray-800 h-28 flex items-center justify-center text-white text-xs gap-1">
                      ▶ Video
                    </div>
                  )}
                  {header.format === "DOCUMENT" && (
                    <div className="bg-gray-100 h-16 flex items-center justify-center text-gray-500 text-xs gap-1 border-b">
                      📄 Document
                    </div>
                  )}
                  {(header.format === "TEXT" || !header.format) && header.text && (
                    <div className="px-3 pt-2.5 text-[13px] font-semibold text-gray-900 leading-snug">
                      {header.text}
                    </div>
                  )}
                </>
              )}

              {/* Body */}
              {body?.text && (
                <div className="px-3 py-2 text-[12px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {renderBody(body.text)}
                </div>
              )}

              {/* Footer */}
              {footer?.text && (
                <div className="px-3 pb-2 text-[10px] text-gray-400 leading-snug">
                  {footer.text}
                </div>
              )}

              {/* Timestamp */}
              <div className="px-3 pb-1.5 flex justify-end">
                <span className="text-[9px] text-gray-400">10:30 AM ✓✓</span>
              </div>
            </div>

            {/* Buttons */}
            {buttonsComp?.buttons && buttonsComp.buttons.length > 0 && (
              <div className="mt-1 flex flex-col gap-1">
                {buttonsComp.buttons.map((btn, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg shadow-sm py-2 px-3 flex items-center justify-center gap-1.5 text-[#00A884] text-[11px] font-medium"
                  >
                    {btn.type === "URL" && <ExternalLinkIcon className="size-3" />}
                    {btn.type === "PHONE_NUMBER" && <PhoneIcon className="size-3" />}
                    {btn.type === "QUICK_REPLY" && <CornerDownLeftIcon className="size-3" />}
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
