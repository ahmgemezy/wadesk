import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth/minimal";
import { organization } from "better-auth/plugins";
import { role } from "better-auth/plugins/access";
import authConfig from "./auth.config";

export const authComponent = createClient<DataModel>(components.betterAuth);

// ── Access control (Stage 1 §3.2, Q8 Option A) ───────────────────────────────
// Empty resource statement — WabDesk gates access via role-string comparison
// (assertAdmin, assertAdminOrSupervisor in convex/lib/auth.ts), not via
// granular hasPermission checks. Stage 3 day-one: verify "org:admin" colon
// syntax is accepted by Better Auth 1.6.9 organization plugin at runtime.
const orgAdmin = role({});
const orgSupervisor = role({});
const orgAgent = role({});

// ── JWT payload ───────────────────────────────────────────────────────────────
// MUST remain synchronous — no DB access permitted. activeOrganizationRole
// must already be on the session record (written by session.update.before).
// sessionId and iat are included explicitly per Stage 1 §9 Q1 locked shape;
// if @convex-dev/better-auth 0.12.2 also auto-injects them, Stage 3 should
// remove the duplicates. See §9 open question OQ-3.
function definePayload({
  session,
}: {
  user: Record<string, unknown>;
  session: Record<string, unknown>;
}) {
  return {
    orgId: (session.activeOrganizationId as string | null | undefined) ?? "",
    orgRole:
      (session.activeOrganizationRole as string | null | undefined) ?? "org:agent",
    sessionId: session.id as string,
    iat: Math.floor(Date.now() / 1000),
  };
}

