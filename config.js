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
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllaGV1bWpldGRuZ25jbnR2bm9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4OTk0NTAsImV4cCI6MjA4OTQ3NTQ1MH0.uV5qEgVB3s2WwBpuxezngtBkA6orFQAoysw_oZMkzKM",   // eyJhbGci...

  // ── Telegram Bot ───────────────────────────────────────────
  // @BotFather → /newbot → copy token
  // @userinfobot → copy your chat ID
  telegramToken: "YOUR_BOT_TOKEN",
  telegramChatId: "YOUR_CHAT_ID",

  // ── Admin Password ─────────────────────────────────────────
  adminPassword: "admin2024"

};
