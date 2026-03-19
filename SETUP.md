# Rahat Math Care — Complete Setup Guide
## Everything is FREE. No billing required anywhere.

---

## 📁 File Overview

```
rahat-math-care/
├── index.html          ← Homepage
├── about.html          ← About / Instructor page
├── programs.html       ← Programs & batch info
├── schedule.html       ← Class timetable
├── gallery.html        ← Photo gallery
├── contact.html        ← Contact page
├── exam-portal.html    ← Exam portal landing
├── admin-login.html    ← Admin login page
├── admin.html          ← Full admin panel
├── mcq-exam.html       ← MCQ exam (students)
├── written-exam.html   ← Written exam (students)
├── config.js           ← ⚙️ YOUR SETTINGS — edit this
├── database.sql        ← Run this in Supabase once
├── logo.png            ← Site logo
└── vercel.json         ← Vercel deploy config
```

---

## STEP 1 — Supabase (Free Database)

> Supabase stores your exam data AND your website content (programs, schedules, gallery, contact info).

1. Go to **https://supabase.com** → Sign up free (no credit card)
2. Click **New Project** → enter a name and password → Create
3. Wait ~60 seconds for setup to complete
4. Go to **Project Settings → API**
5. Copy:
   - **Project URL** → looks like `https://abcxyz.supabase.co`
   - **anon public key** → long string starting with `eyJ...`
6. Paste both into `config.js` (see Step 4)

### Create All Database Tables

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the `database.sql` file from this package
4. Copy the entire contents and paste into the SQL editor
5. Click **Run** (green button)
6. You should see "Success. No rows returned" — that means it worked ✅

This creates 8 tables:
- `written_exams` — written exam data
- `mcq_exams` — MCQ exam data
- `written_results` — student written submissions
- `mcq_results` — student MCQ scores
- `site_programs` — your batch/program info
- `site_schedules` — class timetables
- `site_gallery` — gallery photos
- `site_contact` — your contact details

---

## STEP 2 — Telegram Bot (for receiving written exam photos)

> When a student submits a written exam photo, it gets sent to you on Telegram instantly.

1. Open Telegram → search **@BotFather**
2. Send the message: `/newbot`
3. Follow the prompts — give your bot a name and username
4. Copy the **bot token** (looks like `7123456789:AAH...`)
5. To get your **Chat ID**:
   - Search **@userinfobot** on Telegram
   - Press Start — it shows your numeric ID (e.g. `123456789`)
6. **Important:** Send any message to your new bot first so it can message you back
7. Paste both values into `config.js` (see Step 4)

---

## STEP 3 — Google Drive (for question papers — nothing to configure!)

> Upload your PDF question papers to Google Drive and paste the link in the Admin panel.

How to share a PDF:
1. Upload your PDF to Google Drive
2. Right-click the file → **Share**
3. Change from "Restricted" to **"Anyone with the link"**
4. Click **Copy link**
5. Paste that link into the Admin panel when creating an exam

The link looks like:
```
https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBd.../view
```
The site automatically converts it to an embeddable link for students.

---

## STEP 4 — Edit config.js

Open `config.js` in any text editor (Notepad, VS Code, etc.) and fill in your details:

```javascript
window.EXAM_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",  // from Step 1
  supabaseKey: "eyJhbGci...",                        // from Step 1
  telegramToken: "7123456789:AAH...",                // from Step 2
  telegramChatId: "123456789",                       // from Step 2
  adminPassword: "your_strong_password"              // choose your own!
};
```

> ⚠️ Change `adminPassword` to something secure! Default is `admin2024`.

---

## STEP 5 — Deploy to Vercel (Free Hosting)

### Option A — GitHub + Vercel (Recommended)

1. Go to **https://github.com** → create a free account
2. Click **+** → **New repository** → name it `rahat-math-care` → Create
3. Upload all files from this package to the repository
4. Go to **https://vercel.com** → Sign in with GitHub (free)
5. Click **Add New Project** → select `rahat-math-care`
6. Click **Deploy** — done in ~30 seconds!

Your site will be live at: `https://rahat-math-care.vercel.app`

### Option B — Netlify (Easiest, no signup needed)

1. Go to **https://netlify.com/drop**
2. Drag and drop the entire project folder into the browser
3. Your site is live immediately with a random URL
4. You can set a custom name in Netlify settings

---

## STEP 6 — First Time Admin Setup

Once deployed, go to:
```
https://your-site-url/admin-login.html
```

1. Enter your admin password (from `config.js`)
2. You'll land on the full Admin Panel

### Add Your Programs (HSC Batches)

1. Click **📚 Programs** in the left sidebar
2. Click **Add / Edit Program**
3. Fill in:
   - **Batch Name** → e.g. `HSC 26`
   - **Subtitle** → e.g. `Higher Mathematics — Academic Batch`
   - **Admission Fee** → `0` (for free) or enter amount
   - **Monthly Fee** → `800`
   - **Badge Label** → e.g. `Free Admission`
   - **Description** → short paragraph about the batch
   - **Features** → one feature per line (these show as bullet points on the Programs page)
   - **Featured** → Yes to show a "New Batch" label
