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
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      // false: invitation acceptance must not require prior email verification
      // (Stage 1 §7 risk #11). Stage 3: confirm this setting does not block
      // the email+password signup flow.
      requireEmailVerification: false,
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
          // hookCtx shape is Better Auth's internal hook context. The access
          // pattern `hookCtx?.context?.session?.userId` is inferred from the
          // docs example for user.update.before. Stage 3: verify this path
          // against @convex-dev/better-auth 0.12.2. See §9 OQ-2.
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
              | { context?: { session?: { userId?: string } } }
              | undefined;
            const sessionUserId = hCtx?.context?.session?.userId;
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
