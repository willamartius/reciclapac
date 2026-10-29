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
    'js/core.js', 'js/views.js', 'js/delivery-timestamps.js', 'js/auth.js', 'js/fichas.js', 'js/registro-express.js', 'js/transfers-exchange.js', 'js/share.js', 'js/monitoramento.js', 'js/main.js'
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

test('salvar avisos públicos mantém espaço de status estável para evitar salto na rolagem', () => {
  const main = read('js/main.js');
  const views = read('js/views.js');
  assert.match(main, /id="avisosPublicosErro" class="small-note" role="status" aria-live="polite" style="min-height:1\.4em;margin:0;"/);
  assert.doesNotMatch(main, /avisosPublicosErro[^\n]*hidden/);
  assert.match(main, /erroElemento\.textContent=mensagem\?'Mensagem salva e ativada\.'\:'Mensagem removida e desativada\.'/);
  assert.match(main, /erroElemento\.textContent=erro\.message\|\|'Não foi possível salvar a mensagem\.'/);
  assert.ok(views.includes('STATE.avisoManutencaoPublico?`<div class="public-configured-notice">'));
  assert.ok(views.includes('STATE.avisoRankingPublico?`<div class="public-configured-notice" role="status">'));
});

test('painel e página pública usam o mesmo renderizador de detalhes de kits', () => {
  const usos = appScripts.filter(file => read(file).includes('renderDetalhesKit(kit,unidadeItem)'));
  assert.deepEqual(usos.sort(), ['js/transfers-exchange.js', 'js/views.js']);
  assert.ok(read('js/auth.js').includes('montarResumoKitColaborador('));
});

