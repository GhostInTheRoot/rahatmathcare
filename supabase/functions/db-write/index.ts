// Edge Function: db-write
// All database writes go through here using service_role key
// Admin writes require valid token from auth-admin
// Student writes (exam results, profile updates) allowed with student ID

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

type Operation = "insert" | "upsert" | "update" | "delete"

// Must include custom headers we send from the browser (e.g. X-Admin-Token),
// otherwise the browser blocks the request during CORS preflight.
const ALLOWED_HEADERS = "Content-Type, Authorization, apikey, x-client-info, X-Admin-Token"
const WINDOW_MS = 60 * 1000
const MAX_REQ_PER_WINDOW = 80
const reqCounters = new Map<string, { count: number; resetAt: number }>()

const ALLOWED_TABLES = new Set([
  "written_exams",
  "mcq_exams",
  "site_programs",
  "site_schedules",
  "site_gallery",
  "site_contact",
  "site_notices",
  "students",
  "written_results",
  "mcq_results",
])

const ADMIN_ONLY_TABLES = new Set([
  "written_exams",
  "mcq_exams",
  "site_programs",
  "site_schedules",
  "site_gallery",
  "site_contact",
  "site_notices",
])

const STUDENT_ALLOWED_FIELDS = new Set([
  "student_name",
  "class_name",
  "phone",
  "school",
  "college",
  "whatsapp",
  "address",
  "bio",
  "avatar",
  "password_hash",
  "otp_hash",
  "otp_expiry",
])

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isAllowedOperation(op: unknown): op is Operation {
  return op === "insert" || op === "upsert" || op === "update" || op === "delete"
}

function jsonResponse(payload: Record<string, unknown>, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}

function isAdminRequired(table: string, operation: Operation): boolean {
  if (ADMIN_ONLY_TABLES.has(table)) return true
  if (table === "students" && (operation === "insert" || operation === "delete")) return true
  if ((table === "written_results" || table === "mcq_results") && (operation === "update" || operation === "delete")) return true
  return false
}

function validateStudentSelfUpdate(data: unknown, match: unknown): string | null {
  if (!isPlainObject(data)) return "Invalid update payload"
  if (!isPlainObject(match) || typeof match.id !== "string" || !match.id.trim()) {
    return "Student update requires exact id match"
  }
  const keys = Object.keys(data)
  if (keys.length === 0) return "No fields to update"
  for (const key of keys) {
    if (!STUDENT_ALLOWED_FIELDS.has(key)) return `Field not allowed: ${key}`
  }
  if (typeof data.avatar === "string" && data.avatar.length > 2_000_000) {
    return "Avatar payload too large"
  }
  return null
}

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    if (!token) return false
    const decoded = atob(token)
    const parts = decoded.split(":")
    if (parts.length < 3) return false
    const role = parts[0], timestamp = parts[1], sigHex = parts[2]
    if (Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) return false
    const secret = Deno.env.get("TOKEN_SECRET") ?? "rmc-secret-2024"
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    )
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(`${role}:${timestamp}`))
    return valid && (role === "admin" || role === "superadmin")
  } catch { return false }
}

serve(async (req) => {
  const cors = getCorsHeaders(req.headers.get("origin"))
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, cors)

  const ip = getClientIp(req)
  if (isRateLimited(ip)) return jsonResponse({ error: "Too many write requests. Please wait." }, 429, cors)

  try {
    const contentType = req.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) {
      return jsonResponse({ error: "Invalid content type" }, 400, cors)
    }

    const body = await req.json()
    const { table, operation, data, match } = body
    if (typeof table !== "string" || !ALLOWED_TABLES.has(table)) {
      return jsonResponse({ error: "Table not allowed" }, 400, cors)
    }
    if (!isAllowedOperation(operation)) {
      return jsonResponse({ error: "Unknown op" }, 400, cors)
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    // Prefer a dedicated header so we don't conflict with Supabase platform auth checks.
    // Backward compatible: still support "Authorization: Bearer <token>".
    const adminTokenHeader = req.headers.get("X-Admin-Token") ?? ""
    const authHeader = req.headers.get("Authorization") ?? ""
    const token = (adminTokenHeader || authHeader.replace("Bearer ", "")).trim()

    if (isAdminRequired(table, operation) && !await verifyAdminToken(token)) {
      return jsonResponse({ error: "Unauthorized" }, 401, cors)
    }

    if (table === "students" && operation === "update" && !await verifyAdminToken(token)) {
      const validationError = validateStudentSelfUpdate(data, match)
      if (validationError) return jsonResponse({ error: validationError }, 400, cors)
    }

    if (operation === "update" || operation === "delete") {
      if (!isPlainObject(match) || Object.keys(match).length === 0) {
        return jsonResponse({ error: "Match condition required for update/delete" }, 400, cors)
      }
    }

    if ((operation === "insert" || operation === "upsert" || operation === "update") && !isPlainObject(data)) {
      return jsonResponse({ error: "Data payload must be an object" }, 400, cors)
    }

    let q: any = sb.from(table)
    if (operation === "insert") q = q.insert(data)
    else if (operation === "upsert") q = q.upsert(data)
    else if (operation === "update") {
      q = q.update(data)
      for (const [c,v] of Object.entries(match)) q = q.eq(c, v)
    } else if (operation === "delete") {
      q = q.delete()
      for (const [c,v] of Object.entries(match)) q = q.eq(c, v)
    } else return jsonResponse({ error: "Unknown op" }, 400, cors)

    // Supabase-js may require an explicit select list for write operations.
    // Using '*' makes sure we always return affected rows and get meaningful errors.
    const result = await q.select('*')
    if (result?.error) {
      const msg = (result.error.message && result.error.message.trim()) ? result.error.message : String(result.error)
      return jsonResponse({ error: msg }, 400, cors)
    }
    return jsonResponse({ ok: true, data: result?.data }, 200, cors)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error"
    return jsonResponse({ error: message }, 500, cors)
  }
})
