import { ConvexError } from "convex/values";

export async function assertNotLastAdmin(
  members: Array<{ role: string; userId: string }>,
  targetUserId: string,
): Promise<void> {
  const admins = members.filter((m) => m.role === "org:admin");
  if (admins.length <= 1) {
    const isTargetAdmin = admins.some((a) => a.userId === targetUserId);
    if (isTargetAdmin) {
      throw new ConvexError("LAST_ADMIN");
    }
  }
}
