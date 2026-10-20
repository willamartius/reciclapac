/* ---------- AUTENTICAÇÃO E PAPÉIS ---------- */
function abrirLoginAdmin(){
  if(STORAGE_MODE!=='firestore' || !FIREBASE_AUTH){
    alert('O login seguro só está disponível quando o Firebase Authentication está inicializado.');
    return;
  }
  STATE.mostrarLogin=true;
  STATE.authError='';
  STATE.authNotice='';
  renderApp();
  setTimeout(()=>document.getElementById('authEmail')?.focus(),50);
}
async function solicitarRedefinicaoSenhaLogin(){
  if(!FIREBASE_AUTH){ STATE.authError='O Firebase Authentication não está disponível.'; renderApp(); return; }
  const campoEmail=document.getElementById('authEmail');
  const email=campoEmail && campoEmail.value.trim();
  if(!email){
    campoEmail?.reportValidity();
    return;
  }
  if(!campoEmail.checkValidity()){ campoEmail.reportValidity(); return; }
  STATE.authEmail=email;
  STATE.authError='';
  STATE.authNotice='';
  try{
    await FIREBASE_AUTH.sendPasswordResetEmail(email);
    STATE.authNotice='Se houver uma conta cadastrada com esse e-mail, enviaremos um link de redefinição.';
  }catch(e){
    console.error('Erro ao solicitar redefinição de senha no login',e);
    STATE.authError=e.code==='auth/too-many-requests'
      ? 'Muitas tentativas. Aguarde antes de solicitar outro e-mail.'
      : e.code==='auth/operation-not-allowed'
        ? 'A redefinição por e-mail ainda não está habilitada no Firebase Authentication.'
        : 'Não foi possível solicitar a redefinição. Verifique sua conexão e tente novamente.';
  }
  renderApp();
}
async function confirmarLoginAdmin(){
  if(STATE.loginCarregando) return;
  if(!FIREBASE_AUTH){ STATE.authError='O Firebase Authentication não está disponível.'; renderApp(); return; }
  const email=document.getElementById('authEmail')?.value.trim();
  const senha=document.getElementById('authPassword')?.value;
  if(!email || !senha){ STATE.authError='Informe o e-mail e a senha.'; renderApp(); return; }
  STATE.authEmail=email;
  STATE.authError='';
  STATE.authNotice='';
  STATE.loginCarregando=true;
  renderApp();
  try{
    await FIREBASE_AUTH.signInWithEmailAndPassword(email,senha);
  }catch(e){
    STATE.loginCarregando=false;
    console.error('Erro ao autenticar usuário',e);
    const mensagens={
      'auth/too-many-requests':'Muitas tentativas. Aguarde antes de tentar novamente.',
      'auth/operation-not-allowed':'O acesso por e-mail e senha ainda não está habilitado no Firebase Authentication.',
      'auth/unauthorized-domain':'Este domínio ainda não foi autorizado no Firebase Authentication.',
      'auth/network-request-failed':'Não foi possível conectar ao Firebase. Verifique sua conexão e tente novamente.',
    };
    STATE.authError=mensagens[e.code] || 'Não foi possível entrar. Confira suas credenciais e tente novamente.';
    renderApp();
  }
}
async function sairAdmin(){
  if(!FIREBASE_AUTH) return;
  try { await FIREBASE_AUTH.signOut(); }
  catch(e){ console.error('Erro ao sair da conta',e); alert('Não foi possível encerrar a sessão. Tente novamente.'); }
}
window.abrirLoginAdmin=abrirLoginAdmin; window.confirmarLoginAdmin=confirmarLoginAdmin; window.sairAdmin=sairAdmin;
function podeEditarDados(){ return STATE.isAdmin || STATE.isOperator; }
function exigirAdmin(){
  if(STATE.isAdmin) return true;
  if(!STATE.authUser){ abrirLoginAdmin(); return false; }
  alert('Esta ação exige perfil de administrador.');
  return false;
}
function exigirOperador(){
  if(podeEditarDados()) return true;
  if(!STATE.authUser){ abrirLoginAdmin(); return false; }
  alert('Esta ação exige um perfil autorizado para cadastrar dados.');
  return false;
}

function nomeExibicaoUsuario(){
  return STATE.authUser && STATE.authUser.displayName && STATE.authUser.displayName.trim()
    ? STATE.authUser.displayName.trim()
    : (STATE.authUser && STATE.authUser.email) || 'Usuário';
}
function partesNomeUsuario(){
  const partes=STATE.authUser && STATE.authUser.displayName
    ? STATE.authUser.displayName.trim().split(/\s+/).filter(Boolean)
    : [];
  return {nome:partes.shift()||'', sobrenome:partes.join(' ')};
}
function renderCamposPerfilUsuario(prefixo){
  const partes=partesNomeUsuario();
  return `<div class="grid grid-2">
    <div class="field"><label for="${prefixo}Nome">Nome</label><input id="${prefixo}Nome" type="text" maxlength="60" value="${escapeHtml(partes.nome)}" autocomplete="given-name" required></div>
    <div class="field"><label for="${prefixo}Sobrenome">Sobrenome</label><input id="${prefixo}Sobrenome" type="text" maxlength="100" value="${escapeHtml(partes.sobrenome)}" autocomplete="family-name" required></div>
  </div>
  <div class="field"><label>Perfil de acesso</label><input type="text" value="${STATE.isAdmin?'Administrador':'Operador'}" readonly aria-readonly="true"></div>`;
}
function abrirPerfilUsuario(){
  if(!STATE.authUser) return;
  abrirModal(`
    <div class="modal-head"><h3>Meu perfil</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <p class="small-note">Conta: ${escapeHtml(STATE.authUser.email||'')}</p>
    <form onsubmit="event.preventDefault();salvarPerfilUsuario('perfilModal')">
      ${renderCamposPerfilUsuario('perfilModal')}
      <p class="small-note">O perfil de acesso é definido pelo administrador no Firebase e não pode ser alterado aqui.</p>
      <div class="modal-actions">
        <button class="btn btn-outline btn-block" type="button" onclick="fecharModal()">Cancelar</button>
        <button class="btn btn-primary btn-block" type="submit">Salvar nome</button>
      </div>
    </form>
  `);
}
async function salvarPerfilUsuario(prefixo){
  if(!STATE.authUser || !FIREBASE_AUTH) return;
  const nome=document.getElementById(`${prefixo}Nome`)?.value.trim()||'';
  const sobrenome=document.getElementById(`${prefixo}Sobrenome`)?.value.trim()||'';
  if(!nome || !sobrenome){
    alert('Informe seu nome e sobrenome.');
    return;
  }
  const displayName=`${nome} ${sobrenome}`;
  try{
    await STATE.authUser.updateProfile({displayName});
    STATE.authUser=FIREBASE_AUTH.currentUser;
    fecharModal();
    renderApp();
  }catch(e){
    console.error('Erro ao atualizar nome do usuário',e);
    alert('Não foi possível salvar seu nome no Firebase Authentication. Tente novamente.');
  }
}
window.abrirPerfilUsuario=abrirPerfilUsuario;
window.salvarPerfilUsuario=salvarPerfilUsuario;

