/**
 * Public Supabase key: Dashboard → Settings → API Keys → publishable.
 * syncLoginEmail: must exactly match ONE Auth user you create (Dashboard → Users → Add user).
 * Same user’s password is what players type as “Family password” in ⚙️ (kids never see this email).
 */
window.SCORE_SYNC = {
  supabaseUrl: "https://enuzrcjnrxwglacivlnu.supabase.co",
  supabaseAnonKey: "sb_publishable_UBxAjD7aeFU47TQDk6uNjA_LpWs5BUS",
  syncLoginEmail: "sofia-room@fam.local",
  /** Slug in …/functions/v1/{slug} — matches folder / deploy name `clever-service`. */
  storybookEdgeSlug: "clever-service",
  /** When true: storybook POST returns 202 and finishes in background (needs DB migration + service role secret on clever-service). */
  storybookAsync: true,
  /** Prompt → Babylon HTML (`game-maker` edge function). */
  gameMakerEdgeSlug: "dynamic-action",
};
window.SCORE_CONFIG = window.SCORE_SYNC;
