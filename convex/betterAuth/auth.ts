import { betterAuth } from "better-auth/minimal";
import { organization } from "better-auth/plugins";
import { convexAdapter } from "@convex-dev/better-auth";

// Static export — used only by: cd convex/betterAuth && npx auth generate
// NOT imported at runtime. Runtime config is in convex/auth.ts.
// This file must mirror all schema-relevant config from convex/auth.ts:
//   - plugins that add tables (organization adds: organization, member, invitation)
//   - session.additionalFields (adds activeOrganizationRole column to session)
// Do NOT include: convex plugin, databaseHooks, socialProviders, secret, baseURL.
// database: convexAdapter is required for npx auth generate to invoke createSchema;
// without it, better-auth defaults to "memory" adapter which lacks createSchema.
export const auth = betterAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  database: convexAdapter({} as any, {} as any),
  plugins: [
    organization(),
  ],
  session: {
    additionalFields: {
      activeOrganizationRole: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
});