function agendarSincronizacaoRankingsPublicos(key){
  if(!rankingPublicoSyncAtivo || !PUBLIC_RANKING_SOURCE_KEYS.has(key)
    || STORAGE_MODE!=='firestore' || !podeEditarDados()) return;
  rankingPublicoSyncPendente=true;
  clearTimeout(rankingPublicoSyncTimer);
  rankingPublicoSyncTimer=setTimeout(()=>{
    sincronizarRankingsPublicos().catch(mostrarErroSincronizacaoRankingPublico);
  },500);
}
function mostrarErroSincronizacaoRankingPublico(erro){
  console.error('Erro ao atualizar ranking público automaticamente',erro);
  alert('Os dados foram salvos no aplicativo, mas a página pública não foi atualizada. Verifique se as regras do Firestore foram atualizadas e abra o app novamente para sincronizar.');
}
function agendarSincronizacaoRankingPublicoNaViradaDoMes(){
  clearTimeout(rankingPublicoSyncMesTimer);
  if(!rankingPublicoSyncAtivo) return;
  const agora=new Date();
  const chaveAgendada=chaveMA(agora.getMonth()+1,agora.getFullYear());
  const proximoMes=new Date(agora.getFullYear(),agora.getMonth()+1,1);
  const espera=Math.min(Math.max(1000,proximoMes.getTime()-agora.getTime()+1000),2147483000);
  rankingPublicoSyncMesTimer=setTimeout(()=>{
    if(!rankingPublicoSyncAtivo) return;
    const dataAtual=mesAnoAtual();
    const chaveAtual=chaveMA(dataAtual.mes,dataAtual.ano);
    if(chaveAtual!==chaveAgendada){
      sincronizarRankingsPublicos().catch(mostrarErroSincronizacaoRankingPublico);
    }
    agendarSincronizacaoRankingPublicoNaViradaDoMes();
  },espera);
}
function sincronizarRankingPublicoSeMesMudou(){
  if(!rankingPublicoSyncAtivo) return;
  const atual=mesAnoAtual();
  if(rankingPublicoUltimoMesSincronizado!==chaveMA(atual.mes,atual.ano)){
    sincronizarRankingsPublicos().catch(mostrarErroSincronizacaoRankingPublico);
  }
}
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible') sincronizarRankingPublicoSeMesMudou();
});
window.addEventListener('focus',sincronizarRankingPublicoSeMesMudou);
function chavePeriodoValida(chave){
  return typeof chave==='string' && /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(chave);
}
async function sincronizarRankingsPublicos(){
  if(!rankingPublicoSyncAtivo || !FIREBASE_DB || !podeEditarDados()) return;
  if(rankingPublicoSyncPromise) return rankingPublicoSyncPromise;
  rankingPublicoSyncPendente=false;
  rankingPublicoSyncPromise=(async()=>{
    const [colaboradores,entregas,transferencias,trocas,campanhasCarregadas,metasSnapshots]=await Promise.all([
      storageGet('colaboradores',[]),
      storageGet('entregas',[]),
      storageGet('transferencias',[]),
      storageGet('trocas',[]),
      storageGet('campanhas',[]),
      storageGet('metas',[]),
    ]);
    if(!rankingPublicoSyncAtivo || !podeEditarDados()) return;
    STATE.colaboradores=colaboradores;
    STATE.entregas=entregas;
    STATE.transferencias=transferencias;
    STATE.trocas=trocas;
    STATE.campanhas=Array.isArray(campanhasCarregadas)?campanhasCarregadas:[];
    STATE.metasSnapshots=metasSnapshots;
    const colecao=FIREBASE_DB.collection('reciclar-apac-public-ranking');
    const snapshot=await colecao.get();
    const documentos=new Map(snapshot.docs.map(doc=>[doc.id,doc.data()]));
    const campanhas=STATE.campanhas;
    const campanhaIds=new Set(campanhas.map(campanha=>campanha.id));
    for(const doc of snapshot.docs){
      if(STATE.isAdmin && typeof doc.data().campanhaId==='string' && !campanhaIds.has(doc.data().campanhaId)){
        await doc.ref.delete();
        documentos.delete(doc.id);
      }
    }
    const atual=mesAnoAtual();
    for(const campanha of campanhas){
      const inicio=campanha.anoInicio*12+campanha.mesInicio;
      const fimCampanha=campanha.anoFim?campanha.anoFim*12+campanha.mesFim:Infinity;
      const fimPossivel=Math.min(atual.ano*12+atual.mes,fimCampanha);
      const fim=fimPossivel<inicio && atual.ano*12+atual.mes<inicio && fimCampanha>=inicio
        ? inicio
        : fimPossivel;
      const periodoInicio={mes:campanha.mesInicio,ano:campanha.anoInicio};
      const periodoFim={mes:fim%12||12,ano:Math.floor((fim-1)/12)};
      const periodos=new Set(inicio<=fim
        ? todosMesesEntre(periodoInicio.mes,periodoInicio.ano,periodoFim.mes,periodoFim.ano).map(({mes,ano})=>chaveMA(mes,ano))
        : []);
      mesesComDados(campanha.id).forEach(chave=>periodos.add(chave));
      STATE.entregas.concat(STATE.transferencias,STATE.trocas).forEach(registro=>{
        if(registro.campanhaId===campanha.id && registro.data) periodos.add(registro.data.slice(0,7));
      });
      STATE.metasSnapshots.forEach(metas=>{
        if(metas.campanhaId===campanha.id) periodos.add(metas.chave);
      });
      documentos.forEach(documento=>{
        if(documento.campanhaId===campanha.id && Number.isInteger(documento.mes) && Number.isInteger(documento.ano)){
          periodos.add(chaveMA(documento.mes,documento.ano));
        }
      });
      const categorias=categoriasDaCampanha(campanha);
      const periodosValidos=[...periodos].filter(chave=>{
        if(!chavePeriodoValida(chave)) return false;
        const [ano,mes]=chave.split('-').map(Number);
        const valor=ano*12+mes;
        return valor>=inicio && valor<=fim;
      }).sort();
      for(const chave of periodosValidos){
        const [ano,mes]=chave.split('-').map(Number);
        const cfgTroca=campanha.trocaCartela&&campanha.trocaCartela.ativo
          ?campanha.trocaCartela:null;
        const ranking=calcularResultadosMes(campanha.id,mes,ano)
          .map(resultado=>({
            resultado,
            itensTrocados:cfgTroca?ReciclarRankingLogic.somarItensTrocados(
              STATE.trocas,campanha.id,mes,ano,resultado.colaborador.id,
              Number(cfgTroca.cartelasPorKit)||1
            ):0,
          }))
          .filter(({resultado,itensTrocados})=>resultado.colaborador.status!=='desligado'
            && ReciclarRankingLogic.deveIncluirNoRankingPublico(resultado,itensTrocados))
          .map(({resultado,itensTrocados})=>({
            posicao:resultado.posicao||null,
            nome:resultado.colaborador.nome,
            pontuacao:Math.round(resultado.pontuacao),
            percentualGeral:resultado.mediaReal,
            totalMateriais:resultado.totalMateriais,
            ...(cfgTroca?{
              resumoTroca:(()=>{
                const nomeItem=String(cfgTroca.nomeItem||'item').trim();
                return {
                  quantidade:itensTrocados,
                  unidade:itensTrocados===1||/s$/i.test(nomeItem)?nomeItem:nomeItem+'s',
                };
              })(),
            }:{ }),
            ...(cfgTroca?{kit:montarResumoKitColaborador(campanha,cfgTroca,resultado,chave,categorias)}:{ }),
            detalhes:categorias.map(cat=>({
              nome:cat.label.split(' (')[0],
              unidade:cat.unidade,
              quantidade:resultado.totais[cat.key]||0,
              carryIn:resultado.carryInsPorCategoria[cat.key]||0,
              meta:resultado.metasPorCategoria[cat.key],
            })),
          }));
        if(cfgTroca){
          ranking.sort((a,b)=>b.kit.trocadosMes-a.kit.trocadosMes||b.kit.disponiveis-a.kit.disponiveis||a.nome.localeCompare(b.nome,'pt-BR'));
          ranking.forEach((item,i)=>{
            item.posicao=i+1;
            item.pontuacao=item.kit.trocadosMes;
          });
        }
        const id=`${encodeURIComponent(campanha.id)}_${chave}`;
        const anterior=documentos.get(id);
        const mesAtual=chave===chaveMA(atual.mes,atual.ano);
        const temDados=mesAtual||ranking.length>0;
        if(!temDados && !anterior) continue;
        const participantes=STATE.colaboradores
          .filter(colaborador=>colaborador.status!=='desligado')
          .map(colaborador=>({id:colaborador.id,nome:colaborador.nome}));
        const materiais= categorias.map(categoria=>({
          key:categoria.key,
          nome:categoria.label.split(' (')[0],
          unidade:categoria.unidade,
        }));
        const solicitacoesPermitidas=campanha.status==='ativa'
          && dataDentroDaCampanha(campanha.id,new Date().toISOString().slice(0,10)).ok;
        if(anterior && anterior.campanhaNome===campanha.nome
          && anterior.temDados===temDados
          && serializarEstavel(anterior.participantes)===serializarEstavel(participantes)
          && serializarEstavel(anterior.materiais)===serializarEstavel(materiais)
          && anterior.solicitacoesPermitidas===solicitacoesPermitidas
          && serializarEstavel(anterior.ranking)===serializarEstavel(ranking)) continue;
        const documento={
          campanhaId:campanha.id,
          campanhaNome:campanha.nome,
          mes,
          ano,
          atualizadoEm:new Date().toISOString(),
          temDados,
          participantes,
          materiais,
          solicitacoesPermitidas,
          ranking,
        };
        await colecao.doc(id).set(documento);
        documentos.set(id,documento);
      }
    }
    rankingPublicoUltimoMesSincronizado=chaveMA(atual.mes,atual.ano);
    if(STATE.authUser) renderApp();
  })();
  try{
    await rankingPublicoSyncPromise;
  }finally{
    rankingPublicoSyncPromise=null;
    if(rankingPublicoSyncPendente && rankingPublicoSyncAtivo){
      rankingPublicoSyncTimer=setTimeout(()=>{
        sincronizarRankingsPublicos().catch(mostrarErroSincronizacaoRankingPublico);
      },0);
    }
  }
}

