const test = require('node:test');
const assert = require('node:assert/strict');
const {chaveFechamento,encontrarFechamento,calcularSaldoTransportavel,decisaoValida}=require('../monthly-close-logic.js');

test('gera identificador estável e isolado por campanha, mês, ano e colaborador',()=>{
  const id=chaveFechamento('campanha A',3,2026,'colaborador/1');
  assert.equal(id,'fechamento_campanha%20A_2026-03_colaborador%2F1');
  assert.notEqual(id,chaveFechamento('campanha B',3,2026,'colaborador/1'));
  assert.notEqual(id,chaveFechamento('campanha A',4,2026,'colaborador/1'));
  assert.notEqual(id,chaveFechamento('campanha A',3,2026,'colaborador/2'));
});
test('localiza decisão somente para a mesma campanha, colaborador e competência',()=>{
  const registros=[{campanhaId:'c1',mes:3,ano:2026,colaboradorId:'p1',decisao:'meia-folga'},{campanhaId:'c2',mes:3,ano:2026,colaboradorId:'p1',decisao:'zerar'}];
  assert.equal(encontrarFechamento(registros,'c1',3,2026,'p1').decisao,'meia-folga');
  assert.equal(encontrarFechamento(registros,'c1',4,2026,'p1'),null);
  assert.equal(encontrarFechamento(registros,'c1',3,2026,'p2'),null);
});
test('meia folga transporta o saldo remanescente e zerar descarta apenas o saldo',()=>{
  assert.equal(calcularSaldoTransportavel(37,'meia-folga',false,0),37);
  assert.equal(calcularSaldoTransportavel(0,'meia-folga',false,0),0);
  assert.equal(calcularSaldoTransportavel(37,'zerar',false,0),0);
  assert.equal(calcularSaldoTransportavel(-2,'meia-folga',false,0),0);
});
test('preserva o transporte automático do excedente quando todas as metas são atingidas',()=>{
  assert.equal(calcularSaldoTransportavel(120,'zerar',true,20),20);
  assert.equal(calcularSaldoTransportavel(120,'meia-folga',true,20),20);
});
test('sem decisão administrativa, mantém o cálculo automático anterior',()=>{
  assert.equal(calcularSaldoTransportavel(120,null,false,40),40);
  assert.equal(calcularSaldoTransportavel(70,null,false,0),0);
});
test('somente as duas decisões administrativas conhecidas são aceitas',()=>{
  assert.equal(decisaoValida('meia-folga'),true);
  assert.equal(decisaoValida('zerar'),true);
  assert.equal(decisaoValida('transferir'),false);
  assert.equal(decisaoValida(''),false);
});