// ── Auth factory ──────────────────────────────────────────────────────────────
// createAuth is called once per Convex request. The Convex ctx is closed over
// by databaseHooks so adapter queries can use it inside hook callbacks.
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    appName: "WabDesk",
    baseURL: process.env.SITE_URL!,
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS
      ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    database: authComponent.adapter(ctx),
    emailVerification: {
      // Sends a single-language verification email matching the user's locale cookie.
      // The verify link points to the Convex HTTP endpoint (SITE_URL) with an
      // absolute callbackURL back to the Next.js app so the redirect lands
      // on the correct domain after token verification.
      // NOTE: invited members also go through this flow — they receive a
      // verification email in addition to the invitation email. If this proves
      // too much friction, add a databaseHook on user.create to skip
      // verification for users whose email matches a pending invitation.
      sendVerificationEmail: async ({ user, token }, request) => {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          console.log("[EMAIL_VERIFY_SKIP] RESEND_API_KEY not configured");
          return;
        }

        // Detect locale from the `locale` cookie on the signup request.
        const cookieHeader = request?.headers.get("cookie") ?? "";
        const localeCookie = cookieHeader.split(";").find((c) => c.trim().startsWith("locale="));
        const locale: "ar" | "en" = localeCookie?.split("=")[1]?.trim() === "en" ? "en" : "ar";

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const siteUrl = process.env.SITE_URL ?? appUrl;
        const callbackUrl = encodeURIComponent(`${appUrl}/onboarding`);
        const verifyUrl = `${siteUrl}/api/auth/verify-email?token=${token}&callbackURL=${callbackUrl}`;

        const isAr = locale === "ar";
        const dir = isAr ? "rtl" : "ltr";
        const align = isAr ? "right" : "left";
        const greeting = isAr ? "مرحباً،" : "Hi,";
        const body = isAr
          ? "اضغط على الزر أدناه لتأكيد بريدك الإلكتروني والبدء باستخدام WABDesk."
          : "Click the button below to verify your email address and get started with WABDesk.";
        const btnLabel = isAr ? "تأكيد البريد الإلكتروني" : "Verify Email Address";
        const footer = isAr
          ? "إذا لم تقم بإنشاء حساب WABDesk، يمكنك تجاهل هذه الرسالة."
          : "If you didn't create a WABDesk account, you can safely ignore this email.";
        const subject = isAr
          ? "تأكيد بريدك الإلكتروني في WABDesk"
          : "Verify your WABDesk email";

        const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="UTF-8"></head><body style="background:#f8fafc;font-family:Arial,sans-serif;padding:40px 20px;margin:0"><div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e2e8f0"><h1 style="color:#0071e3;font-size:20px;text-align:center;margin-bottom:24px">WABDesk</h1><p style="color:#334155;font-size:15px;text-align:${align};direction:${dir};margin-bottom:8px">${greeting}</p><p style="color:#334155;font-size:15px;text-align:${align};direction:${dir};margin-bottom:20px">${body}</p><div style="text-align:center;margin-bottom:24px"><a href="${verifyUrl}" style="background:#0071e3;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;font-family:Arial,sans-serif">${btnLabel}</a></div><p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:16px">${footer}</p></div></body></html>`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "WABDesk <noreply@wabdesk.com>",
            to: user.email,
            subject,
            html,
          }),
        });
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }, request) => {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          console.log("[PASSWORD_RESET_SKIP] RESEND_API_KEY not configured");
          return;
        }

        const cookieHeader = request?.headers.get("cookie") ?? "";
        const localeCookie = cookieHeader.split(";").find((c) => c.trim().startsWith("locale="));
        const locale: "ar" | "en" = localeCookie?.split("=")[1]?.trim() === "en" ? "en" : "ar";

        const isAr = locale === "ar";
        const dir = isAr ? "rtl" : "ltr";
        const align = isAr ? "right" : "left";
        const subject = isAr ? "إعادة تعيين كلمة المرور - WABDesk" : "Reset your WABDesk password";
        const greeting = isAr ? "مرحباً،" : "Hi,";
        const body = isAr
          ? "تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. اضغط على الزر أدناه لاختيار كلمة مرور جديدة."
          : "We received a request to reset your WABDesk account password. Click the button below to choose a new password.";
        const btnLabel = isAr ? "إعادة تعيين كلمة المرور" : "Reset Password";
        const footer = isAr
          ? "إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان. ينتهي صلاحية هذا الرابط خلال ساعة واحدة."
          : "If you didn't request a password reset, you can safely ignore this email. This link expires in 1 hour.";

        const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="UTF-8"></head><body style="background:#f8fafc;font-family:Arial,sans-serif;padding:40px 20px;margin:0"><div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e2e8f0"><h1 style="color:#0071e3;font-size:20px;text-align:center;margin-bottom:24px">WABDesk</h1><p style="color:#334155;font-size:15px;text-align:${align};direction:${dir};margin-bottom:8px">${greeting}</p><p style="color:#334155;font-size:15px;text-align:${align};direction:${dir};margin-bottom:20px">${body}</p><div style="text-align:center;margin-bottom:24px"><a href="${url}" style="background:#0071e3;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;font-family:Arial,sans-serif">${btnLabel}</a></div><p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:16px">${footer}</p></div></body></html>`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "WABDesk <noreply@wabdesk.com>",
            to: user.email,
            subject,
            html,
          }),
        });
      },
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      facebook: {
        clientId: process.env.FACEBOOK_CLIENT_ID!,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      },
    },
    // additionalFields on session adds activeOrganizationRole column to the
    // schema. Stage 3: verify Better Auth 1.6.9 supports session.additionalFields
    // (docs confirm user.additionalFields; session key is inferred by analogy).
    // If not supported, manually add the column to the CLI-generated schema.
    // See §9 open question OQ-1.
    session: {
      additionalFields: {
        activeOrganizationRole: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },
    databaseHooks: {
      session: {
        create: {
          // Stage 1 §9 Q1 (locked): auto-set activeOrganizationId when a new
          // session is created and the user belongs to exactly one organization.
          // Closed over `ctx` is the Convex request context; the adapter query
          // targets the "member" model (different from "session") so no circular
          // DB call is involved.
          before: async (session) => {
            const members = await ctx.runQuery(
              components.betterAuth.orgQueries.listMembersByUserId,
              { userId: session.userId },
            );
            if (members.length === 1) {
              return {
                data: {
                  ...session,
                  activeOrganizationId: members[0].organizationId,
                  activeOrganizationRole: (members[0].role as string | undefined) ?? "org:agent",
                },
              };
            }
            return { data: session };
          },
        },
        update: {
          // Denormalize activeOrganizationRole onto the session record when
          // activeOrganizationId changes. definePayload is sync, so it cannot
          // query the DB — this hook is the only place the role can be written.
          //
          // hookCtx shape verified empirically in Phase 3 Block 2.2 against
          // @convex-dev/better-auth 0.12.2: hCtx.context.session is the
          // session+user wrapper { session: Session, user: User }, not Session
          // directly. The userId we need is at .session.session.userId.
          before: async (
            data: Record<string, unknown>,
            hookCtx: unknown,
          ) => {
            const activeOrgId = data.activeOrganizationId as
              | string
              | null
              | undefined;
            if (!activeOrgId) return { data };
            const hCtx = hookCtx as
              | { context?: { session?: { session?: { userId?: string } } } }
              | undefined;
            const sessionUserId = hCtx?.context?.session?.session?.userId;
            if (!sessionUserId) return { data };
            const member = await ctx.runQuery(
              components.betterAuth.orgQueries.findOrgMember,
              { userId: sessionUserId, organizationId: activeOrgId },
            );
            const role = member?.role as string | undefined;
            return {
              data: { ...data, activeOrganizationRole: role ?? "org:agent" },
            };
          },
        },
      },
    },
    plugins: [
      organization({
        roles: {
          "org:admin": orgAdmin,
          "org:supervisor": orgSupervisor,
          "org:agent": orgAgent,
        },
        creatorRole: "org:admin",
        // Stage 2c wires this to convex/lib/emailHelpers.ts (Resend).
        // Signature from better-auth docs:
        //   data: { id, email, inviter: { user: { name, email } }, organization: { name } }
        sendInvitationEmail: async (_data) => {
          void _data;
        },
      }),
      convex({ authConfig, jwt: { definePayload } }),
    ],
  });
};

// ── getCurrentUser query ──────────────────────────────────────────────────────
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});
