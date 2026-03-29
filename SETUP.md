# Rahat Math Care — Secure Setup Guide (Final)
## Static website + Supabase Edge Functions backend (free tier friendly)

---

## What Changed (Security Upgrade)

Previously `config.js` contained your admin password, Telegram token, and other secrets visible to anyone who opened DevTools. This is now fixed:

| Before | After |
|---|---|
| Admin password in config.js (visible) | Verified server-side via Edge Function |
| Telegram token in config.js (visible) | Used only inside Edge Functions |
| Anyone could write to DB with anon key | RLS enabled — anon key is read-only |
| Super admin password in browser | Verified server-side |

**config.js now contains only:** Supabase URL, anon key (read-only), Edge Function URL. Safe to deploy.

---

## STEP 1 — Supabase Setup

1. Go to **https://supabase.com** → Sign up free
2. Create a new project, wait ~60 seconds
3. Go to **Project Settings → API**, copy:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon public key** → starts with `eyJ...`
   - **service_role key** → also starts with `eyJ...` (keep this secret — for Edge Functions only)

### Run the Database SQL

1. Go to **SQL Editor → New Query**
2. Paste the entire contents of `database.sql`
3. Click **Run** → should see "Success"

This creates all tables and enables Row Level Security (RLS) so the public anon key can only read data, never write.

**Important:** `database.sql` also adds the checked-paper feature column:
- `written_results.checked_urls` (comma-separated Google Drive links)

---

## STEP 2 — Deploy Edge Functions

Edge Functions are small server-side scripts that run on Supabase's servers. Your secrets live here, never in the browser.

### Install Supabase CLI

```bash
npm install -g supabase
```

### Login and Link Project

```bash
supabase login
supabase link --project-ref your_project_ref_here
```
(Replace `your_project_ref_here` with your project ref — it's the part of your Supabase URL between `https://` and `.supabase.co`)

### Deploy the 4 Edge Functions

From the project folder containing the `supabase/` directory:

```bash
supabase functions deploy auth-admin
supabase functions deploy telegram-proxy
supabase functions deploy otp-send
supabase functions deploy db-write
```

### Set Environment Variables (Secrets)

These are your actual secrets — stored only on Supabase's servers:

```bash
supabase secrets set ADMIN_PASSWORD="your_strong_admin_password"
supabase secrets set SUPER_ADMIN_PASSWORD="your_strong_super_password"
supabase secrets set TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
supabase secrets set TELEGRAM_CHAT_ID="your_telegram_chat_id"
supabase secrets set TOKEN_SECRET="any_long_random_string_eg_rmc2024xK9mP"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_from_step_1"
# Optional but recommended: comma-separated allowed site origins
# Example:
# supabase secrets set ALLOWED_ORIGINS="https://your-site.vercel.app,https://www.yourdomain.com"
```

> ⚠️ Change `ADMIN_PASSWORD` and `SUPER_ADMIN_PASSWORD` to strong passwords.  
> ⚠️ `TOKEN_SECRET` can be any long random string — used to sign session tokens.  
> ⚠️ Never share `SUPABASE_SERVICE_ROLE_KEY` — it has full database access.

### Verify Functions Are Running

Go to **Supabase Dashboard → Edge Functions** — you should see 4 functions listed:
- `auth-admin`
- `telegram-proxy`  
- `otp-send`
- `db-write`

### Re-deploy After Security Updates

If you changed any function code (recommended hardening), deploy all functions again:

```bash
supabase functions deploy auth-admin
supabase functions deploy telegram-proxy
supabase functions deploy otp-send
supabase functions deploy db-write
```

---

## STEP 3 — Update config.js

Open `config.js` and verify it looks like this (your values already filled in):

```javascript
window.EXAM_CONFIG = {
  supabaseUrl: "https://your-project-ref.supabase.co",
  supabaseKey: "eyJ...",   // anon key — safe to be public
  edgeUrl: "https://your-project-ref.supabase.co/functions/v1",
};
```

The `edgeUrl` is always your `supabaseUrl` + `/functions/v1`.

---

## STEP 4 — Deploy Website

### Option A — Vercel (Recommended)

1. Push all files to a GitHub repository
2. Go to **vercel.com** → Add New Project → select your repo
3. Click Deploy

### Option B — Netlify Drop

1. Go to **netlify.com/drop**
2. Drag and drop the entire project folder

---

## STEP 5 — First Admin Login

Go to `your-site/admin-login.html` and enter your `ADMIN_PASSWORD` (the one you set in Step 2, not the old one from config.js).

The password is now verified by the Edge Function — it never appears in the browser.

> Note: `auth-admin` may use JWT verification in Supabase.  
> This project already sends `apikey` + `Authorization` headers from the frontend, so login works with function protection enabled.

---

## STEP 6 — Populate Your Content

### Add Programs
Admin → Programs → fill in batch name, fees, features → Save

### Add Schedules  
Admin → Schedule → select class days → Save

### Add Gallery Photos
Admin → Gallery → paste Google Drive image URL → Save  
Google Drive URL format: `https://drive.google.com/uc?export=view&id=YOUR_FILE_ID`

---

## STEP 7.5 — Attach Checked Paper Link (Google Drive)

Because Supabase free storage is limited, the recommended workflow is:
1) You upload the checked paper PDF/images to Google Drive yourself  
2) Copy the share link  
3) Paste it into Admin → it will show for students on results pages

