/** Returns the canonical app base URL (no trailing slash).
 *
 * Set NEXT_PUBLIC_APP_URL in the Convex dashboard environment variables:
 *   https://dashboard.convex.dev → your deployment → Settings → Environment Variables
 *
 * Example: NEXT_PUBLIC_APP_URL=https://app.wabdesk.com
 *
 * Defaults to http://localhost:3000 for local development only.
 */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
