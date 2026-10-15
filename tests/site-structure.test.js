const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const scriptTags = [...html.matchAll(/<script\b[^>]*\bsrc="([^"?]+)[^"]*"[^>]*>/g)].map(m => m[1]);
const appScripts = scriptTags.filter(src => src.startsWith('js/'));

test('index.html carrega CSS e scripts do app em arquivos separados, em ordem', () => {
  assert.match(html, /<link rel="stylesheet" href="css\/styles\.css/);
  assert.deepEqual(appScripts, [
    'js/core.js', 'js/views.js', 'js/auth.js', 'js/fichas.js', 'js/transfers-exchange.js', 'js/share.js', 'js/main.js'
  ]);
  assert.ok(scriptTags.indexOf('ranking-logic.js') < scriptTags.indexOf('js/core.js'));
  assert.ok(scriptTags.indexOf('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js') < scriptTags.indexOf('js/core.js'));
  assert.doesNotMatch(html, /<style>/i);
  assert.doesNotMatch(html, /<script>/i);
});

test('todos os arquivos referenciados existem e o CSS tem chaves balanceadas', () => {
  for (const file of ['css/styles.css', ...appScripts]) {
    assert.ok(fs.existsSync(path.join(root, file)), file);
  }
  const css = read('css/styles.css');
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
});

test('cada arquivo JS é sintaticamente válido e o conjunto compila como um script único', () => {
  for (const file of appScripts) new vm.Script(read(file), { filename: file });
  new vm.Script(appScripts.map(read).join('\n'), { filename: 'app-concatenado.js' });
});

test('funções chamadas por handlers inline existem no escopo global', () => {
  const sources = appScripts.map(read).join('\n');
  const sandbox = { window: {}, document: {}, localStorage: {}, sessionStorage: {} };
  const declarada = nome => new RegExp(`function\\s+${nome}\\s*\\(`).test(sources)
    || new RegExp(`window\\.${nome}\\s*=`).test(sources);
  const handlers = new Set();
  for (const m of sources.matchAll(/on(?:click|change|input|submit|keydown)="([^"]+)"/g)) {
    for (const chamada of m[1].matchAll(/(?:^|[;\s(!])([A-Za-z_$][\w$]*)\s*\(/g)) handlers.add(chamada[1]);
  }
  const nativas = new Set(['if', 'event', 'confirm', 'alert', 'setTimeout', 'String', 'Number', 'parseInt', 'parseFloat', 'stopPropagation', 'preventDefault', 'click', 'focus', 'select', 'remove']);
  const ausentes = [...handlers].filter(nome => !nativas.has(nome) && !declarada(nome));
  assert.deepEqual(ausentes, [], `Handlers sem função: ${ausentes.join(', ')}`);
  assert.ok(sandbox);
});

test('painel e página pública usam o mesmo renderizador de detalhes de kits', () => {
  const usos = appScripts.filter(file => read(file).includes('renderDetalhesKit(kit,unidadeItem)'));
  assert.deepEqual(usos.sort(), ['js/transfers-exchange.js', 'js/views.js']);
  assert.ok(read('js/auth.js').includes('montarResumoKitColaborador('));
});
