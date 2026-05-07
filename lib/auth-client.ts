import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins";
import { role } from "better-auth/plugins/access";

// Mirror the server-side access control config. Role names must match convex/auth.ts.
// Stage 3 day-one: verify colon-separated role keys ("org:admin" etc.) are
// accepted by organizationClient in better-auth 1.6.9. See §9 OQ-4.
const orgAdmin = role({});
const orgSupervisor = role({});
const orgAgent = role({});

export const authClient = createAuthClient({
  plugins: [
    convexClient(),
    organizationClient({
      // ac dropped — OrganizationClientOptions.ac is optional (confirmed in
      // node_modules/better-auth/dist/plugins/organization/client.d.mts).
      // role() produces Role<{}> which satisfies Role without an ac instance.
      roles: {
        "org:admin": orgAdmin,
        "org:supervisor": orgSupervisor,
        "org:agent": orgAgent,
      },
    }),
  ],
});
