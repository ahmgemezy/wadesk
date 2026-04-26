# Resend Email Service Setup

## Overview

WaDesk uses [Resend](https://resend.com) to send transactional emails for the 30-day channel retention system. This includes:
- **Warning emails** (days 25-29): Notifying admins that their WhatsApp channel will be deleted soon
- **Deletion confirmation emails** (day 30): Notifying admins that their channel and data have been permanently deleted

## Getting Your API Key

### Step 1: Create a Resend Account
1. Go to [https://resend.com](https://resend.com)
2. Sign up with your email
3. Verify your email address

### Step 2: Generate API Key
1. Log in to your Resend dashboard
2. Navigate to **Settings** → **API Keys**
3. Click **"Create API Key"**
4. Choose **"Standard API Key"** (default option)
5. Give it a name like `"WaDesk Development"` or `"WaDesk Production"`
6. Copy the generated key (starts with `re_`)

### Step 3: Add to `.env.local`
Open `.env.local` in your project root and add:

```env
RESEND_API_KEY=re_your_actual_api_key_here
```

Replace `re_your_actual_api_key_here` with the key you copied in Step 2.

## Verifying the Setup

### Development
When running `npm run dev`, the system will:
- Check if `RESEND_API_KEY` is set
- If not set, emails will be skipped with a log message: `[EMAIL_SKIP] RESEND_API_KEY not configured`
- If set, emails will be sent via Resend API

To test email sending manually in development:
```bash
npx convex run "actions/sendEmail.sendEmail" \
  --arg to="test@example.com" \
  --arg templateKey="channel_expiring_soon" \
  --arg locale="en" \
  --arg variables='{"channelName":"Test Channel","daysLeft":"5","deleteDate":"May 15, 2026"}'
```

### Production (Convex Cloud)
When deploying to Convex Cloud, you must set the environment variable in the dashboard:

1. Go to **Convex Dashboard** → **Settings** → **Environment Variables**
2. Add new variable: `RESEND_API_KEY`
3. Paste your Resend API key
4. Deploy your code

## Email Templates

The system uses two email templates:

### 1. `channel_expiring_soon` (Days 25-29)
- **Subject**: "Action Required: WhatsApp Number Deletes in {{daysLeft}} Days"
- **Variables**: `channelName`, `daysLeft`, `deleteDate`
- **Languages**: English & Arabic

### 2. `channel_deleted` (Day 30)
- **Subject**: "WhatsApp Number Permanently Deleted"
- **Variables**: `channelName`
- **Languages**: English & Arabic

Templates are defined in: `convex/actions/sendEmail.ts`

## Troubleshooting

### Emails Not Sending
1. **Check API key exists**: Verify `RESEND_API_KEY` is in `.env.local`
2. **Check Resend status**: Visit [status.resend.com](https://status.resend.com)
3. **Check logs**: Look for `[EMAIL_ERROR]` messages in console
4. **Verify domain**: Resend uses `noreply@wadesk.com` as sender (no domain setup required for testing)

### "RESEND_API_KEY not configured" in Logs
This is expected in development if you haven't added your key yet. Emails are simply skipped.
To enable emails, add your key to `.env.local` and restart the dev server.

### Invalid API Key Error
- Ensure the key starts with `re_`
- Copy the entire key (no extra spaces)
- Check it hasn't expired in Resend dashboard
- Regenerate a new key if needed

## Security Best Practices

1. **Never commit keys**: `.env.local` is in `.gitignore`
2. **Rotate keys**: Regenerate keys periodically in Resend dashboard
3. **Scope keys**: Use separate keys for dev and production
4. **Monitor usage**: Check Resend dashboard for suspicious activity

## Rate Limiting

Resend allows:
- **100 emails/second** on Standard plans
- **1000 emails/day** on free tier (sufficient for this use case)

WaDesk sends warnings once per day per channel on days 25-29, so volume is minimal.

## Email Frequency

The channel retention cron runs **daily** (every 24 hours):
- **Days 0-24**: No emails
- **Days 25-29**: One email per day per disconnected channel
- **Day 30**: Final email, then channel is purged

Example: A single disconnected channel will receive maximum 6 emails total.

## Customizing Email Templates

To modify email templates, edit `convex/actions/sendEmail.ts`:

```typescript
const TEMPLATES: Record<string, Record<string, EmailTemplate>> = {
  channel_expiring_soon: {
    ar: {
      subject: "...",
      body: "...",
    },
    en: {
      subject: "...",
      body: "...",
    },
  },
  // Add your custom templates here
};
```

Variables in templates use `{{variableName}}` syntax and are automatically replaced.

## Support

- **Resend Docs**: https://resend.com/docs
- **Resend Status**: https://status.resend.com
- **Support Email**: support@resend.com (for paid plans)
