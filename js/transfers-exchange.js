/* ---------- TRANSFERÊNCIAS ENTRE COLABORADORES / CATEGORIAS ---------- */
function abrirFormTransferencia(){
  if(!exigirOperador()) return;
  if(STATE.colaboradores.length===0){ alert('Cadastre ao menos um colaborador antes de transferir material.'); return; }
  const campanha = campanhaPorId(STATE.campanhaSelecionadaId);
  const opcoesColab = STATE.colaboradores.map(c=>`<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('');
  const opcoesCategoria = categoriasDaCampanha(campanha).map(c=>`<option value="${c.key}">${escapeHtml(c.label.split(' (')[0])}</option>`).join('');
  abrirModal(`
    <div class="modal-head"><h3>Transferir material</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <div class="banner" style="margin-bottom:14px;"><span>${icon('ranking')}</span><div>Campanha: <b>${escapeHtml(campanha?campanha.nome:'—')}</b></div></div>
    <p class="small-note" style="margin-top:-6px;">Move o crédito de material entre colaboradores, entre categorias, ou os dois ao mesmo tempo. Por exemplo, trocar latinhas por embalagens plásticas do mesmo colaborador, ou passar parte da meta de um colaborador para outro, com autorização administrativa.</p>
    <div class="field"><label>Data da transferência</label><input type="date" id="tData" value="${new Date().toISOString().slice(0,10)}" onchange="atualizarSaldoTransferencia()"></div>
    <div class="section-title" style="margin:16px 0 8px 0;font-size:13.5px;">De (origem)</div>
    <div class="grid grid-2">
      <div class="field"><label>Colaborador</label><select id="tColabOrigem" onchange="atualizarSaldoTransferencia()">${opcoesColab}</select></div>
      <div class="field"><label>Categoria</label><select id="tCategoriaOrigem" onchange="atualizarSaldoTransferencia()">${opcoesCategoria}</select></div>
    </div>
    <div class="small-note" id="saldoOrigemInfo" style="margin:-6px 0 14px 0;">—</div>
    <div class="section-title" style="margin:0 0 8px 0;font-size:13.5px;">Para (destino)</div>
    <div class="field"><label>Campanha de destino</label><select id="tCampanhaDestino" onchange="atualizarCategoriasDestinoTransferencia()">${STATE.campanhas.slice().sort((a,b)=>(a.id===campanha?.id?-1:0)-(b.id===campanha?.id?-1:0)).map(c=>`<option value="${c.id}">${escapeHtml(c.nome)}${c.id===campanha?.id?' (atual)':''}</option>`).join('')}</select></div>
    <div class="grid grid-2">
      <div class="field"><label>Colaborador</label><select id="tColabDestino">${opcoesColab}</select></div>
      <div class="field"><label>Categoria</label><select id="tCategoriaDestino">${opcoesCategoria}</select></div>
    </div>
    <div class="field"><label>Quantidade (unidades equivalentes)</label><input type="number" min="0" step="1" id="tQuantidade" oninput="atualizarSaldoTransferencia()"></div>
    <div class="field"><label>Motivo / observação</label><input type="text" id="tMotivo" placeholder="Ex: acordo entre colaboradores, correção de lançamento"></div>
    <div id="transfErro" style="color:var(--vermelho);font-size:12.5px;display:none;margin-bottom:8px;"></div>
    <div class="modal-actions">
      <button class="btn btn-outline btn-block" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary btn-block" onclick="salvarTransferencia()">${icon('check',16)}Transferir</button>
    </div>
  `);
  setTimeout(atualizarSaldoTransferencia, 30);
}
function atualizarSaldoTransferencia(){
  const dataEl = document.getElementById('tData');
  const colabEl = document.getElementById('tColabOrigem');
  const catEl = document.getElementById('tCategoriaOrigem');
  const info = document.getElementById('saldoOrigemInfo');
  if(!dataEl || !colabEl || !catEl || !info) return;
  const data = dataEl.value; if(!data) return;
  const mes = +data.slice(5,7), ano = +data.slice(0,4);
  const saldo = saldoDisponivelAntes(STATE.campanhaSelecionadaId, colabEl.value, catEl.value, mes, ano);
  const cat = resolverCategoria(STATE.campanhaSelecionadaId, catEl.value);
  info.innerHTML = `Saldo disponível deste colaborador em ${escapeHtml(cat?cat.label.split(' (')[0]:'')} até ${nomeMes(mes)}/${ano}: <b>${saldo.toFixed(0)}</b> unidades equivalentes.`;
}
window.atualizarSaldoTransferencia = atualizarSaldoTransferencia;
function atualizarCategoriasDestinoTransferencia(){
  const campanhaEl=document.getElementById('tCampanhaDestino');
  const catEl=document.getElementById('tCategoriaDestino');
  if(!campanhaEl||!catEl) return;
  const anterior=catEl.value;
  catEl.innerHTML=categoriasDaCampanha(campanhaPorId(campanhaEl.value)).map(c=>`<option value="${c.key}">${escapeHtml(c.label.split(' (')[0])}</option>`).join('');
  if([...catEl.options].some(o=>o.value===anterior)) catEl.value=anterior;
}
window.atualizarCategoriasDestinoTransferencia = atualizarCategoriasDestinoTransferencia;
async function salvarTransferencia(){
  if(!exigirOperador()) return;
  const anteriores=STATE.transferencias.map(t=>({...t}));
  const data = document.getElementById('tData').value;
  const colaboradorOrigemId = document.getElementById('tColabOrigem').value;
  const categoriaOrigem = document.getElementById('tCategoriaOrigem').value;
  const colaboradorDestinoId = document.getElementById('tColabDestino').value;
  const categoriaDestino = document.getElementById('tCategoriaDestino').value;
  const quantidade = parseFloat(document.getElementById('tQuantidade').value);
  const motivo = document.getElementById('tMotivo').value.trim();
  const erroEl = document.getElementById('transfErro');
  erroEl.style.display='none';
  if(!data || !colaboradorOrigemId || !colaboradorDestinoId || !Number.isFinite(quantidade) || quantidade<=0){
    erroEl.textContent = 'Preencha data, colaboradores e uma quantidade maior que zero.'; erroEl.style.display='block'; return;
  }
  if(!ReciclarRankingLogic.quantidadeUnitariaValida(quantidade,false)){
    erroEl.textContent = 'A quantidade transferida precisa ser um número inteiro de unidades.'; erroEl.style.display='block'; return;
  }
  const campanhaDestinoId = document.getElementById('tCampanhaDestino').value;
  const entreCampanhas = campanhaDestinoId!==STATE.campanhaSelecionadaId;
  if(!entreCampanhas && colaboradorOrigemId===colaboradorDestinoId && categoriaOrigem===categoriaDestino){
    erroEl.textContent = 'Origem e destino são iguais. Escolha um colaborador ou categoria diferente para o destino.'; erroEl.style.display='block'; return;
  }
  const validacaoData = dataDentroDaCampanha(STATE.campanhaSelecionadaId, data);
  if(!validacaoData.ok){ erroEl.textContent = validacaoData.motivo; erroEl.style.display='block'; return; }
  if(entreCampanhas){
    const validacaoDestino = dataDentroDaCampanha(campanhaDestinoId, data);
    if(!validacaoDestino.ok){ erroEl.textContent = `Campanha de destino: ${validacaoDestino.motivo}`; erroEl.style.display='block'; return; }
  }
  const mes = +data.slice(5,7), ano = +data.slice(0,4);
  const campanhaId = STATE.campanhaSelecionadaId;
  const saldoAtual = saldoDisponivelAntes(campanhaId, colaboradorOrigemId, categoriaOrigem, mes, ano);
  if(quantidade > saldoAtual){
    erroEl.textContent = `Quantidade maior que o saldo disponível na origem (${saldoAtual.toFixed(0)} unidades equivalentes até este mês).`; erroEl.style.display='block'; return;
  }
  if(entreCampanhas){
    const vinculoId=uid();
    STATE.transferencias.push({
      id:uid(), campanhaId, data, colaboradorOrigemId, categoriaOrigem, colaboradorDestinoId:'', categoriaDestino:'',
      quantidade, motivo, criadoEm:Date.now(), entreCampanhas:true, vinculoId, campanhaDestinoId, colaboradorDestinoNomeId:colaboradorDestinoId, categoriaDestinoRef:categoriaDestino
    },{
      id:uid(), campanhaId:campanhaDestinoId, data, colaboradorOrigemId:'', categoriaOrigem:'', colaboradorDestinoId, categoriaDestino,
      quantidade, motivo, criadoEm:Date.now(), entreCampanhas:true, vinculoId, campanhaOrigemId:campanhaId, colaboradorOrigemNomeId:colaboradorOrigemId, categoriaOrigemRef:categoriaOrigem
    });
  }else{
    STATE.transferencias.push({
      id:uid(), campanhaId, data, colaboradorOrigemId, categoriaOrigem, colaboradorDestinoId, categoriaDestino,
      quantidade, motivo, criadoEm:Date.now()
    });
  }
  try{
    await garantirSnapshotMetas(campanhaId, mes,ano);
    if(entreCampanhas) await garantirSnapshotMetas(campanhaDestinoId, mes,ano);
    if(!await salvarTransferencias()) throw new Error('O Firebase recusou a gravação.');
  }catch(e){
    STATE.transferencias=anteriores;
    console.error('Erro ao salvar transferência',e);
    alert(e.message || 'Não foi possível salvar a transferência. Atualize a página e tente novamente.');
    return;
  }
  fecharModal(); renderApp();
}
function obterSolicitacoesTroca(){
  if(!STATE.isAdmin || !FIREBASE_DB || !STATE.authUser) return;
  if(solicitacoesTrocaUnsubscribe && solicitacoesTrocaListenerUid===STATE.authUser.uid) return;
  if(solicitacoesTrocaUnsubscribe) solicitacoesTrocaUnsubscribe();
  solicitacoesTrocaListenerUid=STATE.authUser.uid;
  const uidObservado=STATE.authUser.uid;
  STATE.solicitacoesTrocaPublicas=[];
  STATE.solicitacoesTrocaError='';
  solicitacoesTrocaUnsubscribe=FIREBASE_DB.collection(SOLICITACAO_TROCA_COLLECTION)
    .where('status','==','pendente')
    .onSnapshot(snapshot=>{
      if(!STATE.isAdmin || !STATE.authUser || STATE.authUser.uid!==uidObservado) return;
      try{
        STATE.solicitacoesTrocaPublicas=snapshot.docs.map(documento=>{
          const pedido=documento.data();
          const textos=['id','campanhaId','campanhaNome','colaboradorOrigemId','colaboradorOrigemNome',
            'categoriaOrigem','materialOrigemNome','colaboradorDestinoId','colaboradorDestinoNome',
            'categoriaDestino','materialDestinoNome','status'];
          if(!pedido || textos.some(campo=>typeof pedido[campo]!=='string' || !pedido[campo].trim())
            || pedido.id!==documento.id || pedido.status!=='pendente'
            || pedido.colaboradorOrigemId===pedido.colaboradorDestinoId
            || pedido.categoriaOrigem===pedido.categoriaDestino
            || !Number.isSafeInteger(pedido.quantidadeOrigem) || pedido.quantidadeOrigem<=0
            || !Number.isSafeInteger(pedido.quantidadeDestino) || pedido.quantidadeDestino<=0
            || !pedido.solicitadoEm || typeof pedido.solicitadoEm.toDate!=='function'
            || !Number.isFinite(pedido.solicitadoEm.toMillis())){
            throw new Error('Uma solicitação de troca salva tem formato inválido. Verifique o documento no Firestore.');
          }
          return pedido;
        }).sort((a,b)=>b.solicitadoEm.toMillis()-a.solicitadoEm.toMillis());
        STATE.solicitacoesTrocaError='';
      }catch(erro){
        console.error('Erro ao interpretar solicitações de troca',erro);
        STATE.solicitacoesTrocaError=erro.message||'Não foi possível interpretar as solicitações de troca.';
      }
      renderApp();
      atualizarModalNotificacoesTroca();
    },erro=>{
      if(!STATE.isAdmin || !STATE.authUser || STATE.authUser.uid!==uidObservado) return;
      console.error('Erro ao observar solicitações de troca',erro);
      STATE.solicitacoesTrocaError='Não foi possível carregar as solicitações de troca. Verifique as regras do Firestore.';
      renderApp();
      atualizarModalNotificacoesTroca();
    });
}
function pararObservacaoSolicitacoesTroca(){
  if(solicitacoesTrocaUnsubscribe) solicitacoesTrocaUnsubscribe();
  solicitacoesTrocaUnsubscribe=null;
  solicitacoesTrocaListenerUid='';
  STATE.solicitacoesTrocaPublicas=[];
  STATE.solicitacoesTrocaError='';
  STATE.solicitacaoTrocaBusyId='';
}
function obterConfigSenhaSolicitacaoTroca(){
  if(!STATE.isAdmin || !FIREBASE_DB || !STATE.authUser) return;
  if(senhaSolicitacaoTrocaUnsubscribe) return;
  senhaSolicitacaoTrocaUnsubscribe=FIREBASE_DB.collection(PUBLIC_SETTINGS_COLLECTION).doc(SENHA_SOLICITACAO_TROCA_DOC)
    .onSnapshot(documento=>{
      const dados=documento.exists?documento.data():null;
      STATE.senhaSolicitacaoTroca=(dados && typeof dados.senha==='string')?dados.senha:'';
      STATE.senhaSolicitacaoTrocaCarregada=true;
      renderApp();
    },erro=>{
      console.error('Erro ao observar a senha de solicitação de troca',erro);
      STATE.senhaSolicitacaoTrocaCarregada=true;
      renderApp();
    });
}
function pararObservacaoConfigSenhaSolicitacaoTroca(){
  if(senhaSolicitacaoTrocaUnsubscribe) senhaSolicitacaoTrocaUnsubscribe();
  senhaSolicitacaoTrocaUnsubscribe=null;
  STATE.senhaSolicitacaoTroca='';
  STATE.senhaSolicitacaoTrocaCarregada=false;
}
window.obterConfigSenhaSolicitacaoTroca=obterConfigSenhaSolicitacaoTroca;
window.pararObservacaoConfigSenhaSolicitacaoTroca=pararObservacaoConfigSenhaSolicitacaoTroca;
function verificarRegistrosTransacionais(key,remotos,filtro){
  let locais;
  if(key==='colaboradores') locais=STATE.colaboradores;
  else if(key==='entregas') locais=STATE.entregas;
  else if(key==='transferencias') locais=STATE.transferencias;
  else if(key==='trocas') locais=STATE.trocas;
  else if(key==='campanhas') locais=STATE.campanhas;
  else if(key==='metas') locais=STATE.metasSnapshots;
  else throw new Error(`Coleção inesperada na validação da troca: ${key}.`);
  const locaisRelevantes=new Map(locais.filter(filtro).map(registro=>[registro.id,serializarEstavel(registro)]));
  const remotosRelevantes=new Map(remotos.filter(filtro).map(registro=>[registro.id,serializarEstavel(registro)]));
  if(locaisRelevantes.size!==remotosRelevantes.size
    || [...locaisRelevantes].some(([id,valor])=>remotosRelevantes.get(id)!==valor)){
    throw new Error('Os dados envolvidos nesta troca mudaram desde que o painel foi carregado. Atualize a página e revise o pedido.');
  }
}
function montarTransferenciasSolicitacaoPublica(pedido,campanhaId,data,origem,destino,materialOrigem,materialDestino,origemParaDestinoId,destinoParaOrigemId,criadoEm=Date.now()){
  const motivo=`Troca aprovada a partir da solicitação pública ${pedido.id}`;
  return [
    {
      id:origemParaDestinoId,
      campanhaId,
      data,
      colaboradorOrigemId:origem.id,
      categoriaOrigem:materialOrigem.key,
      colaboradorDestinoId:destino.id,
      categoriaDestino:materialOrigem.key,
      quantidade:pedido.quantidadeOrigem,
      motivo,
      criadoEm,
    },
    {
      id:destinoParaOrigemId,
      campanhaId,
      data,
      colaboradorOrigemId:destino.id,
      categoriaOrigem:materialDestino.key,
      colaboradorDestinoId:origem.id,
      categoriaDestino:materialDestino.key,
      quantidade:pedido.quantidadeDestino,
      motivo,
      criadoEm,
    },
  ];
}
async function consultarRegistrosTrocaTransacional(campanhaId,participanteIds){
  const raiz=FIREBASE_DB.collection('reciclar-apac');
  const registros=key=>raiz.doc(key).collection('records');
  const [entregas,transferenciasOrigem,transferenciasDestino,trocas,metas]=await Promise.all([
    registros('entregas').where('colaboradorId','in',participanteIds).get(),
    registros('transferencias').where('colaboradorOrigemId','in',participanteIds).get(),
    registros('transferencias').where('colaboradorDestinoId','in',participanteIds).get(),
    registros('trocas').where('colaboradorId','in',participanteIds).get(),
    registros('metas').where('campanhaId','==',campanhaId).get(),
  ]);
  return {entregas,transferenciasOrigem,transferenciasDestino,trocas,metas};
}
async function carregarEstadoTrocaTransacional(transacao,campanhaId,participanteIds,consultas){
  const raiz=FIREBASE_DB.collection('reciclar-apac');
  const registros=key=>raiz.doc(key).collection('records');
  const campanhaRef=registros('campanhas').doc(campanhaId);
  const [origemDoc,destinoDoc,campanhaDoc,...documentosConsultados]=await Promise.all([
    transacao.get(registros('colaboradores').doc(participanteIds[0])),
    transacao.get(registros('colaboradores').doc(participanteIds[1])),
    transacao.get(campanhaRef),
    ...[
      ...consultas.entregas.docs,
      ...consultas.transferenciasOrigem.docs,
      ...consultas.transferenciasDestino.docs,
      ...consultas.trocas.docs,
      ...consultas.metas.docs,
    ].map(documento=>transacao.get(documento.ref)),
  ]);
  if(!origemDoc.exists || !destinoDoc.exists || !campanhaDoc.exists){
    throw new Error('A campanha ou um dos colaboradores não está mais cadastrado. Atualize o painel.');
  }
  let indiceDocumento=0;
  const lerConsulta=consulta=>consulta.docs.map(()=>documentosConsultados[indiceDocumento++]).filter(documento=>documento.exists);
  const entregasSnapshot=lerConsulta(consultas.entregas);
  const transferenciasOrigemSnapshot=lerConsulta(consultas.transferenciasOrigem);
  const transferenciasDestinoSnapshot=lerConsulta(consultas.transferenciasDestino);
  const trocasSnapshot=lerConsulta(consultas.trocas);
  const metasSnapshot=lerConsulta(consultas.metas);
  const colaboradores=[origemDoc.data(),destinoDoc.data()];
  const entregas=entregasSnapshot.map(documento=>documento.data());
  const transferencias=[...new Map(
    [...transferenciasOrigemSnapshot,...transferenciasDestinoSnapshot]
      .map(documento=>[documento.id,documento.data()])
  ).values()];
  const trocas=trocasSnapshot.map(documento=>documento.data());
  const campanhas=[campanhaDoc.data()];
  const metas=metasSnapshot.map(documento=>documento.data());
  const participanteEnvolvido=registro=>participanteIds.includes(registro.colaboradorId)
    || participanteIds.includes(registro.colaboradorOrigemId)
    || participanteIds.includes(registro.colaboradorDestinoId);
  verificarRegistrosTransacionais('colaboradores',colaboradores,registro=>participanteIds.includes(registro.id));
  verificarRegistrosTransacionais('entregas',entregas,participanteEnvolvido);
  verificarRegistrosTransacionais('transferencias',transferencias,participanteEnvolvido);
  verificarRegistrosTransacionais('trocas',trocas,participanteEnvolvido);
  verificarRegistrosTransacionais('campanhas',campanhas,registro=>registro.id===campanhaId);
  verificarRegistrosTransacionais('metas',metas,registro=>registro.campanhaId===campanhaId);
  return {colaboradores,entregas,transferencias,trocas,campanhas,metas};
}
async function decidirSolicitacaoTroca(id,decisao){
  if(!exigirAdmin() || !['aprovada','rejeitada'].includes(decisao)) return;
  if(STATE.solicitacaoTrocaBusyId) return;
  const pedido=STATE.solicitacoesTrocaPublicas.find(item=>item.id===id);
  if(!pedido) return;
  STATE.solicitacaoTrocaBusyId=id;
  STATE.solicitacoesTrocaError='';
  atualizarModalNotificacoesTroca();
  try{
    const referencia=FIREBASE_DB.collection(SOLICITACAO_TROCA_COLLECTION).doc(id);
    const decididoEm=new Date().toISOString();
    let transferenciasAprovadas=[];
    if(decisao==='rejeitada'){
      await referencia.update({
        status:'rejeitada',
        decididoEm,
        decididoPor:STATE.authUser.uid,
        transferenciaIds:[],
      });
    }else{
      const campanha=campanhaPorId(pedido.campanhaId);
      const origem=STATE.colaboradores.find(colaborador=>colaborador.id===pedido.colaboradorOrigemId);
      const destino=STATE.colaboradores.find(colaborador=>colaborador.id===pedido.colaboradorDestinoId);
      const materialOrigem=campanha&&categoriasDaCampanha(campanha).find(categoria=>categoria.key===pedido.categoriaOrigem);
      const materialDestino=campanha&&categoriasDaCampanha(campanha).find(categoria=>categoria.key===pedido.categoriaDestino);
      if(!campanha || campanha.status!=='ativa' || !origem || origem.status==='desligado'
        || !destino || destino.status==='desligado' || origem.id===destino.id
        || !materialOrigem || !materialDestino || materialOrigem.key===materialDestino.key){
        throw new Error('A campanha, os colaboradores ou os materiais já não estão disponíveis. Rejeite a solicitação ou revise os cadastros.');
      }
      const data=new Date().toISOString().slice(0,10);
      const validacaoData=dataDentroDaCampanha(campanha.id,data);
      if(!validacaoData.ok) throw new Error(validacaoData.motivo);
      if(!Number.isSafeInteger(pedido.quantidadeOrigem) || pedido.quantidadeOrigem<=0
        || !Number.isSafeInteger(pedido.quantidadeDestino) || pedido.quantidadeDestino<=0){
        throw new Error('As quantidades desta solicitação são inválidas.');
      }
      const mes=Number(data.slice(5,7));
      const ano=Number(data.slice(0,4));
      const metaOriginal=[...STATE.metasSnapshots];
      try{
        await garantirSnapshotMetas(campanha.id,mes,ano);
      }catch(erro){
        STATE.metasSnapshots=metaOriginal;
        throw erro;
      }
      const consultasTroca=await consultarRegistrosTrocaTransacional(campanha.id,[origem.id,destino.id]);
      const transferenciasRef=FIREBASE_DB.collection('reciclar-apac').doc('transferencias').collection('records');
      const origemParaDestinoRef=transferenciasRef.doc();
      const destinoParaOrigemRef=transferenciasRef.doc();
      const [transferenciaOrigemParaDestino,transferenciaDestinoParaOrigem]=montarTransferenciasSolicitacaoPublica(
        pedido,campanha.id,data,origem,destino,materialOrigem,materialDestino,
        origemParaDestinoRef.id,destinoParaOrigemRef.id
      );
      await FIREBASE_DB.runTransaction(async transacao=>{
        const documento=await transacao.get(referencia);
        if(!documento.exists || documento.data().status!=='pendente'){
          throw new Error('Esta solicitação já foi decidida por outro administrador. Atualize a lista.');
        }
        if(serializarEstavel(documento.data())!==serializarEstavel(pedido)){
          throw new Error('A solicitação mudou desde que foi carregada. Atualize a página e tente novamente.');
        }
        const dadosAtuais=await carregarEstadoTrocaTransacional(transacao,campanha.id,[origem.id,destino.id],consultasTroca);
        const estadoAnterior={
          colaboradores:STATE.colaboradores,
          entregas:STATE.entregas,
          transferencias:STATE.transferencias,
          trocas:STATE.trocas,
          campanhas:STATE.campanhas,
          metasSnapshots:STATE.metasSnapshots,
        };
        try{
          STATE.colaboradores=dadosAtuais.colaboradores;
          STATE.entregas=dadosAtuais.entregas;
          STATE.transferencias=dadosAtuais.transferencias;
          STATE.trocas=dadosAtuais.trocas;
          STATE.campanhas=dadosAtuais.campanhas;
          STATE.metasSnapshots=dadosAtuais.metas;
          if(saldoDisponivelAntes(campanha.id,origem.id,materialOrigem.key,mes,ano)<pedido.quantidadeOrigem){
            throw new Error(`${origem.nome} não tem saldo suficiente de ${materialOrigem.label.split(' (')[0]} para concluir a troca.`);
          }
          if(saldoDisponivelAntes(campanha.id,destino.id,materialDestino.key,mes,ano)<pedido.quantidadeDestino){
            throw new Error(`${destino.nome} não tem saldo suficiente de ${materialDestino.label.split(' (')[0]} para concluir a troca.`);
          }
        }finally{
          Object.assign(STATE,estadoAnterior);
        }
        const transferenciaAtual=await transacao.get(origemParaDestinoRef);
        const transferenciaReversaAtual=await transacao.get(destinoParaOrigemRef);
        if(transferenciaAtual.exists || transferenciaReversaAtual.exists){
          throw new Error('Não foi possível reservar registros únicos para a troca. Tente novamente.');
        }
        transacao.set(origemParaDestinoRef,transferenciaOrigemParaDestino);
        transacao.set(destinoParaOrigemRef,transferenciaDestinoParaOrigem);
        transacao.update(referencia,{
          status:'aprovada',
          decididoEm,
          decididoPor:STATE.authUser.uid,
          transferenciaIds:[origemParaDestinoRef.id,destinoParaOrigemRef.id],
        });
      });
      transferenciasAprovadas=[transferenciaOrigemParaDestino,transferenciaDestinoParaOrigem];
      STATE.transferencias.push(...transferenciasAprovadas);
      const baseline=FIRESTORE_BASELINES.get('transferencias')||new Map();
      transferenciasAprovadas.forEach(transferencia=>baseline.set(transferencia.id,serializarEstavel(transferencia)));
      FIRESTORE_BASELINES.set('transferencias',baseline);
      agendarSincronizacaoRankingsPublicos('transferencias');
    }
    STATE.solicitacoesTrocaPublicas=STATE.solicitacoesTrocaPublicas.filter(item=>item.id!==id);
    renderApp();
  }catch(erro){
    console.error(`Erro ao ${decisao==='aprovada'?'aprovar':'rejeitar'} solicitação pública de troca`,erro);
    STATE.solicitacoesTrocaError=erro.message||'Não foi possível processar a solicitação de troca.';
  }finally{
    STATE.solicitacaoTrocaBusyId='';
    atualizarModalNotificacoesTroca();
    renderApp();
  }
}
window.decidirSolicitacaoTroca=decidirSolicitacaoTroca;
function confirmarExcluirTransferencia(id){
  if(!exigirAdmin()) return;
  abrirModal(`
    <div class="modal-head"><h3>Excluir transferência</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <p>Tem certeza que deseja excluir esta transferência? O material volta a contar para o colaborador e categoria de origem. A transferência poderá ser restaurada por até 30 dias.</p>
    <div class="modal-actions">
      <button class="btn btn-outline btn-block" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-danger btn-block" onclick="excluirTransferencia('${id}')">${icon('trash',16)}Excluir</button>
    </div>
  `);
}
async function excluirTransferencia(id){
  if(!exigirAdmin()) return;
  const alvo=STATE.transferencias.find(t=>t.id===id);
  const ids=alvo&&alvo.vinculoId?STATE.transferencias.filter(t=>t.vinculoId===alvo.vinculoId).map(t=>t.id):[id];
  for(const registroId of ids){
    if(!await moverRegistroParaLixeira('transferencias',registroId)){ mostrarErroOperacao(formatarMensagemErroFirestore(STORAGE_ERRORS.get('transferencias'),'Não foi possível mover a transferência para Itens apagados.')); return; }
  }
  fecharModal(); renderApp();
}
window.abrirFormTransferencia=abrirFormTransferencia; window.salvarTransferencia=salvarTransferencia;
window.confirmarExcluirTransferencia=confirmarExcluirTransferencia; window.excluirTransferencia=excluirTransferencia;

/* ---------- TROCA DE MATERIAL POR ITEM (ex.: cartelas de bingo) ---------- */
function totaisAcumuladosColaborador(campanhaId, colaboradorId){
  const {mes,ano} = mesAnoAtual();
  const saldos = calcularSaldosAcumulados(campanhaId, mes, ano);
  const categorias = categoriasDaCampanha(campanhaPorId(campanhaId));
  const totais = {};
  const chaveAtual=chaveMA(mes,ano);
  categorias.forEach(cat=>{
    // Usa o saldo efetivamente disponível no mês atual, já com excedente transportado,
    // transferências e materiais consumidos nos resgates. Somar "creditos" históricos
    // recontava valores de meses anteriores e podia devolver cartelas já resgatadas.
    totais[cat.key] = saldos[colaboradorId]?.[cat.key]?.[chaveAtual]?.totalDisponivel || 0;
  });
  return totais;
}
function renderTabelaTrocas(){
  const wrap = document.getElementById('tabelaTrocasWrap');
  if(!wrap) return;
  const campanhaId = STATE.campanhaSelecionadaId;
  const campanha = campanhaPorId(campanhaId);
  const cfgTroca = campanha && campanha.trocaCartela && campanha.trocaCartela.ativo ? campanha.trocaCartela : null;
  if(!cfgTroca) return;
  const lista = STATE.trocas.filter(t=>t.campanhaId===campanhaId).sort((a,b)=>b.data.localeCompare(a.data));
  if(lista.length===0){ wrap.innerHTML = `<div class="table-empty">Nenhum resgate registrado ainda.</div>`; return; }
  wrap.innerHTML = `
    <table><thead><tr><th>Data</th><th>Colaborador</th><th class="table-cell-center">Kits</th><th class="table-cell-center">RESGATE DE ${escapeHtml(String(cfgTroca.nomeItem||'item').toLocaleUpperCase('pt-BR'))}</th>${STATE.isAdmin?'<th></th>':''}</tr></thead>
    <tbody>
      ${lista.map(t=>{
        const c = STATE.colaboradores.find(x=>x.id===t.colaboradorId);
        return `<tr>
          <td>${formatarData(t.data)}</td>
          <td style="font-weight:700;">${escapeHtml(c?c.nome:'(removido)')}</td>
          <td class="table-cell-center">${t.quantidadeKits}</td>
          <td class="table-cell-center"><span class="badge badge-green">${t.cartelasEmitidas}</span></td>
          ${STATE.isAdmin?`<td style="text-align:right;"><button class="btn btn-ghost btn-sm" onclick="confirmarExcluirTroca('${t.id}')" style="color:var(--vermelho);">${icon('trash',16)}</button></td>`:''}
        </tr>`;
      }).join('')}
    </tbody></table>
  `;
}
window.renderTabelaTrocas = renderTabelaTrocas;
function abrirFormTrocaCartela(){
  if(!exigirAdmin()) return;
  const campanhaId = STATE.campanhaSelecionadaId;
  const campanha = campanhaPorId(campanhaId);
  const cfgTroca = campanha && campanha.trocaCartela;
  if(!cfgTroca || !cfgTroca.ativo){ alert('Esta campanha não tem resgate por itens ativado.'); return; }
  if(STATE.colaboradores.length===0){ alert('Cadastre ao menos um colaborador antes de registrar um resgate.'); return; }
  const opcoesColab = STATE.colaboradores.map(c=>`<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('');
  abrirModal(`
    <div class="modal-head"><h3>Resgatar ${escapeHtml(cfgTroca.nomeItem)}</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <div class="field"><label>Colaborador</label><select id="tcColab" onchange="atualizarKitsDisponiveisForm()">${opcoesColab}</select></div>
    <div class="field"><label>Data</label><input type="date" id="tcData" value="${new Date().toISOString().slice(0,10)}"></div>
    <div class="banner" id="tcInfoKits" style="margin-bottom:14px;"><span>${icon('ranking')}</span><div>—</div></div>
    <div class="field"><label>Quantidade de kits para resgatar</label><input type="number" min="1" id="tcQuantidadeKits" value="1" oninput="atualizarPreviaTroca()"></div>
    <p class="small-note" id="tcPrevia"></p>
    <div id="trocaErro" style="color:var(--vermelho);font-size:12.5px;display:none;margin-bottom:8px;"></div>
    <div class="modal-actions">
      <button class="btn btn-outline btn-block" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary btn-block" onclick="salvarTroca()">${icon('check',16)}Confirmar resgate</button>
    </div>
  `);
  setTimeout(atualizarKitsDisponiveisForm, 30);
}
function atualizarKitsDisponiveisForm(){
  const campanhaId = STATE.campanhaSelecionadaId;
  const campanha = campanhaPorId(campanhaId);
  const cfgTroca = campanha.trocaCartela;
  const colaboradorId = document.getElementById('tcColab').value;
  const totais = totaisAcumuladosColaborador(campanhaId, colaboradorId);
  const kits = kitsDisponiveis(campanha, totais);
  const itens= kits*cfgTroca.cartelasPorKit;
  document.getElementById('tcInfoKits').innerHTML = `<span>${icon('ranking')}</span><div>Disponível para resgate: <b>${kits} kit${kits===1?'':'s'}</b>, equivalente${kits===1?'':'s'} a <b>${itens} ${escapeHtml(cfgTroca.nomeItem)}${itens===1?'':'s'}</b>.</div>`;
  document.getElementById('tcQuantidadeKits').max = kits || 1;
  atualizarPreviaTroca();
}
window.atualizarKitsDisponiveisForm = atualizarKitsDisponiveisForm;
function atualizarPreviaTroca(){
  const campanha = campanhaPorId(STATE.campanhaSelecionadaId);
  const qtd = parseInt(document.getElementById('tcQuantidadeKits').value,10) || 0;
  const itens=qtd*campanha.trocaCartela.cartelasPorKit;
  document.getElementById('tcPrevia').textContent = qtd>0 ? `O resgate dará direito a ${itens} ${campanha.trocaCartela.nomeItem}${itens===1?'':'s'} e descontará os materiais correspondentes do saldo do colaborador.` : '';
}
window.atualizarPreviaTroca = atualizarPreviaTroca;
async function salvarTroca(){
  if(!exigirAdmin()) return;
  const campanhaId = STATE.campanhaSelecionadaId;
  const campanha = campanhaPorId(campanhaId);
  const cfgTroca = campanha.trocaCartela;
  const colaboradorId = document.getElementById('tcColab').value;
  const data = document.getElementById('tcData').value;
  const quantidadeKits = parseInt(document.getElementById('tcQuantidadeKits').value,10);
  const erroEl = document.getElementById('trocaErro');
  erroEl.style.display='none';
  if(!data || !quantidadeKits || quantidadeKits<=0){ erroEl.textContent='Informe uma data e uma quantidade de kits maior que zero.'; erroEl.style.display='block'; return; }
  const validacaoData = dataDentroDaCampanha(campanhaId, data);
  if(!validacaoData.ok){ erroEl.textContent = validacaoData.motivo; erroEl.style.display='block'; return; }
  const totais = totaisAcumuladosColaborador(campanhaId, colaboradorId);
  const kitsMax = kitsDisponiveis(campanha, totais);
  if(quantidadeKits > kitsMax){ erroEl.textContent = `Este colaborador só pode resgatar ${kitsMax} kit${kitsMax===1?'':'s'} no momento.`; erroEl.style.display='block'; return; }
  const kitConsumido = {};
  Object.keys(cfgTroca.kit).forEach(catKey=>{ kitConsumido[catKey] = cfgTroca.kit[catKey] * quantidadeKits; });
  STATE.trocas.push({
    id:uid(), campanhaId, colaboradorId, data, quantidadeKits,
    cartelasEmitidas: quantidadeKits * cfgTroca.cartelasPorKit,
    nomeItem: cfgTroca.nomeItem, kitConsumido, criadoEm: Date.now()
  });
  await salvarTrocas();
  fecharModal(); renderApp();
}
window.abrirFormTrocaCartela=abrirFormTrocaCartela; window.salvarTroca=salvarTroca;
function confirmarExcluirTroca(id){
  if(!exigirAdmin()) return;
  abrirModal(`
    <div class="modal-head"><h3>Excluir resgate</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <p>Tem certeza que deseja excluir este registro de resgate? O material consumido volta a contar no saldo do colaborador. O resgate poderá ser restaurado por até 30 dias.</p>
    <div class="modal-actions">
      <button class="btn btn-outline btn-block" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-danger btn-block" onclick="excluirTroca('${id}')">${icon('trash',16)}Excluir</button>
    </div>
  `);
}
async function excluirTroca(id){
  if(!exigirAdmin()) return;
  if(!await moverRegistroParaLixeira('trocas',id)){ mostrarErroOperacao(formatarMensagemErroFirestore(STORAGE_ERRORS.get('trocas'),'Não foi possível mover o resgate para Itens apagados.')); return; }
  fecharModal(); renderApp();
}
window.confirmarExcluirTroca=confirmarExcluirTroca; window.excluirTroca=excluirTroca;

/* =========================================================
   RANKING
   ========================================================= */
function renderRanking(){
  const campanhaId = STATE.campanhaSelecionadaId;
  if(!campanhaId){
    return `<div class="card"><div class="empty-state">Nenhuma campanha cadastrada ainda.</div></div>`;
  }
  const mes=STATE.rankMes, ano=STATE.rankAno;
  let resultados = calcularResultadosMes(campanhaId, mes,ano,STATE.rankSetor);
  const campanhaRanking=campanhaPorId(campanhaId);
  const cfgTrocaRanking=campanhaRanking&&campanhaRanking.trocaCartela&&campanhaRanking.trocaCartela.ativo?campanhaRanking.trocaCartela:null;
  const chaveRanking=chaveMA(mes,ano);
  const categoriasRanking=categoriasDaCampanha(campanhaRanking);
  if(cfgTrocaRanking){
    let posicaoResgate=0;
    resultados=resultados.map(r=>({
      ...r,
      _resgatesRanking:montarResumoKitColaborador(campanhaRanking,cfgTrocaRanking,r,chaveRanking,categoriasRanking).resgatesMes
    })).sort((a,b)=>b._resgatesRanking-a._resgatesRanking||String(a.colaborador.nome||'').localeCompare(String(b.colaborador.nome||''),'pt-BR'))
      .map(r=>({...r,posicao:r._resgatesRanking>0?++posicaoResgate:null}));
  }
  const setores = setoresExistentes();
  const comAtividade = cfgTrocaRanking
    ? resultados.filter(r=>r._resgatesRanking>0)
    : resultados.filter(r=> r.pontuacao>0 || r.totalMateriais>0);
  const top3 = comAtividade.slice(0,3);
  return `
    <div class="toolbar">
      <div class="toolbar-left filters">
        ${seletorMesAno('rank', mes, ano)}
        <select id="filtroSetorRank" onchange="STATE.rankSetor=this.value; renderApp();">
          <option value="">Todos os setores</option>
          ${setores.map(s=>`<option value="${escapeHtml(s)}" ${STATE.rankSetor===s?'selected':''}>${escapeHtml(s)}</option>`).join('')}
        </select>
      </div>
      ${STATE.isAdmin? `<div class="toolbar-right">
        <button class="btn btn-outline" onclick="abrirCompartilhamentoRanking(${mes},${ano})">Compartilhar no WhatsApp</button>
        <button class="btn btn-outline" onclick="gerarCardRanking(${mes},${ano})">Gerar card do ranking</button>
      </div>` : ''}
    </div>
    ${resultados.length===0? `<div class="card"><div class="empty-state"><div class="icon">${icon('ranking',44)}</div>Nenhum colaborador com entregas validadas neste período.</div></div>` : `
      <div class="podium-wrap">
        ${renderPodium(top3[1],'2','🥈',!!cfgTrocaRanking)}
        ${renderPodium(top3[0],'1','🥇',!!cfgTrocaRanking)}
        ${renderPodium(top3[2],'3','🥉',!!cfgTrocaRanking)}
      </div>
      <div class="card" style="padding:0;"><div class="table-wrap">${renderTabelaRanking(resultados, true, mes, ano)}</div></div>
    `}
    ${STATE.isAdmin? `<p class="small-note">O ranking público é atualizado automaticamente após salvar alterações nos dados da campanha.</p>`:''}
  `;
}
function renderPodium(r,pos,medal,usarResgates=false){
  if(!r){
    return `<div class="podium-card podium-${pos} podium-vazio">
      <div class="podium-medal" style="opacity:.35;">${medal}</div>
      <div class="podium-name" style="opacity:.7;">A definir</div>
      <div class="podium-score" style="opacity:.6;">—</div>
    </div>`;
  }
  return `<div class="podium-card podium-${pos}">
    <div class="podium-medal">${medal}</div>
    <div class="podium-name">${escapeHtml(r.colaborador.nome)}</div>
    <div class="podium-score">${usarResgates?Number(r._resgatesRanking||0).toLocaleString('pt-BR')+' resgates':r.pontuacao.toFixed(0)+' pts'}</div>
    ${usarResgates?'':`<div style="font-size:11px;opacity:.9;">${Math.round(r.mediaReal)}% da meta</div>`}
  </div>`;
}
function pluralizarNomeItemRanking(nome){
  const texto=String(nome||'item').trim()||'item';
  const partes=texto.split(/\s+/);
  const primeiro=partes.shift();
  const plural=/s$/i.test(primeiro)?primeiro:/m$/i.test(primeiro)?primeiro.slice(0,-1)+'ns':/l$/i.test(primeiro)?primeiro.slice(0,-1)+'is':primeiro+'s';
  return [plural,...partes].join(' ');
}
function renderTabelaRanking(resultados, completa, mes, ano){
  if(resultados.length===0) return `<div class="table-empty">Nenhum resultado neste período.</div>`;
  const campanha = campanhaPorId(STATE.campanhaSelecionadaId);
  const cfgTroca = campanha && campanha.trocaCartela && campanha.trocaCartela.ativo ? campanha.trocaCartela : null;
  const modoResgates=!!cfgTroca&&completa;
  const cabecalhoItem=cfgTroca?pluralizarNomeItemRanking(cfgTroca.nomeItem):'';
  return `
    <table><thead><tr>
      <th>Pos.</th><th>Colaborador</th><th>Setor</th>${completa?'<th>Materiais</th>':''}${modoResgates?'':'<th>Pontuação</th><th>% cumprimento</th><th>Meta</th>'}${cfgTroca?`<th class="table-cell-center">${escapeHtml(cabecalhoItem)}</th>`:''}${modoResgates?'<th>Resgates</th>':''}<th></th>
    </tr></thead>
    <tbody>
      ${resultados.map(r=>{
        const kits = cfgTroca ? kitsDisponiveis(campanha, r.totais) : 0;
        const itensDisponiveis = kits * (Number(cfgTroca && cfgTroca.cartelasPorKit) || 1);
        const resgatesMes=modoResgates?(Number.isFinite(Number(r._resgatesRanking))?Number(r._resgatesRanking):montarResumoKitColaborador(campanha,cfgTroca,r,chaveMA(mes,ano),categoriasDaCampanha(campanha)).resgatesMes):0;
        return `
        <tr>
          <td class="ranking-position-cell">${r.posicao? `<span class="ranking-position-content"><b>${r.posicao}º</b>${r.posicao<=3?`<span class="ranking-medal" aria-hidden="true">${({1:'🥇',2:'🥈',3:'🥉'}[r.posicao]||'')}</span>`:''}</span>` : '<span class="small-note">—</span>'}</td>
          <td style="font-weight:700;">${escapeHtml(r.colaborador.nome)}</td>
          <td>${escapeHtml(r.colaborador.setor||'—')}</td>
          ${completa?`<td>${r.totalMateriais.toLocaleString('pt-BR')}</td>`:''}
          ${modoResgates?'':`<td style="min-width:120px;"><div style="display:flex;align-items:center;gap:8px;"><div class="progress" style="flex:1;"><div style="width:${Math.min(100,r.pontuacao)}%"></div></div><span>${r.pontuacao.toFixed(0)}</span></div></td><td>${r.mediaReal.toFixed(0)}%</td><td>${r.metaAtingida? '<span class="badge badge-green">Atingida</span>' : '<span class="badge badge-grey">Em andamento</span>'}</td>`}
          ${cfgTroca?`<td class="table-cell-center"><div style="display:flex;justify-content:center;">${itensDisponiveis>0?`<span class="badge badge-green">${itensDisponiveis} disponíve${itensDisponiveis===1?'l':'is'}</span>`:'<span class="small-note">0</span>'}</div></td>`:''}
          ${modoResgates?`<td>${resgatesMes.toLocaleString('pt-BR')}</td>`:''}
          <td>${mes&&ano? `<button class="btn btn-ghost btn-sm" onclick="abrirDetalhesColaborador('${r.colaborador.id}',${mes},${ano})">Detalhes</button>` : ''}</td>
        </tr>`;
      }).join('')}
    </tbody></table>
  `;
}
function abrirDetalhesColaborador(colaboradorId, mes, ano){
  const campanhaId = STATE.campanhaSelecionadaId;
  const categorias = categoriasDaCampanha(campanhaPorId(campanhaId));
  const resultados = calcularResultadosMes(campanhaId, mes,ano);
  const r = resultados.find(x=>x.colaborador.id===colaboradorId);
  if(!r) return;
  const campanha=campanhaPorId(campanhaId);
  const cfgTroca=campanha&&campanha.trocaCartela&&campanha.trocaCartela.ativo?campanha.trocaCartela:null;
  if(cfgTroca){
    const nomeItem=String(cfgTroca.nomeItem||'item').trim();
    const kit=montarResumoKitColaborador(campanha,cfgTroca,r,chaveMA(mes,ano),categorias);
    const unidadeItem=kit.resgatesMes===1||/s$/i.test(nomeItem)?nomeItem:nomeItem+'s';
    abrirModal(`
      <div class="modal-head"><h3>${escapeHtml(r.colaborador.nome)} - ${nomeMes(mes)}/${ano}</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
      ${renderDetalhesKit(kit,unidadeItem)}
    `, true, 'public-details');
    return;
  }
  const detalhesCategorias=categorias.map(cat=>({
    nome:cat.label.split(' (')[0],
    unidade:cat.unidade,
    quantidade:r.totais[cat.key]||0,
    carryIn:r.carryInsPorCategoria[cat.key]||0,
    meta:getMetasDoMes(campanhaId, mes,ano)[cat.key]||cat.metaDefault,
    percentual:r.percentuais[cat.key]||0,
  }));
  const ordemPublicaFixa=!((campanha&&campanha.trocaCartela)||{}).ativo;
  abrirModal(`
    <div class="modal-head"><h3>${escapeHtml(r.colaborador.nome)} — ${nomeMes(mes)}/${ano}</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <p class="small-note" style="margin-top:-6px;">Como é calculada a pontuação: a posição no ranking é definida pela média do percentual de cumprimento das ${categorias.length} categorias. Para o cálculo da média, cada categoria é limitada a 100%, evitando que resultados acima da meta compensem categorias abaixo dela.</p>
    <div class="table-wrap public-ranking-table">${renderTabelaDetalhesMateriais(detalhesCategorias,ordemPublicaFixa)}</div>
    <p class="small-note" style="margin-top:12px;">Sobre os valores: o percentual de cumprimento mostra o resultado real de cada categoria e pode ultrapassar 100% quando a meta é superada. Os indicadores ao lado das categorias representam saldos transferidos de meses anteriores ou para o mês seguinte.</p>
    <p class="small-note" style="margin-top:12px;">Pontuação do ranking: <b>${r.pontuacao.toFixed(0)} pontos</b> (média das ${categorias.length} categorias, cada uma limitada a 100%).</p>
    <p class="small-note material-balance-legend"><span class="material-balance-legend-item"><span class="material-balance-swatch previous" aria-hidden="true"></span>Saldo mês anterior</span><span class="material-balance-legend-item"><span class="material-balance-swatch next" aria-hidden="true"></span>Saldo mês seguinte</span></p>
  `, true, 'public-details');
}
window.abrirDetalhesColaborador = abrirDetalhesColaborador;

