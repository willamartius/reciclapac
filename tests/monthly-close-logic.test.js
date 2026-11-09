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
  assert.equal(calcularSaldoTransportavel(37,80,'meia-folga',false,0),37);
  assert.equal(calcularSaldoTransportavel(0,80,'meia-folga',false,0),0);
  assert.equal(calcularSaldoTransportavel(37,80,'zerar',false,0),0);
  assert.equal(calcularSaldoTransportavel(-2,80,'meia-folga',false,0),0);
});
test('transfere apenas o remanescente por categoria, sem duplicar a quantidade que cumpriu a meta',()=>{
  assert.equal(calcularSaldoTransportavel(120,100,'meia-folga',false,20),20);
  assert.equal(calcularSaldoTransportavel(70,100,'meia-folga',false,0),70);
});
test('preserva o transporte automático do excedente quando todas as metas são atingidas',()=>{
  assert.equal(calcularSaldoTransportavel(120,100,'zerar',true,20),20);
  assert.equal(calcularSaldoTransportavel(120,100,'meia-folga',true,20),20);
});
test('sem decisão administrativa, mantém o cálculo automático anterior',()=>{
  assert.equal(calcularSaldoTransportavel(120,100,null,false,40),40);
  assert.equal(calcularSaldoTransportavel(70,100,null,false,0),0);
});
test('somente as duas decisões administrativas conhecidas são aceitas',()=>{
  assert.equal(decisaoValida('meia-folga'),true);
  assert.equal(decisaoValida('zerar'),true);
  assert.equal(decisaoValida('transferir'),false);
  assert.equal(decisaoValida(''),false);
});

test('saldo de meia folga anterior completa a meta, mas não gera excedente pela soma de dois meses',()=>{
  assert.equal(calcularSaldoTransportavel(120,100,null,true,20,90,true),0);
  assert.equal(calcularSaldoTransportavel(90,100,'meia-folga',false,0,60,true),90);
  assert.equal(calcularSaldoTransportavel(90,100,'zerar',false,0,60,true),0);
});
test('somente a produção do mês atual acima da meta gera excedente após carry restrito',()=>{
  assert.equal(calcularSaldoTransportavel(140,100,null,true,40,110,true),10);
  assert.equal(calcularSaldoTransportavel(130,100,null,true,30,100,true),0);
});

test('carry restrito continua acumulado quando a meta ainda não foi alcançada',()=>{
  assert.equal(calcularSaldoTransportavel(90,100,null,false,0,60,true),90);
  assert.equal(calcularSaldoTransportavel(90,100,'meia-folga',false,0,60,true),90);
});
