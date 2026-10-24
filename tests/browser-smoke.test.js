const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');

test('smoke test do site no Chromium: página inicial e scripts do app carregam', async t => {
  const server = spawn(process.execPath, [path.join(root, 'scripts', 'serve-local.js')], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverOutput = '';
  server.stdout.on('data', chunk => { serverOutput += chunk.toString(); });
  server.stderr.on('data', chunk => { serverOutput += chunk.toString(); });
  t.after(() => server.kill());

  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null) throw new Error(`Servidor local encerrou: ${serverOutput}`);
    try {
      const response = await fetch('http://127.0.0.1:8001/');
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.equal(ready, true, `servidor local não iniciou: ${serverOutput}`);

  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const failedResponses = [];
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).origin === 'http://127.0.0.1:8001') {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('http://127.0.0.1:8001/?emulator=1', { waitUntil: 'domcontentloaded' });
  assert.equal(await page.title(), 'Reciclapac');
  assert.equal(await page.locator('#app').count(), 1);
  assert.equal(await page.locator('script[src="js/transfers-exchange.js?v=20261017-cache-refresh"]').count(), 1);
  assert.deepEqual(failedResponses, [], 'arquivos locais referenciados não devem responder com erro HTTP');
});
