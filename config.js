// ============================================================
//  Rahat Math Care — Public Configuration
//  ✅ SAFE TO DEPLOY — no passwords or secrets here
//  All secrets live in Supabase Edge Function environment vars
// ============================================================

window.EXAM_CONFIG = {

  // ── Supabase (public anon key — read-only with RLS) ────────
  // supabase.com → your project → Settings → API
  supabaseUrl: "https://qroqpfujixujzvzfmwhz.supabase.co",
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyb3FwZnVqaXh1anp2emZtd2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjkwOTMsImV4cCI6MjA5MDEwNTA5M30.-VsSLuPxGKscQPQLgznRf1szxP1zIyuWHtJn3vzdNbM",

  // ── Edge Functions base URL ────────────────────────────────
  // Your Supabase project URL + /functions/v1
  // All secrets (passwords, telegram token) stored in Supabase only
  edgeUrl: "https://qroqpfujixujzvzfmwhz.supabase.co/functions/v1",

};
