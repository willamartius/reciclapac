const FIREBASE_PROJECT_ID = "apac-reciclar";
const DRIVE_LINK_COLLECTION = "reciclar-apac-drive-links";
const DRIVE_SCOPE = "openid email profile https://www.googleapis.com/auth/drive.file";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const FIREBASE_JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

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
  let b64 = bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_");
  while (b64.endsWith("=")) b64 = b64.slice(0, -1);
  return b64;
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
function parseAllowedOrigins(env) {
  return (env.APP_ORIGIN || "")
    .split(",")
    .map(o => {
      let s = o.trim();
      while (s.endsWith("/")) s = s.slice(0, -1);
      return s;
    })
    .filter(Boolean);
}
function originAllowed(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  return parseAllowedOrigins(env).includes(origin);
}
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const headers = { "Vary": "Origin" };
  if (origin && parseAllowedOrigins(env).includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}
async function encryptionKey(env) {
  if (!env.TOKEN_ENCRYPTION_KEY) {
    throw new HttpError(503, "Configuração incompleta do Google Drive: o segredo de criptografia não está configurado no Worker.");
  }
  let raw;
  try {
    raw = base64ToBytes(env.TOKEN_ENCRYPTION_KEY);
  } catch {
    throw new HttpError(503, "Configuração inválida do Google Drive: o segredo de criptografia precisa estar em Base64.");
  }
  if (raw.length !== 32) {
    throw new HttpError(503, "Configuração inválida do Google Drive: o segredo de criptografia precisa conter 32 bytes em Base64.");
  }
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
  if (parts.length !== 3) throw new HttpError(401, "Token Firebase inválido.");
  let header, claims;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
    claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  } catch (e) {
    throw new HttpError(401, "Token Firebase inválido.");
  }
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== "RS256" || !header.kid) throw new HttpError(401, "Assinatura do token Firebase inválida.");
  if (claims.aud !== FIREBASE_PROJECT_ID || claims.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`
      || typeof claims.sub !== "string" || !claims.sub
      || !Number.isSafeInteger(claims.exp) || claims.exp <= now
      || !Number.isSafeInteger(claims.iat) || claims.iat > now + 60
      || !Number.isSafeInteger(claims.auth_time) || claims.auth_time > now + 60) {
    throw new HttpError(401, "Token Firebase expirado ou destinado a outro projeto.");
  }
  const jwksResponse = await fetch(FIREBASE_JWKS_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!jwksResponse.ok) throw new HttpError(502, "Não foi possível validar a assinatura Firebase.");
  const jwks = await jwksResponse.json();
  const jwk = jwks.keys.find(item => item.kid === header.kid);
  if (!jwk) throw new HttpError(401, "Chave de assinatura Firebase não encontrada.");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const valid = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, b64urlToBytes(parts[2]), signed);
  if (!valid) throw new HttpError(401, "Assinatura do token Firebase inválida.");
  return claims;
}
function firebaseDocumentUrl(path) {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
}
async function firebaseGet(path, idToken) {
  let response;
  try {
    response = await fetch(firebaseDocumentUrl(path), { headers: { Authorization: `Bearer ${idToken}` } });
  } catch {
    throw new HttpError(502, "Não foi possível conectar ao Firestore para verificar as permissões do administrador.");
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new HttpError(502, `O Firestore recusou a consulta de permissões (HTTP ${response.status}). Confira o acesso ao documento de perfil administrativo.`);
  }
  return response.json();
}
async function requireAdmin(idToken, env) {
  const claims = await verifyFirebaseIdToken(idToken, env);
  const roleDoc = await firebaseGet(`reciclar-apac-roles/${encodeURIComponent(claims.sub)}`, idToken);
  if (!roleDoc || roleDoc.fields?.role?.stringValue !== "admin") {
    throw new HttpError(403, "Apenas administradores do Reciclapac podem usar esta integração.");
  }
  return { uid: claims.sub, claims };
}

// A lista é exclusiva da rota de métricas para que o diagnóstico continue acessível
// quando o Firestore atingir a cota. As demais rotas continuam consultando o papel no Firestore.
async function requireFirestoreUsageAdmin(idToken, env) {
  const claims = await verifyFirebaseIdToken(idToken, env);
  const allowedUids = (env.FIRESTORE_USAGE_ADMIN_UIDS || "")
    .split(",")
    .map(uid => uid.trim())
    .filter(Boolean);
  if (allowedUids.length === 0) {
    throw new HttpError(503, "A consulta oficial ainda não está habilitada: configure FIRESTORE_USAGE_ADMIN_UIDS no Worker com o UID Firebase do administrador.");
  }
  if (!allowedUids.includes(claims.sub)) {
    throw new HttpError(403, "Apenas administradores autorizados podem consultar as métricas oficiais.");
  }
  return { uid: claims.sub, claims };
}

function base64UrlEncodeText(value) {
  return base64UrlEncode(new TextEncoder().encode(value));
}
async function createMonitoringAccessToken(serviceAccount) {
  if (!serviceAccount || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new HttpError(503, "A conta de serviço do Cloud Monitoring não está configurada corretamente no Worker.");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncodeText(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64UrlEncodeText(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/monitoring.read",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = header + "." + claims;
  let privateKeyBytes;
  try {
    const pem = serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
    privateKeyBytes = base64ToBytes(pem);
  } catch {
    throw new HttpError(503, "A chave privada da conta de serviço do Cloud Monitoring é inválida.");
  }
  let key;
  try {
    key = await crypto.subtle.importKey("pkcs8", privateKeyBytes, {
      name: "RSASSA-PKCS1-v1_5", hash: "SHA-256",
    }, false, ["sign"]);
  } catch {
    throw new HttpError(503, "Não foi possível carregar a chave privada do Cloud Monitoring.");
  }
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = unsigned + "." + base64UrlEncode(new Uint8Array(signature));
  let tokenResponse;
  try {
    tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
  } catch {
    throw new HttpError(502, "Não foi possível autenticar no Google Cloud Monitoring.");
  }
  if (!tokenResponse.ok) throw new HttpError(502, "O Google Cloud recusou a autenticação para consultar métricas.");
  const tokenData = await tokenResponse.json();
  if (typeof tokenData.access_token !== "string" || !tokenData.access_token) {
    throw new HttpError(502, "O Google Cloud não retornou um token de acesso para métricas.");
  }
  return tokenData.access_token;
}
function pacificDayInterval(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(now).reduce((result, part) => {
    if (part.type !== "literal") result[part.type] = Number(part.value);
    return result;
  }, {});
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offset = localAsUtc - now.getTime();
  const startTime = new Date(Date.UTC(parts.year, parts.month - 1, parts.day) - offset);
  const tomorrow = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1, 12));
  const nextParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(tomorrow).reduce((result, part) => {
    if (part.type !== "literal") result[part.type] = Number(part.value);
    return result;
  }, {});
  const nextLocalAsUtc = Date.UTC(nextParts.year, nextParts.month - 1, nextParts.day, nextParts.hour, nextParts.minute, nextParts.second);
  const nextOffset = nextLocalAsUtc - tomorrow.getTime();
  const endTime = new Date(Date.UTC(nextParts.year, nextParts.month - 1, nextParts.day) - nextOffset);
  return { startTime: startTime.toISOString(), endTime: endTime.toISOString() };
}

const FIRESTORE_ESTIMATE_PREFIX = "firestore-estimate:v1:";
const FIRESTORE_ESTIMATE_TTL = 172800;
async function handleFirestoreUsageEstimate(request, env) {
  const idToken = bearerToken(request);
  const claims = await verifyFirebaseIdToken(idToken, env);
  if (request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { throw new HttpError(400, "Payload de estimativa inválido."); }
    const day = typeof body.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.day) ? body.day : "";
    const deviceId = typeof body.deviceId === "string" && /^[a-f0-9-]{16,64}$/i.test(body.deviceId) ? body.deviceId : "";
    const total = Number(body.total);
    const porOperacao = body.porOperacao && typeof body.porOperacao === "object" && !Array.isArray(body.porOperacao) ? body.porOperacao : {};
    if (!day || !deviceId || !Number.isSafeInteger(total) || total < 0 || total > 10000000) {
      throw new HttpError(400, "Os dados da estimativa estão fora do formato esperado.");
    }
    const clean = {};
    for (const [key, value] of Object.entries(porOperacao).slice(0, 30)) {
      if (/^[a-zA-Z0-9_-]{1,40}$/.test(key) && Number.isSafeInteger(Number(value)) && Number(value) >= 0 && Number(value) <= total) clean[key] = Number(value);
    }
    const now = new Date();
    const key = FIRESTORE_ESTIMATE_PREFIX + day + ":" + claims.sub + ":" + deviceId;
    await env.DRIVE_TOKENS.put(key, JSON.stringify({ day, total, porOperacao: clean, updatedAt: now.toISOString() }), { expirationTtl: FIRESTORE_ESTIMATE_TTL });
    return json({ ok: true, updatedAt: now.toISOString() });
  }
  if (request.method !== "GET") throw new HttpError(405, "Método não permitido.");
  await requireFirestoreUsageAdmin(idToken, env);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  let cursor;
  let total = 0;
  const porOperacao = {};
  let dispositivos = 0;
  do {
    const page = await env.DRIVE_TOKENS.list({ prefix: FIRESTORE_ESTIMATE_PREFIX + day + ":", cursor, limit: 1000 });
    for (const item of page.keys || []) {
      const raw = await env.DRIVE_TOKENS.get(item.name);
      if (!raw) continue;
      let record;
      try { record = JSON.parse(raw); } catch { continue; }
      if (record.day !== day || !Number.isSafeInteger(record.total) || record.total < 0) continue;
      total += record.total;
      dispositivos++;
      for (const [key, value] of Object.entries(record.porOperacao || {})) {
        if (Number.isSafeInteger(value) && value >= 0) porOperacao[key] = (porOperacao[key] || 0) + value;
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return json({ ok: true, day, total: Math.min(total, 1000000000), porOperacao, dispositivos, fetchedAt: new Date().toISOString(), source: "browser-estimates" });
}

async function handleFirestoreUsage(request, env) {
  const idToken = bearerToken(request);
  await requireFirestoreUsageAdmin(idToken, env);
  if (!env.GCP_MONITORING_SERVICE_ACCOUNT_JSON) {
    throw new HttpError(503, "As métricas oficiais ainda não estão configuradas. Configure GCP_MONITORING_SERVICE_ACCOUNT_JSON no Worker.");
  }
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(env.GCP_MONITORING_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new HttpError(503, "O secret da conta de serviço do Cloud Monitoring não contém JSON válido.");
  }
  const projectId = env.GCP_MONITORING_PROJECT_ID || FIREBASE_PROJECT_ID;
  const accessToken = await createMonitoringAccessToken(serviceAccount);
  const interval = pacificDayInterval();
  const endpoint = new URL("https://monitoring.googleapis.com/v3/projects/" + encodeURIComponent(projectId) + "/timeSeries");
  endpoint.searchParams.set("filter", 'metric.type = "firestore.googleapis.com/document/read_count"');
  endpoint.searchParams.set("interval.startTime", interval.startTime);
  endpoint.searchParams.set("interval.endTime", interval.endTime);
  endpoint.searchParams.set("aggregation.alignmentPeriod", "60s");
  endpoint.searchParams.set("aggregation.perSeriesAligner", "ALIGN_SUM");
  endpoint.searchParams.set("aggregation.crossSeriesReducer", "REDUCE_SUM");
  endpoint.searchParams.set("view", "FULL");
  endpoint.searchParams.set("pageSize", "1000");
  let response;
  try {
    response = await fetch(endpoint.toString(), {
      headers: { Authorization: "Bearer " + accessToken },
    });
  } catch {
    throw new HttpError(502, "Não foi possível consultar as métricas do Cloud Monitoring.");
  }
  if (!response.ok) {
    // Preserve o diagnóstico retornado pelo Google sem registrar credenciais ou tokens.
    const googleError = await response.json().catch(() => ({}));
    const errorStatus = typeof googleError.error?.status === "string"
      ? googleError.error.status.slice(0, 80)
      : "";
    const errorMessage = typeof googleError.error?.message === "string"
      ? googleError.error.message.replace(/[\r\n\t]+/g, " ").slice(0, 300)
      : "";
    const diagnostic = [
      `HTTP ${response.status}`,
      errorStatus,
      errorMessage,
    ].filter(Boolean).join("; ");
    throw new HttpError(502, `Cloud Monitoring recusou a consulta (${diagnostic || "erro sem detalhes retornados"}).`);
  }
  const data = await response.json();
  const readsToday = (data.timeSeries || []).reduce((total, series) => total + (series.points || []).reduce((subtotal, point) => {
    const value = point.value || {};
    const count = Number(value.int64Value !== undefined ? value.int64Value : value.doubleValue);
    return subtotal + (Number.isFinite(count) && count > 0 ? count : 0);
  }, 0), 0);
  return json({
    readsToday: Math.round(readsToday),
    fetchedAt: new Date().toISOString(),
    interval,
    projectId,
    source: "cloud-monitoring",
  });
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
  if (!response.ok) {
    throw new HttpError(502, `Não foi possível salvar o vínculo Google no Firestore (HTTP ${response.status}). Confira as regras de acesso da coleção de vínculos.`);
  }
}
function bearerToken(request) {
  const value = request.headers.get("Authorization") || "";
  if (!value.startsWith("Bearer ")) throw new HttpError(401, "Entre novamente no Reciclapac.");
  return value.slice(7);
}
async function googleTokenRequest(params, env) {
  let response;
  try {
    response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...params, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET }),
    });
  } catch {
    throw new HttpError(502, "Não foi possível conectar ao serviço OAuth do Google.");
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (result.error === "invalid_client") {
      throw new HttpError(503, "Configuração OAuth do Google inválida no Worker. Confira o Client ID e o Client Secret.");
    }
    if (result.error === "invalid_grant") {
      throw new HttpError(401, "A autorização Google expirou ou foi revogada. Vincule a conta novamente.");
    }
    throw new HttpError(502, `O Google recusou a solicitação OAuth (${String(result.error || "erro não identificado")}).`);
  }
  return result;
}
function callbackPage(status, message, targetOrigin = "*") {
  const payload = JSON.stringify({ type: "reciclapac-drive-oauth", status, message }).replace(/</g, "\\u003c");
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Reciclapac</title><body><p>${status === "success" ? "Conta Google vinculada. Esta janela será fechada." : "Não foi possível vincular a conta. Volte ao Reciclapac."}</p><script>try{if(window.opener){window.opener.postMessage(${payload}, ${JSON.stringify(targetOrigin)});setTimeout(function(){window.close();},800);}}catch(e){}</script></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'" } });
}
async function handleOAuthStart(request, env) {
  const idToken = bearerToken(request);
  const { uid } = await requireAdmin(idToken, env);
  const body = await request.json().catch(() => ({}));
  if (body.mode !== "connect") return json({ error: "Modo OAuth inválido." }, 400);
  const existing = await getDriveLink(uid, idToken);
  const state = randomToken();
  const origin = request.headers.get("Origin") || "";
  const stateRecord = {
    uid, idToken, origin, mode: "connect", expectedGoogleSub: existing?.googleSub || "",
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
  const fallbackOrigin = parseAllowedOrigins(env)[0] || env.APP_ORIGIN || "*";
  if (url.searchParams.has("error")) {
    console.warn("Google OAuth was cancelled or denied.");
    return callbackPage("error", "Autorização Google cancelada ou recusada.", fallbackOrigin);
  }
  if (!state || !code) return callbackPage("error", "Resposta OAuth incompleta.", fallbackOrigin);
  const key = `state:${state}`;
  const stored = await env.DRIVE_TOKENS.get(key);
  if (!stored) return callbackPage("error", "A autorização expirou. Tente novamente.", fallbackOrigin);
  await env.DRIVE_TOKENS.delete(key);
  let targetOrigin = fallbackOrigin;
  try {
    const stateRecord = await decryptJson(stored, env);
    if (stateRecord?.origin) targetOrigin = stateRecord.origin;
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
    return callbackPage("success", "Conta Google vinculada.", targetOrigin);
  } catch (error) {
    console.error("Cloudflare Drive OAuth callback failed:", error);
    return callbackPage("error", "Não foi possível concluir a autorização. Volte ao Reciclapac e tente novamente.", targetOrigin);
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
  let tokens;
  try {
    tokens = await googleTokenRequest({ refresh_token: record.refreshToken, grant_type: "refresh_token" }, env);
  } catch (error) {
    if (error && Number.isInteger(error.status)) throw error;
    throw new HttpError(401, "A autorização Google expirou ou foi revogada. Vincule a conta novamente.");
  }
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
function validateWorkerConfig(pathname, env) {
  if (!env.DRIVE_TOKENS || typeof env.DRIVE_TOKENS.get !== "function"
      || typeof env.DRIVE_TOKENS.put !== "function" || typeof env.DRIVE_TOKENS.delete !== "function") {
    throw new HttpError(503, "Armazenamento KV do Google Drive não está configurado no Worker.");
  }
  const needsOAuth = pathname === "/oauth/start" || pathname === "/token" || pathname === "/oauth/callback";
  if (needsOAuth) {
    if (!env.TOKEN_ENCRYPTION_KEY) {
      throw new HttpError(503, "Configuração incompleta do Google Drive: o segredo de criptografia não está configurado no Worker.");
    }
    let keyBytes;
    try {
      if (typeof env.TOKEN_ENCRYPTION_KEY !== "string"
          || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(env.TOKEN_ENCRYPTION_KEY)) {
        throw new Error("Formato Base64 inválido.");
      }
      keyBytes = base64ToBytes(env.TOKEN_ENCRYPTION_KEY);
    } catch {
      throw new HttpError(503, "Configuração inválida do Google Drive: o segredo de criptografia precisa estar em Base64.");
    }
    if (keyBytes.length !== 32) {
      throw new HttpError(503, "Configuração inválida do Google Drive: o segredo de criptografia precisa conter 32 bytes em Base64.");
    }
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new HttpError(503, "Configuração OAuth do Google incompleta no Worker. Confira o Client ID e o Client Secret.");
    }
  }
  if ((pathname === "/oauth/start" || pathname === "/oauth/callback") && !env.GOOGLE_REDIRECT_URI) {
    throw new HttpError(503, "Configuração incompleta do Google Drive: a URI de retorno OAuth não está configurada no Worker.");
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      const origin = request.headers.get("Origin");
      if (origin && !parseAllowedOrigins(env).includes(origin)) return json({ error: "Origem não autorizada." }, 403);
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    if (url.pathname === "/oauth/callback" && request.method === "GET") {
      const fallbackOrigin = parseAllowedOrigins(env)[0] || env.APP_ORIGIN || "*";
      try {
        // Preserve the cancellation/denial response even if other OAuth settings are incomplete.
        if (!url.searchParams.has("error")) validateWorkerConfig(url.pathname, env);
        return await handleOAuthCallback(request, env);
      } catch (error) {
        const message = error instanceof HttpError
          ? error.message
          : "Não foi possível concluir a autorização. Volte ao Reciclapac e tente novamente.";
        if (!(error instanceof HttpError) || error.status >= 500) {
          console.error("Cloudflare Drive OAuth callback failed:", error);
        }
        return callbackPage("error", message, fallbackOrigin);
      }
    }
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, service: "reciclapac-drive-auth" }, 200, corsHeaders(request, env));
    }
    const protectedRoute = (url.pathname === "/oauth/start" && request.method === "POST")
      || (url.pathname === "/token" && request.method === "POST")
      || (url.pathname === "/link" && request.method === "DELETE")
      || (url.pathname === "/firestore-usage" && request.method === "GET")
      || (url.pathname === "/firestore-usage-estimate" && ["GET", "POST"].includes(request.method));
    if (!protectedRoute) return json({ error: "Rota não encontrada." }, 404, corsHeaders(request, env));
    if (!originAllowed(request, env)) return json({ error: "Origem não autorizada." }, 403, corsHeaders(request, env));
    try {
      validateWorkerConfig(url.pathname, env);
      let response;
      if (url.pathname === "/oauth/start") response = await handleOAuthStart(request, env);
      else if (url.pathname === "/token") response = await handleAccessToken(request, env);
      else if (url.pathname === "/firestore-usage") response = await handleFirestoreUsage(request, env);
      else if (url.pathname === "/firestore-usage-estimate") response = await handleFirestoreUsageEstimate(request, env);
      else response = await handleUnlink(request, env);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders(request, env))) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      const status = error.status || 500;
      if (status >= 500) console.error("Cloudflare Drive Worker request failed:", error);
      const message = error.status ? error.message : "Não foi possível concluir a operação do Google Drive. Tente novamente.";
      return json({ error: message }, status, corsHeaders(request, env));
    }
  },
};