4. Click **Save Program**
5. Repeat for each batch (HSC 26, HSC 27, etc.)

### Add Class Schedules

1. Click **📅 Schedule** in the sidebar
2. Fill in:
   - **Batch Name** → e.g. `HSC 26`
   - **Class Time** → e.g. `4:00 PM – 6:00 PM`
   - **Venue** → e.g. `Katnar Para, Bogura`
   - **Class Days** → click the day buttons to toggle (green = class day)
   - **Notice** → optional note shown at the bottom of the schedule
3. Click **Save Schedule**

### Add Gallery Photos

1. Click **🖼️ Gallery** in the sidebar
2. For each photo:
   - Enter a **title** and **category**
   - Paste the **image URL**
   
   > **Using Google Drive for images:**
   > 1. Upload your photo to Google Drive
   > 2. Share it ("Anyone with the link")
   > 3. Get the File ID from the URL (the long string between `/d/` and `/view`)
   > 4. Build this URL: `https://drive.google.com/uc?export=view&id=YOUR_FILE_ID`
   > 5. Paste that URL into the Image URL field

3. A preview appears — confirm it looks correct
4. Click **Save Photo**

### Update Contact Info

1. Click **📞 Contact Info** in the sidebar
2. Fill in all your details:
   - Phone numbers, email, WhatsApp
   - Full address
   - Class hours for each batch
3. Click **💾 Save Contact Info**
4. A preview card appears showing exactly what will display on your site

---

## STEP 7 — Creating Exams

### Written Exam

1. Go to **Admin → 📝 Written Exams**
2. Fill in title, class, duration
3. Paste your Google Drive PDF link (question paper)
4. Click **Save Written Exam**

Students will:
- See the question paper PDF in their browser
- Write answers on paper
- Upload a photo before the timer ends
- Photo gets sent to your Telegram automatically

### MCQ Exam — Full Questions Mode

1. Go to **Admin → ✅ MCQ Exams**
2. Select **Full Questions** mode
3. Fill in title, class, duration
4. Click **＋ Add Question** for each question
5. Type the question text, add 4 options, click **✓ Correct** next to the right answer
6. Optionally add images to questions or options
7. Click **Save Full MCQ Exam**

### MCQ Exam — Answer Key Mode

1. Go to **Admin → ✅ MCQ Exams**
2. Select **Answer Key Only** mode
3. Fill in title, class, duration
4. Set the number of questions using the +/− buttons
5. Click A/B/C/D for the correct answer for each question number
6. Click **Save Answer Key Exam**

Students get a printed question paper separately and just click their answer (A/B/C/D) for each number online.

---

## STEP 8 — Viewing Results

### MCQ Results
- Go to **Admin → 📋 Submissions**
- Or click **Results** next to any MCQ exam in the MCQ Exams tab
- See each student's name, roll, score, percentage

### Written Submissions
- Go to **Admin → 📋 Submissions → Written Submissions**
- Click **View Photo** to see the student's uploaded answer sheet

---

## Admin Panel — Full Feature Summary

| Section | What you can manage |
|---|---|
| **Overview** | Stats + quick shortcuts to all sections |
| **📝 Written Exams** | Create, preview, delete written exams |
| **✅ MCQ Exams** | Create Full or Answer Key MCQ exams |
| **📋 Submissions** | View all student results and photo submissions |
| **📚 Programs** | Add/Edit/Delete HSC batch info, fees, features |
| **📅 Schedule** | Add/Edit batch class schedules with day toggles |
| **🖼️ Gallery** | Upload photos by URL, view thumbnail grid, delete |
| **📞 Contact Info** | Update phone, email, address, hours — instant preview |

---

## Summary — All Services Used

| Feature | Service | Cost |
|---|---|---|
| Database (exams + website content) | Supabase | Free (500MB) |
| Question papers | Google Drive | Free (15GB) |
| Written exam photo storage | Cloudinary | Free (25GB) |
| Result notifications | Telegram Bot | Free |
| Hosting | Vercel / Netlify | Free |
| **Total** | | **৳0 — Completely Free** |

---

## Troubleshooting

**"Setup Required" screen appears in admin:**
→ Check your `config.js` — make sure `supabaseUrl` and `supabaseKey` are filled in correctly (no extra spaces, no missing quotes)

**Programs/Gallery/Schedule not showing on public pages:**
→ The public pages (programs.html, gallery.html, etc.) currently use static placeholder content. To make them fully dynamic, the pages need a small update to fetch from Supabase — contact the developer to enable this.

**Exam submissions not arriving on Telegram:**
→ Make sure you sent at least one message to your bot first (Telegram requires this). Double-check your `telegramToken` and `telegramChatId` in `config.js`.

**Images not showing in gallery:**
→ Make sure you're using the `uc?export=view&id=...` format for Google Drive images, not the regular sharing link.

---

*Site developed for Rahat Math Care, Gazipur. Developed by Sinan*
