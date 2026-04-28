/**
 * Copy to score-config.js on the server / device.
 *
 * 1. Create ONE user in Supabase → Authentication → Users → Add user
 *    - Email: same string as syncLoginEmail below (can be fake but valid-shaped, e.g. sofia-room@fam.local)
 *    - Password: your shared family secret (strong enough for strangers; rate limits help)
 *    - Confirm / auto-confirm depending on project settings.
 * 2. Enable Email provider in Authentication → Providers (password sign-in uses this identity).
 * 3. Fill supabaseUrl, supabaseAnonKey, syncLoginEmail, deploy.
 *
 * Sync UI shows only “Family password” — no inbox needed on the tablet.
 */
window.SCORE_SYNC = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_PUBLIC_KEY",
  syncLoginEmail: "sofia-room@YOUR_DOMAIN.example",
};
