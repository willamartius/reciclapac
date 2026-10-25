const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');

test('layout desktop: rodapé não cobre a navegação e conteúdo usa a largura disponível', async t => {
  const server = spawn(process.execPath, [path.join(root, 'scripts', 'serve-local.js')], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  server.stdout.on('data', chunk => { output += chunk.toString(); });
  server.stderr.on('data', chunk => { output += chunk.toString(); });
  t.after(() => server.kill());

  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null) throw new Error(`Servidor local encerrou: ${output}`);
    try {
      const response = await fetch('http://127.0.0.1:8001/');
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.equal(ready, true, `servidor local não iniciou: ${output}`);

  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8001/', { waitUntil: 'domcontentloaded' });
  await page.setContent(`
    <link rel="stylesheet" href="http://127.0.0.1:8001/css/styles.css?v=20261025-layout-fixes">
    <div class="sidebar">
      <div class="brand"><div class="brand-title">Reciclapac</div></div>
      <nav class="nav">
        ${Array.from({ length: 13 }, (_, i) => `<button type="button"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg><span>Seção ${i + 1}</span></button>`).join('')}
        <button class="nav-help" type="button">Como usar o painel</button>
      </nav>
      <div class="sidebar-foot"><div class="admin-pill"><div class="account-summary"><span class="account-name"><span class="account-name-text">William Martins de Souza Oliveira</span></span><span class="account-role">Administrador</span></div><button type="button">Sair</button></div></div>
    </div>
    <main class="main"><div class="content"><section class="registro-express-shell"><div class="registro-express-intro">Registro express</div></section></div></main>
  `);

  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 600 }]) {
    await page.setViewportSize(viewport);
    const metrics = await page.evaluate(() => {
      const rect = element => {
        const r = element.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, width: r.width, left: r.left, right: r.right };
      };
      const sidebar = document.querySelector('.sidebar');
      const main = document.querySelector('.main');
      const content = document.querySelector('.content');
      return {
        sidebar: rect(sidebar), help: rect(document.querySelector('.nav-help')),
        footer: rect(document.querySelector('.sidebar-foot')), main: rect(main),
        content: rect(content), shell: rect(document.querySelector('.registro-express-shell')),
        sidebarScrollHeight: sidebar.scrollHeight, sidebarClientHeight: sidebar.clientHeight,
        sidebarOverflowY: getComputedStyle(sidebar).overflowY,
        navGap: parseFloat(getComputedStyle(document.querySelector('.nav')).gap),
        navButtonGap: (() => {
          const buttons = [...document.querySelectorAll('.nav button')];
          return buttons[1].getBoundingClientRect().top - buttons[0].getBoundingClientRect().bottom;
        })(),
        navButtonGap: (() => {
          const buttons = [...document.querySelectorAll('.nav button')];
          const first = buttons[0].getBoundingClientRect();
          const second = buttons[1].getBoundingClientRect();
          return second.top - first.bottom;
        })(),
        accountSummaryTextAlign: getComputedStyle(document.querySelector('.account-summary')).textAlign,
        accountNameTextAlign: getComputedStyle(document.querySelector('.account-name')).textAlign,
        accountName: rect(document.querySelector('.account-name')),
        accountNameText: rect(document.querySelector('.account-name-text')),
        accountButton: rect(document.querySelector('.admin-pill > button:last-child')),
        accountTextContent: document.querySelector('.account-name').textContent.trim(),
        hasAccountIcon: Boolean(document.querySelector('.account-name svg')),
      };
    });
    assert.ok(metrics.help.bottom <= metrics.footer.top,
      `“Como usar o painel” sobrepõe o rodapé em ${viewport.width}x${viewport.height}: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.content.width >= metrics.main.width - 1,
      `conteúdo não aproveita a largura do desktop em ${viewport.width}x${viewport.height}`);
    assert.ok(metrics.shell.width >= metrics.content.width - 60,
      `Registro express não aproveita a largura interna do conteúdo em ${viewport.width}x${viewport.height}`);
    assert.ok(metrics.sidebar.left === 0 && metrics.sidebar.right <= 253,
      `painel lateral fora da coluna esperada: ${JSON.stringify(metrics.sidebar)}`);
    assert.equal(metrics.sidebarOverflowY, 'hidden',
      'a navegação lateral não deve ter rolagem no desktop');
    assert.ok(metrics.accountName.bottom <= metrics.accountButton.top,
      'o botão Sair deve ficar abaixo do nome do perfil');
    assert.equal(metrics.hasAccountIcon, false,
      'o nome do perfil não deve exibir ícone decorativo');
  }

  const transform = await page.locator('.nav button').first().evaluate(button => getComputedStyle(button.querySelector('svg')).transform);
  assert.ok(transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)', `ícone se desloca no hover: ${transform}`);
});
