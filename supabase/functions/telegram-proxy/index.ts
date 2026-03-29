// Edge Function: telegram-proxy
// Forwards messages and files to Telegram server-side
// Telegram token NEVER reaches the browser

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ALLOWED_HEADERS = "Content-Type, Authorization, apikey, x-client-info"
const TEXT_MAX_LENGTH = 3500
const MAX_FILE_BYTES = 10 * 1024 * 1024
const WINDOW_MS = 60 * 1000
const MAX_REQ_PER_WINDOW = 20
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

serve(async (req) => {
  const cors = getCorsHeaders(req.headers.get("origin"))
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, cors)

  const ip = getClientIp(req)
  if (isRateLimited(ip)) return jsonResponse({ error: "Too many requests. Please wait a minute." }, 429, cors)

  try {
    const token  = Deno.env.get("TELEGRAM_BOT_TOKEN")
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID")

    if (!token || !chatId) {
      return jsonResponse({ error: "Telegram not configured on server" }, 500, cors)
    }

    const contentType = req.headers.get("content-type") ?? ""

    if (contentType.includes("application/json")) {
      // Plain text message
      const { text, parse_mode } = await req.json()
      if (typeof text !== "string" || !text.trim()) {
        return jsonResponse({ error: "Message text is required" }, 400, cors)
      }
      if (text.length > TEXT_MAX_LENGTH) {
        return jsonResponse({ error: "Message too long" }, 400, cors)
      }
      const parseMode = ["Markdown", "MarkdownV2", "HTML"].includes(parse_mode) ? parse_mode : "Markdown"
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode })
      })
      const json = await res.json()
      return jsonResponse(json, res.ok ? 200 : 502, cors)

    } else if (contentType.includes("multipart/form-data")) {
      // File/document (written exam PDF)
      const formData = await req.formData()
      const newForm  = new FormData()
      newForm.append("chat_id", chatId)
      
      const doc = formData.get("document")
      const caption = formData.get("caption")
      if (!(doc instanceof File)) {
        return jsonResponse({ error: "Document file is required" }, 400, cors)
      }
      if (doc.size > MAX_FILE_BYTES) {
        return jsonResponse({ error: "Document too large (max 10MB)" }, 400, cors)
      }
      if (doc) newForm.append("document", doc)
      if (caption) newForm.append("caption", caption as string)
      newForm.append("parse_mode", "Markdown")

      const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
        method: "POST",
        body: newForm
      })
      const json = await res.json()
      return jsonResponse(json, res.ok ? 200 : 502, cors)
    }

    return jsonResponse({ error: "Unknown content type" }, 400, cors)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error"
    return jsonResponse({ error: message }, 500, cors)
  }
})
