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
