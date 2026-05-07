"use client";

// This file previously wrapped the app in Clerk's <ClerkProvider> with locale
// support. After migrating to Better Auth, the Clerk dependency is removed.
// The component is preserved as a passthrough so app/layout.tsx doesn't need
// restructuring; locale is handled entirely by lib/i18n/context.tsx now.

export const LOCALE_CHANGE_EVENT = "wabdesk:locale-change";

export function ClerkProviderWithLocale({
  children,
}: {
  locale: "ar" | "en";
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
