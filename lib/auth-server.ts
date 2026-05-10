import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.CONVEX_SITE_URL!,
});

// Decode the Convex auth JWT to extract claims without a round-trip Convex query.
// Used by server layouts that only need userId/orgId/orgRole for redirect logic.
// UX routing only — does NOT verify the JWT signature; never use for authorization
export async function getServerAuth(): Promise<{
  userId: string | null;
  orgId: string | null;
  orgRole: string | null;
}> {
  const token = await getToken();
  if (!token) return { userId: null, orgId: null, orgRole: null };
  try {
    const parts = token.split(".");
    if (parts.length < 2) return { userId: null, orgId: null, orgRole: null };
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as { sub?: string; orgId?: string; orgRole?: string };
    return {
      userId: payload.sub ?? null,
      orgId: payload.orgId || null,
      orgRole: payload.orgRole || null,
    };
  } catch {
    return { userId: null, orgId: null, orgRole: null };
  }
}
