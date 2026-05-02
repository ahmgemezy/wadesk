// Must be injected in <head> before any GTM/GA script loads.
// Sets all consent types to denied by default (opt-in model, GDPR-compliant).
export const CONSENT_MODE_DEFAULT_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('consent', 'default', {
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
  'analytics_storage': 'denied',
  'functionality_storage': 'granted',
  'personalization_storage': 'denied',
  'security_storage': 'granted',
  'wait_for_update': 500
});
`.trim();
