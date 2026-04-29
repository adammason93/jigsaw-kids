/**
 * Supabase anon key: Dashboard → Settings → API (anon public).
 * syncLoginEmail: must exactly match ONE Auth user you create (Dashboard → Users → Add user).
 * Same user’s password is what players type as “Family password” in ⚙️ (kids never see this email).
 */
window.SCORE_SYNC = {
  supabaseUrl: "https://enuzrcjnrxwglacivlnu.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVudXpyY2pucnh3Z2xhY2l2bG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNDI2OTYsImV4cCI6MjA5MjgxODY5Nn0.vYbFLRoKgpeNkzPntutSc3P1DxURjBP7qd40_kk8peA",
  syncLoginEmail: "sofia-room@fam.local",
  /** Slug in …/functions/v1/{slug} — matches folder / deploy name `clever-service`. */
  storybookEdgeSlug: "clever-service",
};
window.SCORE_CONFIG = window.SCORE_SYNC;
