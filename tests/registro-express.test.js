const test = require('node:test');
const assert = require('node:assert/strict');
const {
  REGISTRO_EXPRESS_MATERIAIS,
  quantidadesFichaValidas,
  normalizarQuantidadeRegistroExpress,
  avancarEtapaRegistroExpress,
  etapaAnteriorRegistroExpress,
  dataCivilHojeISO,
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

test('fluxo guiado aceita Enter com valor válido, rejeita inválidos e preserva valores ao voltar', () => {
  assert.equal(normalizarQuantidadeRegistroExpress(''), null);
  assert.equal(normalizarQuantidadeRegistroExpress('-1'), null);
  assert.equal(normalizarQuantidadeRegistroExpress('1.5'), null);
  assert.equal(normalizarQuantidadeRegistroExpress('1000'), null);
  assert.equal(normalizarQuantidadeRegistroExpress('0'), 0);
  assert.equal(normalizarQuantidadeRegistroExpress('999'), 999);

  const vazio = Array(6).fill('');
  assert.equal(avancarEtapaRegistroExpress(1, vazio, '').ok, false);
  assert.equal(avancarEtapaRegistroExpress(1, vazio, '1000').ok, false);
  const etapa2 = avancarEtapaRegistroExpress(1, vazio, '12');
  assert.equal(etapa2.ok, true);
  assert.equal(etapa2.etapa, 2);
  assert.deepEqual(etapa2.quantidades, [12, '', '', '', '', '']);
  assert.equal(etapaAnteriorRegistroExpress(etapa2.etapa), 1);

  const etapa3 = avancarEtapaRegistroExpress(2, etapa2.quantidades, '7');
  assert.equal(etapa3.etapa, 3);
  assert.equal(etapa3.quantidades[0], 12);
  assert.equal(etapa3.quantidades[1], 7);
  let revisada = etapa3.quantidades.slice();
  revisada[0] = 15;
  assert.deepEqual(revisada, [15, 7, '', '', '', '']);

  let proxima = { etapa: 3, quantidades: revisada };
  for (let etapa = 3; etapa <= 6; etapa++) {
    proxima = avancarEtapaRegistroExpress(etapa, proxima.quantidades, '0');
    assert.equal(proxima.ok, true);
  }
  assert.equal(proxima.etapa, 7);
  assert.deepEqual(proxima.quantidades, [15, 7, 0, 0, 0, 0]);
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

test('quantidades zero são preservadas no fluxo, mas não geram entregas', () => {
  const registros = montarEntregasDaFicha({
    fichaId: ficha.id,
    ficha,
    data: '2026-10-15',
    quantidades: [0, 2, 0, 4, 0, 6],
    statusValidacao: 'pendente',
    responsavelContagem: 'Ana',
  });

  assert.deepEqual(registros.map(item => item.quantidade), [2, 4, 6]);
  assert.deepEqual(registros.map(item => item.tipo), [
    REGISTRO_EXPRESS_MATERIAIS[1].tipo,
    REGISTRO_EXPRESS_MATERIAIS[3].tipo,
    REGISTRO_EXPRESS_MATERIAIS[5].tipo,
  ]);
  assert.ok(registros.every(item => item.entregaGrupoId === `${ficha.id}-papelao`));
});

test('histórico não confunde quantidade zero com entrega excluída', () => {
  const snapshot = {
    id: ficha.id,
    status: 'utilizada',
    quantidades: [0, 2, 0, 4, 0, 6],
  };

  const historico = montarHistoricoEntregasExpress(snapshot, []);

  assert.equal(historico.length, 6);
  assert.deepEqual(historico.map(item => item.quantidadeOriginal), [0, 2, 0, 4, 0, 6]);
  assert.deepEqual(historico.map(item => item.excluida), [false, true, false, true, false, true]);
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

test('dataCivilHojeISO calcula data civil local sem avançar indevidamente no fuso noturno', () => {
  const noite = new Date(2026, 9, 16, 21, 30, 0); // 16 de outubro de 2026 às 21:30 local
  assert.equal(dataCivilHojeISO(noite), '2026-10-16');

  const viradaAno = new Date(2026, 11, 31, 23, 59, 0);
  assert.equal(dataCivilHojeISO(viradaAno), '2026-12-31');

  const bissexto = new Date(2024, 1, 29, 12, 0, 0);
  assert.equal(dataCivilHojeISO(bissexto), '2024-02-29');
});

test('dataISORegistroExpressValida valida rigorosamente todos os casos do calendário civil gregoriano', () => {
  // Casos mínimos exigidos
  assert.equal(dataISORegistroExpressValida('2024-02-29'), true); // Bissexto válido
  assert.equal(dataISORegistroExpressValida('2025-02-29'), false); // Não bissexto
  assert.equal(dataISORegistroExpressValida('2026-02-29'), false); // Não bissexto
  assert.equal(dataISORegistroExpressValida('2024-02-31'), false); // Dia inexistente
  assert.equal(dataISORegistroExpressValida('2024-04-30'), true); // Abril tem 30 dias
  assert.equal(dataISORegistroExpressValida('2024-04-31'), false); // Abril não tem 31 dias
  assert.equal(dataISORegistroExpressValida('2024-13-01'), false); // Mês 13 inválido
  assert.equal(dataISORegistroExpressValida('2024-00-10'), false); // Mês 0 inválido
  assert.equal(dataISORegistroExpressValida('2026-10-15'), true);
  assert.equal(dataISORegistroExpressValida('invalid-date'), false);
  assert.equal(dataISORegistroExpressValida(''), false);
});
