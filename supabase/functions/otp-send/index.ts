// Edge Function: otp-send
// Generates OTP, stores hashed version in DB, sends to admin via Telegram
// Neither Telegram token nor OTP plaintext ever reaches the browser

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ALLOWED_HEADERS = "Content-Type, Authorization, apikey, x-client-info"
const WINDOW_MS = 10 * 60 * 1000
const MAX_REQ_PER_WINDOW = 5
const reqCounters = new Map<string, { count: number; resetAt: number }>()

function getCorsHeaders(origin: string | null) {
  const allowListRaw = (Deno.env.get("ALLOWED_ORIGINS") ?? "*").trim()
  if (allowListRaw === "*") {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    }
  }
  const allowList = allowListRaw.split(",").map((s) => s.trim()).filter(Boolean)
  const allowedOrigin = origin && allowList.includes(origin) ? origin : allowList[0] ?? "null"
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Vary": "Origin",
  }
}

function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for") ?? ""
  if (xf) return xf.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const rec = reqCounters.get(key)
  if (!rec || now > rec.resetAt) {
    reqCounters.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  rec.count += 1
  reqCounters.set(key, rec)
  return rec.count > MAX_REQ_PER_WINDOW
}

function jsonResponse(payload: Record<string, unknown>, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("")
}

serve(async (req) => {
  const cors = getCorsHeaders(req.headers.get("origin"))
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, cors)

  try {
    const contentType = req.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) {
      return jsonResponse({ error: "Invalid content type" }, 400, cors)
    }
    const { roll, phone } = await req.json()
    if (typeof roll !== "string" || typeof phone !== "string" || !roll.trim() || !phone.trim()) {
      return jsonResponse({ error: "Roll and phone required" }, 400, cors)
    }
    const cleanRoll = roll.trim()
    const cleanPhone = phone.trim()
    if (cleanRoll.length > 64 || cleanPhone.length > 32) {
      return jsonResponse({ error: "Invalid roll or phone format" }, 400, cors)
    }

    const rateKey = `${getClientIp(req)}:${cleanRoll}`
    if (isRateLimited(rateKey)) {
      return jsonResponse({ error: "Too many OTP requests. Try again later." }, 429, cors)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const sb = createClient(supabaseUrl, serviceKey)

    // Find student by roll + phone
    const { data: rows } = await sb.from("students")
      .select("id, student_name, roll_no, phone, class_name")
      .ilike("roll_no", cleanRoll)
      .limit(10)

    const student = rows?.find(r =>
      r.phone?.replace(/\D/g, "").includes(cleanPhone.replace(/\D/g, ""))
    )

    if (!student) {
      return jsonResponse({ error: "Roll number and phone do not match our records." }, 404, cors)
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpHash = await sha256(otp)
    const expiry  = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Store hashed OTP in DB
    await sb.from("students").update({ otp_hash: otpHash, otp_expiry: expiry }).eq("id", student.id)

    // Send OTP via Telegram (token stays server-side)
    const token  = Deno.env.get("TELEGRAM_BOT_TOKEN")
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID")

    if (token && chatId) {
      const msg = `🔐 *Password Reset OTP*\n\nStudent: ${student.student_name}\nRoll: ${student.roll_no} | Class: ${student.class_name ?? "—"}\n\n🔑 OTP Code: \`${otp}\`\n\n⏱ Valid for 10 minutes.\n\nForward this code to the student.`
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" })
      })
    }

    return jsonResponse({ ok: true, name: student.student_name.split(" ")[0] }, 200, cors)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error"
    return jsonResponse({ error: message }, 500, cors)
  }
})
