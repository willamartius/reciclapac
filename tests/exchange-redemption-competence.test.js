const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const core = fs.readFileSync(path.join(__dirname, '..', 'js', 'core.js'), 'utf8');

function extrair(nome, proximo) {
  const inicio = core.indexOf('function ' + nome + '(');
  const fim = core.indexOf('\nfunction ' + proximo + '(', inicio);
  assert.ok(inicio >= 0 && fim > inicio, 'função ' + nome + ' deve existir');
  return core.slice(inicio, fim);
}

test('resgate na competência atual usa o próprio mês corrente', () => {
  const sandbox = {
    mesAnoAtual: () => ({mes: 11, ano: 2026}),
    chaveMA: (mes, ano) => ano + '-' + String(mes).padStart(2, '0'),
  };
  vm.createContext(sandbox);
  vm.runInContext(extrair('competenciaSaldoTroca', 'trocasDoMes') +
    '\nglobalThis.calcular = competenciaSaldoTroca;', sandbox);

  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.calcular('2026-11-17'))),
    {mes: 11, ano: 2026, chave: '2026-11'});
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.calcular('2026-12-03'))),
    {mes: 12, ano: 2026, chave: '2026-12'});
});

test('data de resgate mantém a competência do próprio mês', () => {
  const sandbox = {
    mesAnoAtual: () => ({mes: 11, ano: 2026}),
    chaveMA: (mes, ano) => ano + '-' + String(mes).padStart(2, '0'),
  };
  vm.createContext(sandbox);
  vm.runInContext(extrair('competenciaSaldoTroca', 'trocasDoMes') +
    '\nglobalThis.calcular = competenciaSaldoTroca;', sandbox);

  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.calcular('2026-10-28'))),
    {mes: 10, ano: 2026, chave: '2026-10'});
});

test('consumo do resgate é lançado na competência do saldo e mantém compatibilidade com registros antigos', () => {
  const sandbox = {
    STATE: {trocas: [
      {id: 'novo', campanhaId: 'c1', data: '2026-11-17', competencia: '2026-11'},
      {id: 'antigo', campanhaId: 'c1', data: '2026-10-28'},
      {id: 'outro', campanhaId: 'c2', data: '2026-11-17', competencia: '2026-10'},
    ]},
    chaveMA: (mes, ano) => ano + '-' + String(mes).padStart(2, '0'),
  };
  vm.createContext(sandbox);
  vm.runInContext(extrair('trocasDoMes', 'kitsDisponiveis') +
    '\nglobalThis.consultar = trocasDoMes;', sandbox);

  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.consultar('c1', 11, 2026)))
    .map(item => item.id), ['novo', 'antigo']);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.consultar('c1', 10, 2026))), []);
});

test('cálculo de novembro desconta resgate feito em novembro na própria competência', () => {
  const calc = extrair('calcularSaldosAcumulados', 'saldoDisponivelAntes');
  const trocas = extrair('trocasDoMes', 'kitsDisponiveis');
  const sandbox = {
    STATE: {
      colaboradores: [{id: 'marcilio', nome: 'Marcílio'}],
      entregas: [], transferencias: [],
      trocas: [{
        id: 'resgate-1', campanhaId: 'c1', colaboradorId: 'marcilio',
        data: '2026-11-17', competencia: '2026-10',
        kitConsumido: {papelao: 75, pet: 150},
      }],
      fechamentosMensais: [],
    },
    ReciclarFechamentoLogic: {
      encontrarFechamento: () => null,
      fechamentoAtivo: () => false,
      calcularSaldoTransportavel: (total, meta, decisao, atingida, automatico) => automatico,
    },
    ReciclarRankingLogic: {
      somarEntregasValidadas: (entregas, campanha, mes, ano, colaborador, categoria) =>
        categoria === 'papelao' ? 103 : 176,
      calcularSaldoMensal: (creditos, carryIn) => ({
        totalDisponivel: creditos + carryIn,
        leftover: Math.max(0, creditos + carryIn),
      }),
    },
    normalizarQuantidadeUnidades: value => value,
    todosMesesDaCampanhaAte: () => [{mes: 11, ano: 2026}],
    categoriasDaCampanha: () => [
      {key: 'papelao', metaDefault: 75},
      {key: 'pet', metaDefault: 150},
    ],
    campanhaPorId: () => ({id: 'c1', anoInicio: 2026, mesInicio: 10}),
    getMetasDoMes: () => ({papelao: 75, pet: 150}),
    transferenciasDoMes: () => [],
    mesAnteriorDe: () => null,
    chaveMA: (mes, ano) => ano + '-' + String(mes).padStart(2, '0'),
  };
  vm.createContext(sandbox);
  vm.runInContext(trocas + '\n' + calc +
    '\nglobalThis.calcular = calcularSaldosAcumulados;', sandbox);
  const saldos = sandbox.calcular('c1', 11, 2026);
  assert.equal(saldos.marcilio.papelao['2026-11'].totalDisponivel, 28);
  assert.equal(saldos.marcilio.pet['2026-11'].totalDisponivel, 26);
});


test('ranking público da campanha de resgate usa a mesma competência fechada do formulário no mês atual', () => {
  const auth = fs.readFileSync(path.join(__dirname, '..', 'js', 'auth.js'), 'utf8');
  assert.match(auth, /const competenciaRanking=cfgTroca&&chave===chaveMA\\(atual\\.mes,atual\\.ano\\)[\\s\\S]*?competenciaSaldoTroca\\(chave\\+'-01'\\)/);
  assert.match(auth, /calcularResultadosMes\\(campanha\\.id,competenciaRanking\\.mes,competenciaRanking\\.ano\\)/);
});