function abrirAjuda(){
  abrirModal(`
    <div class="modal-head"><h3>Como usar o painel</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <div class="help-guide-scroll">
    <p class="help-guide-intro">Um guia rápido para registrar materiais, acompanhar resultados e manter os dados da campanha atualizados. As opções disponíveis podem variar conforme seu perfil de acesso.</p>
    <section class="help-guide-section">
      <h4 class="help-guide-section-title">Rotina da campanha</h4>
      <div class="help-guide-list">
        <article class="help-guide-item"><b>Escolha a campanha e o período</b><p>Use o seletor no topo para trocar de campanha. No Painel geral e nas telas de acompanhamento, escolha o mês e o ano que deseja consultar.</p></article>
        <article class="help-guide-item"><b>Cadastre os colaboradores</b><p>Em Colaboradores, cadastre cada participante e mantenha a situação atualizada. Se disponível, importe vários nomes de uma planilha.</p></article>
        <article class="help-guide-item"><b>Registre e confira as entregas</b><p>Em Entregas, informe o colaborador, o material, a quantidade e a unidade. Entregas pendentes ainda não entram nos saldos nem no ranking; valide-as após conferir os materiais recebidos.</p></article>
        <article class="help-guide-item"><b>Registre transferências</b><p>Na tela Entregas, use Transferir material para mover saldo entre colaboradores ou categorias. Confira origem, destino e quantidade antes de salvar.</p></article>
      </div>
    </section>
    <section class="help-guide-section">
      <h4 class="help-guide-section-title">Rankings e saldos</h4>
      <div class="help-guide-list">
        <article class="help-guide-item"><b>Entenda a pontuação</b><p>O Ranking mensal ordena os colaboradores pela média do cumprimento das categorias. Para a pontuação, cada categoria conta no máximo 100%; os detalhes mostram o percentual real, inclusive resultados acima da meta.</p></article>
        <article class="help-guide-item"><b>Acompanhe os excedentes</b><p>Quando a quantidade supera a meta, o excedente segue para o mês seguinte na mesma categoria. Os indicadores de saldo anterior e seguinte ajudam a identificar esses valores nos detalhes.</p></article>
        <article class="help-guide-item"><b>Confira a página pública</b><p>O ranking público é atualizado quando um administrador ou operador salva alterações. Os visitantes podem consultar campanha, período e detalhes; os pedidos públicos de troca só mudam os saldos após aprovação de um administrador.</p></article>
        <article class="help-guide-item"><b>Compartilhe o ranking</b><p>Na tela Ranking, escolha o resumo do Top 3 ou a classificação completa, revise a mensagem e então compartilhe pelo WhatsApp.</p></article>
      </div>
    </section>
    <section class="help-guide-section">
      <h4 class="help-guide-section-title">Configurações e segurança</h4>
      <div class="help-guide-list">
        <article class="help-guide-item"><b>Solicitações de troca</b><p>O sino mostra pedidos aguardando análise. Confira os nomes e as quantidades combinadas; ao aprovar, o sistema verifica os saldos antes de registrar a troca.</p></article>
        <article class="help-guide-item"><b>Backups</b><p>Em Configurações, administradores podem exportar ou importar um backup local e gerenciar backups privados no Google Drive. Cada administrador vincula sua própria conta Google.</p></article>
        <article class="help-guide-item"><b>Aviso de manutenção</b><p>Em Configurações, um administrador pode ativar ou desativar temporariamente o aviso exibido na página pública.</p></article>
      </div>
    </section>
    </div>
  `,true,'help-guide');
}
window.abrirAjuda = abrirAjuda;

/* =========================================================
   DASHBOARD
   ========================================================= */
