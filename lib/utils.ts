import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert an organization name into a URL-safe slug for Better Auth.
 * Empty result (e.g. Arabic-only names) falls back to "org-" + 8-char random suffix.
 * See STAGE_2C1_GAP_CLOSER.md §3 for full specification and test-case traces.
 */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  if (slug.length === 0) {
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    return `org-${suffix}`;
  }

  return slug;
}
