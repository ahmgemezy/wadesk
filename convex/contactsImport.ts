"use node";

import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { assertAdminOrSupervisor } from "./lib/auth";
import type { OrgRole } from "./lib/auth";

const MAX_ROWS = 10000;
const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 500;

type BatchChunkResult = {
  added: number;
  skipped: number;
  failed: number;
  failedRows: { row: number; reason: string }[];
};

export const importBatch = action({
  args: {
    rows: v.array(
      v.object({
        phone: v.string(),
        name: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        notes: v.optional(v.string()),
      }),
    ),
    onDuplicate: v.union(v.literal("skip"), v.literal("overwrite")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHORIZED");
    if (!identity.orgId) throw new ConvexError("NO_ORG");
    const orgRole = (identity.orgRole ?? "org:agent") as OrgRole;
    assertAdminOrSupervisor(orgRole);
    const tenantId = identity.orgId as string;

    if (args.rows.length > MAX_ROWS) {
      throw new ConvexError({ message: "TOO_MANY_ROWS", data: { max: MAX_ROWS } });
    }

    let added = 0;
    let skipped = 0;
    let failed = 0;
    const failedRows: { row: number; reason: string }[] = [];

    for (let i = 0; i < args.rows.length; i += BATCH_SIZE) {
      const batch = args.rows.slice(i, i + BATCH_SIZE);

      const result: BatchChunkResult = await ctx.runMutation(
        internal.contactsImportHelpers.importBatchChunk,
        { tenantId, rows: batch, onDuplicate: args.onDuplicate as "skip" | "overwrite", startIndex: i },
      );
      added += result.added;
      skipped += result.skipped;
      failed += result.failed;
      failedRows.push(...result.failedRows);

      if (i + BATCH_SIZE < args.rows.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }
    return { added, skipped, failed, failedRows };
  },
});
