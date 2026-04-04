import { ConvexError } from "convex/values";

export async function assertNotLastAdmin(
  memberships: { data: Array<{ role: string; publicUserData?: { userId: string } | null }> },
  targetUserId: string,
): Promise<void> {
  const admins = memberships.data.filter(
    (m) => m.role === "org:admin" || m.role === "admin",
  );

  if (admins.length <= 1) {
    const isTargetAdmin = admins.some(
      (a) => a.publicUserData?.userId === targetUserId,
    );
    if (isTargetAdmin) {
      throw new ConvexError("LAST_ADMIN");
    }
  }
}
