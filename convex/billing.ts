import {
  action,
  internalMutation,
  mutation,
  httpAction,
} from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { getCallerRole } from "./lib/auth";
import type { Plan } from "./lib/planLimits";
import { verifyPaddleSignature } from "./webhooks/verify";

function paddleBaseUrl(): string {
  return process.env.PADDLE_SANDBOX === "true"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
}

function priceIdForPlan(plan: "starter" | "growth" | "business"): string {
  const map: Record<string, string | undefined> = {
    starter: process.env.PADDLE_PRICE_STARTER,
    growth: process.env.PADDLE_PRICE_GROWTH,
    business: process.env.PADDLE_PRICE_BUSINESS,
  };
  const id = map[plan];
  if (!id) throw new ConvexError("PRICE_NOT_CONFIGURED");
  return id;
}

function planForPriceId(priceId: string): Plan | null {
  const map: Record<string, Plan> = {};
  if (process.env.PADDLE_PRICE_STARTER) map[process.env.PADDLE_PRICE_STARTER] = "starter";
  if (process.env.PADDLE_PRICE_GROWTH) map[process.env.PADDLE_PRICE_GROWTH] = "growth";
  if (process.env.PADDLE_PRICE_BUSINESS) map[process.env.PADDLE_PRICE_BUSINESS] = "business";
  return map[priceId] ?? null;
}

export const createCheckout = action({
  args: {
    plan: v.union(v.literal("starter"), v.literal("growth"), v.literal("business")),
  },
  handler: async (ctx, args): Promise<{ transactionId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    const raw = identity as unknown as Record<string, unknown> | null;
    const orgId = (raw?.orgId as string | undefined) ?? (raw?.o as { id?: string } | undefined)?.id;
    if (!orgId) throw new ConvexError("UNAUTHORIZED");

    const tenantId = orgId;
    const priceId = priceIdForPlan(args.plan);
    const email = identity?.email;

    const res = await fetch(`${paddleBaseUrl()}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        ...(email ? { customer: { email } } : {}),
        custom_data: { tenantId },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[billing] createCheckout Paddle error:", err);
      throw new ConvexError("PADDLE_ERROR");
    }

    const data = await res.json() as { data: { id: string } };
    return { transactionId: data.data.id };
  },
});

export const updateSubscription = action({
  args: {
    plan: v.union(v.literal("starter"), v.literal("growth"), v.literal("business")),
  },
  handler: async (ctx, args): Promise<{ ok: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    const raw = identity as unknown as Record<string, unknown> | null;
    const orgId = (raw?.orgId as string | undefined) ?? (raw?.o as { id?: string } | undefined)?.id;
    if (!orgId) throw new ConvexError("UNAUTHORIZED");

    const role = await getCallerRole(ctx);
    if (role !== "org:admin") throw new ConvexError("FORBIDDEN");

    const tenantId = orgId;
    const tenant = await ctx.runQuery(internal.lib.tenants.getTenantInternal, { tenantId });

    if (!tenant?.paddle_subscription_id) {
      throw new ConvexError("NO_SUBSCRIPTION");
    }

    const priceId = priceIdForPlan(args.plan);

    const res = await fetch(
      `${paddleBaseUrl()}/subscriptions/${tenant.paddle_subscription_id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{ price_id: priceId, quantity: 1 }],
          proration_billing_mode: "prorated_immediately",
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[billing] updateSubscription Paddle error:", err);
      throw new ConvexError("PADDLE_ERROR");
    }

    return { ok: true };
  },
});

