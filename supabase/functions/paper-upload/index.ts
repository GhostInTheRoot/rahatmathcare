// Edge Function: paper-upload
// Upload checked written exam papers to Google Drive (to avoid Supabase Storage limits)
// and attach URLs to written_results.checked_urls

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ALLOWED_HEADERS = "Content-Type, Authorization, apikey, x-client-info, X-Admin-Token"
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_FILES = 6
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  const b64 = btoa(bin)
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function utf8ToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "")
  const bin = atob(clean)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

async function getGoogleAccessToken(): Promise<string> {
  const clientEmail = (Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") ?? "").trim()
  const privateKey = (Deno.env.get("GOOGLE_PRIVATE_KEY") ?? "").trim()
  if (!clientEmail || !privateKey) throw new Error("Google Drive not configured on server")

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT" }
  const claim = {
    iss: clientEmail,
    scope: DRIVE_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 60 * 30,
  }
  const encHeader = base64UrlEncode(utf8ToBytes(JSON.stringify(header)))
  const encClaim = base64UrlEncode(utf8ToBytes(JSON.stringify(claim)))
  const signingInput = `${encHeader}.${encClaim}`

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, utf8ToBytes(signingInput))
  const jwt = `${signingInput}.${base64UrlEncode(new Uint8Array(sig))}`

  const body = new URLSearchParams()
  body.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer")
  body.set("assertion", jwt)
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  const json = await res.json()
  if (!res.ok || !json?.access_token) throw new Error(json?.error_description || "Could not get Google access token")
  return json.access_token as string
}

async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  resultId: string,
  f: File,
): Promise<{ id: string; url: string }> {
  const safeName = (f.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_")
  const name = `${resultId}_${Date.now()}_${safeName}`
  const meta: Record<string, unknown> = { name, parents: folderId ? [folderId] : undefined }

  const form = new FormData()
  form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json; charset=UTF-8" }))
  form.append("file", f, safeName)

  const up = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  const j = await up.json()
  if (!up.ok || !j?.id) throw new Error(j?.error?.message || "Drive upload failed")

  // Make link-viewable (optional but usually desired)
  const makePublic = (Deno.env.get("DRIVE_PUBLIC") ?? "1").trim() !== "0"
  if (makePublic) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${j.id}/permissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    })
  }

  const url = `https://drive.google.com/file/d/${j.id}/view`
  return { id: j.id as string, url }
}

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

function jsonResponse(payload: Record<string, unknown>, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
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
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    )
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(`${role}:${timestamp}`))
    return valid && (role === "admin" || role === "superadmin")
  } catch {
    return false
  }
}

serve(async (req) => {
  const cors = getCorsHeaders(req.headers.get("origin"))
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, cors)

  try {
    const adminToken = (req.headers.get("X-Admin-Token") ?? "").trim()
    if (!await verifyAdminToken(adminToken)) return jsonResponse({ error: "Unauthorized" }, 401, cors)

    const contentType = req.headers.get("content-type") ?? ""
    if (!contentType.includes("multipart/form-data")) {
      return jsonResponse({ error: "Expected multipart/form-data" }, 400, cors)
    }

    const form = await req.formData()
    const resultId = String(form.get("result_id") ?? "").trim()
    if (!resultId) return jsonResponse({ error: "result_id is required" }, 400, cors)

    const files = form.getAll("files").filter((f) => f instanceof File) as File[]
    if (!files.length) return jsonResponse({ error: "No files uploaded" }, 400, cors)
    if (files.length > MAX_FILES) return jsonResponse({ error: `Too many files (max ${MAX_FILES})` }, 400, cors)

    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) return jsonResponse({ error: "File too large (max 10MB each)" }, 400, cors)
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )
    const folderId = (Deno.env.get("GOOGLE_DRIVE_FOLDER_ID") ?? "").trim()
    const accessToken = await getGoogleAccessToken()

    const uploadedUrls: string[] = []
    for (const f of files) {
      const { url } = await uploadFileToDrive(accessToken, folderId, resultId, f)
      uploadedUrls.push(url)
    }

    // Append to existing checked_urls
    const existing = await sb.from("written_results").select("checked_urls").eq("id", resultId).maybeSingle()
    if (existing.error) return jsonResponse({ error: existing.error.message }, 400, cors)
    const prev = String(existing.data?.checked_urls ?? "").trim()
    const next = [...(prev ? prev.split(",").map((s) => s.trim()).filter(Boolean) : []), ...uploadedUrls].join(",")

    const upd = await sb.from("written_results").update({ checked_urls: next }).eq("id", resultId).select("*")
    if (upd.error) return jsonResponse({ error: upd.error.message }, 400, cors)

    return jsonResponse({ ok: true, urls: uploadedUrls, row: upd.data?.[0] }, 200, cors)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error"
    return jsonResponse({ error: message }, 500, cors)
  }
})

