import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign as signJwt } from 'node:crypto';
import worker from '../src/index.js';

function createMockKV(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async put(key, value) { store.set(key, String(value)); },
    async delete(key) { store.delete(key); },
    _store: store,
  };
}


const TEST_FIREBASE_UID = 'admin-metrics-test';
const TEST_FIREBASE_KID = 'metrics-test-kid';
const { privateKey: TEST_FIREBASE_PRIVATE_KEY, publicKey: TEST_FIREBASE_PUBLIC_KEY } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const TEST_FIREBASE_JWK = { ...TEST_FIREBASE_PUBLIC_KEY.export({ format: 'jwk' }), kid: TEST_FIREBASE_KID, alg: 'RS256', use: 'sig' };
function createFirebaseIdToken(uid = TEST_FIREBASE_UID) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: TEST_FIREBASE_KID })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    aud: 'apac-reciclar',
    iss: 'https://securetoken.google.com/apac-reciclar',
    sub: uid,
    iat: now,
    exp: now + 3600,
    auth_time: now,
  })).toString('base64url');
  const unsigned = header + '.' + payload;
  return unsigned + '.' + signJwt('RSA-SHA256', Buffer.from(unsigned), TEST_FIREBASE_PRIVATE_KEY).toString('base64url');
}

const TEST_KEY = Buffer.alloc(32, 7).toString('base64');
const TEST_ENV = {
  APP_ORIGIN: 'https://reciclapac.com.br, http://localhost:8000',
  TOKEN_ENCRYPTION_KEY: TEST_KEY,
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_REDIRECT_URI: 'https://reciclapac-drive-auth.reciclapac.workers.dev/oauth/callback',
  DRIVE_TOKENS: createMockKV(),
};

test('GET /health retorna 200 e dados do serviço', async () => {
  const req = new Request('https://worker.local/health', { method: 'GET' });
  const res = await worker.fetch(req, TEST_ENV);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  const data = await res.json();
  assert.deepEqual(data, { ok: true, service: 'reciclapac-drive-auth' });
});

test('OPTIONS retorna 204 com cabeçalhos CORS para origem autorizada', async () => {
  const req = new Request('https://worker.local/token', {
    method: 'OPTIONS',
    headers: { Origin: 'https://reciclapac.com.br' },
  });
  const res = await worker.fetch(req, TEST_ENV);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://reciclapac.com.br');
  assert.ok(res.headers.get('Access-Control-Allow-Methods').includes('POST'));
  assert.ok(res.headers.get('Access-Control-Allow-Headers').includes('Authorization'));
  assert.equal(res.headers.get('Access-Control-Max-Age'), '86400');
});

test('OPTIONS suporta múltiplas origens configuradas em APP_ORIGIN', async () => {
  const req = new Request('https://worker.local/token', {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:8000' },
  });
  const res = await worker.fetch(req, TEST_ENV);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'http://localhost:8000');
});

test('OPTIONS suporta APP_ORIGIN com barras finais e múltiplos espaços', async () => {
  const req = new Request('https://worker.local/token', {
    method: 'OPTIONS',
    headers: { Origin: 'https://staging.reciclapac.com.br' },
  });
  const res = await worker.fetch(req, {
    ...TEST_ENV,
    APP_ORIGIN: ' https://reciclapac.com.br/// , https://staging.reciclapac.com.br// ',
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://staging.reciclapac.com.br');
});

test('OPTIONS rejeita origem não autorizada com 403', async () => {
  const req = new Request('https://worker.local/token', {
    method: 'OPTIONS',
    headers: { Origin: 'https://site-malicioso.com' },
  });
  const res = await worker.fetch(req, TEST_ENV);
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.error, 'Origem não autorizada.');
});

test('Rota inexistente retorna 404', async () => {
  const req = new Request('https://worker.local/rota-inexistente', {
    method: 'GET',
    headers: { Origin: 'https://reciclapac.com.br' },
  });
  const res = await worker.fetch(req, TEST_ENV);
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.error, 'Rota não encontrada.');
});

test('Rota protegida rejeita requisição de origem não autorizada com 403', async () => {
  const req = new Request('https://worker.local/token', {
    method: 'POST',
    headers: { Origin: 'https://origem-estranha.com' },
  });
  const res = await worker.fetch(req, TEST_ENV);
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.error, 'Origem não autorizada.');
});

test('Método inválido para rota protegida retorna 404', async () => {
  const req = new Request('https://worker.local/token', {
    method: 'GET',
    headers: { Origin: 'https://reciclapac.com.br' },
  });
  const res = await worker.fetch(req, TEST_ENV);
  assert.equal(res.status, 404);
});

test('Requisição protegida sem Authorization retorna 401', async () => {
  const req = new Request('https://worker.local/token', {
    method: 'POST',
    headers: {
      Origin: 'https://reciclapac.com.br',
      'Content-Type': 'application/json',
    },
  });
  const res = await worker.fetch(req, TEST_ENV);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'Entre novamente no Reciclapac.');
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://reciclapac.com.br');
});

test('Requisição com Authorization malformado (sem prefixo Bearer) retorna 401', async () => {
  const req = new Request('https://worker.local/token', {
    method: 'POST',
    headers: {
      Origin: 'https://reciclapac.com.br',
      Authorization: 'Basic 123456',
    },
  });
  const res = await worker.fetch(req, TEST_ENV);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'Entre novamente no Reciclapac.');
});

