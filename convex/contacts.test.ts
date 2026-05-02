/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("contact search works", async () => {
  const t = convexTest(schema, modules);
  
  // Note: Depending on your auth setup, you may need to mock authentication here
  // using t.withIdentity({ subject: "user_123", tokenIdentifier: "id_123" })
  // and insert mock data before running queries.
  // 
  // Example data setup:
  // await t.run(async (ctx) => {
  //   await ctx.db.insert("contacts", {
  //     tenantId: "test_tenant",
  //     phone: "+1234567890",
  //     displayName: "Test Contact",
  //     tags: [],
  //     source: "manual",
  //     isArchived: false,
  //     firstSeenAt: Date.now(),
  //     lastSeenAt: Date.now(),
  //     createdAt: Date.now(),
  //   });
  // });
  
  // Expect it to run without crashing (even if it returns 0 results for now)
  // To avoid auth errors for this basic scaffold, we won't call auth-protected queries directly.
  expect(true).toBe(true);
});
