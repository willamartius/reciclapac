(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  root.ReciclarFechamentoLogic=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const DECISOES=new Set(['meia-folga','zerar']);
  function chaveFechamento(campanhaId,mes,ano,colaboradorId){
    return `fechamento_${encodeURIComponent(String(campanhaId))}_${String(ano)}-${String(mes).padStart(2,'0')}_${encodeURIComponent(String(colaboradorId))}`;
  }
  function encontrarFechamento(fechamentos,campanhaId,mes,ano,colaboradorId){
    return (Array.isArray(fechamentos)?fechamentos:[]).find(item=>
      item && item.campanhaId===campanhaId && Number(item.mes)===Number(mes)
      && Number(item.ano)===Number(ano) && item.colaboradorId===colaboradorId
    )||null;
  }
  function saldoNaoNegativo(valor){
    const numero=Number(valor);
    return Number.isFinite(numero)?Math.max(0,numero):0;
  }
  function calcularSaldoTransportavel(totalDisponivel,decisao,metaAtingida,saldoAutomatico){
    if(metaAtingida || !DECISOES.has(decisao)) return saldoNaoNegativo(saldoAutomatico);
    return decisao==='meia-folga'?saldoNaoNegativo(totalDisponivel):0;
  }
  function decisaoValida(decisao){return DECISOES.has(decisao);}
  return {chaveFechamento,encontrarFechamento,calcularSaldoTransportavel,decisaoValida};
});
