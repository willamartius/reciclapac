import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const BASE_ENV = {
  APP_ORIGIN: 'https://reciclapac.com.br',
  DRIVE_TOKENS: {
    async get() { return null; },
    async put() {},
    async delete() {},
  },
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_REDIRECT_URI: 'https://reciclapac-drive-auth.reciclapac.workers.dev/oauth/callback',
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
};

async function postToken(env) {
  return worker.fetch(new Request('https://worker.local/token', {
    method: 'POST',
    headers: {
      Origin: 'https://reciclapac.com.br',
      Authorization: 'Bearer invalid-token',
      'Content-Type': 'application/json',
    },
  }), env);
}

test('retorna diagnóstico claro quando o KV do Worker não está configurado', async () => {
  const { DRIVE_TOKENS, ...env } = BASE_ENV;
  const response = await postToken(env);
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /KV.*não está configurado/i);
});

test('retorna diagnóstico claro quando falta a chave de criptografia', async () => {
  const { TOKEN_ENCRYPTION_KEY, ...env } = BASE_ENV;
  const response = await postToken(env);
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /segredo de criptografia não está configurado/i);
});

test('retorna diagnóstico claro quando faltam as credenciais OAuth do Google', async () => {
  const { GOOGLE_CLIENT_SECRET, ...env } = BASE_ENV;
  const response = await postToken(env);
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Client ID e o Client Secret/i);
});
