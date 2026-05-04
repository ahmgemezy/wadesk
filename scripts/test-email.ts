/**
 * Sends one test email from each WABDesk address to confirm
 * Cloudflare Email Routing + Resend are wired up correctly.
 *
 * Usage:
 *   npx tsx scripts/test-email.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const API_KEY = process.env.RESEND_API_KEY;
if (!API_KEY) {
  console.error("RESEND_API_KEY not found in .env.local");
  process.exit(1);
}

const TO = "gemmezy@gmail.com";

const ADDRESSES = [
  { from: "WABDesk <noreply@wabdesk.com>",     label: "Transactional / noreply" },
  { from: "WABDesk Billing <billing@wabdesk.com>", label: "Billing" },
  { from: "WABDesk Alerts <alerts@wabdesk.com>",   label: "Alerts" },
  { from: "WABDesk Support <support@wabdesk.com>", label: "Support" },
  { from: "WABDesk Legal <legal@wabdesk.com>",     label: "Legal" },
  { from: "WABDesk Privacy <privacy@wabdesk.com>", label: "Privacy" },
  { from: "WABDesk Security <security@wabdesk.com>", label: "Security" },
  { from: "WABDesk Compliance <compliance@wabdesk.com>", label: "Compliance" },
  { from: "WABDesk <info@wabdesk.com>",            label: "Info" },
];

async function send(from: string, label: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: TO,
      subject: `[WABDesk Test] ${label} — ${from.match(/<(.+)>/)?.[1]}`,
      html: `<p>This is a test email from <strong>${from}</strong>.<br>If you received this, the address is correctly routed.</p>`,
    }),
  });

  const body = await res.json() as { id?: string; message?: string };
  if (res.ok) {
    console.log(`✓ ${label.padEnd(15)} → ${body.id}`);
  } else {
    console.error(`✗ ${label.padEnd(15)} → ${body.message}`);
  }
}

async function main() {
  console.log(`Sending ${ADDRESSES.length} test emails to ${TO}...\n`);
  for (const { from, label } of ADDRESSES) {
    await send(from, label);
  }
  console.log("\nDone. Check your inbox.");
}

main();
