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
  function calcularSaldoTransportavel(totalDisponivel,meta,decisao,metaAtingida,saldoAutomatico,creditosMes,carryInDeMeiaFolga){
    const total=saldoNaoNegativo(totalDisponivel);
    const metaSegura=saldoNaoNegativo(meta);
    const creditos=saldoNaoNegativo(creditosMes);
    if(carryInDeMeiaFolga===true){
      // O saldo de uma meia folga anterior pode completar a meta, mas não pode
      // transformar a soma de dois meses em excedente. Só a produção do mês
      // atual acima da meta gera excedente válido.
      if(creditos>=metaSegura) return Math.max(0,creditos-metaSegura);
      if(metaAtingida) return 0;
      if(decisao==='zerar') return 0;
      // Se a meta continuar pendente, o restante restrito continua disponível
      // para compensá-la nos meses seguintes, sem virar excedente.
      return total;
    }
    if(metaAtingida || !DECISOES.has(decisao)) return saldoNaoNegativo(saldoAutomatico);
    if(decisao==='zerar') return 0;
    return total<metaSegura?total:Math.max(0,total-metaSegura);
  }
  function listarCategoriasPendentes(categorias,totais,metas){
    return (Array.isArray(categorias)?categorias:[]).map(cat=>({
      ...cat,
      quantidade:saldoNaoNegativo(totais&&totais[cat.key]),
      meta:saldoNaoNegativo(metas&&metas[cat.key]),
    })).filter(cat=>cat.meta>0 && cat.quantidade<cat.meta);
  }
  function decisaoValida(decisao){return DECISOES.has(decisao);}
  function fechamentoAtivo(fechamento){return !!fechamento&&decisaoValida(fechamento.decisao);}
  return {chaveFechamento,encontrarFechamento,calcularSaldoTransportavel,listarCategoriasPendentes,decisaoValida,fechamentoAtivo};
});
