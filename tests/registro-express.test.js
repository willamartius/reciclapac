const test = require('node:test');
const assert = require('node:assert/strict');
const {
  REGISTRO_EXPRESS_MATERIAIS,
  quantidadesFichaValidas,
  dataISORegistroExpressValida,
  montarEntregasDaFicha,
  montarHistoricoEntregasExpress,
} = require('../js/registro-express.js');

const ficha = {
  id: '123455',
  status: 'emitida',
  colaboradorId: 'colaborador-1',
  colaboradorNome: 'Colaborador Teste',
  campanhaId: 'campanha-1',
};

test('Registro Express mapeia as seis quantidades na ordem impressa e conserva o vínculo', () => {
  const registros = montarEntregasDaFicha({
    fichaId: ficha.id,
    ficha,
    data: '2026-10-15',
    quantidades: [1, 2, 3, 4, 5, 6],
    statusValidacao: 'pendente',
    responsavelContagem: '  Ana  ',
    observacoes: ' Conferido ',
    criadoEm: 123,
  });

  assert.equal(registros.length, 6);
  assert.deepEqual(registros.map(item => item.tipo), REGISTRO_EXPRESS_MATERIAIS.map(item => item.tipo));
  assert.deepEqual(registros.map(item => item.quantidade), [1, 2, 3, 4, 5, 6]);
  assert.ok(registros.every(item => item.fichaId === ficha.id));
  assert.ok(registros.every(item => item.entregaGrupoId === `${ficha.id}-papelao`));
  assert.equal(registros[0].id, `${ficha.id}-papelao`);
  assert.equal(registros[0].unidade, 'unidades');
  assert.equal(registros[0].responsavelContagem, 'Ana');
  assert.equal(registros[0].observacoes, 'Conferido');
});

test('quantidades aceitam somente seis inteiros de zero a 999', () => {
  assert.equal(quantidadesFichaValidas([0, 0, 0, 0, 0, 0]), true);
  assert.equal(quantidadesFichaValidas([999, 999, 999, 999, 999, 999]), true);
  assert.equal(quantidadesFichaValidas([1, 2, 3, 4, 5]), false);
  assert.equal(quantidadesFichaValidas([1, 2, 3, 4, 5, 1000]), false);
  assert.equal(quantidadesFichaValidas([1, 2, 3, 4, 5, 1.5]), false);
});

test('Registro Express rejeita data impossível, ficha terminal e status desconhecido', () => {
  assert.equal(dataISORegistroExpressValida('2026-10-15'), true);
  assert.equal(dataISORegistroExpressValida('2026-02-31'), false);
  assert.equal(dataISORegistroExpressValida('15/10/2026'), false);
  assert.throws(() => montarEntregasDaFicha({
    fichaId: ficha.id,
    ficha: { ...ficha, status: 'utilizada' },
    data: '2026-10-15',
    quantidades: [1, 2, 3, 4, 5, 6],
    statusValidacao: 'pendente',
  }), /não está disponível/);
  assert.throws(() => montarEntregasDaFicha({
    fichaId: ficha.id,
    ficha,
    data: '2026-10-15',
    quantidades: [1, 2, 3, 4, 5, 6],
    statusValidacao: 'desconhecido',
  }), /status de validação/);
});

test('Registro Express valida o calendário civil gregoriano e anos bissextos', () => {
  assert.equal(dataISORegistroExpressValida('2024-02-29'), true);
  assert.equal(dataISORegistroExpressValida('2000-02-29'), true);
  assert.equal(dataISORegistroExpressValida('1900-02-29'), false);
  assert.equal(dataISORegistroExpressValida('2026-02-29'), false);
  assert.equal(dataISORegistroExpressValida('2026-04-31'), false);
  assert.equal(dataISORegistroExpressValida('0000-01-01'), false);
});

test('histórico usa snapshot para as seis entregas e identifica exclusões e edições', () => {
  const snapshot = {
    id: '123455', status: 'utilizada', quantidades: [1, 2, 3, 4, 5, 6],
  };
  const atualizadas = [
    { id: '123455-papelao', tipo: 'papelao', quantidade: 99, statusValidacao: 'validado' },
    { id: '123455-latinhas', tipo: 'latinhas', quantidade: 8, statusValidacao: 'pendente' },
  ];
  const historico = montarHistoricoEntregasExpress(snapshot, atualizadas);

  assert.equal(historico.length, 6);
  assert.deepEqual(historico.map(item => item.quantidadeOriginal), [1, 2, 3, 4, 5, 6]);
  assert.equal(historico[0].quantidadeAtual, 99);
  assert.equal(historico[0].fichaId, snapshot.id);
  assert.equal(historico[0].entregaGrupoId, `${snapshot.id}-papelao`);
  assert.equal(historico[2].excluida, true);
  assert.equal(historico[2].quantidadeOriginal, 3);
});