export const getCustomerPortalUrl = action({
  args: {},
  handler: async (ctx): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    const raw = identity as unknown as Record<string, unknown> | null;
    const orgId = (raw?.orgId as string | undefined) ?? (raw?.o as { id?: string } | undefined)?.id;
    if (!orgId) throw new ConvexError("UNAUTHORIZED");

    const role = await getCallerRole(ctx);
    if (role !== "org:admin") throw new ConvexError("FORBIDDEN");

    const tenantId = orgId;
    const tenant = await ctx.runQuery(internal.lib.tenants.getTenantInternal, { tenantId });

    if (!tenant?.paddle_customer_id) {
      throw new ConvexError("NO_CUSTOMER");
    }

    const res = await fetch(
      `${paddleBaseUrl()}/customers/${tenant.paddle_customer_id}/portal-sessions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[billing] getCustomerPortalUrl Paddle error:", err);
      throw new ConvexError("PADDLE_PORTAL_ERROR");
    }

    const data = await res.json() as { data: { urls: { general: { overview: string } } } };
    return { url: data.data.urls.general.overview };
  },
});

export const setPaymentStatus = internalMutation({
  args: {
    tenantId: v.string(),
    paymentStatus: v.optional(v.literal("past_due")),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
    if (!tenant) return;
    await ctx.db.patch(tenant._id, { paymentStatus: args.paymentStatus });
  },
});


export const handlePaddleEvent = internalMutation({
  args: {
    tenantId: v.string(),
    newPlan: v.union(
      v.literal("free"),
      v.literal("starter"),
      v.literal("growth"),
      v.literal("business")
    ),
    paddleCustomerId: v.optional(v.string()),
    paddleSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    if (!tenant) {
      console.error("[billing] handlePaddleEvent: tenant not found", args.tenantId);
      return;
    }

    if (args.newPlan === "free") {
      await ctx.db.patch(tenant._id, {
        plan: "free",
        paddle_subscription_id: undefined,
        plan_activated_at: Date.now(),
      });
    } else {
      await ctx.db.patch(tenant._id, {
        plan: args.newPlan,
        paddle_customer_id: args.paddleCustomerId,
        paddle_subscription_id: args.paddleSubscriptionId,
        plan_activated_at: Date.now(),
      });
    }
  },
});

export const paddleWebhook = httpAction(async (ctx, request) => {
  const rawBody = await request.text();

  const paddleSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!paddleSecret) {
    console.error("[billing] paddleWebhook: PADDLE_WEBHOOK_SECRET not configured");
    return new Response("Internal Server Error", { status: 500 });
  }

  const signatureHeader = request.headers.get("Paddle-Signature");
  const valid = await verifyPaddleSignature(rawBody, signatureHeader, paddleSecret);
  if (!valid) {
    return new Response("Unauthorized", { status: 401 });
  }

  let event: {
    event_type: string;
    data: {
      id: string;
      customer_id: string;
      subscription_id?: string | null;
      items?: { price: { id: string } }[];
      custom_data?: { tenantId?: string } | null;
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { event_type, data } = event;

  let resolvedTenantId = data.custom_data?.tenantId;
  if (!resolvedTenantId) {
    // For subscription events data.id is the subscription ID.
    // For transaction events (billed, completed) data.subscription_id holds it.
    const subId = data.subscription_id ?? data.id;
    const tenant = await ctx.runQuery(internal.lib.tenants.getTenantBySubscriptionId, {
      subscriptionId: subId,
    });
    resolvedTenantId = tenant?.tenantId;
  }

  if (!resolvedTenantId) {
    console.warn("[billing] paddleWebhook: cannot resolve tenantId, skipping", data.id);
    return new Response("OK", { status: 200 });
  }

  if (event_type === "transaction.completed") {
    // transaction.completed fires first after checkout and always carries
    // custom_data.tenantId (set in createCheckout). Use it to store the
    // subscription_id so that subsequent subscription.* events can resolve
    // the tenant via getTenantBySubscriptionId.
    const priceId = data.items?.[0]?.price?.id ?? "";
    const newPlan = planForPriceId(priceId);
    if (!newPlan) {
      console.warn("[billing] paddleWebhook: unknown priceId in transaction.completed", priceId);
      return new Response("OK", { status: 200 });
    }
    await ctx.runMutation(internal.billing.handlePaddleEvent, {
      tenantId: resolvedTenantId,
      newPlan,
      paddleCustomerId: data.customer_id,
      paddleSubscriptionId: data.subscription_id ?? undefined,
    });
  } else if (event_type === "subscription.activated" || event_type === "subscription.updated") {
    const priceId = data.items?.[0]?.price?.id ?? "";
    const newPlan = planForPriceId(priceId);
    if (!newPlan) {
      console.warn("[billing] paddleWebhook: unknown priceId", priceId);
      return new Response("OK", { status: 200 });
    }
    await ctx.runMutation(internal.billing.handlePaddleEvent, {
      tenantId: resolvedTenantId,
      newPlan,
      paddleCustomerId: data.customer_id,
      paddleSubscriptionId: data.id,
    });
  } else if (event_type === "subscription.canceled") {
    const currentPlan: Plan = await ctx.runQuery(internal.lib.tenants.getPlan, {
      tenantId: resolvedTenantId,
    });
    const canceledPlanName = currentPlan ?? "المدفوع";

    await ctx.runMutation(internal.billing.handlePaddleEvent, {
      tenantId: resolvedTenantId,
      newPlan: "free",
    });

    await ctx.runAction(internal.actions.notifyEmail.billingSubscriptionExpiredEmail, {
      tenantId: resolvedTenantId,
      planName: canceledPlanName,
    });
  } else if (event_type === "subscription.past_due") {
    await ctx.runMutation(internal.billing.setPaymentStatus, {
      tenantId: resolvedTenantId,
      paymentStatus: "past_due",
    });
  } else if (event_type === "subscription.resumed") {
    const priceId = data.items?.[0]?.price?.id ?? "";
    const resumedPlan = planForPriceId(priceId);
    if (resumedPlan) {
      await ctx.runMutation(internal.billing.handlePaddleEvent, {
        tenantId: resolvedTenantId,
        newPlan: resumedPlan,
        paddleCustomerId: data.customer_id,
        paddleSubscriptionId: data.id,
      });
    }
    await ctx.runMutation(internal.billing.setPaymentStatus, {
      tenantId: resolvedTenantId,
      paymentStatus: undefined,
    });
  } else if (event_type === "transaction.billed") {
    const priceId = data.items?.[0]?.price?.id ?? "";
    const billedPlanName = planForPriceId(priceId) ?? "المدفوع";
    await ctx.runAction(internal.actions.notifyEmail.billingRenewalReceiptEmail, {
      tenantId: resolvedTenantId,
      planName: billedPlanName,
    });
  } else if (event_type === "transaction.payment_failed") {
    const priceId = data.items?.[0]?.price?.id ?? "";
    const failedPlanName = planForPriceId(priceId) ?? "المدفوع";

    await ctx.runAction(internal.actions.notifyEmail.billingPaymentFailedEmail, {
      tenantId: resolvedTenantId,
      planName: failedPlanName,
    });
  }

  return new Response("OK", { status: 200 });
});
