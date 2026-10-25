const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const transfers = fs.readFileSync(path.join(root, 'js', 'transfers-exchange.js'), 'utf8');

function extractFunction(source, name) {
  const match = source.match(new RegExp('function ' + name + '\\([\\s\\S]*?\\n}\\n'));
  assert.ok(match, 'função ' + name + ' deve existir');
  return match[0];
}

test('saldo usado no formulário de resgate é o disponível no mês atual, não a soma de créditos históricos', () => {
  const helper = extractFunction(transfers, 'totaisAcumuladosColaborador');
  const sandbox = {
    mesAnoAtual: () => ({mes: 10, ano: 2026}),
    calcularSaldosAcumulados: () => ({
      colaborador1: {
        papelao: {
          '2026-09': {creditos: 8, totalDisponivel: 0, leftover: 0},
          '2026-10': {creditos: 2, totalDisponivel: 6, leftover: 0},
        },
        latinhas: {
          '2026-09': {creditos: 10, totalDisponivel: 0, leftover: 0},
          '2026-10': {creditos: 0, totalDisponivel: 4, leftover: 0},
        },
      },
    }),
    categoriasDaCampanha: () => [{key: 'papelao'}, {key: 'latinhas'}],
    campanhaPorId: () => ({id: 'campanha1'}),
    chaveMA: (mes, ano) => String(ano) + '-' + String(mes).padStart(2, '0'),
  };
  vm.createContext(sandbox);
  vm.runInContext(helper + '\\nglobalThis.calcularTotais = totaisAcumuladosColaborador;', sandbox);

  assert.deepEqual(
    JSON.parse(JSON.stringify(sandbox.calcularTotais('campanha1', 'colaborador1'))),
    {papelao: 6, latinhas: 4},
  );
});

test('ranking calcula kits disponíveis com os mesmos totais do período usados nos detalhes', () => {
  const ranking = extractFunction(transfers, 'renderTabelaRanking');
  assert.match(ranking, /kitsDisponiveis\\(campanha, r\\.totais\\)/);
  assert.doesNotMatch(ranking, /kitsDisponiveis\\(campanha, r\\.totaisAcumulados\\)/);
});

test('saldo disponível no formulário continua sendo calculado pela função central de saldo acumulado', () => {
  const helper = extractFunction(transfers, 'totaisAcumuladosColaborador');
  assert.match(helper, /calcularSaldosAcumulados\\(campanhaId, mes, ano\\)/);
  assert.match(helper, /\\[chaveAtual\\]\\?\\.totalDisponivel/);
});
