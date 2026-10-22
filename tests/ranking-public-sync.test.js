const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const authSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'auth.js'), 'utf8');

test('public ranking reloads all source collections before publishing', async () => {
  const remote = {
    colaboradores: [{id: 'remoto', nome: 'Ana Remota', status: 'ativo'}],
    entregas: [{id: 'entrega-remota', campanhaId: 'campanha', data: '2026-10-01'}],
    transferencias: [],
    trocas: [],
    campanhas: [{
      id: 'campanha', nome: 'Campanha remota', mesInicio: 10, anoInicio: 2026,
      mesFim: null, anoFim: null, status: 'ativa', trocaCartela: {ativo: false},
    }],
    metas: [{id: 'meta-remota', campanhaId: 'campanha', chave: '2026-10', metas: {papel: 1}}],
  };
  const reads = [];
  const published = [];
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    document: {addEventListener() {}},
    window: {addEventListener() {}},
    remote,
    reads,
    published,
  };

  vm.createContext(sandbox);
  new vm.Script(`
    let rankingPublicoSyncAtivo = true;
    let rankingPublicoSyncPromise = null;
    let rankingPublicoSyncPendente = false;
    let rankingPublicoSyncTimer = null;
    let rankingPublicoSyncMesTimer = null;
    let rankingPublicoUltimoMesSincronizado = '';
    const STORAGE_MODE = 'firestore';
    const PUBLIC_RANKING_SOURCE_KEYS = new Set();
    const STATE = {
      colaboradores: [{id: 'antigo', nome: 'Cache antigo', status: 'ativo'}],
      entregas: [], transferencias: [], trocas: [], campanhas: [], metasSnapshots: [],
      isAdmin: true, isOperator: false, authUser: null,
    };
    const FIREBASE_DB = {
      collection(nome) {
        if (nome !== 'reciclar-apac-public-ranking') throw new Error('Coleção inesperada: ' + nome);
        return {
          get: async () => ({docs: []}),
          doc: id => ({set: async documento => published.push({id, documento})}),
        };
      },
    };
    function podeEditarDados() { return true; }
    async function storageGet(chave) { reads.push(chave); return remote[chave]; }
    function mesAnoAtual() { return {mes: 10, ano: 2026}; }
    function chaveMA(mes, ano) { return ano + '-' + String(mes).padStart(2, '0'); }
    function todosMesesEntre(mes, ano) { return [{mes, ano}]; }
    function mesesComDados() { return []; }
    function categoriasDaCampanha() { return [{key: 'papel', label: 'Papel', unidade: 'unidades'}]; }
    function calcularResultadosMes() {
      return STATE.colaboradores.map(colaborador => ({
        colaborador, posicao: 1, pontuacao: 100, mediaReal: 100, totalMateriais: 1,
        totais: {papel: 1}, carryInsPorCategoria: {}, metasPorCategoria: {papel: 1},
      }));
    }
    const ReciclarRankingLogic = {
      deveIncluirNoRankingPublico: () => true,
      somarItensTrocados: () => 0,
    };
    function dataDentroDaCampanha() { return {ok: true}; }
    function serializarEstavel(valor) { return JSON.stringify(valor); }
    function renderApp() {}
    const remote = globalThis.remote;
    const reads = globalThis.reads;
    const published = globalThis.published;
  `, {filename: 'ranking-public-sync-setup.js'}).runInContext(sandbox);
  new vm.Script(authSource, {filename: 'js/auth.js'}).runInContext(sandbox);
  new vm.Script('globalThis.executarSync = sincronizarRankingsPublicos; globalThis.estado = STATE;').runInContext(sandbox);

  await sandbox.executarSync();

  assert.deepEqual(reads, ['colaboradores', 'entregas', 'transferencias', 'trocas', 'campanhas', 'metas']);
  assert.equal(sandbox.estado.colaboradores[0].nome, 'Ana Remota');
  assert.equal(published.length, 1);
  assert.equal(published[0].documento.ranking[0].nome, 'Ana Remota');
  assert.equal(published[0].documento.campanhaNome, 'Campanha remota');
});
