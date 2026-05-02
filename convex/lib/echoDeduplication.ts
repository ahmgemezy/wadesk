import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

const DEFAULT_DEDUP_WINDOW_MS = 5000;

/** SHA-256 hash of contentType+content via Web Crypto. Deterministic for same inputs. */
export async function computeContentHash(content: string, contentType: string): Promise<string> {
  const encoded = new TextEncoder().encode(`${contentType}:${content}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Secondary dedup: looks for a recent unmatched outbound message in the conversation
 * whose content hash matches the echo. Returns the message ID or null.
 * Used when primary wamid lookup misses (echo arrived before setMetaMessageId).
 *
 * Window is anchored on the echo's own timestamp, not Date.now(), so the result
 * is invariant under webhook delivery delay.
 *
 * Index query uses createdAt because by_conversation indexes on createdAt.
 * For api-sent messages createdAt === timestamp (both set to Date.now() at send time),
 * so the bounds are functionally equivalent.
 */
export async function findDuplicateOutbound(
  ctx: MutationCtx,
  params: {
    conversationId: Id<"conversations">;
    content: string;
    contentType: string;
    echoTimestamp: number;
  },
): Promise<Id<"messages"> | null> {
  const windowMs = Number(process.env.ECHO_DEDUP_WINDOW_MS ?? DEFAULT_DEDUP_WINDOW_MS);
  const lower = params.echoTimestamp - windowMs;
  const upper = params.echoTimestamp + windowMs;
  const targetHash = await computeContentHash(params.content, params.contentType);

  const candidates = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) =>
      q.eq("conversationId", params.conversationId).gte("createdAt", lower),
    )
    .order("desc")
    .filter((q) =>
      q.and(
        q.lte(q.field("createdAt"), upper),
        q.eq(q.field("direction"), "outbound"),
        q.eq(q.field("isInternalNote"), false),
      ),
    )
    .take(20);

  for (const msg of candidates) {
    if (msg.metaMessageId) continue; // already matched to a wamid
    const msgHash = await computeContentHash(msg.content, msg.contentType);
    if (msgHash === targetHash) return msg._id;
  }

  return null;
}