### 1) Upload checked papers to Google Drive (manual)

1. Upload the checked paper file(s) to your Drive (PDF recommended)
2. Right click → Share → set **“Anyone with the link can view”**
3. Copy the link

### 2) Paste link in Admin

Admin → Submissions → Written:
- Paste the Drive link into **Checked link**
- Click **Save Link**

Tip: you can paste **multiple links** separated by commas/new lines (if you uploaded multiple files).

Students will see:
- `results.html`: **Download checked paper** button + **Score** badge
- `student-login.html`: checked paper link inside written submissions

### Update Contact Info
Admin → Contact Info → fill all fields → Save

### Enrollment & Contact Form Messages
Website forms now send messages through `telegram-proxy` (server-side), not directly to Telegram API from browser.
No Telegram token is required in `config.js`.

---

## STEP 7 — Creating Exams

### Written Exam
1. Admin → Written Exams → fill title, class, duration
2. Paste Google Drive PDF link (question paper)
3. Save → students can now take the exam

When a student submits, their answer sheet PDF is sent to your Telegram automatically (via the server-side proxy — token never in browser).

### MCQ Exam
1. Admin → MCQ Exams → choose Full Questions or Answer Key mode
2. Add questions/answers → Save

---

## How Security Works Now

```
Browser (config.js)           Supabase Edge Functions       Database
─────────────────────         ──────────────────────────    ──────────
supabaseUrl ✓ (public)        ADMIN_PASSWORD (secret)  →   service_role
supabaseKey ✓ (read-only)     TELEGRAM_BOT_TOKEN       →   full write access
edgeUrl     ✓ (public)        SUPABASE_SERVICE_ROLE_KEY
                              TOKEN_SECRET
```

- Visiting student can **read** exams and public content
- No one can **write** to the database without going through an Edge Function
- Admin writes require a signed token from `auth-admin` (valid 24 hours)
- Telegram is called server-side — token never reaches the browser
- OTP for password reset is generated and sent server-side

---

## Troubleshooting

**"edgeUrl not configured" error:**
→ Make sure `edgeUrl` is set in config.js as shown in Step 3

**Admin login says "Error: fetch failed":**
→ Usually means one of these:
1. Edge function not deployed  
2. Browser cached old JS (do hard refresh with Ctrl+Shift+R)  
3. CORS/header mismatch from older `auth-admin` code  

Re-deploy latest function:
```bash
supabase functions deploy auth-admin
```

**Admin login says `{"code":401,"message":"Missing authorization header"}` in function test/curl:**
→ You are calling the function without Supabase auth headers.  
From website this is already handled by frontend code.  
For manual curl test, include:
```bash
-H "apikey: YOUR_ANON_KEY" -H "Authorization: Bearer YOUR_ANON_KEY"
```

**"Unauthorized" when saving in admin:**
→ Your admin session token expired (24h). Log out and log back in.

**Telegram OTP not arriving:**
→ Check that `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` secrets are set correctly (Step 2). Make sure you sent at least one message to your bot first.

**Programs/Schedule/Gallery not loading:**
→ RLS is enabled — make sure you ran the full `database.sql`. If tables existed before, re-run just the `create policy` lines.

**Student login not working:**
→ Make sure `db-write` edge function is deployed. Check Supabase → Edge Functions → db-write → Logs.

**Admin “Save Link” error: `Could not find the 'checked_urls' column … schema cache`:**
→ Run the latest `database.sql` again, wait 1–2 minutes, refresh the admin page.

---

*Rahat Math Care — Developed by Sinan*
