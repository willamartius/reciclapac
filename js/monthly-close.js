/* ---------- FECHAMENTO MENSAL EM LOTE ---------- */
let fechamentoMensalSelecionados=[];
function abrirFechamentoMensal(){
  if(!exigirAdmin()) return;
  const campanhaId=STATE.campanhaSelecionadaId;
  const campanha=campanhaPorId(campanhaId);
  if(!campanha){mostrarErroOperacao('Selecione uma campanha antes de fechar o mês.');return;}
  const mes=Number(STATE.rankMes),ano=Number(STATE.rankAno),periodo=ano*12+mes;
  const inicio=Number(campanha.anoInicio)*12+Number(campanha.mesInicio);
  const fim=campanha.anoFim?Number(campanha.anoFim)*12+Number(campanha.mesFim):Infinity;
  const atual=mesAnoAtual();
  if(!Number.isInteger(mes)||mes<1||mes>12||!Number.isInteger(ano)||periodo<inicio||periodo>fim||periodo>=atual.ano*12+atual.mes){
    mostrarErroOperacao('Escolha um mês encerrado e dentro do período da campanha.');return;
  }
  const categorias=categoriasDaCampanha(campanha);
  const resultados=calcularResultadosMes(campanhaId,mes,ano)
    .filter(resultado=>!resultado.metaAtingida&&resultado.colaborador.status!=='desligado')
    .map(resultado=>({...resultado,categoriasPendentes:ReciclarFechamentoLogic.listarCategoriasPendentes(categorias,resultado.totais,resultado.metasPorCategoria)}))
    .filter(resultado=>resultado.categoriasPendentes.length>0);
  if(!resultados.length){
    abrirModal(`<div class="modal-head"><h3>Fechamento mensal</h3><button class="modal-close" type="button" onclick="fecharModal()" aria-label="Fechar">${icon('x')}</button></div>
      <p>Todos os colaboradores ativos atingiram as metas neste período, ou não há participantes cadastrados para ele.</p>
      <p class="small-note">O excedente de quem atingiu todas as metas continua sendo transportado automaticamente.</p>
      <div class="modal-actions"><button class="btn btn-outline btn-block" type="button" onclick="fecharModal()">Fechar</button></div>`);
    return;
  }
  fechamentoMensalSelecionados=resultados.map(r=>r.colaborador.id);
  const linhas=resultados.map(resultado=>{
    const id=resultado.colaborador.id;
    const existente=ReciclarFechamentoLogic.encontrarFechamento(STATE.fechamentosMensais,campanhaId,mes,ano,id);
    const status=existente?(existente.decisao==='meia-folga'?'Meia folga registrada':'Saldo zerado'):'Ainda não fechado';
    const historico=Array.isArray(existente&&existente.historico)?existente.historico.length:0;
    const resumo=resultado.categoriasPendentes.map(cat=>`${cat.label.split(' (')[0]}: ${cat.quantidade.toLocaleString('pt-BR')} / ${cat.meta.toLocaleString('pt-BR')}`).join(' · ');
    return `<label style="display:flex;gap:12px;align-items:flex-start;padding:12px;border-bottom:1px solid var(--borda);cursor:pointer;">
      <input class="fechamento-mensal-selecao" type="checkbox" value="${escapeHtml(id)}" checked onchange="atualizarSelecaoFechamentoMensal()" style="margin-top:4px;">
      <span style="flex:1;min-width:0;"><strong style="display:block;">${escapeHtml(resultado.colaborador.nome)}</strong>
      <small class="small-note">${escapeHtml(status)}${historico?` · ${historico} decisão(ões) no histórico`:''}</small>
      <small class="small-note" style="display:block;">${escapeHtml(resumo)}</small></span>
    </label>`;
  }).join('');
  abrirModal(`<div class="modal-head"><h3>Fechamento mensal · ${escapeHtml(MESES_PT[mes-1])} de ${ano}</h3><button class="modal-close" type="button" onclick="fecharModal()" aria-label="Fechar">${icon('x')}</button></div>
    <p class="small-note">Selecione os colaboradores que não atingiram todas as metas. Quem atingiu continua com o excedente transferido automaticamente.</p>
    <label style="display:flex;gap:9px;align-items:center;margin:12px 0;"><input id="fechamentoSelecionarTodos" type="checkbox" checked onchange="selecionarTodosFechamentoMensal(this.checked)">Selecionar todos</label>
    <div style="max-height:48vh;overflow:auto;border:1px solid var(--borda);border-radius:10px;">${linhas}</div>
    <p id="fechamentoSelecaoResumo" class="small-note" role="status" aria-live="polite" style="margin:10px 0;">${resultados.length} selecionados</p>
    <div class="modal-actions" style="display:grid;grid-template-columns:1fr;gap:8px;">
      <button id="fechamentoAcaoMeiaFolga" class="btn btn-primary btn-block" type="button" onclick="confirmarFechamentoMensal('meia-folga')">Transferir saldo e conceder meia folga</button>
      <button id="fechamentoAcaoZerar" class="btn btn-danger btn-block" type="button" onclick="confirmarFechamentoMensal('zerar')">Zerar saldo para o próximo mês</button>
    </div>`);
  atualizarSelecaoFechamentoMensal();
}
function idsSelecionadosFechamentoMensal(){
  return [...document.querySelectorAll('#modalOverlay .fechamento-mensal-selecao:checked')].map(input=>input.value);
}
function selecionarTodosFechamentoMensal(checked){
  document.querySelectorAll('#modalOverlay .fechamento-mensal-selecao').forEach(input=>{input.checked=!!checked;});
  atualizarSelecaoFechamentoMensal();
}
function atualizarSelecaoFechamentoMensal(){
  const caixas=[...document.querySelectorAll('#modalOverlay .fechamento-mensal-selecao')];
  const selecionados=caixas.filter(input=>input.checked).length;
  const resumo=document.getElementById('fechamentoSelecaoResumo'),todos=document.getElementById('fechamentoSelecionarTodos');
  if(resumo) resumo.textContent=`${selecionados} de ${caixas.length} selecionados`;
  if(todos){todos.checked=caixas.length>0&&selecionados===caixas.length;todos.indeterminate=selecionados>0&&selecionados<caixas.length;}
  ['fechamentoAcaoMeiaFolga','fechamentoAcaoZerar'].forEach(id=>{const botao=document.getElementById(id);if(botao)botao.disabled=selecionados===0;});
}
function confirmarFechamentoMensal(decisao){
  if(!exigirAdmin()||!ReciclarFechamentoLogic.decisaoValida(decisao)) return;
  fechamentoMensalSelecionados=idsSelecionadosFechamentoMensal();
  if(!fechamentoMensalSelecionados.length){mostrarErroOperacao('Selecione pelo menos um colaborador.');return;}
  const acao=decisao==='meia-folga'?'transferir o saldo remanescente e conceder meia folga':'zerar o saldo remanescente para o próximo mês';
  abrirModal(`<div class="modal-head"><h3>Confirmar fechamento</h3><button class="modal-close" type="button" onclick="abrirFechamentoMensal()">${icon('x')}</button></div>
    <p>Confirma ${acao} para <b>${fechamentoMensalSelecionados.length}</b> colaborador(es) selecionado(s)?</p>
    <p class="small-note">As entregas e o histórico não serão apagados. Esta decisão poderá ser alterada depois, e os saldos dos meses seguintes serão recalculados.</p>
    <div class="modal-actions"><button class="btn btn-outline btn-block" type="button" onclick="abrirFechamentoMensal()">Voltar</button>
    <button class="btn btn-primary btn-block" type="button" onclick="aplicarFechamentoMensal('${decisao}')">Confirmar</button></div>`);
}
async function aplicarFechamentoMensal(decisao){
  if(!exigirAdmin()||!ReciclarFechamentoLogic.decisaoValida(decisao)) return;
  const ids=fechamentoMensalSelecionados.slice();
  if(!ids.length){mostrarErroOperacao('Selecione pelo menos um colaborador.');return;}
  const campanhaId=STATE.campanhaSelecionadaId,mes=Number(STATE.rankMes),ano=Number(STATE.rankAno);
  const resultados=calcularResultadosMes(campanhaId,mes,ano);
  const elegiveis=new Set(resultados.filter(r=>!r.metaAtingida&&r.colaborador.status!=='desligado').map(r=>r.colaborador.id));
  const aplicar=ids.filter(id=>elegiveis.has(id));
  if(!aplicar.length){mostrarErroOperacao('Nenhum dos colaboradores selecionados continua abaixo da meta. Atualize a tela e tente novamente.');return;}
  const anteriores=STATE.fechamentosMensais||[],proximos=anteriores.map(item=>({...item}));
  const agora=new Date().toISOString();
  aplicar.forEach(colaboradorId=>{
    const existente=ReciclarFechamentoLogic.encontrarFechamento(proximos,campanhaId,mes,ano,colaboradorId);
    const ator=STATE.authUser?STATE.authUser.uid:'';
    if(existente){
      const historico=Array.isArray(existente.historico)?existente.historico.slice():[];
      if(!historico.length && existente.decisao){
        historico.push({
          decisao:existente.decisao,
          decididoEm:existente.atualizadoEm||existente.criadoEm,
          decididoPor:existente.decididoPor||'',
        });
      }
      if(existente.decisao!==decisao || !historico.length){
        historico.push({decisao,decididoEm:agora,decididoPor:ator});
      }
      existente.historico=historico.slice(-100);
      existente.decisao=decisao;
      existente.atualizadoEm=agora;
      existente.decididoPor=ator;
    }else proximos.push({
      id:ReciclarFechamentoLogic.chaveFechamento(campanhaId,mes,ano,colaboradorId),
      campanhaId,mes,ano,colaboradorId,decisao,criadoEm:agora,atualizadoEm:agora,
      decididoPor:ator,
      historico:[{decisao,decididoEm:agora,decididoPor:ator}],
    });
  });
  STATE.fechamentosMensais=proximos;
  if(!await storageSet('fechamentos',proximos)){
    STATE.fechamentosMensais=anteriores;
    mostrarErroOperacao(formatarMensagemErroFirestore(STORAGE_ERRORS.get('fechamentos'),'Não foi possível salvar o fechamento mensal. Nenhuma decisão foi confirmada.'));
    return;
  }
  fechamentoMensalSelecionados=[];
  fecharModal();renderApp();
  abrirModal(`<div class="modal-head"><h3>Fechamento salvo</h3><button class="modal-close" type="button" onclick="fecharModal()">${icon('x')}</button></div>
    <p>${aplicar.length} decisão(ões) registrada(s) para ${escapeHtml(MESES_PT[mes-1])} de ${ano}.</p>
    <p class="small-note">${decisao==='meia-folga'?'Os saldos remanescentes serão transportados para o próximo mês e os colaboradores receberão meia folga.':'Os saldos remanescentes não serão transportados. Entregas e histórico permanecem intactos.'} Os meses seguintes serão recalculados nos saldos e rankings.</p>
    <div class="modal-actions"><button class="btn btn-primary btn-block" type="button" onclick="fecharModal()">Concluir</button></div>`);
}
window.abrirFechamentoMensal=abrirFechamentoMensal;
window.selecionarTodosFechamentoMensal=selecionarTodosFechamentoMensal;
window.atualizarSelecaoFechamentoMensal=atualizarSelecaoFechamentoMensal;
window.confirmarFechamentoMensal=confirmarFechamentoMensal;
window.aplicarFechamentoMensal=aplicarFechamentoMensal;
