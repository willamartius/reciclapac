const FIREBASE_PROJECT_ID = "apac-reciclar";
const DRIVE_LINK_COLLECTION = "reciclar-apac-drive-links";
const DRIVE_SCOPE = "openid email profile https://www.googleapis.com/auth/drive.file";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const FIREBASE_JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}
function b64urlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
function base64UrlEncode(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64UrlEncode(value);
}
function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function originAllowed(request, env) {
  return request.headers.get("Origin") === env.APP_ORIGIN;
}
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const headers = { "Vary": "Origin" };
  if (origin && origin === env.APP_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS";
  }
  return headers;
}
async function encryptionKey(env) {
  if (!env.TOKEN_ENCRYPTION_KEY) throw new Error("TOKEN_ENCRYPTION_KEY não configurada.");
  const raw = base64ToBytes(env.TOKEN_ENCRYPTION_KEY);
  if (raw.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY deve conter 32 bytes em Base64.");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encryptJson(value, env) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(env);
  const clear = new TextEncoder().encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, clear);
  return JSON.stringify({ v: 1, iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(encrypted)) });
}
async function decryptJson(serialized, env) {
  const record = JSON.parse(serialized);
  if (!record || record.v !== 1 || !record.iv || !record.data) throw new Error("Registro criptografado inválido.");
  const key = await encryptionKey(env);
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(record.iv) }, key, base64ToBytes(record.data));
  return JSON.parse(new TextDecoder().decode(clear));
}
async function verifyFirebaseIdToken(token, env) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Token Firebase inválido.");
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
  const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Assinatura do token Firebase inválida.");
  if (claims.aud !== FIREBASE_PROJECT_ID || claims.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`
      || typeof claims.sub !== "string" || !claims.sub
      || !Number.isSafeInteger(claims.exp) || claims.exp <= now
      || !Number.isSafeInteger(claims.iat) || claims.iat > now + 60
      || !Number.isSafeInteger(claims.auth_time) || claims.auth_time > now) {
    throw new Error("Token Firebase expirado ou destinado a outro projeto.");
  }
  const jwksResponse = await fetch(FIREBASE_JWKS_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!jwksResponse.ok) throw new Error("Não foi possível validar a assinatura Firebase.");
  const jwks = await jwksResponse.json();
  const jwk = jwks.keys.find(item => item.kid === header.kid);
  if (!jwk) throw new Error("Chave de assinatura Firebase não encontrada.");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const valid = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, b64urlToBytes(parts[2]), signed);
  if (!valid) throw new Error("Assinatura do token Firebase inválida.");
  return claims;
}
function firebaseDocumentUrl(path) {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
}
async function firebaseGet(path, idToken) {
  const response = await fetch(firebaseDocumentUrl(path), { headers: { Authorization: `Bearer ${idToken}` } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Não foi possível consultar as permissões no Firestore.");
  return response.json();
}
async function requireAdmin(idToken, env) {
  const claims = await verifyFirebaseIdToken(idToken, env);
  const roleDoc = await firebaseGet(`reciclar-apac-roles/${encodeURIComponent(claims.sub)}`, idToken);
  if (!roleDoc || roleDoc.fields?.role?.stringValue !== "admin") {
    throw new Error("Apenas administradores do Reciclapac podem usar esta integração.");
  }
  return { uid: claims.sub, claims };
}
async function getDriveLink(uid, idToken) {
  const doc = await firebaseGet(`${DRIVE_LINK_COLLECTION}/${encodeURIComponent(uid)}`, idToken);
  if (!doc) return null;
  return {
    googleSub: doc.fields?.googleSub?.stringValue || "",
    email: doc.fields?.email?.stringValue || "",
    linkedAt: doc.fields?.linkedAt?.stringValue || "",
  };
}
async function saveDriveLink(uid, link, idToken) {
  const url = new URL(firebaseDocumentUrl(`${DRIVE_LINK_COLLECTION}/${encodeURIComponent(uid)}`));
  for (const field of ["googleSub", "email", "linkedAt"]) url.searchParams.append("updateMask.fieldPaths", field);
  const response = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${idToken}`, "content-type": "application/json" },
    body: JSON.stringify({ fields: {
      googleSub: { stringValue: link.googleSub },
      email: { stringValue: link.email },
      linkedAt: { stringValue: link.linkedAt },
    } }),
  });
  if (!response.ok) throw new Error("Não foi possível salvar o vínculo Google no Firestore.");
}
function bearerToken(request) {
  const value = request.headers.get("Authorization") || "";
  if (!value.startsWith("Bearer ")) throw new Error("Entre novamente no Reciclapac.");
  return value.slice(7);
}
async function googleTokenRequest(params, env) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error_description || result.error || "Falha na autorização Google.");
  return result;
}
function callbackPage(status, message, env) {
  const payload = JSON.stringify({ type: "reciclapac-drive-oauth", status, message }).replace(/</g, "\\u003c");
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Reciclapac</title><body><p>${status === "success" ? "Conta Google vinculada. Esta janela será fechada." : "Não foi possível vincular a conta. Volte ao Reciclapac."}</p><script>try{if(window.opener){window.opener.postMessage(${payload}, ${JSON.stringify(env.APP_ORIGIN)});window.close();}}catch(e){}</script></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'" } });
}
async function handleOAuthStart(request, env) {
  const idToken = bearerToken(request);
  const { uid } = await requireAdmin(idToken, env);
  const body = await request.json().catch(() => ({}));
  if (body.mode !== "connect") return json({ error: "Modo OAuth inválido." }, 400);
  const existing = await getDriveLink(uid, idToken);
  const state = randomToken();
  const stateRecord = {
    uid, idToken, mode: "connect", expectedGoogleSub: existing?.googleSub || "",
    createdAt: Date.now(),
  };
  await env.DRIVE_TOKENS.put(`state:${state}`, await encryptJson(stateRecord, env), { expirationTtl: 600 });
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();
  return json({ authUrl: authUrl.toString() });
}
async function handleOAuthCallback(request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  if (url.searchParams.has("error")) {
    console.warn("Google OAuth was cancelled or denied.");
    return callbackPage("error", "Autorização Google cancelada ou recusada.", env);
  }
  if (!state || !code) return callbackPage("error", "Resposta OAuth incompleta.", env);
  const key = `state:${state}`;
  const stored = await env.DRIVE_TOKENS.get(key);
  if (!stored) return callbackPage("error", "A autorização expirou. Tente novamente.", env);
  await env.DRIVE_TOKENS.delete(key);
  try {
    const stateRecord = await decryptJson(stored, env);
    if (Date.now() - stateRecord.createdAt > 10 * 60 * 1000) throw new Error("A autorização expirou.");
    await requireAdmin(stateRecord.idToken, env);
    const tokens = await googleTokenRequest({
      code, redirect_uri: env.GOOGLE_REDIRECT_URI, grant_type: "authorization_code",
    }, env);
    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    if (!userInfoResponse.ok) throw new Error("Não foi possível confirmar a conta Google.");
    const identity = await userInfoResponse.json();
    if (!identity.sub || !identity.email || identity.email_verified !== true) throw new Error("A conta Google não foi confirmada.");
    if (stateRecord.expectedGoogleSub && identity.sub !== stateRecord.expectedGoogleSub) {
      throw new Error("A conta autorizada não corresponde à conta Google já vinculada ao Reciclapac.");
    }
    const refreshKey = `refresh:${stateRecord.uid}`;
    const existingRefresh = await env.DRIVE_TOKENS.get(refreshKey);
    if (!tokens.refresh_token && !existingRefresh) {
      throw new Error("O Google não retornou um token de renovação. Tente vincular novamente e aceite o acesso solicitado.");
    }
    if (!tokens.refresh_token && existingRefresh) {
      const saved = await decryptJson(existingRefresh, env);
      if (saved.googleSub !== identity.sub) throw new Error("A credencial de renovação existente pertence a outra conta Google.");
    }
    const link = { googleSub: identity.sub, email: identity.email, linkedAt: new Date().toISOString() };
    if (tokens.refresh_token) {
      await env.DRIVE_TOKENS.put(refreshKey, await encryptJson({
        refreshToken: tokens.refresh_token, googleSub: identity.sub, email: identity.email, updatedAt: Date.now(),
      }, env));
    }
    await saveDriveLink(stateRecord.uid, link, stateRecord.idToken);
    return callbackPage("success", "Conta Google vinculada.", env);
  } catch (error) {
    console.error("Cloudflare Drive OAuth callback failed:", error);
    return callbackPage("error", "Não foi possível concluir a autorização. Volte ao Reciclapac e tente novamente.", env);
  }
}
async function handleAccessToken(request, env) {
  const idToken = bearerToken(request);
  const { uid } = await requireAdmin(idToken, env);
  const link = await getDriveLink(uid, idToken);
  if (!link?.googleSub || !link.email) return json({ error: "Vincule uma conta Google Drive primeiro." }, 409);
  const stored = await env.DRIVE_TOKENS.get(`refresh:${uid}`);
  if (!stored) return json({ error: "A conta vinculada ainda não tem renovação configurada. Vincule-a novamente." }, 409);
  const record = await decryptJson(stored, env);
  if (record.googleSub !== link.googleSub || record.email.toLowerCase() !== link.email.toLowerCase()) {
    return json({ error: "A credencial salva não corresponde à conta Google vinculada." }, 409);
  }
  const tokens = await googleTokenRequest({ refresh_token: record.refreshToken, grant_type: "refresh_token" }, env);
  return json({ accessToken: tokens.access_token, expiresIn: Number(tokens.expires_in) || 3600 });
}
async function handleUnlink(request, env) {
  const idToken = bearerToken(request);
  const { uid } = await requireAdmin(idToken, env);
  await getDriveLink(uid, idToken);
  const response = await fetch(firebaseDocumentUrl(`${DRIVE_LINK_COLLECTION}/${encodeURIComponent(uid)}`), {
    method: "DELETE", headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!response.ok && response.status !== 404) throw new Error("Não foi possível remover o vínculo no Firestore.");
  await env.DRIVE_TOKENS.delete(`refresh:${uid}`);
  return json({ ok: true });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      const origin = request.headers.get("Origin");
      if (origin && origin !== env.APP_ORIGIN) return json({ error: "Origem não autorizada." }, 403);
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    if (url.pathname === "/oauth/callback" && request.method === "GET") return handleOAuthCallback(request, env);
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, service: "reciclapac-drive-auth" }, 200, corsHeaders(request, env));
    }
    const protectedRoute = (url.pathname === "/oauth/start" && request.method === "POST")
      || (url.pathname === "/token" && request.method === "POST")
      || (url.pathname === "/link" && request.method === "DELETE");
    if (!protectedRoute) return json({ error: "Rota não encontrada." }, 404, corsHeaders(request, env));
    if (!originAllowed(request, env)) return json({ error: "Origem não autorizada." }, 403, corsHeaders(request, env));
    try {
      let response;
      if (url.pathname === "/oauth/start") response = await handleOAuthStart(request, env);
      else if (url.pathname === "/token") response = await handleAccessToken(request, env);
      else response = await handleUnlink(request, env);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders(request, env))) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      console.error("Cloudflare Drive Worker request failed:", error);
      return json({ error: "Não foi possível concluir a operação do Google Drive. Tente novamente." }, 500, corsHeaders(request, env));
    }
  },
};