test('GET /oauth/callback com erro do Google retorna página de erro segura', async () => {
  const req = new Request('https://worker.local/oauth/callback?error=access_denied', {
    method: 'GET',
  });
  const res = await worker.fetch(req, TEST_ENV);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.ok(res.headers.get('content-security-policy').includes("default-src 'none'"));
  const html = await res.text();
  assert.ok(html.includes('reciclapac-drive-oauth'));
  assert.ok(html.includes('error'));
  assert.ok(html.includes('Autorização Google cancelada ou recusada.'));
});

test('GET /oauth/callback com parâmetros incompletos retorna página de erro', async () => {
  const req = new Request('https://worker.local/oauth/callback?state=incompleto', {
    method: 'GET',
  });
  const res = await worker.fetch(req, TEST_ENV);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('Resposta OAuth incompleta.'));
});

test('GET /oauth/callback com estado inexistente ou expirado retorna página de erro', async () => {
  const kv = createMockKV();
  const env = { ...TEST_ENV, DRIVE_TOKENS: kv };
  const req = new Request('https://worker.local/oauth/callback?state=nao-existe&code=abc', {
    method: 'GET',
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('A autorização expirou. Tente novamente.'));
});

test('Página de retorno do OAuth inclui temporizador para fechamento do popup', async () => {
  const req = new Request('https://worker.local/oauth/callback?error=access_denied', {
    method: 'GET',
  });
  const res = await worker.fetch(req, TEST_ENV);
  const html = await res.text();
  assert.ok(html.includes('setTimeout(function(){window.close();},800)'), 'Deve conter atraso de fechamento para garantir o postMessage');
});


test('GET /firestore-usage exige origem autorizada', async () => {
  const req = new Request('https://worker.local/firestore-usage', {
    method: 'GET', headers: { Origin: 'https://origem-estranha.com' },
  });
  const res = await worker.fetch(req, TEST_ENV);
  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { error: 'Origem não autorizada.' });
});

test('GET /firestore-usage exige token de autenticação', async () => {
  const req = new Request('https://worker.local/firestore-usage', {
    method: 'GET', headers: { Origin: 'https://reciclapac.com.br' },
  });
  const res = await worker.fetch(req, TEST_ENV);
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: 'Entre novamente no Reciclapac.' });
});


test('GET /firestore-usage autoriza o UID listado sem consultar o Firestore', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.match(String(input), /securetoken@system\.gserviceaccount\.com/);
    return new Response(JSON.stringify({ keys: [TEST_FIREBASE_JWK] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const req = new Request('https://worker.local/firestore-usage', {
      method: 'GET',
      headers: {
        Origin: 'https://reciclapac.com.br',
        Authorization: 'Bearer ' + createFirebaseIdToken(),
      },
    });
    const res = await worker.fetch(req, {
      ...TEST_ENV,
      FIRESTORE_USAGE_ADMIN_UIDS: TEST_FIREBASE_UID,
    });
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /GCP_MONITORING_SERVICE_ACCOUNT_JSON/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GET /firestore-usage mostra diagnóstico seguro retornado pelo Cloud Monitoring', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, options = {}) => {
    const url = String(input);
    if (url.includes('securetoken@system.gserviceaccount.com')) {
      return new Response(JSON.stringify({ keys: [TEST_FIREBASE_JWK] }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }
    if (url === 'https://oauth2.googleapis.com/token') {
      return new Response(JSON.stringify({ access_token: 'test-monitoring-access-token' }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }
    assert.match(url, /monitoring.googleapis.com\/v3\/projects\/apac-reciclar\/timeSeries/);
    assert.equal(options.headers.Authorization, 'Bearer test-monitoring-access-token');
    return new Response(JSON.stringify({
      error: {
        code: 403,
        status: 'PERMISSION_DENIED',
        message: 'Cloud Monitoring API has not been used in project apac-reciclar or it is disabled.',
      },
    }), { status: 403, headers: { 'content-type': 'application/json' } });
  };
  try {
    const monitoringPrivateKey = TEST_FIREBASE_PRIVATE_KEY.export({ type: 'pkcs8', format: 'pem' });
    const req = new Request('https://worker.local/firestore-usage', {
      method: 'GET',
      headers: {
        Origin: 'https://reciclapac.com.br',
        Authorization: 'Bearer ' + createFirebaseIdToken(),
      },
    });
    const res = await worker.fetch(req, {
      ...TEST_ENV,
      FIRESTORE_USAGE_ADMIN_UIDS: TEST_FIREBASE_UID,
      GCP_MONITORING_SERVICE_ACCOUNT_JSON: JSON.stringify({
        client_email: 'monitor@example.iam.gserviceaccount.com',
        private_key: monitoringPrivateKey,
      }),
    });
    assert.equal(res.status, 502);
    const data = await res.json();
    assert.match(data.error, /HTTP 403/);
    assert.match(data.error, /PERMISSION_DENIED/);
    assert.match(data.error, /API has not been used/);
    assert.doesNotMatch(data.error, /test-monitoring-access-token|PRIVATE KEY/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GET /firestore-usage recusa UID não listado sem consultar o Firestore', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.match(String(input), /securetoken@system\.gserviceaccount\.com/);
    return new Response(JSON.stringify({ keys: [TEST_FIREBASE_JWK] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const req = new Request('https://worker.local/firestore-usage', {
      method: 'GET',
      headers: {
        Origin: 'https://reciclapac.com.br',
        Authorization: 'Bearer ' + createFirebaseIdToken('ordinary-user'),
      },
    });
    const res = await worker.fetch(req, {
      ...TEST_ENV,
      FIRESTORE_USAGE_ADMIN_UIDS: TEST_FIREBASE_UID,
    });
    assert.equal(res.status, 403);
    assert.match((await res.json()).error, /UID|administradores autorizados/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
