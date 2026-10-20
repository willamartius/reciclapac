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
    'js/core.js', 'js/views.js', 'js/delivery-timestamps.js', 'js/auth.js', 'js/fichas.js', 'js/registro-express.js', 'js/transfers-exchange.js', 'js/share.js', 'js/main.js'
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

test('emissão de fichas fica dentro do Registro Express e não na navegação separada', () => {
  const views = read('js/views.js');
  const registro = read('js/registro-express.js');

  assert.match(views, /\[\.\.\.NAV_ITEMS_BASE, NAV_ITEM_TRASH, NAV_ITEM_CONFIG\]/);
  assert.doesNotMatch(views, /NAV_ITEMS_BASE\.slice\(0, 4\), NAV_ITEM_FOLHAS/);
  assert.doesNotMatch(views, /folhas: renderFolhaEntrega/);
  assert.match(views, /label:'Emissão de fichas'/);
  assert.match(registro, /registro-express-emissao/);
  assert.match(registro, /\$\{renderFolhaEntrega\(\)\}/);
  assert.match(registro, /registroExpressTabRegistrar/);
  assert.match(registro, /registroExpressTabEmitir/);
  assert.match(registro, /function selecionarAbaRegistroExpress/);
  assert.match(registro, /registroExpressPainelRegistrar/);
  assert.match(registro, /registroExpressPainelEmitir/);
});

test('Registro Express expõe avanço por Enter, progresso e acessibilidade responsiva', () => {
  const registro = read('js/registro-express.js');
  const css = read('css/styles.css');
  assert.match(registro, /onsubmit="event\.preventDefault\(\);avancarEtapaFichaExpress\(\)"/);
  assert.match(registro, /aria-label="Progresso do Registro Express"/);
  assert.match(registro, /onclick="voltarEtapaFichaExpress\(\)"/);
  assert.match(registro, /role="alert"/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});


test('histórico exibe horário do registro e data coleta; detalhes públicos identificam kit de materiais', () => {
  const main = read('js/main.js');
  const auth = read('js/auth.js');
  const views = read('js/views.js');
  assert.match(main, /dataPrincipal=ev\.tipo==='Entrega'\?formatarDataHoraRegistro\(ev\.criadoEm\)/);
  assert.match(main, /Data coleta:/);
  assert.match(main, /const rotuloData = 'Data coleta';/);
  assert.match(auth, /const rotuloData = 'Data coleta';/);
  assert.doesNotMatch(main + auth, /Data informada/);
  assert.match(views, /<th>KIT DE MATERIAIS<\/th><th>Necessário<\/th><th>Disponível<\/th>/);
});

test('modo de manutenção pública não exibe solicitação de troca nem rodapé legal', () => {
  const views = read('js/views.js');
  const maintenanceStart = views.indexOf('function renderAvisoManutencaoPublica()');
  const publicRankingStart = views.indexOf('function renderRankingPublico()', maintenanceStart);
  assert.ok(maintenanceStart >= 0 && publicRankingStart > maintenanceStart);
  const maintenance = views.slice(maintenanceStart, publicRankingStart);
  assert.doesNotMatch(maintenance, /Solicitar troca/);
  assert.doesNotMatch(maintenance, /renderRodapePublico\(\)/);
  assert.match(maintenance, /Estamos em manutenção/);
  assert.match(maintenance, /abrirLoginAdmin\(\)/);
  const normalRanking = views.slice(publicRankingStart);
  assert.match(normalRanking, /if\(STATE\.manutencaoPublica\) return renderAvisoManutencaoPublica\(\)/);
  assert.match(normalRanking, /Solicitar troca/);
  assert.match(normalRanking, /renderRodapePublico\(\)/);
});
