// Edge Function: auth-admin
// Verifies admin password server-side and returns a session token
// Secret: ADMIN_PASSWORD stored in Supabase environment (never in browser)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ALLOWED_HEADERS = "Content-Type, Authorization, apikey, x-client-info"
const LOGIN_WINDOW_MS = 60 * 1000
const LOGIN_MAX_ATTEMPTS = 8
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

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
  const rec = loginAttempts.get(key)
  if (!rec || now > rec.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
    return false
  }
  rec.count += 1
  loginAttempts.set(key, rec)
  return rec.count > LOGIN_MAX_ATTEMPTS
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
  if (isRateLimited(ip)) return jsonResponse({ error: "Too many attempts. Please wait a minute." }, 429, cors)

  try {
    const contentType = req.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) {
      return jsonResponse({ error: "Invalid content type" }, 400, cors)
    }

    const { password } = await req.json()
    if (typeof password !== "string" || !password.trim()) return jsonResponse({ error: "No password" }, 400, cors)
    if (password.length > 256) return jsonResponse({ error: "Password too long" }, 400, cors)

    const adminPw = Deno.env.get("ADMIN_PASSWORD")
    const superAdminPw = Deno.env.get("SUPER_ADMIN_PASSWORD")

    // Clear server-side signal for misconfigured deployments
    if (!adminPw && !superAdminPw) {
      return jsonResponse({ error: "Admin passwords are not configured on Edge Function" }, 500, cors)
    }

    const cleanInput = password.trim()

    let role: string | null = null
    if (adminPw && cleanInput === adminPw.trim()) role = "admin"
    if (superAdminPw && cleanInput === superAdminPw.trim()) role = "superadmin"

    if (!role) {
      return jsonResponse({ error: "Incorrect password" }, 401, cors)
    }

    // Create a signed token: base64(role:timestamp:hmac)
    const timestamp = Date.now()
    const secret = Deno.env.get("TOKEN_SECRET") ?? "rmc-secret-2024"
    const payload = `${role}:${timestamp}`

    // Simple HMAC using Web Crypto
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    )
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
    const sigHex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("")
    const token = btoa(`${payload}:${sigHex}`)

    return jsonResponse({ token, role }, 200, cors)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error"
    return jsonResponse({ error: message }, 500, cors)
  }
})