function renderDashboard(){
  if(!STATE.campanhaSelecionadaId){
    return `<div class="card"><div class="empty-state">Nenhuma campanha cadastrada ainda. ${STATE.isAdmin? 'Crie uma em Configurações → Campanhas.' : 'Fale com o administrador do sistema.'}</div></div>`;
  }
  const campanhaId = STATE.campanhaSelecionadaId;
  const mes=STATE.dashMes, ano=STATE.dashAno;
  const resultados = calcularResultadosMes(campanhaId, mes,ano);
  const ativos = STATE.colaboradores.filter(c=>c.status==='ativo').length;
  const entregasMes = entregasValidadasDoMes(campanhaId, mes,ano);
  const totalMateriais = resultados.reduce((a,r)=>a+r.totalMateriais,0);
  const atingiramMeta = resultados.filter(r=>r.metaAtingida).length;
  const mediaGeral = resultados.length? (resultados.reduce((a,r)=>a+r.pontuacao,0)/resultados.length) : 0;
  const primeiro = resultados[0];

  const { campanha: campanhaPainel, meses: mesesPainel } = calcularJanelaPainel();
  const ultimoMesPainel = mesesPainel[mesesPainel.length-1];
  const saldosPainel = ultimoMesPainel ? calcularSaldosAcumulados(campanhaId, ultimoMesPainel.mes, ultimoMesPainel.ano) : {};
  const evolucao = mesesPainel.map(({mes:m,ano:a})=>{
    const r = resultadosDoMesUsandoSaldos(saldosPainel, campanhaId, m, a);
    const media = r.length? r.reduce((x,y)=>x+y.pontuacao,0)/r.length : 0;
    return {label: nomeMes(m).slice(0,3)+'/'+String(a).slice(2), media};
  });
  const resumoCampanha = calcularResumoCampanha(saldosPainel, campanhaId, mesesPainel);

  return `
    <div class="toolbar">
      <div class="toolbar-left"><span class="small-note">Mês de referência do painel</span></div>
      <div class="toolbar-right">${seletorMesAno('dash', mes, ano)}</div>
    </div>
    <div class="grid grid-4">
      <div class="card stat-card"><div class="stat-label">Colaboradores ativos</div><div class="stat-value">${ativos}</div><div class="stat-sub">${STATE.colaboradores.length} cadastrados no total</div></div>
      <div class="card stat-card"><div class="stat-label">Materiais arrecadados</div><div class="stat-value">${totalMateriais.toLocaleString('pt-BR')}</div><div class="stat-sub">unidades equivalentes em ${nomeMes(mes)}</div></div>
      <div class="card stat-card"><div class="stat-label">Atingiram a meta</div><div class="stat-value">${atingiramMeta}</div><div class="stat-sub">de ${resultados.length} participantes</div></div>
      <div class="card stat-card"><div class="stat-label">Cumprimento médio</div><div class="stat-value">${mediaGeral.toFixed(0)}%</div><div class="stat-sub">média geral de pontuação, já com excedente acumulado</div></div>
    </div>
    <div class="grid grid-2" style="margin-top:14px;">
      <div class="card">
        <div class="stat-label">1º colocado do mês</div>
        ${primeiro? `
          <div style="display:flex;align-items:center;gap:12px;margin-top:8px;">
            <div style="width:44px;height:44px;border-radius:50%;background:var(--verde-100);display:flex;align-items:center;justify-content:center;font-size:20px;">🏆</div>
            <div><div style="font-weight:800;font-size:15px;">${escapeHtml(primeiro.colaborador.nome)}</div><div class="small-note">${escapeHtml(primeiro.colaborador.setor||'—')} · ${primeiro.pontuacao.toFixed(0)} pontos</div></div>
          </div>` : `<div class="small-note" style="margin-top:8px;">Nenhum colaborador com entregas validadas neste mês.</div>`}
        <div style="margin-top:14px;">
          <div class="stat-label">Total de entregas registradas</div>
          <div class="stat-value small">${entregasMes.length}</div>
        </div>
      </div>
      <div class="card">
        <div class="stat-label">Evolução do cumprimento médio</div>
        <div style="overflow-x:auto;">${renderMiniBarChart(evolucao)}</div>
      </div>
    </div>
    <div class="section-title">Acompanhamento</div>
    <div class="card">
      ${renderSeletorPainelPeriodo(campanhaPainel)}
    </div>
    <div class="card" style="padding:0;margin-top:12px;">
      <div class="table-wrap">
        ${resumoCampanha.length===0? `<div class="table-empty">Ainda não há lançamentos neste período.</div>` : `
        <table><thead><tr><th>Colaborador</th><th>Setor</th><th>Meses participando</th><th>Pontuação média</th><th>Materiais arrecadados (total)</th><th>Meses com meta atingida</th></tr></thead>
        <tbody>
          ${resumoCampanha.map(r=>`
            <tr>
              <td style="font-weight:700;">${escapeHtml(r.colaborador.nome)}</td>
              <td>${escapeHtml(r.colaborador.setor||'—')}</td>
              <td>${r.mesesParticipando}</td>
              <td>${r.mediaPontuacao.toFixed(0)}</td>
              <td>${r.totalMateriais.toLocaleString('pt-BR')}</td>
              <td>${r.mesesComMetaAtingida}</td>
            </tr>`).join('')}
        </tbody></table>`}
      </div>
    </div>
    <div class="section-title">Ranking resumido — ${nomeMes(mes)} de ${ano}</div>
    <div class="dashboard-ranking-table table-wrap">${renderTabelaRanking(resultados.slice(0,5), false, mes, ano)}</div>
    <div class="dashboard-ranking-mobile">
      ${resultados.slice(0,5).map(r=>`
        <div class="dashboard-ranking-mobile-item">
          <span class="dashboard-ranking-mobile-position">${r.posicao?`${r.posicao}º`:'—'}</span>
          <span class="dashboard-ranking-mobile-name">${escapeHtml(r.colaborador.nome)}</span>
          <span class="dashboard-ranking-mobile-score">${r.pontuacao.toFixed(0)} pts</span>
        </div>
      `).join('')}
    </div>
    ${resultados.length>5? `<div style="margin-top:10px;"><button class="btn btn-outline" onclick="irPara('ranking')">${icon('ranking')}Ver ranking completo</button></div>`:''}
  `;
}
function renderSeletorPainelPeriodo(campanhaPainel){
  const pref = STATE.config.painelPeriodo;
  const campanhas = campanhasOrdenadas();
  const campanhaSelecionadaId = STATE.campanhaSelecionadaId;
  const hoje = mesAnoAtual();
  const anoMin = campanhaPainel? campanhaPainel.anoInicio : hoje.ano;
  const anoMax = campanhaPainel? (campanhaPainel.anoFim || hoje.ano) : hoje.ano;
  const anos = []; for(let a=anoMin; a<=anoMax; a++) anos.push(a);
  const anoSelecionado = pref.ano || hoje.ano;
  const tipo = pref.tipo || '6';
  return `
    <div class="filters">
      <div>
        <label style="display:block;font-size:11.5px;font-weight:700;color:var(--text-muted);margin-bottom:4px;">Campanha</label>
        <select onchange="mudarCampanhaSelecionada(this.value)">
          ${campanhas.map(c=>`<option value="${c.id}" ${c.id===campanhaSelecionadaId?'selected':''}>${escapeHtml(c.nome)}${c.status==='ativa'?' (ativa)':''}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="display:block;font-size:11.5px;font-weight:700;color:var(--text-muted);margin-bottom:4px;">Ano</label>
        <select onchange="mudarPainelPeriodo('ano', this.value)">
          ${anos.map(a=>`<option value="${a}" ${a===anoSelecionado?'selected':''}>${a}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="display:block;font-size:11.5px;font-weight:700;color:var(--text-muted);margin-bottom:4px;">Período</label>
        <select onchange="mudarPainelPeriodo('tipo', this.value)">
          <option value="3" ${tipo==='3'?'selected':''}>Últimos 3 meses</option>
          <option value="6" ${tipo==='6'?'selected':''}>Últimos 6 meses</option>
          <option value="12" ${tipo==='12'?'selected':''}>Últimos 12 meses</option>
          <option value="anoAtual" ${tipo==='anoAtual'?'selected':''}>Ano completo</option>
          <option value="personalizado" ${tipo==='personalizado'?'selected':''}>Período personalizado</option>
        </select>
      </div>
    </div>
    ${tipo==='personalizado'? `
    <div class="filters" style="margin-top:10px;">
      <div>
        <label style="display:block;font-size:11.5px;font-weight:700;color:var(--text-muted);margin-bottom:4px;">De (mês/ano)</label>
        <div style="display:flex;gap:6px;">
          <select onchange="mudarPainelPeriodo('mesInicio', this.value)">${MESES_PT.map((m,i)=>`<option value="${i+1}" ${pref.mesInicio===i+1?'selected':''}>${m}</option>`).join('')}</select>
          <select onchange="mudarPainelPeriodo('anoInicio', this.value)">${anos.map(a=>`<option value="${a}" ${pref.anoInicio===a?'selected':''}>${a}</option>`).join('')}</select>
        </div>
      </div>
      <div>
        <label style="display:block;font-size:11.5px;font-weight:700;color:var(--text-muted);margin-bottom:4px;">Até (mês/ano)</label>
        <div style="display:flex;gap:6px;">
          <select onchange="mudarPainelPeriodo('mesFim', this.value)">${MESES_PT.map((m,i)=>`<option value="${i+1}" ${pref.mesFim===i+1?'selected':''}>${m}</option>`).join('')}</select>
          <select onchange="mudarPainelPeriodo('anoFim', this.value)">${anos.map(a=>`<option value="${a}" ${pref.anoFim===a?'selected':''}>${a}</option>`).join('')}</select>
        </div>
      </div>
    </div>` : ''}
  `;
}
function calcularResumoCampanha(saldosCompletos, campanhaId, mesesCampanha){
  const porColaborador = {};
  mesesCampanha.forEach(({mes,ano})=>{
    const resultados = resultadosDoMesUsandoSaldos(saldosCompletos, campanhaId, mes, ano);
    resultados.forEach(r=>{
      if(!porColaborador[r.colaborador.id]){
        porColaborador[r.colaborador.id] = { colaborador:r.colaborador, mesesParticipando:0, somaPontuacao:0, totalMateriais:0, mesesComMetaAtingida:0 };
      }
      const acc = porColaborador[r.colaborador.id];
      acc.mesesParticipando++;
      acc.somaPontuacao += r.pontuacao;
      acc.totalMateriais += r.totalMateriais;
      if(r.metaAtingida) acc.mesesComMetaAtingida++;
    });
  });
  const lista = Object.values(porColaborador).map(acc=> ({
    ...acc, mediaPontuacao: acc.mesesParticipando? acc.somaPontuacao/acc.mesesParticipando : 0
  }));
  lista.sort((a,b)=> b.mediaPontuacao-a.mediaPontuacao || b.totalMateriais-a.totalMateriais);
  return lista;
}
function ultimosMeses(n){
  const out=[]; let {mes,ano}=mesAnoAtual();
  for(let i=0;i<n;i++){ out.unshift({mes,ano}); mes--; if(mes<1){mes=12;ano--;} }
  return out;
}
function renderMiniBarChart(data){
  const max = Math.max(100, ...data.map(d=>d.media));
  return `<div style="display:flex;align-items:flex-end;gap:8px;height:110px;margin-top:12px;">
    ${data.map(d=>`
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
        <div style="width:100%;background:var(--verde-100);border-radius:6px 6px 0 0;height:${Math.max(4,(d.media/max)*80)}px;position:relative;">
          <div style="position:absolute;inset:0;background:var(--verde-500);border-radius:6px 6px 0 0;"></div>
        </div>
        <span style="font-size:10.5px;color:var(--text-muted);">${d.label}</span>
      </div>`).join('')}
  </div>`;
}
function seletorMesAno(prefix, mes, ano){
  const anos = [...new Set([ano-1,ano,ano+1])];
  return `
    <select onchange="mudarMes${cap(prefix)}(this.value,${ano})">${MESES_PT.map((m,i)=>`<option value="${i+1}" ${i+1===mes?'selected':''}>${m}</option>`).join('')}</select>
    <select onchange="mudarAno${cap(prefix)}(${mes},this.value)">${anos.map(a=>`<option value="${a}" ${a===ano?'selected':''}>${a}</option>`).join('')}</select>
  `;
}
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
window.mudarMesDash=(m,a)=>{ STATE.dashMes=+m; STATE.dashAno=+a; renderApp(); };
window.mudarAnoDash=(m,a)=>{ STATE.dashMes=+m; STATE.dashAno=+a; renderApp(); };
window.mudarMesRank=(m,a)=>{ STATE.rankMes=+m; STATE.rankAno=+a; renderApp(); };
window.mudarAnoRank=(m,a)=>{ STATE.rankMes=+m; STATE.rankAno=+a; renderApp(); };
window.mudarMesHist=(m,a)=>{ STATE.histMes=+m; STATE.histAno=+a; renderApp(); };
window.mudarAnoHist=(m,a)=>{ STATE.histMes=+m; STATE.histAno=+a; renderApp(); };

function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* =========================================================
   COLABORADORES
   ========================================================= */
function renderColaboradores(){
  const setores = setoresExistentes();
  return `
    <div class="toolbar">
      <div class="toolbar-left">
        <input type="text" id="buscaColab" placeholder="Buscar por nome ou setor…" style="min-width:220px;" oninput="renderTabelaColaboradores()">
      </div>
      ${podeEditarDados()? `
      <div class="toolbar-right">
        <button class="btn btn-outline" onclick="abrirImportarCsv()">${icon('upload')}Importar planilha</button>
        <button class="btn btn-primary" onclick="abrirFormColaborador()">${icon('plus')}Novo colaborador</button>
      </div>` : ''}
    </div>
    <div class="card" style="padding:0;">
      <div class="table-wrap" id="tabelaColaboradoresWrap"></div>
    </div>
  `;
}
function renderTabelaColaboradores(){
  const wrap = document.getElementById('tabelaColaboradoresWrap');
  if(!wrap) return;
  const busca = (document.getElementById('buscaColab')?.value||'').toLowerCase();
  const lista = STATE.colaboradores.filter(c=> !busca || c.nome.toLowerCase().includes(busca) || (c.setor||'').toLowerCase().includes(busca))
    .sort((a,b)=>a.nome.localeCompare(b.nome));
  if(lista.length===0){ wrap.innerHTML = `<div class="table-empty">Nenhum colaborador cadastrado ainda.</div>`; return; }
  wrap.innerHTML = `
    <table><thead><tr><th>Nome</th><th>Setor</th><th>Cargo</th><th>Status</th><th>Cadastro</th>${podeEditarDados()?'<th></th>':''}</tr></thead>
    <tbody>
      ${lista.map(c=>`
        <tr>
          <td style="font-weight:700;">${escapeHtml(c.nome)}</td>
          <td>${escapeHtml(c.setor||'—')}</td>
          <td>${escapeHtml(c.cargo||'—')}</td>
          <td>${c.status==='ativo'? '<span class="badge badge-green">Ativo</span>' : '<span class="badge badge-grey">Desligado</span>'}</td>
          <td>${formatarData(c.dataCadastro)}</td>
          ${podeEditarDados()? `<td style="text-align:right;white-space:nowrap;">
            <button class="btn btn-ghost btn-sm" onclick="abrirFormColaborador('${c.id}')">${icon('edit',16)}</button>
            ${STATE.isAdmin? `<button class="btn btn-ghost btn-sm" onclick="confirmarExcluirColaborador('${c.id}')" style="color:var(--vermelho);">${icon('trash',16)}</button>` : ''}
          </td>` : ''}
        </tr>`).join('')}
    </tbody></table>
  `;
}
function formatarData(iso){ if(!iso) return '—'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; }
function abrirFormColaborador(id){
  if(!exigirOperador()) return;
  const c = id ? STATE.colaboradores.find(x=>x.id===id) : null;
  abrirModal(`
    <div class="modal-head"><h3>${c?'Editar colaborador':'Novo colaborador'}</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <div class="field"><label>Nome completo</label><input type="text" id="fNome" value="${c?escapeHtml(c.nome):''}" placeholder="Ex: Maria Aparecida Lima"></div>
    <div class="grid grid-2">
      <div class="field"><label>Setor</label><input type="text" id="fSetor" value="${c?escapeHtml(c.setor||''):''}" placeholder="Ex: Marcenaria"></div>
      <div class="field"><label>Cargo</label><input type="text" id="fCargo" value="${c?escapeHtml(c.cargo||''):''}" placeholder="Ex: Colaborador(a)"></div>
    </div>
    <div class="field"><label>Status</label>
      <select id="fStatus"><option value="ativo" ${!c||c.status==='ativo'?'selected':''}>Ativo</option><option value="desligado" ${c&&c.status==='desligado'?'selected':''}>Desligado</option></select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline btn-block" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary btn-block" onclick="salvarColaborador('${id||''}')">${icon('check',16)}Salvar</button>
    </div>
  `);
}
async function salvarColaborador(id){
  if(!exigirOperador()) return;
  const anterior=STATE.colaboradores.map(c=>({...c}));
  const nome = document.getElementById('fNome').value.trim();
  if(!nome){ alert('Informe o nome do colaborador.'); return; }
  const setor = document.getElementById('fSetor').value.trim();
  const cargo = document.getElementById('fCargo').value.trim();
  const status = document.getElementById('fStatus').value;
  if(id){
    const c = STATE.colaboradores.find(x=>x.id===id);
    Object.assign(c,{nome,setor,cargo,status});
  } else {
    STATE.colaboradores.push({id:uid(),nome,setor,cargo,status,dataCadastro:new Date().toISOString().slice(0,10)});
  }
  if(!await salvarColaboradores()){
    STATE.colaboradores=anterior;
    alert('Não foi possível salvar o colaborador. Atualize a página e tente novamente.');
    return;
  }
  fecharModal(); renderApp();
}
function confirmarExcluirColaborador(id){
  if(!exigirAdmin()) return;
  const c = STATE.colaboradores.find(x=>x.id===id);
  abrirModal(`
    <div class="modal-head"><h3>Excluir colaborador</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <p>Tem certeza que deseja excluir <b>${escapeHtml(c.nome)}</b>? Ele poderá ser restaurado em "Itens apagados" por até 30 dias. As entregas já registradas serão mantidas no histórico.</p>
    <div class="modal-actions">
      <button class="btn btn-outline btn-block" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-danger btn-block" onclick="excluirColaborador('${id}')">${icon('trash',16)}Excluir</button>
    </div>
  `);
}
async function excluirColaborador(id){
  if(!exigirAdmin()) return;
  if(!await moverRegistroParaLixeira('colaboradores',id)){ alert('Não foi possível mover o colaborador para Itens apagados. Atualize a página e tente novamente.'); return; }
  fecharModal(); renderApp();
}
function abrirImportarCsv(){
  if(!exigirOperador()) return;
  abrirModal(`
    <div class="modal-head"><h3>Importar colaboradores</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <p class="small-note">Envie um arquivo CSV ou Excel (.csv) com as colunas: <b>nome, setor, cargo</b>. A primeira linha deve ser o cabeçalho.</p>
    <label class="tag-input-btn" style="cursor:pointer;">
      ${icon('upload')} Escolher arquivo CSV
      <input type="file" accept=".csv" style="display:none;" id="csvInput" onchange="processarCsv(this)">
    </label>
    <div id="csvPreview" style="margin-top:14px;"></div>
  `);
}
function processarCsv(input){
  const file = input.files[0]; if(!file) return;
  Papa.parse(file, { header:true, skipEmptyLines:true, complete: (res)=>{
    const linhas = res.data.map(r=>{
      const keys = Object.keys(r); const get=(name)=>{ const k=keys.find(k=>k.toLowerCase().trim()===name); return k? (r[k]||'').trim() : ''; };
      return { nome:get('nome'), setor:get('setor'), cargo:get('cargo') };
    }).filter(r=>r.nome);
    if(linhas.length===0){ document.getElementById('csvPreview').innerHTML = `<div class="small-note" style="color:var(--vermelho);">Nenhum colaborador válido encontrado no arquivo.</div>`; return; }
    window._csvImportPreview = linhas;
    document.getElementById('csvPreview').innerHTML = `
      <div class="banner"><b>${linhas.length} colaborador(es) encontrados</b>Confira antes de importar.</div>
      <div class="table-wrap" style="max-height:220px;overflow-y:auto;"><table><thead><tr><th>Nome</th><th>Setor</th><th>Cargo</th></tr></thead>
      <tbody>${linhas.map(l=>`<tr><td>${escapeHtml(l.nome)}</td><td>${escapeHtml(l.setor)}</td><td>${escapeHtml(l.cargo)}</td></tr>`).join('')}</tbody></table></div>
      <button class="btn btn-primary btn-block" style="margin-top:12px;" onclick="confirmarImportacaoCsv()">${icon('check',16)}Importar ${linhas.length} colaborador(es)</button>
    `;
  }});
}
async function confirmarImportacaoCsv(){
  if(!exigirOperador()) return;
  const anterior=STATE.colaboradores.map(c=>({...c}));
  const linhas = window._csvImportPreview || [];
  const hojeIso = new Date().toISOString().slice(0,10);
  linhas.forEach(l=> STATE.colaboradores.push({id:uid(),nome:l.nome,setor:l.setor,cargo:l.cargo,status:'ativo',dataCadastro:hojeIso}));
  if(!await salvarColaboradores()){
    STATE.colaboradores=anterior;
    alert('Não foi possível importar os colaboradores. Atualize a página e tente novamente.');
    return;
  }
  fecharModal(); renderApp();
}
window.abrirFormColaborador=abrirFormColaborador; window.salvarColaborador=salvarColaborador;
window.confirmarExcluirColaborador=confirmarExcluirColaborador; window.excluirColaborador=excluirColaborador;
window.abrirImportarCsv=abrirImportarCsv; window.processarCsv=processarCsv; window.confirmarImportacaoCsv=confirmarImportacaoCsv;
window.renderTabelaColaboradores=renderTabelaColaboradores;

/* =========================================================
   ENTREGAS
   ========================================================= */
function renderEntregas(){
  const campanhaId = STATE.campanhaSelecionadaId;
  if(!campanhaId){
    return `<div class="card"><div class="empty-state">Nenhuma campanha cadastrada ainda. ${STATE.isAdmin? 'Crie uma em Configurações → Campanhas.' : ''}</div></div>`;
  }
  const campanha = campanhaPorId(campanhaId);
  const cfgTroca = campanha && campanha.trocaCartela && campanha.trocaCartela.ativo ? campanha.trocaCartela : null;
  if(STATE.entregasSecao==='trocas' && !cfgTroca) STATE.entregasSecao='entregas';
  return `
    <div class="toolbar">
      <div class="toolbar-left filters">
        <div><select id="filtroEntregaMes" onchange="renderTabelaEntregas()">${MESES_PT.map((m,i)=>`<option value="${i+1}" ${i+1===mesAnoAtual().mes?'selected':''}>${m}</option>`).join('')}</select></div>
        <div><select id="filtroEntregaAno" onchange="renderTabelaEntregas()">${[mesAnoAtual().ano-1,mesAnoAtual().ano,mesAnoAtual().ano+1].map(a=>`<option ${a===mesAnoAtual().ano?'selected':''}>${a}</option>`).join('')}</select></div>
        ${STATE.entregasSecao==='entregas'?`<div class="filtro-status"><select id="filtroEntregaStatus" onchange="renderTabelaEntregas()"><option value="">Todos os status</option><option value="pendente">Pendente</option><option value="validado">Validado</option></select></div>`:''}
      </div>
      ${podeEditarDados()? `
      <div class="toolbar-right">
        <button class="btn btn-outline" onclick="abrirFormTransferencia()">${icon('ranking')}Transferir material</button>
        <button class="btn btn-primary" onclick="abrirFormEntrega()">${icon('plus')}Nova entrega</button>
      </div>` : ''}
    </div>
    ${STATE.entregasSecao==='entregas' && podeEditarDados()?`
      <div class="card">
        <div class="toolbar">
          <div><b>Fichas comuns para preenchimento manual</b><p class="small-note">Sem ID e sem registro no sistema. Preencha a ficha à mão e registre cada material individualmente em Entregas.</p></div>
          <button class="btn btn-outline" type="button" onclick="imprimirFichasComuns()">Imprimir fichas comuns</button>
        </div>
      </div>
    `:''}
    <div class="section-tabs" role="tablist" aria-label="Seção de registros">
      <button type="button" role="tab" aria-selected="${STATE.entregasSecao==='entregas'}" class="${STATE.entregasSecao==='entregas'?'active':''}" onclick="mudarSecaoEntregas('entregas')">Entregas</button>
      <button type="button" role="tab" aria-selected="${STATE.entregasSecao==='excedentes'}" class="${STATE.entregasSecao==='excedentes'?'active':''}" onclick="mudarSecaoEntregas('excedentes')">Excedentes</button>
      <button type="button" role="tab" aria-selected="${STATE.entregasSecao==='transferencias'}" class="${STATE.entregasSecao==='transferencias'?'active':''}" onclick="mudarSecaoEntregas('transferencias')">Transferências</button>
      ${cfgTroca? `<button type="button" role="tab" aria-selected="${STATE.entregasSecao==='trocas'}" class="${STATE.entregasSecao==='trocas'?'active':''}" onclick="mudarSecaoEntregas('trocas')">Resgates</button>` : ''}
    </div>
    ${STATE.entregasSecao==='entregas'? `
      <div class="card" style="padding:0;"><div class="table-wrap" id="tabelaEntregasWrap"></div></div>
    ` : ''}
    ${STATE.entregasSecao==='excedentes'? `
      <div class="card" id="saldoTransportadoWrap"></div>
    ` : ''}
    ${STATE.entregasSecao==='transferencias'? `
      <div class="toolbar">
        <div><div class="section-title" style="margin:0;">Transferências entre colaboradores e materiais</div><p class="small-note" style="margin:5px 0 0;">Reatribuições de material registradas neste mês.</p></div>
        ${podeEditarDados()? `<button class="btn btn-primary" onclick="abrirFormTransferencia()">${icon('ranking')}Nova transferência</button>` : ''}
      </div>
      <div class="card" style="padding:0;"><div class="table-wrap" id="tabelaTransferenciasWrap"></div></div>
    ` : ''}
    ${cfgTroca && STATE.entregasSecao==='trocas'? `
      <div class="toolbar">
        <div><div class="section-title" style="margin:0;">Resgate por itens</div><p class="small-note" style="margin:5px 0 0;">Cada kit fechado dá direito a ${cfgTroca.cartelasPorKit} ${escapeHtml(cfgTroca.nomeItem)}(s).</p></div>
        ${STATE.isAdmin? `<button class="btn btn-primary" onclick="abrirFormTrocaCartela()">${icon('plus')}Resgatar ${escapeHtml(cfgTroca.nomeItem)}</button>` : ''}
      </div>
      <div class="card" style="padding:0;"><div class="table-wrap" id="tabelaTrocasWrap"></div></div>
    ` : ''}
  `;
}
function mudarSecaoEntregas(secao){
  if(!['entregas','excedentes','transferencias','trocas'].includes(secao)) return;
  STATE.entregasSecao=secao;
  renderApp();
}
window.mudarSecaoEntregas=mudarSecaoEntregas;
function renderTabelaEntregas(){
  const wrap = document.getElementById('tabelaEntregasWrap');
  const campanhaId = STATE.campanhaSelecionadaId;
  const mes = +document.getElementById('filtroEntregaMes').value;
  const ano = +document.getElementById('filtroEntregaAno').value;
  const status = document.getElementById('filtroEntregaStatus')?.value||'';
  renderSaldoTransportado(mes,ano);
  if(wrap){
    const chave = chaveMA(mes,ano);
    let lista = STATE.entregas.filter(e=> e.campanhaId===campanhaId && e.data && e.data.slice(0,7)===chave && (!status || e.statusValidacao===status));
    lista = ordenarEntregasPorRegistro(lista);
    if(lista.length===0){ wrap.innerHTML = `<div class="table-empty">Nenhuma entrega registrada nesta campanha e período.</div>`; }
    else {
      wrap.innerHTML = `
        <table><thead><tr><th>Registro no sistema</th><th>Colaborador</th><th>Material</th><th>Qtd.</th><th>Status</th>${podeEditarDados()?'<th></th>':''}</tr></thead>
        <tbody>
          ${lista.map(e=>{
            const c = STATE.colaboradores.find(x=>x.id===e.colaboradorId);
            const cat = resolverCategoria(campanhaId, e.tipo);
            const unidLabel = e.tipo==='latinhas'? (e.unidade==='kg'?'kg':'unid.') : (cat?cat.unidade.replace('unidades','unid.'):'');
            const rotuloData = e.fichaId ? 'Data da ficha' : 'Data informada';
            return `<tr>
              <td><span>${formatarDataHoraRegistro(e.criadoEm)}</span><div class="small-note">${rotuloData}: ${formatarData(e.data)}</div></td>
              <td style="font-weight:700;">${escapeHtml(c?c.nome:'(removido)')}</td>
              <td>${cat? escapeHtml(cat.label.split(' (')[0]) : 'Outros materiais'}${e.fichaId?`<div class="small-note">Ficha ${escapeHtml(e.fichaId)}</div>`:''}</td>
              <td>${e.quantidade} ${unidLabel}</td>
              <td>${e.statusValidacao==='validado'? '<span class="badge badge-green">Validado</span>' : '<span class="badge badge-amber">Pendente</span>'}</td>
              ${podeEditarDados()? `<td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-ghost btn-sm" onclick="abrirFormEntrega('${e.id}')">${icon('edit',16)}</button>
                ${STATE.isAdmin? `<button class="btn btn-ghost btn-sm" onclick="confirmarExcluirEntrega('${e.id}')" style="color:var(--vermelho);">${icon('trash',16)}</button>` : ''}
              </td>` : ''}
            </tr>`;
          }).join('')}
        </tbody></table>
      `;
    }
  }
  renderTabelaTransferencias(mes,ano);
  renderTabelaTrocas();
}
function partesTransferencia(t){
  const campanhaOrigem=t.campanhaOrigemId||t.campanhaId;
  const campanhaDestino=t.campanhaDestinoId||t.campanhaId;
  const categoriaOrigem=t.categoriaOrigem||t.categoriaOrigemRef;
  const categoriaDestino=t.categoriaDestino||t.categoriaDestinoRef;
  return {
    origem:STATE.colaboradores.find(x=>x.id===(t.colaboradorOrigemId||t.colaboradorOrigemNomeId)),
    destino:STATE.colaboradores.find(x=>x.id===(t.colaboradorDestinoId||t.colaboradorDestinoNomeId)),
    catOrigem:resolverCategoria(campanhaOrigem,categoriaOrigem),
    catDestino:resolverCategoria(campanhaDestino,categoriaDestino),
    campanhaOrigem:campanhaPorId(campanhaOrigem),
    campanhaDestino:campanhaPorId(campanhaDestino),
  };
}
function renderTabelaTransferencias(mes,ano){
  const wrap = document.getElementById('tabelaTransferenciasWrap');
  if(!wrap) return;
  const campanhaId = STATE.campanhaSelecionadaId;
  const lista = transferenciasDoMes(campanhaId, mes,ano).slice().sort((a,b)=>b.data.localeCompare(a.data));
  if(lista.length===0){ wrap.innerHTML = `<div class="table-empty">Nenhuma transferência registrada neste mês.</div>`; return; }
  wrap.innerHTML = `
    <table><thead><tr><th>Data</th><th>De</th><th>Para</th><th class="table-cell-center">Qtd.</th><th>Motivo</th>${STATE.isAdmin?'<th></th>':''}</tr></thead>
    <tbody>
      ${lista.map(t=>{
        const catOrigem = resolverCategoria(t.campanhaOrigemId||campanhaId, t.categoriaOrigem||t.categoriaOrigemRef);
        const catDestino = resolverCategoria(t.campanhaDestinoId||campanhaId, t.categoriaDestino||t.categoriaDestinoRef);
        const origem = STATE.colaboradores.find(x=>x.id===(t.colaboradorOrigemId||t.colaboradorOrigemNomeId));
        const destino = STATE.colaboradores.find(x=>x.id===(t.colaboradorDestinoId||t.colaboradorDestinoNomeId));
        const campanhaOutra = t.entreCampanhas?campanhaPorId(t.campanhaDestinoId||t.campanhaOrigemId):null;
        const etiquetaCampanha = campanhaOutra?`<br><span class="badge">${t.campanhaDestinoId?'Enviado para':'Recebido de'}: ${escapeHtml(campanhaOutra.nome)}</span>`:'';
        return `<tr>
          <td>${formatarData(t.data)}</td>
          <td>${escapeHtml(origem?origem.nome:'(removido)')} <span class="small-note">— ${catOrigem?escapeHtml(catOrigem.label.split(' (')[0]):''}</span>${t.campanhaOrigemId?etiquetaCampanha:''}</td>
          <td>${escapeHtml(destino?destino.nome:'(removido)')} <span class="small-note">— ${catDestino?escapeHtml(catDestino.label.split(' (')[0]):''}</span>${t.campanhaDestinoId?etiquetaCampanha:''}</td>
          <td class="table-cell-center">${t.quantidade}</td>
          <td>${escapeHtml(t.motivo||'—')}</td>
          ${STATE.isAdmin? `<td style="text-align:right;"><button class="btn btn-ghost btn-sm" onclick="confirmarExcluirTransferencia('${t.id}')" style="color:var(--vermelho);">${icon('trash',16)}</button></td>` : ''}
        </tr>`;
      }).join('')}
    </tbody></table>
  `;
}
function abrirFormEntrega(id){
  if(!exigirOperador()) return;
  const e = id? STATE.entregas.find(x=>x.id===id) : null;
  if(STATE.colaboradores.length===0){ alert('Cadastre ao menos um colaborador antes de registrar entregas.'); return; }
  const campanha = campanhaPorId(STATE.campanhaSelecionadaId);
  const catOpcoes = categoriasDaCampanha(campanha).map(c=>`<option value="${c.key}" ${e&&e.tipo===c.key?'selected':''}>${escapeHtml(c.label)}</option>`).join('')
    + `<option value="${TIPO_OUTROS}" ${e&&e.tipo===TIPO_OUTROS?'selected':''}>Outros materiais aceitos</option>`;
  abrirModal(`
    <div class="modal-head"><h3>${e?'Editar entrega':'Nova entrega'}</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <div class="banner" style="margin-bottom:14px;"><span>${icon('ranking')}</span><div>Campanha: <b>${escapeHtml(campanha?campanha.nome:'—')}</b></div></div>
    <div class="grid grid-2">
      <div class="field"><label>Data da entrega</label><input type="date" id="fData" value="${e?e.data:dataCivilHojeISO()}"></div>
      <div class="field"><label>Colaborador</label><select id="fColab">${STATE.colaboradores.filter(c=>c.status==='ativo'||c.id===(e&&e.colaboradorId)).map(c=>`<option value="${c.id}" ${e&&e.colaboradorId===c.id?'selected':''}>${escapeHtml(c.nome)}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Tipo de material</label><select id="fTipo" onchange="atualizarCampoUnidadeEntrega()" ${e?'disabled':''}>${catOpcoes}</select></div>
    <div class="grid grid-2">
      <div class="field"><label>Quantidade</label><input type="number" min="0" step="1" id="fQtd" value="${e?e.quantidade:''}"></div>
      <div class="field" id="campoUnidadeWrap"><label>Unidade</label><div id="campoUnidade"></div></div>
    </div>
    <div class="field"><label>Responsável pela contagem</label><input type="text" id="fResp" value="${e?escapeHtml(e.responsavelContagem||''):''}" placeholder="Ex: Encarregada Financeira"></div>
    <div class="field"><label>Observações</label><textarea id="fObs" rows="2" placeholder="Opcional">${e?escapeHtml(e.observacoes||''):''}</textarea></div>
    <div class="field"><label>Status da validação</label>
      <select id="fStatusValid">
        <option value="pendente" ${!e||e.statusValidacao==='pendente'?'selected':''}>Pendente</option>
        <option value="validado" ${e&&e.statusValidacao==='validado'?'selected':''}>Validado (conta no ranking)</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline btn-block" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary btn-block" onclick="salvarEntrega('${id||''}')">${icon('check',16)}Salvar</button>
    </div>
  `);
  setTimeout(()=>atualizarCampoUnidadeEntrega(e),30);
}
function atualizarCampoUnidadeEntrega(e){
  const tipo = document.getElementById('fTipo').value;
  const holder = document.getElementById('campoUnidade');
  if(tipo==='latinhas'){
    holder.innerHTML = `<select id="fUnidade" onchange="atualizarPassoQuantidadeEntrega()"><option value="unidades" ${e&&e.unidade==='unidades'?'selected':''}>Unidades (latinhas)</option><option value="kg" ${e&&e.unidade==='kg'?'selected':''}>Quilogramas (kg)</option></select>`;
  } else if(tipo===TIPO_OUTROS){
    holder.innerHTML = `<input type="text" id="fUnidade" value="${e&&e.unidade?escapeHtml(e.unidade):'unidades'}" placeholder="Ex: kg, sacos, unidades">`;
  } else {
    const cat = resolverCategoria(STATE.campanhaSelecionadaId, tipo);
    holder.innerHTML = `<input type="text" value="${cat?cat.unidade:''}" disabled style="background:#F3F5F3;color:var(--text-muted);"><input type="hidden" id="fUnidade" value="unidades">`;
  }
  atualizarPassoQuantidadeEntrega();
}
function atualizarPassoQuantidadeEntrega(){
  const quantidade=document.getElementById('fQtd');
  const tipo=document.getElementById('fTipo')?.value;
  const unidade=document.getElementById('fUnidade')?.value||'unidades';
  if(quantidade) quantidade.step=tipo==='latinhas'&&unidade==='kg'?'0.1':'1';
}
window.atualizarCampoUnidadeEntrega = atualizarCampoUnidadeEntrega;
window.atualizarPassoQuantidadeEntrega = atualizarPassoQuantidadeEntrega;
async function salvarEntrega(id){
  if(!exigirOperador()) return;
  const anteriores=STATE.entregas.map(e=>({...e}));
  const entregaOriginal=id?STATE.entregas.find(x=>x.id===id):null;
  if(id && !entregaOriginal){ alert('A entrega não foi encontrada. Atualize a página e tente novamente.'); return; }
  const data = document.getElementById('fData').value;
  const colaboradorId = document.getElementById('fColab').value;
  const tipo = entregaOriginal?entregaOriginal.tipo:document.getElementById('fTipo').value;
  const quantidade = parseFloat(document.getElementById('fQtd').value);
  const unidadeEl = document.getElementById('fUnidade');
  const unidade = unidadeEl ? unidadeEl.value : 'unidades';
  const responsavelContagem = document.getElementById('fResp').value.trim();
  const observacoes = document.getElementById('fObs').value.trim();
  const statusValidacao = document.getElementById('fStatusValid').value;
  if(!data || !colaboradorId || !tipo || isNaN(quantidade) || quantidade<0){ alert('Preencha data, colaborador, tipo de material e uma quantidade válida.'); return; }
  if(!dataISORegistroExpressValida(data)){ alert('Informe uma data civil válida.'); return; }
  if(!ReciclarRankingLogic.quantidadeUnitariaValida(quantidade,tipo==='latinhas'&&unidade==='kg')){
    alert('A quantidade desta categoria precisa ser informada em unidades inteiras.');
    return;
  }
  const campanhaId = entregaOriginal?entregaOriginal.campanhaId:STATE.campanhaSelecionadaId;
  const validacao = dataDentroDaCampanha(campanhaId, data);
  if(!validacao.ok){ alert(validacao.motivo); return; }
  const payload = {data,colaboradorId,tipo,quantidade,unidade,responsavelContagem,observacoes,statusValidacao,campanhaId};
  if(id){
    const idx = STATE.entregas.findIndex(x=>x.id===id);
    STATE.entregas[idx] = {...STATE.entregas[idx], ...payload};
  } else {
    STATE.entregas.push({id:uid(), criadoEm:Date.now(), ...payload});
  }
  try{
    await garantirSnapshotMetas(campanhaId, +data.slice(5,7), +data.slice(0,4));
    if(!await salvarEntregas()) throw new Error('O Firebase recusou a gravação.');
  }catch(e){
    STATE.entregas=anteriores;
    console.error('Erro ao salvar entrega',e);
    alert(e.message || 'Não foi possível salvar a entrega. Atualize a página e tente novamente.');
    return;
  }
  fecharModal(); renderApp();
}
function confirmarExcluirEntrega(id){
  if(!exigirAdmin()) return;
  abrirModal(`
    <div class="modal-head"><h3>Excluir entrega</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <p>Tem certeza que deseja excluir este registro de entrega? Ele poderá ser restaurado em "Itens apagados" por até 30 dias.</p>
    <div class="modal-actions">
      <button class="btn btn-outline btn-block" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-danger btn-block" onclick="excluirEntrega('${id}')">${icon('trash',16)}Excluir</button>
    </div>
  `);
}
async function excluirEntrega(id){
  if(!exigirAdmin()) return;
  if(!await moverRegistroParaLixeira('entregas',id)){ alert('Não foi possível mover a entrega para Itens apagados. Atualize a página e tente novamente.'); return; }
  fecharModal(); renderApp();
}
function renderSaldoTransportado(mes,ano){
  const wrap = document.getElementById('saldoTransportadoWrap');
  if(!wrap) return;
  const campanhaId = STATE.campanhaSelecionadaId;
  const lista=dadosExcedentesDoMes(campanhaId,mes,ano);
  window._excedentesPorColaborador = lista;
  if(lista.length===0){
    wrap.innerHTML=`<div class="empty-state">Nenhum excedente trazido de meses anteriores neste período.</div>`;
    return;
  }
  wrap.innerHTML = `
    <div class="stat-label">Excedente trazido de meses anteriores para ${nomeMes(mes)}/${ano}</div>
    <p class="small-note" style="margin:4px 0 10px 0;">Crédito que sobrou da meta batida em meses passados, já incluído automaticamente no cálculo deste mês. ${lista.length} colaborador(es) com excedente.</p>
    <div class="table-wrap">
      <table><thead><tr><th>Colaborador</th><th>Setor</th><th class="table-cell-center">Categorias com excedente</th><th class="table-cell-center">Total excedente</th><th></th></tr></thead>
      <tbody>
        ${lista.map((item,i)=>`
          <tr>
            <td style="font-weight:700;">${escapeHtml(item.colaborador.nome)}</td>
            <td>${escapeHtml(item.colaborador.setor||'—')}</td>
            <td class="table-cell-center">${item.itens.length}</td>
            <td class="table-cell-center"><span class="badge badge-green">+${Math.round(item.total).toLocaleString('pt-BR')}</span></td>
            <td style="text-align:right;"><button class="btn btn-ghost btn-sm" onclick="abrirDetalhesExcedente(${i})">Ver detalhes</button></td>
          </tr>`).join('')}
      </tbody></table>
    </div>
  `;
}
function dadosExcedentesDoMes(campanhaId,mes,ano){
  const chave=chaveMA(mes,ano);
  const saldos=calcularSaldosAcumulados(campanhaId,mes,ano);
  const porColaborador={};
  const categorias=categoriasDaCampanha(campanhaPorId(campanhaId));
  STATE.colaboradores.forEach(colaborador=>{
    categorias.forEach(categoria=>{
      const saldo=saldos[colaborador.id]?.[categoria.key]?.[chave];
      if(!saldo || saldo.carryIn<=0) return;
      if(!porColaborador[colaborador.id]){
        porColaborador[colaborador.id]={colaborador,total:0,itens:[]};
      }
      porColaborador[colaborador.id].total+=saldo.carryIn;
      porColaborador[colaborador.id].itens.push({
        key:categoria.key,
        categoria:categoria.label.split(' (')[0],
        unidade:categoria.unidade,
        valor:saldo.carryIn,
      });
    });
  });
  return Object.values(porColaborador).sort((a,b)=>b.total-a.total);
}
function abrirDetalhesExcedente(indice){
  const item = (window._excedentesPorColaborador||[])[indice];
  if(!item) return;
  abrirModal(`
    <div class="modal-head"><h3>Excedente de ${escapeHtml(item.colaborador.nome)}</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <div class="table-wrap"><table><thead><tr><th>Material</th><th class="table-cell-center">Excedente trazido</th></tr></thead>
      <tbody>${item.itens.map(it=>`<tr><td>${escapeHtml(it.categoria)}</td><td class="table-cell-center">+${Math.round(it.valor).toLocaleString('pt-BR')}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="small-note" style="margin-top:12px;">Total: <b>+${Math.round(item.total).toLocaleString('pt-BR')}</b> unidades equivalentes.</p>
  `);
}
window.abrirDetalhesExcedente = abrirDetalhesExcedente;
window.renderSaldoTransportado = renderSaldoTransportado;
window.abrirFormEntrega=abrirFormEntrega; window.salvarEntrega=salvarEntrega;
window.confirmarExcluirEntrega=confirmarExcluirEntrega; window.excluirEntrega=excluirEntrega;
window.renderTabelaEntregas=renderTabelaEntregas; window.renderTabelaTransferencias=renderTabelaTransferencias;