test('emissão de fichas fica dentro do Registro express e não na navegação separada', () => {
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

test('Registro express expõe avanço por Enter, progresso e acessibilidade responsiva', () => {
  const registro = read('js/registro-express.js');
  const css = read('css/styles.css');
  assert.match(registro, /onsubmit="event\.preventDefault\(\);avancarEtapaFichaExpress\(\)"/);
  assert.match(registro, /aria-label="Progresso do Registro express"/);
  assert.match(registro, /onclick="voltarEtapaFichaExpress\(\)"/);
  assert.match(registro, /role="alert"/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});


test('histórico padroniza registro e coleta; navegação usa Registro express', () => {
  const main = read('js/main.js');
  const auth = read('js/auth.js');
  const views = read('js/views.js');
  assert.match(main, /dataPrincipal=\['Entrega','Transferência'\]\.includes\(ev\.tipo\)\?formatarDataHoraRegistro\(ev\.criadoEm\)/);
  assert.ok(main.includes('<th>Registro no sistema</th><th>Tipo</th><th>Detalhe</th><th>Obs.</th>'));
  assert.match(views, /label:'Registro express'/);
  assert.ok(read('js/registro-express.js').includes('<h1>Registro express</h1>'));
  assert.match(main, /Coleta:/);
  assert.match(main, /const rotuloData = 'Coleta';/);
  assert.match(auth, /const rotuloData = 'Coleta';/);
  assert.doesNotMatch(main + auth, /Data informada|Data coleta/);
  assert.match(views, /<th>MATERIAIS<\/th><th>Necessário<\/th><th>Disponível<\/th>/);
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


test('Área técnica do Firestore é carregada e fica nas Configurações administrativas', () => {
  const monitor = read('js/monitoramento.js');
  const main = read('js/main.js');
  assert.ok(appScripts.includes('js/monitoramento.js'));
  assert.match(main, /Desenvolvedor/);
  assert.match(main, /firestoreMonitorContent/);
  assert.match(main, /renderMonitoramentoFirestore/);
  assert.match(monitor, /firestore-usage/);
  assert.match(monitor, /reciclapac:firestore-read-monitor:v1/);
  assert.match(monitor, /emulator/);
  assert.match(monitor, /não geram gravações no Firestore/);
});

test('navegação mantém o shell e reseta a rolagem uma vez após atualizar a seção', () => {
  const views = read('js/views.js');
  const start = views.indexOf('function irPara(view)');
  const end = views.indexOf('window.irPara = irPara;', start);
  assert.ok(start >= 0 && end > start);
  const navigation = views.slice(start, end);
  assert.ok(navigation.indexOf('renderApp();') < navigation.indexOf('window.scrollTo({top:0,left:0,behavior:\'auto\'});'),
    'a rolagem deve ser ajustada depois de atualizar somente o conteúdo');
  assert.equal((navigation.match(/window\.scrollTo\(/g) || []).length, 1,
    'a navegação deve fazer apenas um reset de rolagem');
  assert.ok(views.includes("if(!app.querySelector('.sidebar'))"),
    'o shell da lateral deve ser criado apenas uma vez, evitando flash entre seções');
});


test('falhas ao excluir registros preservam o erro do Firestore e usam feedback na interface', () => {
  const core = read('js/core.js');
  const auth = read('js/auth.js');
  const transfers = read('js/transfers-exchange.js');
  assert.match(core, /function formatarMensagemErroFirestore\(erro/);
  assert.match(core, /resource-exhausted/);
  assert.match(core, /STORAGE_ERRORS\.set\(colecao,erro\)/);
  assert.match(core, /function mostrarErroOperacao\(mensagem\)/);
  assert.match(auth, /mostrarErroOperacao\(formatarMensagemErroFirestore\(STORAGE_ERRORS\.get\('entregas'\)/);
  assert.match(auth, /mostrarErroOperacao\(formatarMensagemErroFirestore\(STORAGE_ERRORS\.get\('colaboradores'\)/);
  assert.match(transfers, /mostrarErroOperacao\(formatarMensagemErroFirestore\(STORAGE_ERRORS\.get\('transferencias'\)/);
  assert.match(transfers, /mostrarErroOperacao\(formatarMensagemErroFirestore\(STORAGE_ERRORS\.get\('trocas'\)/);
  assert.match(read('css/styles.css'), /\.btn-danger:hover\{background:#fee8e6;border-color:#d92d20;color:#b42318;\}/);
});


test('renderização das tabelas ocorre após montar a seção, sem duplicação por setTimeout', () => {
  const views = read('js/views.js');
  const main = read('js/main.js');
  assert.match(views, /if\(STATE\.view==='colaboradores'\) renderTabelaColaboradores\(\);/);
  assert.match(views, /if\(STATE\.view==='entregas'\) renderTabelaEntregas\(\);/);
  assert.match(views, /if\(STATE\.view==='config' && STATE\.isAdmin\) renderTabelaCampanhas\(\);/);
  assert.doesNotMatch(main, /if\(STATE\.view==='colaboradores'\) setTimeout\(renderTabelaColaboradores,0\)/);
  assert.doesNotMatch(main, /if\(STATE\.view==='entregas'\) setTimeout\(renderTabelaEntregas,0\)/);
  assert.match(read('css/styles.css'), /\.nav button:hover svg\{opacity:1;\}/);
});


test('monitoramento distingue estimativa agregada das métricas oficiais e usa endpoint centralizado', () => {
  const monitor = read('js/monitoramento.js');
  const worker = read('cloudflare/drive-auth/src/index.js');
  assert.match(monitor, /firestore-usage-estimate/);
  assert.match(monitor, /Estimativa agregada entre dispositivos/);
  assert.match(monitor, /não substitui métricas oficiais/);
  assert.match(worker, /async function handleFirestoreUsageEstimate/);
  assert.match(worker, /requireFirestoreUsageAdmin\(idToken, env\)/);
  assert.match(worker, /FIRESTORE_ESTIMATE_PREFIX/);
  assert.match(worker, /expirationTtl: FIRESTORE_ESTIMATE_TTL/);
});

test('Configurações administrativas têm abas, mantêm alvos de funções e documentam serviços usados', () => {
  const main = read('js/main.js');
  const views = read('js/views.js');
  const monitor = read('js/monitoramento.js');
  const privacy = read('privacidade.html');
  for (const aba of ['perfil','campanhas','backup','manutencao','tecnica']) {
    assert.match(main, new RegExp('data-settings-panel="' + aba + '"'));
    assert.match(main, new RegExp('data-settings-tab="' + aba + '"'));
  }
  assert.match(main, /function selecionarAbaConfiguracoes\(aba\)/);
  assert.match(main, />Desenvolvedor<\/button>/);
  assert.match(main, /async function salvarAvisoPublico\(tipo\)/);
  assert.match(main, /avisoManutencaoPublicaInput/);
  assert.match(main, /avisoRankingPublicoInput/);
  assert.match(views, /public-configured-notice/);
  assert.match(views, /STATE\.avisoRankingPublico\?`<div class=\"public-configured-notice\"/);
  assert.match(views, /STATE\.avisoManutencaoPublico\?`<div class=\"public-configured-notice\"/);
  assert.match(read('firestore.rules'), /mostrarAvisoManutencao/);
  assert.match(read('css/styles.css'), /settings-tab\.is-active\{background:var\(--verde-600\);color:#fff/);
  assert.match(read('css/styles.css'), /toggle-switch input:checked\+\.toggle-switch-track\{background:var\(--verde-600\);/);
  assert.match(views, /selecionarAbaConfiguracoes\('perfil'\)/);
  for (const id of ['filtroStatusCampanha','tabelaCampanhasWrap','manutencaoPublicaCheckbox','cardBackupGoogleDrive','firestoreMonitorContent']) assert.ok(main.includes('id="' + id + '"'), 'preserva o alvo ' + id);
  assert.match(monitor, /reciclapac:firestore-reference-plan:v1/);
  assert.match(monitor, /<option value="spark"/);
  assert.match(monitor, /<option value="blaze"/);
  assert.match(privacy, /Política de Privacidade da Cloudflare/);
  assert.doesNotMatch(main, /Sobre a campanha/);
});

test('aviso de manutenção usa interruptor acessível sem alterar o callback existente', () => {
  const main = read('js/main.js');
  assert.match(main, /class="toggle-switch"/);
  assert.match(main, /role="switch" aria-label="Exibir aviso de manutenção"/);
  assert.match(main, /onchange="alterarManutencaoPublica\(this\.checked\)"/);
});


test('avisos públicos usam salvar e limpar, e links legais abrem em nova guia', () => {
  const main = read('js/main.js');
  const views = read('js/views.js');
  assert.match(main, /limparAvisoPublico/);
  assert.match(main, /salvarAvisoPublico/);
  assert.match(main, /avisoManutencaoPublicaInput/);
  assert.match(main, /avisoRankingPublicoInput/);
  assert.doesNotMatch(main, /mostrarAvisoManutencaoPublicoCheckbox/);
  assert.doesNotMatch(main, /mostrarAvisoRankingPublicoCheckbox/);
  assert.match(main, /target="_blank" rel="noopener noreferrer"/);
  assert.match(views, /href="termos\.html" target="_blank" rel="noopener noreferrer"/);
  assert.match(views, /href="privacidade\.html" target="_blank" rel="noopener noreferrer"/);
});


test('conteúdo da coluna de itens disponíveis fica centralizado em ambas as configurações de campanha', () => {
  const ranking = read('js/transfers-exchange.js');
  const css = read('css/styles.css');
  const start = ranking.indexOf('function renderTabelaRanking(');
  const end = ranking.indexOf('function abrirDetalhesColaborador(', start);
  assert.ok(start >= 0 && end > start);
  const tabela = ranking.slice(start, end);
  assert.match(tabela, /const campanha = campanhaPorId\(STATE\.campanhaSelecionadaId\)/);
  assert.match(tabela, /<table class="ranking-table">/);
  assert.match(tabela, /class="table-cell-center"><div class="ranking-item-cell-content"/);
  assert.match(css, /\.ranking-item-cell-content\{display:flex;width:100%;min-width:0;align-items:center;justify-content:center;box-sizing:border-box;\}/);
  assert.match(css, /#viewContent \.ranking-table th,\s*#viewContent \.ranking-table td\{text-align:center;\}/);
  assert.match(css, /#viewContent \.ranking-table th:nth-child\(2\),\s*#viewContent \.ranking-table td:nth-child\(2\)\{text-align:left;\}/);
  assert.match(css, /#viewContent \.ranking-table td \.progress\{min-width:0;\}/);
});

test('contador do sino é sincronizado quando o shell do painel é reutilizado', () => {
  const views = read('js/views.js');
  const renderStart = views.indexOf('function renderApp(){');
  const contentStart = views.indexOf("const content = document.getElementById('viewContent');", renderStart);
  assert.ok(renderStart >= 0 && contentStart > renderStart);
  const render = views.slice(renderStart, contentStart);
  assert.match(render, /app\.querySelector\('\.topbar-icon-actions'\)/);
  assert.match(render, /STATE\.isAdmin \? renderBotaoNotificacoesTroca\(\) : ''/);
  assert.match(render, /notificationActions\.innerHTML !== notificationMarkup/);
  assert.ok(render.indexOf('notificationActions.innerHTML = notificationMarkup') > render.indexOf('if(!app.querySelector(\'.sidebar\'))'));
});

test('avisos públicos oferecem editor formatado e sanitizam HTML antes de exibir', () => {
  const main = read('js/main.js');
  const views = read('js/views.js');
  const css = read('css/styles.css');
  assert.match(main, /contenteditable="true"/);
  assert.match(main, /let abaConfiguracoesAtiva='perfil'/);
  assert.match(main, /abaConfiguracoesAtiva=permitidas\.includes\(aba\)\?aba:'perfil'/);
  assert.match(main, /aria-label="Formatação da mensagem de manutenção"/);
  assert.match(main, /aria-label="Formatação da mensagem do ranking público"/);
  assert.match(main, /function formatarAvisoPublico\(/);
  assert.ok(main.includes("sanitizarAvisoPublicoHtml((campo?.innerHTML||'').trim(),5000)"));
  assert.ok(main.includes("dados.avisoManutencao.slice(0,5000)"));
  assert.ok(main.includes("dados.avisoRanking.slice(0,5000)"));
  assert.ok(views.includes("function sanitizarAvisoPublicoHtml(conteudo, limite=5000)"));
  assert.match(views, /function sanitizarAvisoPublicoHtml\(/);
  assert.ok(views.includes('const textoColado=documento.body.textContent||\'\''));
  assert.ok(views.includes('documento=new DOMParser().parseFromString(textoColado,\'text/html\')'));
  assert.ok(views.includes("const permitidas=new Set(['B','STRONG','I','EM','U','P','DIV','BR','UL','OL','LI','A','FONT','SPAN'])"));
  assert.ok(views.includes("if(filho.tagName==='DIV')"));
  assert.ok(views.includes("const contemBloco=[...filho.children].some(elemento=>['P','DIV','UL','OL'].includes(elemento.tagName))"));
  assert.ok(views.includes("filho.replaceWith(...filho.childNodes)"));
  assert.ok(views.includes('documento.createElement(\'p\')'));
  assert.ok(css.includes('.public-configured-notice p{margin:0 0 12px;}'));
  assert.ok(css.includes('.rich-text-editor p,.rich-text-editor div{margin:0;}'));
  assert.doesNotMatch(css,/\.rich-text-editor (?:p|div)(?::last-child)?\{margin(?:-bottom)?:0 0 12px|\.rich-text-editor div\{margin-bottom:12px/);
  assert.ok(css.includes('.rich-text-editor li,.public-configured-notice li{margin-bottom:8px;}'));
  assert.ok(views.includes("sanitizarAvisoPublicoHtml(STATE.avisoManutencaoPublico)"));
  assert.ok(views.includes("sanitizarAvisoPublicoHtml(STATE.avisoRankingPublico)"));
  assert.match(css, /\.rich-text-editor:focus/);
});

test('avisos públicos permitem ajustar tamanho em px, usar amostras de cor e sanitizar o HTML', () => {
  const main = read('js/main.js');
  const views = read('js/views.js');
  const css = read('css/styles.css');
  const rules = read('firestore.rules');
  assert.equal((main.match(/class="rich-text-size-control"/g)||[]).length,2);
  assert.equal((main.match(/class="rich-text-color-swatch"/g)||[]).length,12);
  assert.equal((main.match(/aria-label="Aumentar tamanho da fonte"/g)||[]).length,2);
  assert.equal((main.match(/aria-label="Diminuir tamanho da fonte"/g)||[]).length,2);
  assert.match(main,/function alterarTamanhoAvisoPublico/);
  assert.match(main,/\[8,10,12,14,16,18,24,32\]/);
  assert.match(views,/const mapaTamanhos=\{'1':'8px','2':'10px'/);
  assert.ok(views.includes("['8px','10px','12px','14px','16px','18px','24px','32px']"));
  assert.ok(css.includes('.rich-text-color-swatch{'));
  assert.ok(css.includes('.rich-text-stepper{'));
  assert.equal((main.match(/spellcheck="false"/g)||[]).length,2);
  assert.equal((main.match(/onpaste="colarTextoSimplesAvisoPublico\(event,this\.id\)"/g)||[]).length,2);
  assert.match(main,/function colarTextoSimplesAvisoPublico\(event,id\)/);
  assert.ok(main.includes("document.createTreeWalker(conteudo,NodeFilter.SHOW_TEXT)"));
  assert.ok(main.includes("novoIntervalo.setStartBefore(inseridos[0])"));
  assert.ok(main.includes("event.clipboardData.getData('text/plain')"));
  assert.match(main,/function atualizarContadorAvisoPublico\(id\)/);
  assert.match(main,/function atualizarTamanhoFonteAvisoPublico\(id\)/);
  assert.equal((main.match(/class="rich-text-character-count"/g)||[]).length,2);
  assert.equal((main.match(/oninput="atualizarContadorAvisoPublico\(this\.id\);atualizarTamanhoFonteAvisoPublico\(this\.id\)"/g)||[]).length,2);
  assert.ok(main.includes("contador.textContent=quantidade.toLocaleString('pt-BR')+' / 5.000 caracteres'"));
  assert.doesNotMatch(main,/O limite considera o texto visível/);
  assert.ok(main.includes("saida.textContent='Vários'"));
  assert.ok(main.includes('onpointerdown="event.preventDefault();preservarSelecaoAvisoPublico('));
  assert.ok(views.includes("rgb(32, 40, 32)"));
  assert.ok(rules.includes('request.resource.data.avisoManutencao.size() <= 5000'));
  assert.ok(rules.includes('request.resource.data.avisoRanking.size() <= 5000'));
});
