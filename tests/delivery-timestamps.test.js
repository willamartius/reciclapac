const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  normalizarTimestampRegistro,
  ordenarEntregasPorRegistro,
  formatarDataHoraRegistro,
} = require('../js/delivery-timestamps.js');

test('normaliza timestamps numéricos, ISO, Date e Firestore', () => {
  const esperado = Date.parse('2026-09-19T17:32:00.000Z');
  assert.equal(normalizarTimestampRegistro(esperado), esperado);
  assert.equal(normalizarTimestampRegistro('2026-09-19T17:32:00.000Z'), esperado);
  assert.equal(normalizarTimestampRegistro(new Date(esperado)), esperado);
  assert.equal(normalizarTimestampRegistro({ seconds: 1790098320, nanoseconds: 0 }), 1790098320000);
  assert.equal(normalizarTimestampRegistro({ toDate: () => new Date(esperado) }), esperado);
  assert.equal(normalizarTimestampRegistro(null), null);
  assert.equal(normalizarTimestampRegistro('não é uma data'), null);
  assert.equal(normalizarTimestampRegistro({ seconds: NaN }), null);
});

test('ordena pelo registro no sistema, mesmo quando a data informada é mais antiga', () => {
  const entregas = [
    { id: 'ficha-antiga', data: '2026-09-15', criadoEm: Date.parse('2026-09-19T17:32:00Z') },
    { id: 'registro-recente', data: '2026-09-18', criadoEm: Date.parse('2026-09-20T12:00:00Z') },
    { id: 'registro-intermediario', data: '2026-09-19', criadoEm: Date.parse('2026-09-19T18:00:00Z') },
  ];
  assert.deepEqual(
    ordenarEntregasPorRegistro(entregas).map(entrega => entrega.id),
    ['registro-recente', 'registro-intermediario', 'ficha-antiga'],
  );
  assert.equal(entregas[0].data, '2026-09-15', 'a data original da ficha não deve ser alterada');
});

test('registros sem timestamp não recebem horários inventados e ficam após os datados', () => {
  const entregas = [
    { id: 'sem-hora-antigo', data: '2026-09-15' },
    { id: 'com-hora', data: '2026-09-14', criadoEm: 1790000000000 },
    { id: 'sem-hora-recente', data: '2026-09-18', criadoEm: 'timestamp inválido' },
  ];
  assert.deepEqual(
    ordenarEntregasPorRegistro(entregas).map(entrega => entrega.id),
    ['com-hora', 'sem-hora-recente', 'sem-hora-antigo'],
  );
  assert.equal(normalizarTimestampRegistro(entregas[0].criadoEm), null);
  assert.equal(formatarDataHoraRegistro(undefined), 'Horário não disponível');
});

test('formata data e horário sem descartar minutos', () => {
  const valor = Date.parse('2026-09-19T17:32:00Z');
  const formatado = formatarDataHoraRegistro(valor);
  assert.match(formatado, /19\/09\/2026/);
  assert.match(formatado, /\d{2}:32/);
});

test('edição de entrega preserva criadoEm e Registro Express mantém data e criadoEm separados', () => {
  const root = path.join(__dirname, '..');
  const auth = fs.readFileSync(path.join(root, 'js/auth.js'), 'utf8');
  const express = fs.readFileSync(path.join(root, 'js/registro-express.js'), 'utf8');
  assert.match(auth, /STATE\.entregas\[idx\]\s*=\s*\{\.\.\.STATE\.entregas\[idx\],\s*\.\.\.payload\}/);
  assert.match(auth, /STATE\.entregas\.push\(\{id:uid\(\),\s*criadoEm:Date\.now\(\),\s*\.\.\.payload\}\)/);
  assert.match(express, /function montarEntregasDaFicha\([\s\S]*?data, quantidades[\s\S]*?criadoEm = Date\.now\(\)/);
  assert.match(express, /\n\s*criadoEm,\n\s*data,/);
});
