// ============================================================
//  ExamPortal Configuration
//  - Questions:     Google Drive links (paste in admin panel)
//  - Answer sheets: Photos → PDF → sent directly to Telegram
//  - Database:      Supabase (free, no billing)
//  No Cloudinary. No third-party storage. Nothing else needed.
// ============================================================

window.EXAM_CONFIG = {

  // ── Supabase ───────────────────────────────────────────────
  // supabase.com → your project → Settings → API
  supabaseUrl: "YOUR_SUPABASE_URL",        // https://xxxx.supabase.co
  supabaseKey: "YOUR_SUPABASE_ANON_KEY",   // eyJhbGci...

  // ── Telegram Bot ───────────────────────────────────────────
  // @BotFather → /newbot → copy token
  // @userinfobot → copy your chat ID
  telegramToken: "YOUR_BOT_TOKEN",
  telegramChatId: "YOUR_CHAT_ID",

  // ── Admin Password ─────────────────────────────────────────
  adminPassword: "admin2024"

};
