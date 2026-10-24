const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'transfers-exchange.js'), 'utf8');
const helperMatch = source.match(/function montarTransferenciasSolicitacaoPublica\([\s\S]*?\n}\n/);

test('troca pública debita e credita a mesma categoria em cada perna da transferência', () => {
  assert.ok(helperMatch, 'o construtor das transferências da troca pública deve existir');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(helperMatch[0] + '\nglobalThis.montar = montarTransferenciasSolicitacaoPublica;', sandbox);

  const transferencias = sandbox.montar(
    {id: 'pedido-1', quantidadeOrigem: 10, quantidadeDestino: 5},
    'campanha-1',
    '2026-10-23',
    {id: 'ana'},
    {id: 'bia'},
    {key: 'papelao'},
    {key: 'latinhas'},
    'transferencia-1',
    'transferencia-2',
    123
  );

  assert.deepEqual(JSON.parse(JSON.stringify(transferencias)), [
    {
      id: 'transferencia-1',
      campanhaId: 'campanha-1',
      data: '2026-10-23',
      colaboradorOrigemId: 'ana',
      categoriaOrigem: 'papelao',
      colaboradorDestinoId: 'bia',
      categoriaDestino: 'papelao',
      quantidade: 10,
      motivo: 'Troca aprovada a partir da solicitação pública pedido-1',
      criadoEm: 123,
    },
    {
      id: 'transferencia-2',
      campanhaId: 'campanha-1',
      data: '2026-10-23',
      colaboradorOrigemId: 'bia',
      categoriaOrigem: 'latinhas',
      colaboradorDestinoId: 'ana',
      categoriaDestino: 'latinhas',
      quantidade: 5,
      motivo: 'Troca aprovada a partir da solicitação pública pedido-1',
      criadoEm: 123,
    },
  ]);
  assert.match(source, /montarTransferenciasSolicitacaoPublica\(/, 'a aprovação deve usar o construtor testado');
});


test('o cálculo real de saldos reflete a troca nos dois colaboradores e nas duas categorias', () => {
  const core = fs.readFileSync(path.join(__dirname, '..', 'js', 'core.js'), 'utf8');
  const calcMatch = core.match(/function calcularSaldosAcumulados\\([\\s\\S]*?\\n}\\n/);
  const transfersMatch = core.match(/function transferenciasDoMes\\([\\s\\S]*?\\n}\\n/);
  assert.ok(calcMatch, 'o cálculo de saldos do app deve existir');
  assert.ok(transfersMatch, 'o filtro mensal de transferências do app deve existir');

  const sandbox = {
    STATE: {
      colaboradores: [{id: 'ana', nome: 'Ana'}, {id: 'bia', nome: 'Bia'}],
      entregas: [],
      transferencias: [],
      trocas: [],
    },
    ReciclarRankingLogic: {
      somarEntregasValidadas: () => 0,
      calcularSaldoMensal: (creditos, carryIn) => ({
        totalDisponivel: creditos + carryIn,
        leftover: Math.max(0, creditos + carryIn),
      }),
    },
    normalizarQuantidadeUnidades: value => value,
    todosMesesDaCampanhaAte: () => [{mes: 10, ano: 2026}],
    categoriasDaCampanha: () => [{key: 'papelao', metaDefault: 1000}, {key: 'latinhas', metaDefault: 1000}],
    campanhaPorId: () => ({id: 'campanha-1', anoInicio: 2026, mesInicio: 10}),
    getMetasDoMes: () => ({papelao: 1000, latinhas: 1000}),
    trocasDoMes: () => [],
    mesAnteriorDe: () => null,
    chaveMA: (mes, ano) => `${ano}-${String(mes).padStart(2, '0')}`,
  };
  vm.createContext(sandbox);
  vm.runInContext(transfersMatch[0] + '\\n' + calcMatch[0] +
    '\\nglobalThis.calcular = calcularSaldosAcumulados;', sandbox);

  const montarSandbox = {};
  vm.createContext(montarSandbox);
  vm.runInContext(helperMatch[0] + '\\nglobalThis.montar = montarTransferenciasSolicitacaoPublica;', montarSandbox);
  sandbox.STATE.transferencias = montarSandbox.montar(
    {id: 'pedido-1', quantidadeOrigem: 10, quantidadeDestino: 5},
    'campanha-1', '2026-10-23',
    {id: 'ana'}, {id: 'bia'},
    {key: 'papelao'}, {key: 'latinhas'},
    'transferencia-1', 'transferencia-2', 123
  );

  const saldos = sandbox.calcular('campanha-1', 10, 2026);
  assert.equal(saldos.ana.papelao['2026-10'].creditos, -10);
  assert.equal(saldos.bia.papelao['2026-10'].creditos, 10);
  assert.equal(saldos.bia.latinhas['2026-10'].creditos, -5);
  assert.equal(saldos.ana.latinhas['2026-10'].creditos, 5);
});
