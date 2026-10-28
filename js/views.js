/* ---------- ÍCONES (inline SVG, stroke=currentColor) ---------- */
const ICONS = {
  dashboard:'<path d="M4 13h6V4H4v9zM14 20h6v-9h-6v9zM14 4v5h6V4h-6zM4 20h6v-5H4v5z"/>',
  folhas:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 12h7M9 16h7"/>',
  colaboradores:'<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="9" r="2.4"/><path d="M15 20c.2-2.6 1.8-4.4 4-4.9"/>',
  entregas:'<path d="M4 8l8-4 8 4-8 4-8-4z"/><path d="M4 8v8l8 4 8-4V8"/><path d="M12 12v8"/>',
  registro:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  ranking:'<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a3 3 0 0 0 3 5"/><path d="M17 6h3a3 3 0 0 1-3 5"/>',
  historico:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/>',
  relatorios:'<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/><path d="M9 13h6M9 17h6M9 9h3"/>',
  config:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/>',
  more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  logout:'<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>',
  login:'<path d="M14 7l5 5-5 5"/><path d="M19 12H7"/><path d="M12 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  trash:'<path d="M3 6h18"/><path d="M8 6V4h8v2M6 6l1 15h10l1-15"/>',
  check:'<path d="M20 6L9 17l-5-5"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.7 1.2c-.8 1.1-2.3 1.4-2.3 3.3"/><path d="M12 17h.01"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  x:'<path d="M18 6L6 18M6 6l12 12"/>',
  upload:'<path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 18v2h16v-2"/>',
  download:'<path d="M12 4v12M6 12l6 6 6-6"/><path d="M4 20h16"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.7"/><path d="M21 16l-5.5-5.5L4 21"/>',
  filter:'<path d="M4 5h16M7 12h10M10 19h4"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M2.5 19.5c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5"/><circle cx="17.5" cy="9" r="2"/><path d="M15.2 14.3c2-.3 3.8 1.2 3.8 5.2"/>',
};
function icon(name,size=18){ return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||''}</svg>`; }

/* ---------- ROTEAMENTO / RENDER RAIZ ---------- */
const NAV_ITEMS_BASE = [
  {key:'dashboard', label:'Painel geral', icon:'dashboard'},
  {key:'colaboradores', label:'Colaboradores', icon:'colaboradores'},
  {key:'entregas', label:'Entregas', icon:'entregas'},
  {key:'registro-express', label:'Registro express', icon:'registro'},
  {key:'ranking', label:'Ranking mensal', icon:'ranking'},
  {key:'historico', label:'Histórico', icon:'historico'},
  {key:'relatorios', label:'Relatórios', icon:'relatorios'},
];
const NAV_ITEM_TRASH = {key:'lixeira', label:'Itens apagados', icon:'trash'};
const NAV_ITEM_FOLHAS = {key:'folhas', label:'Emissão de fichas', icon:'folhas'};
const NAV_ITEM_CONFIG = {key:'config', label:'Configurações', icon:'config'};
function navItemsVisiveis(){
  const itens = STATE.isAdmin
    ? [...NAV_ITEMS_BASE, NAV_ITEM_TRASH, NAV_ITEM_CONFIG]
    : NAV_ITEMS_BASE.filter(n=>n.key!=='relatorios');
  return itens;
}
function renderBotaoNotificacoesTroca(){
  const quantidade=STATE.solicitacoesTrocaPublicas.length;
  return `<button class="notification-button" type="button" aria-label="Notificações de troca${quantidade?`: ${quantidade} pendentes`:''}" title="Solicitações de troca" onclick="abrirNotificacoesTroca()">
    ${icon('bell',20)}${quantidade?`<span class="notification-count">${quantidade>99?'99+':quantidade}</span>`:''}
  </button>`;
}
function conteudoNotificacoesTroca(){
  const pedidos=STATE.solicitacoesTrocaPublicas;
  return `<div class="modal-head"><h3>Solicitações de troca${pedidos.length?` (${pedidos.length})`:''}</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    ${STATE.solicitacoesTrocaError?`<p class="auth-error" role="alert">${escapeHtml(STATE.solicitacoesTrocaError)}</p>`:''}
    ${pedidos.length?`<div class="swap-request-list">${pedidos.map(pedido=>{
      const data=pedido.solicitadoEm && typeof pedido.solicitadoEm.toDate==='function'
        ?pedido.solicitadoEm.toDate().toLocaleString('pt-BR')
        :'data desconhecida';
      const origem=STATE.colaboradores.find(colaborador=>colaborador.id===pedido.colaboradorOrigemId);
      const destino=STATE.colaboradores.find(colaborador=>colaborador.id===pedido.colaboradorDestinoId);
      const campanha=campanhaPorId(pedido.campanhaId);
      const materialOrigem=campanha&&categoriasDaCampanha(campanha).find(categoria=>categoria.key===pedido.categoriaOrigem);
      const materialDestino=campanha&&categoriasDaCampanha(campanha).find(categoria=>categoria.key===pedido.categoriaDestino);
      const nomeOrigem=origem?origem.nome:`${pedido.colaboradorOrigemNome} (não cadastrado)`;
      const nomeDestino=destino?destino.nome:`${pedido.colaboradorDestinoNome} (não cadastrado)`;
      const nomeMaterialOrigem=materialOrigem?materialOrigem.label.split(' (')[0]:pedido.materialOrigemNome;
      const nomeMaterialDestino=materialDestino?materialDestino.label.split(' (')[0]:pedido.materialDestinoNome;
      const ocupado=STATE.solicitacaoTrocaBusyId===pedido.id;
      return `<article class="swap-request-card">
        <p><b>${escapeHtml(nomeOrigem)}</b> oferece <b>${pedido.quantidadeOrigem.toLocaleString('pt-BR')} ${escapeHtml(nomeMaterialOrigem)}</b> para <b>${escapeHtml(nomeDestino)}</b> em troca de <b>${pedido.quantidadeDestino.toLocaleString('pt-BR')} ${escapeHtml(nomeMaterialDestino)}</b>.</p>
        <p class="small-note">${escapeHtml(pedido.campanhaNome)} · Pedido enviado ${escapeHtml(data)}</p>
        <p class="small-note">Os nomes foram selecionados sem autenticação. Confirme a troca com os colaboradores antes de aprovar.</p>
        <div class="swap-request-actions">
          <button class="btn btn-primary btn-block" type="button" onclick="decidirSolicitacaoTroca('${escapeHtml(pedido.id)}','aprovada')" ${ocupado?'disabled':''}>${icon('check',16)}Aceitar</button>
          <button class="btn btn-outline btn-block" type="button" onclick="decidirSolicitacaoTroca('${escapeHtml(pedido.id)}','rejeitada')" ${ocupado?'disabled':''}>Rejeitar</button>
        </div>
      </article>`;
    }).join('')}</div>`:'<p class="small-note">Não há solicitações pendentes.</p>'}`;
}
function abrirNotificacoesTroca(){
  if(!exigirAdmin()) return;
  abrirModal(conteudoNotificacoesTroca(),false,'swap-notifications');
}
function atualizarModalNotificacoesTroca(){
  const modal=document.querySelector('#modalOverlay .modal-swap-notifications');
  if(modal) modal.innerHTML=conteudoNotificacoesTroca();
}
window.abrirNotificacoesTroca=abrirNotificacoesTroca;
async function alterarManutencaoPublica(ativada){
  if(!exigirAdmin()) return;
  if(STATE.salvandoManutencaoPublica) return;
  const anterior=STATE.manutencaoPublica;
  STATE.manutencaoPublica=ativada;
  STATE.salvandoManutencaoPublica=true;
  STATE.erroManutencaoPublica='';
  const checkbox=document.getElementById('manutencaoPublicaCheckbox');
  const erroElemento=document.getElementById('manutencaoPublicaErro');
  if(checkbox){checkbox.checked=ativada;checkbox.disabled=true;}
  if(erroElemento){erroElemento.textContent='';erroElemento.hidden=true;}
  try{
    if(STORAGE_MODE==='firestore'){
      await FIREBASE_DB.collection('reciclar-apac-public-settings').doc('maintenance').set({
        ativada,
        atualizadoEm:new Date().toISOString(),
      },{merge:true});
    }else{
      STATE.config.manutencaoPublica=ativada;
      if(!await salvarConfig()) throw STORAGE_ERRORS.get('config')||new Error('Não foi possível salvar a configuração local.');
    }
  }catch(erro){
    STATE.manutencaoPublica=anterior;
    if(STORAGE_MODE!=='firestore') STATE.config.manutencaoPublica=anterior;
    STATE.erroManutencaoPublica=erro.message||'Não foi possível atualizar o aviso público.';
    if(checkbox) checkbox.checked=anterior;
    if(erroElemento){
      erroElemento.textContent=STATE.erroManutencaoPublica;
      erroElemento.hidden=false;
    }
    console.error('Erro ao atualizar o modo de manutenção público',erro);
  }finally{
    STATE.salvandoManutencaoPublica=false;
    if(checkbox) checkbox.disabled=false;
  }
}
window.alterarManutencaoPublica=alterarManutencaoPublica;
async function salvarSenhaSolicitacaoTroca(){
  if(!exigirAdmin()) return;
  if(STATE.salvandoSenhaSolicitacaoTroca) return;
  const input=document.getElementById('senhaSolicitacaoTrocaInput');
  const senha=(input?.value||'').trim();
  const erroElemento=document.getElementById('senhaSolicitacaoTrocaErro');
  if(senha.length>200){
    STATE.erroSenhaSolicitacaoTroca='A senha pode ter no máximo 200 caracteres.';
    if(erroElemento){ erroElemento.textContent=STATE.erroSenhaSolicitacaoTroca; erroElemento.hidden=false; }
    return;
  }
  STATE.salvandoSenhaSolicitacaoTroca=true;
  STATE.erroSenhaSolicitacaoTroca='';
  renderApp();
  try{
    if(STORAGE_MODE==='firestore'){
      await FIREBASE_DB.collection(PUBLIC_SETTINGS_COLLECTION).doc(SENHA_SOLICITACAO_TROCA_DOC).set({
        senha,
        atualizadoEm:new Date().toISOString(),
      });
    }else{
      STATE.config.senhaSolicitacaoTroca=senha;
      if(!await salvarConfig()) throw STORAGE_ERRORS.get('config')||new Error('Não foi possível salvar a configuração local.');
    }
    STATE.senhaSolicitacaoTroca=senha;
  }catch(erro){
    console.error('Erro ao salvar a senha de solicitação de troca',erro);
    STATE.erroSenhaSolicitacaoTroca=erro.message||'Não foi possível salvar a senha.';
  }finally{
    STATE.salvandoSenhaSolicitacaoTroca=false;
    renderApp();
  }
}
window.salvarSenhaSolicitacaoTroca=salvarSenhaSolicitacaoTroca;
function irPara(view){
  if((view==='config' || view==='relatorios' || view==='lixeira' || view==='folhas') && !STATE.isAdmin){ exigirAdmin(); return; }
  if(view==='registro-express' && !exigirOperador()) return;
  STATE.view=view;
  renderApp();
  // O shell fica no lugar; zera a rolagem depois de trocar apenas o conteúdo.
  window.scrollTo({top:0,left:0,behavior:'auto'});
}
window.irPara = irPara;
function renderTelaAutenticacao(){
  if(STATE.loginCarregando){
    return `<main class="login-loading-overlay" role="status" aria-live="polite">
      <span class="login-loading-spinner" aria-hidden="true"></span>
      <strong>Verificando seu acesso...</strong>
      <span class="small-note" style="color:rgba(255,255,255,.8);">Aguarde enquanto validamos sua conta.</span>
    </main>`;
  }
  if(STATE.authUser){
    return `<main class="auth-screen"><section class="card auth-card">
      <h1>${STATE.authLoadFailed?'Falha ao carregar o acesso':'Acesso não autorizado'}</h1>
      <p>${STATE.authLoadFailed
        ?`Não foi possível carregar os dados desta sessão (${escapeHtml(STATE.authUser.email||'sem e-mail')}).`
        :`Esta conta (${escapeHtml(STATE.authUser.email||'sem e-mail')}) ainda não tem um perfil de acesso.`}</p>
      ${STATE.authLoadFailed?'':`<p class="small-note">Peça ao administrador para atribuir o perfil no Firebase e entre novamente.</p>`}
      ${STATE.authError? `<p class="auth-error">${escapeHtml(STATE.authError)}</p>`:''}
      <button class="btn btn-outline btn-block" onclick="sairAdmin()">Sair</button>
      <button class="btn btn-ghost btn-block" onclick="voltarAoRankingPublico()">Ver ranking público</button>
    </section></main>`;
  }
  return `<main class="auth-screen"><section class="card auth-card">
    <h1>Entrar no painel</h1>
    <p class="small-note">Entre com sua conta autorizada para o acesso administrativo.</p>
    <form onsubmit="event.preventDefault();confirmarLoginAdmin()">
      <div class="field"><label for="authEmail">E-mail</label><input id="authEmail" type="email" autocomplete="username" value="${escapeHtml(STATE.authEmail)}" required></div>
      <div class="field"><label for="authPassword">Senha</label><input id="authPassword" type="password" autocomplete="current-password" required></div>
      ${STATE.authError? `<p class="auth-error" role="alert">${escapeHtml(STATE.authError)}</p>`:''}
      ${STATE.authNotice? `<p class="small-note" role="status">${escapeHtml(STATE.authNotice)}</p>`:''}
      <button class="btn btn-primary btn-block" type="submit">Entrar</button>
    </form>
    <button class="btn btn-ghost btn-block" type="button" onclick="solicitarRedefinicaoSenhaLogin()">Esqueci minha senha</button>
    <button class="btn btn-ghost btn-block" onclick="voltarAoRankingPublico()">Voltar ao ranking público</button>
  </section></main>`;
}

function formatarMesRankingPublico(mes, ano){
  return `${nomeMes(mes)} de ${ano}`;
}
function rankingPublicoPorId(id){
  return STATE.rankingsPublicos.find(ranking=>ranking.id===id) || null;
}
function renderRodapePublico(){
  const anoAtual = new Date().getFullYear();
  return `<footer class="public-site-footer" aria-label="Informações legais">
    <span>© ${anoAtual} Reciclapac · Desenvolvido por <a href="https://github.com/willamartius" target="_blank" rel="noopener noreferrer">willamartius</a></span>
    <nav aria-label="Links legais">
      <a href="termos.html" target="_blank" rel="noopener noreferrer">Termos de Uso</a>
      <a href="privacidade.html" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>
    </nav>
  </footer>`;
}

function sanitizarAvisoPublicoHtml(conteudo, limite=1000){
  const textoOriginal=String(conteudo||'');
  let documento=new DOMParser().parseFromString(textoOriginal,'text/html');
  // Se o usuário colou tags como texto puro, decodifica uma camada e interpreta apenas HTML permitido.
  const textoColado=documento.body.textContent||'';
  if(!documento.body.children.length && /<\/?(?:b|strong|i|em|u|p|br|div|ul|ol|li|a)\b/i.test(textoColado)){
    documento=new DOMParser().parseFromString(textoColado,'text/html');
  }
  const permitidas=new Set(['B','STRONG','I','EM','U','P','DIV','BR','UL','OL','LI','A','FONT','SPAN']);
  const limpar=no=>{
    [...no.childNodes].forEach(filho=>{
      if(filho.nodeType===Node.COMMENT_NODE){filho.remove();return;}
      if(filho.nodeType!==Node.ELEMENT_NODE)return;
      if(!permitidas.has(filho.tagName)){filho.replaceWith(...filho.childNodes);return;}
      if(filho.tagName==='DIV'){
        const paragrafo=documento.createElement('p');
        while(filho.firstChild) paragrafo.appendChild(filho.firstChild);
        filho.replaceWith(paragrafo);
        limpar(paragrafo);
        return;
      }
      const href=filho.tagName==='A'?filho.getAttribute('href'):null;
      const corFonte=filho.tagName==='FONT'?filho.getAttribute('color'):filho.style?.color;
      const tamanhoFonte=filho.tagName==='FONT'?filho.getAttribute('size'):filho.style?.fontSize;
      if(filho.tagName==='FONT'||filho.tagName==='SPAN'){
        const coresPermitidas=new Set(['#202820','#176b3a','#1d4ed8','#b42318','#9333ea','#d97706']);
        const mapaTamanhos={'1':'10px','2':'12px','3':'14px','4':'16px','5':'18px','6':'24px','7':'32px'};
        const tamanhoNormalizado=mapaTamanhos[String(tamanhoFonte||'')]||(/^\\d+(?:\\.\\d+)?px$/.test(String(tamanhoFonte||''))?String(tamanhoFonte):null);
        const corNormalizada=String(corFonte||'').trim().toLowerCase();
        const span=documento.createElement('span');
        if(tamanhoNormalizado&&['10px','12px','14px','16px','18px','24px','32px'].includes(tamanhoNormalizado))span.style.fontSize=tamanhoNormalizado;
        if(coresPermitidas.has(corNormalizada))span.style.color=corNormalizada;
        while(filho.firstChild)span.appendChild(filho.firstChild);
        if(span.attributes.length)filho.replaceWith(span);
        else filho.replaceWith(...span.childNodes);
        limpar(no);
        return;
      }
      [...filho.attributes].forEach(a=>filho.removeAttribute(a.name));
      if(filho.tagName==='A'){
        if(href&&/^https?:\\/\\//i.test(href.trim())){
          filho.setAttribute('href',href.trim());
          filho.setAttribute('target','_blank');
          filho.setAttribute('rel','noopener noreferrer');
        }else{filho.replaceWith(...filho.childNodes);return;}
      }
      limpar(filho);
    });
  };
  limpar(documento.body);
  let restantes=Math.max(0,Number(limite)||0);
  const limitar=no=>{[...no.childNodes].forEach(filho=>{
    if(restantes<=0){filho.remove();return;}
    if(filho.nodeType===Node.TEXT_NODE){if(filho.textContent.length>restantes)filho.textContent=filho.textContent.slice(0,restantes);restantes-=filho.textContent.length;}
    else if(filho.nodeType===Node.ELEMENT_NODE)limitar(filho);
  });};
  limitar(documento.body);
  return documento.body.innerHTML;
}
window.sanitizarAvisoPublicoHtml=sanitizarAvisoPublicoHtml;

function renderAvisoManutencaoPublica(){
  return `<div class="public-page-shell"><main class="auth-screen public-ranking-screen">
    <section class="card public-ranking-card maintenance-card">
      <div class="maintenance-illustration">
        <img src="maintenance-working-kitten.png" alt="Gatinho trabalhando no computador" loading="lazy">
      </div>
      <h1 class="maintenance-title">Estamos em manutenção</h1>
      <span class="badge badge-amber maintenance-badge">Voltaremos em breve</span>
      ${STATE.avisoManutencaoPublico?`<div class="public-configured-notice">${sanitizarAvisoPublicoHtml(STATE.avisoManutencaoPublico)}</div>`:'' }
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
        <button class="btn btn-outline" type="button" onclick="abrirLoginAdmin()">Painel administrativo</button>
      </div>
    </section>
  </main></div>`;
}
function renderRankingPublico(){
  if(STATE.mostrarLogin) return renderTelaAutenticacao();
  if(STATE.manutencaoPublica) return renderAvisoManutencaoPublica();
  const rankingsOrdenados=[...STATE.rankingsPublicos].sort((a,b)=>(b.ano*12+b.mes)-(a.ano*12+a.mes));
  const campanhasPublicas=[...new Map(rankingsOrdenados.map(item=>[item.campanhaId,{id:item.campanhaId,nome:item.campanhaNome}])).values()]
    .sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  const selecionadoAnterior=rankingPublicoPorId(STATE.rankingPublicoSelecionadoId);
  const campanhaId=campanhasPublicas.some(item=>item.id===STATE.rankingPublicoCampanhaId)
    ? STATE.rankingPublicoCampanhaId
    : (selecionadoAnterior&&campanhasPublicas.some(item=>item.id===selecionadoAnterior.campanhaId)
      ? selecionadoAnterior.campanhaId
      : (campanhasPublicas[0]||{}).id||'');
  STATE.rankingPublicoCampanhaId=campanhaId;
  const periodosPublicos=rankingsOrdenados.filter(item=>item.campanhaId===campanhaId);
  const ranking=periodosPublicos.find(item=>item.id===STATE.rankingPublicoSelecionadoId)
    || periodosPublicos[0]
    || null;
  if(ranking) STATE.rankingPublicoSelecionadoId=ranking.id;
  const opcoesCampanha=campanhasPublicas
    .map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===campanhaId?'selected':''}>${escapeHtml(item.nome)}</option>`)
    .join('');
  const opcoesPeriodo=periodosPublicos
    .map(item=>`<option value="${escapeHtml(item.id)}" ${ranking&&item.id===ranking.id?'selected':''}>${escapeHtml(formatarMesRankingPublico(item.mes,item.ano))}</option>`)
    .join('');
  const mostraDetalhes=!!ranking&&ranking.ranking.some(item=>item.detalhes&&item.detalhes.length);
  return `<div class="public-page-shell"><main class="auth-screen public-ranking-screen">
    <section class="card public-ranking-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:18px;">
        <div><h1 style="margin:0 0 6px;color:var(--verde-900);">Ranking Reciclapac</h1><p class="small-note" style="margin:0;">Acompanhe suas entregas e as dos demais colaboradores.</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
          <button class="btn btn-primary" type="button" onclick="abrirSolicitacaoTrocaPublica()">Solicitar troca</button>
          <button class="btn btn-outline" type="button" onclick="abrirLoginAdmin()">Painel administrativo</button>
        </div>
      </div>
      ${STATE.avisoRankingPublico?`<div class="public-configured-notice" role="status">${sanitizarAvisoPublicoHtml(STATE.avisoRankingPublico)}</div>`:''}
      ${STATE.erroRankingPublico? `<p class="auth-error" role="alert">${escapeHtml(STATE.erroRankingPublico)}</p>`:''}
      ${STATE.rankingsPublicos.length? `
        <div class="public-ranking-filters">
          <div class="field"><label for="seletorCampanhaPublica">Campanha</label><select id="seletorCampanhaPublica" onchange="selecionarCampanhaRankingPublico(this.value)">${opcoesCampanha}</select></div>
          <div class="field"><label for="seletorPeriodoPublico">Mês e ano</label><select id="seletorPeriodoPublico" onchange="selecionarRankingPublico(this.value)">${opcoesPeriodo}</select></div>
        </div>
        <h2 style="font-size:18px;color:var(--verde-900);">${escapeHtml(formatarMesRankingPublico(ranking.mes,ranking.ano))}</h2>
        ${ranking.ranking.length?`<div class="table-wrap public-ranking-table"><table><thead><tr><th>Posição</th><th>Colaborador</th><th>${ranking.ranking.some(item=>item.kit)?'Resgates':'Pontuação'}</th>${mostraDetalhes?'<th>Detalhes</th>':''}</tr></thead>
          <tbody>${ranking.ranking.map((item,index)=>{
            const detalhesDisponiveis=!!(item.detalhes&&item.detalhes.length);
            const resumoTroca=item.resumoTroca;
            const rotuloTroca=resumoTroca
              ?resumoTroca.unidade.replace(/^./,letra=>letra.toLocaleUpperCase('pt-BR'))
              :'';
            const metaAtingida=detalhesDisponiveis&&ReciclarRankingLogic.resumirDetalhesCategorias(item.detalhes).metaAtingida;
            const botaoDestacado=ReciclarRankingLogic.deveDestacarBotaoPublico(metaAtingida,resumoTroca);
            const quadroDetalhes='<span class="public-details-frame"><strong>Detalhes</strong></span>';
            const quadrosDetalhes=metaAtingida
              ?quadroDetalhes+(resumoTroca
                ?`<span class="public-details-frame"><strong>${resumoTroca.quantidade.toLocaleString('pt-BR')}</strong><small>${escapeHtml(rotuloTroca)}</small></span><span class="public-details-frame"><strong>Detalhes</strong></span><span class="public-details-frame"><strong>${resumoTroca.quantidade.toLocaleString('pt-BR')}</strong><small>${escapeHtml(rotuloTroca)}</small></span>`
                :`<span class="public-details-frame"><strong>${Math.round(item.percentualGeral??item.pontuacao)}%</strong><small>da Meta</small></span><span class="public-details-frame"><strong>${(item.totalMateriais||0).toLocaleString('pt-BR')}</strong><small>Materiais</small></span><span class="public-details-frame"><strong>Detalhes</strong></span>`)
              :(resumoTroca&&botaoDestacado
                ?`${quadroDetalhes}<span class="public-details-frame"><strong>${resumoTroca.quantidade.toLocaleString('pt-BR')}</strong><small>${escapeHtml(rotuloTroca)}</small></span><span class="public-details-frame"><strong>Detalhes</strong></span><span class="public-details-frame"><strong>${resumoTroca.quantidade.toLocaleString('pt-BR')}</strong><small>${escapeHtml(rotuloTroca)}</small></span>`
                :quadroDetalhes);
            const botaoDetalhes=item.kit
              ?`<button class="btn btn-ghost btn-sm" type="button" onclick="abrirDetalhesRankingPublico(${index})">Detalhes</button>`
              :detalhesDisponiveis
              ?`<button class="btn btn-sm public-details-toggle${botaoDestacado?' is-achieved':''}" type="button" aria-label="Detalhes${resumoTroca?`. ${resumoTroca.quantidade} ${resumoTroca.unidade}.`:`. ${Math.round(item.percentualGeral??item.pontuacao)}% da meta, ${(item.totalMateriais||0).toLocaleString('pt-BR')} materiais.`} Abrir detalhes." onclick="abrirDetalhesRankingPublico(${index})"><span class="public-details-window" aria-hidden="true"><span class="public-details-track">${quadrosDetalhes}</span></span></button>`
              :`<button class="btn btn-ghost btn-sm" type="button" onclick="abrirDetalhesRankingPublico(${index})">Detalhes</button>`;
            const medalha=item.posicao===1?'🥇':item.posicao===2?'🥈':item.posicao===3?'🥉':'';
            return `<tr><td class="public-ranking-position"><span class="public-ranking-position-content"><b>${item.posicao?`${item.posicao}º`:'—'}</b>${medalha?`<span class="public-ranking-medal" aria-hidden="true">${medalha}</span>`:''}</span></td><td style="font-weight:700;">${escapeHtml(item.nome)}</td><td>${item.kit?`${(Number(item.kit.resgatesMes)||0).toLocaleString('pt-BR')} ${(Number(item.kit.resgatesMes)||0)===1?'cartela':'cartelas'}`:`${item.pontuacao.toFixed(0)} pts`}</td>${mostraDetalhes?`<td>${detalhesDisponiveis?botaoDetalhes:'<span class="small-note">—</span>'}</td>`:''}</tr>`;
          }).join('')}</tbody>
        </table></div>
        `:`<div class="empty-state">Ainda não há colaboradores com movimentação neste período.</div>`}
        <p class="small-note" style="margin:12px 0 0;">Atualizado automaticamente em ${escapeHtml(new Date(ranking.atualizadoEm).toLocaleString('pt-BR'))}.</p>
      ` : `<div class="empty-state">${STATE.erroRankingPublico?'Não foi possível carregar o ranking público.':'A página pública será preenchida automaticamente após um administrador ou operador abrir o aplicativo.'}</div>`}
      <p class="small-note" style="margin:16px 0 0;">A página apresenta a classificação e os saldos mensais por material. Solicitações de troca só alteram os saldos depois da conferência e aprovação de um administrador.</p>
    </section>
  </main>${renderRodapePublico()}</div>`;
}
function selecionarCampanhaRankingPublico(campanhaId){
  STATE.rankingPublicoCampanhaId=campanhaId;
  const maisRecente=STATE.rankingsPublicos
    .filter(item=>item.campanhaId===campanhaId)
    .sort((a,b)=>(b.ano*12+b.mes)-(a.ano*12+a.mes))[0];
  STATE.rankingPublicoSelecionadoId=maisRecente?maisRecente.id:'';
  renderApp();
}
function selecionarRankingPublico(id){
  STATE.rankingPublicoSelecionadoId=id;
  renderApp();
}
window.selecionarCampanhaRankingPublico=selecionarCampanhaRankingPublico;
function campanhasComSolicitacaoPublica(){
  const maisRecentes=new Map();
  [...STATE.rankingsPublicos]
    .sort((a,b)=>(b.ano*12+b.mes)-(a.ano*12+a.mes))
    .forEach(ranking=>{
      if(!maisRecentes.has(ranking.campanhaId)) maisRecentes.set(ranking.campanhaId,ranking);
    });
  return [...maisRecentes.values()]
    .filter(ranking=>ranking.solicitacoesPermitidas && ranking.participantes.length>1 && ranking.materiais.length>1);
}
function rankingCampanhaParaSolicitacao(campanhaId){
  return campanhasComSolicitacaoPublica().find(ranking=>ranking.campanhaId===campanhaId)||null;
}
function renderPickerSolicitacao(id,label,opcoes,valorSelecionado){
  const selecionada=opcoes.find(opcao=>opcao.value===valorSelecionado)||opcoes[0];
  const valor=selecionada?selecionada.value:'';
  const rotulo=selecionada?selecionada.label:'Selecione uma opção';
  return `<div class="field swap-picker" id="${id}Picker">
    <label id="${id}Label">${escapeHtml(label)}</label>
    <input id="${id}" type="hidden" value="${escapeHtml(valor)}">
    <button id="${id}Trigger" class="swap-picker-trigger" type="button" aria-labelledby="${id}Label ${id}Value" aria-haspopup="listbox" aria-expanded="false" onclick="alternarPickerSolicitacao('${id}')">
      <span class="swap-picker-trigger-label" id="${id}Value">${escapeHtml(rotulo)}</span>
      <span class="swap-picker-chevron" aria-hidden="true">${icon('chevron',18)}</span>
    </button>
    <div id="${id}Options" class="swap-picker-options" role="listbox" aria-labelledby="${id}Label" hidden>
      ${opcoes.map(opcao=>`<button class="swap-picker-option" type="button" role="option" aria-selected="${opcao.value===valor}" data-value="${escapeHtml(opcao.value)}" onclick="selecionarOpcaoSolicitacao('${id}',this.dataset.value)">
        <span>${escapeHtml(opcao.label)}</span>
      </button>`).join('')}
    </div>
  </div>`;
}
function alternarPickerSolicitacao(id){
  const picker=document.getElementById(`${id}Picker`);
  const trigger=document.getElementById(`${id}Trigger`);
  const options=document.getElementById(`${id}Options`);
  if(!picker || !trigger || !options) return;
  const abrir=options.hidden;
  document.querySelectorAll('#modalOverlay .swap-picker').forEach(item=>{
    item.classList.remove('is-open');
    const list=item.querySelector('.swap-picker-options');
    const button=item.querySelector('.swap-picker-trigger');
    if(list) list.hidden=true;
    if(button) button.setAttribute('aria-expanded','false');
  });
  if(abrir){
    picker.classList.add('is-open');
    options.hidden=false;
    trigger.setAttribute('aria-expanded','true');
  }
}
function selecionarOpcaoSolicitacao(id,valor){
  const input=document.getElementById(id);
  const options=document.getElementById(`${id}Options`);
  const picker=document.getElementById(`${id}Picker`);
  const trigger=document.getElementById(`${id}Trigger`);
  if(!input || !options || !picker || !trigger) return;
  const opcao=[...options.querySelectorAll('[data-value]')].find(item=>item.dataset.value===valor);
  if(!opcao) return;
  input.value=valor;
  picker.querySelector('.swap-picker-trigger-label').textContent=opcao.querySelector('span:last-child').textContent;
  options.querySelectorAll('[data-value]').forEach(item=>item.setAttribute('aria-selected',String(item===opcao)));
  picker.classList.remove('is-open');
  options.hidden=true;
  trigger.setAttribute('aria-expanded','false');
  if(id==='solicitacaoCampanha') atualizarFormularioSolicitacaoTroca();
  if(id==='solicitacaoOrigem' || id==='solicitacaoDestino'
    || id==='solicitacaoMaterialOrigem' || id==='solicitacaoMaterialDestino'){
    atualizarFormularioSolicitacaoTroca();
  }
}
let appSelectOverlay=null;
let appSelectAtivo=null;
let appSelectOverflowAnterior='';
let appSelectPaddingDireitoAnterior='';
function sincronizarSeletorNativo(select){
  if(!select || !select.dataset.customSelect) return;
  const trigger=document.getElementById(select.dataset.customSelectTrigger);
  const value=trigger&&trigger.querySelector('.app-select-value');
  if(!trigger || !value) return;
  const opcao=select.options[select.selectedIndex];
  value.textContent=opcao?opcao.textContent.trim():'Selecione uma opção';
  trigger.disabled=select.disabled;
  trigger.setAttribute('aria-label',select.labels&&select.labels.length
    ?select.labels[0].textContent.trim()
    :value.textContent);
}
function fecharSeletorNativo(restaurarFoco=false){
  if(!appSelectOverlay || !appSelectAtivo) return;
  const trigger=appSelectAtivo.trigger;
  appSelectOverlay.hidden=true;
  appSelectOverlay.replaceChildren();
  appSelectOverlay.remove();
  appSelectOverlay=null;
  appSelectAtivo=null;
  document.body.style.overflow=appSelectOverflowAnterior;
  document.body.style.paddingRight=appSelectPaddingDireitoAnterior;
  appSelectOverflowAnterior='';
  appSelectPaddingDireitoAnterior='';
  if(trigger && trigger.isConnected){
    trigger.setAttribute('aria-expanded','false');
    if(restaurarFoco) trigger.focus();
  }
}
function abrirSeletorNativo(select){
  if(!select || !select.dataset.customSelect || select.disabled) return;
  if(appSelectAtivo && appSelectAtivo.select===select){
    fecharSeletorNativo();
    return;
  }
  fecharSeletorNativo();
  sincronizarSeletorNativo(select);
  const trigger=document.getElementById(select.dataset.customSelectTrigger);
  if(!trigger) return;
  const rotulo=trigger.getAttribute('aria-label')||'Selecione uma opção';
  const overlay=document.createElement('div');
  overlay.className='app-select-overlay';
  overlay.setAttribute('role','presentation');
  const menu=document.createElement('div');
  menu.id=`${trigger.id}Menu`;
  menu.className='app-select-menu';
  menu.setAttribute('role','dialog');
  menu.setAttribute('aria-modal','true');
  menu.setAttribute('aria-label',rotulo);
  const opcoes=[...select.options].filter(opcao=>!opcao.hidden);
  if(!opcoes.length){
    const vazio=document.createElement('p');
    vazio.className='table-empty';
    vazio.textContent='Nenhuma opção disponível.';
    menu.appendChild(vazio);
  }
  for(const opcao of opcoes){
    const item=document.createElement('button');
    item.type='button';
    item.className='app-select-option';
    item.setAttribute('role','option');
    item.setAttribute('aria-selected',String(opcao===select.options[select.selectedIndex]));
    item.disabled=opcao.disabled;
    const texto=document.createElement('span');
    texto.textContent=opcao.textContent.trim();
    item.append(texto);
    item.addEventListener('click',()=>{
      const mudou=select.value!==opcao.value;
      select.value=opcao.value;
      sincronizarSeletorNativo(select);
      fecharSeletorNativo(true);
      if(mudou){
        select.dispatchEvent(new Event('input',{bubbles:true}));
        select.dispatchEvent(new Event('change',{bubbles:true}));
      }
    });
    menu.appendChild(item);
  }
  overlay.appendChild(menu);
  overlay.addEventListener('click',evento=>{
    if(evento.target===overlay) fecharSeletorNativo(true);
  });
  appSelectOverflowAnterior=document.body.style.overflow;
  appSelectPaddingDireitoAnterior=document.body.style.paddingRight;
  if(consultaTelaCompacta.matches) document.body.style.overflow='hidden';
  appSelectOverlay=overlay;
  appSelectAtivo={select,trigger};
  trigger.setAttribute('aria-expanded','true');
  document.body.appendChild(overlay);
  if(window.innerWidth>600){
    const bounds=trigger.getBoundingClientRect();
    const largura=Math.min(Math.max(bounds.width,260),window.innerWidth-24);
    const esquerda=Math.max(12,Math.min(bounds.left,window.innerWidth-largura-12));
    const altura=menu.getBoundingClientRect().height;
    const abaixo=bounds.bottom+8;
    const topo=abaixo+altura<=window.innerHeight-12
      ?abaixo
      :Math.max(12,bounds.top-altura-8);
    menu.style.left=`${esquerda}px`;
    menu.style.top=`${topo}px`;
    menu.style.width=`${largura}px`;
  }
  const selecionada=menu.querySelector('[aria-selected=true]:not(:disabled)')
    ||menu.querySelector('.app-select-option:not(:disabled)');
  if(selecionada){
    selecionada.focus({preventScroll:true});
    const limitesMenu=menu.getBoundingClientRect();
    const limitesOpcao=selecionada.getBoundingClientRect();
    if(limitesOpcao.top<limitesMenu.top) menu.scrollTop-=limitesMenu.top-limitesOpcao.top;
    else if(limitesOpcao.bottom>limitesMenu.bottom) menu.scrollTop+=limitesOpcao.bottom-limitesMenu.bottom;
  }
}
function aprimorarSeletorNativo(select){
  if(!(select instanceof HTMLSelectElement) || select.dataset.customSelect) return;
  const parent=select.parentNode;
  if(!parent) return;
  const wrapper=document.createElement('div');
  wrapper.className='app-select';
  if(select.style.minWidth) wrapper.style.minWidth=select.style.minWidth;
  if(select.closest('.topbar')) wrapper.classList.add('app-select-topbar');
  const trigger=document.createElement('button');
  const triggerId=`appSelectTrigger${++aprimoramentoSeletorId}`;
  trigger.id=triggerId;
  trigger.type='button';
  trigger.className='app-select-trigger';
  trigger.setAttribute('aria-haspopup','dialog');
  trigger.setAttribute('aria-expanded','false');
  trigger.setAttribute('aria-controls',`${triggerId}Menu`);
  trigger.innerHTML='<span class="app-select-value"></span><span class="app-select-chevron" aria-hidden="true">'+icon('chevron',16)+'</span>';
  const labels=select.labels;
  if(labels&&labels.length){
    labels[0].htmlFor=triggerId;
    trigger.setAttribute('aria-label',labels[0].textContent.trim());
  }
  select.dataset.customSelect='true';
  select.dataset.customSelectTrigger=triggerId;
  select.classList.add('app-select-native');
  select.tabIndex=-1;
  select.setAttribute('aria-hidden','true');
  parent.insertBefore(wrapper,select);
  wrapper.append(select,trigger);
  trigger.addEventListener('click',()=>abrirSeletorNativo(select));
  trigger.addEventListener('keydown',evento=>{
    if(evento.key==='ArrowDown'||evento.key==='ArrowUp'||evento.key==='Enter'||evento.key===' '){
      evento.preventDefault();
      abrirSeletorNativo(select);
    }
  });
  sincronizarSeletorNativo(select);
}
let aprimoramentoSeletorId=0;
function aprimorarSeletoresNativos(raiz=document){
  const seletores=raiz instanceof HTMLSelectElement?[raiz]:raiz.querySelectorAll?[...raiz.querySelectorAll('select')]:[];
  seletores.forEach(select=>{
    try{ aprimorarSeletorNativo(select); }
    catch(erro){ console.error('Não foi possível aplicar o menu personalizado ao seletor.',erro); }
  });
}
document.addEventListener('keydown',evento=>{
  if(!appSelectOverlay) return;
  if(evento.key==='Escape'){
    evento.preventDefault();
    fecharSeletorNativo(true);
    return;
  }
  const opcoes=[...appSelectOverlay.querySelectorAll('.app-select-option:not(:disabled)')];
  const atual=opcoes.indexOf(document.activeElement);
  let proximo=-1;
  if(evento.key==='ArrowDown') proximo=Math.min(atual+1,opcoes.length-1);
  else if(evento.key==='ArrowUp') proximo=Math.max(atual-1,0);
  else if(evento.key==='Home') proximo=0;
  else if(evento.key==='End') proximo=opcoes.length-1;
  if(proximo>=0 && opcoes[proximo]){
    evento.preventDefault();
    opcoes[proximo].focus();
  }
});
document.addEventListener('pointerdown',evento=>{
  if(appSelectOverlay && !appSelectOverlay.contains(evento.target)
    && !appSelectAtivo.trigger.contains(evento.target)){
    fecharSeletorNativo();
  }
},true);
const observadorSeletoresNativos=new MutationObserver(mudancas=>{
  for(const mudanca of mudancas){
    if(mudanca.type==='childList'){
      mudanca.addedNodes.forEach(no=>{
        if(no.nodeType===Node.ELEMENT_NODE) aprimorarSeletoresNativos(no);
      });
    }
    const select=mudanca.target instanceof HTMLSelectElement
      ?mudanca.target
      :mudanca.target.closest&&mudanca.target.closest('select');
    if(select) sincronizarSeletorNativo(select);
  }
  if(appSelectAtivo && !appSelectAtivo.select.isConnected) fecharSeletorNativo();
});
observadorSeletoresNativos.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['selected','disabled']});
aprimorarSeletoresNativos();
function abrirSolicitacaoTrocaPublica(){
  if(!FIREBASE_DB){
    alert('As solicitações públicas exigem conexão com o Firebase. Tente novamente mais tarde.');
    return;
  }
  const campanhas=campanhasComSolicitacaoPublica();
  if(!campanhas.length){
    alert('Não há campanha ativa disponível para solicitar uma troca.');
    return;
  }
  const preferida=campanhas.find(ranking=>ranking.campanhaId===STATE.rankingPublicoCampanhaId)||campanhas[0];
  const participantes=preferida.participantes.slice().sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  const materiais=preferida.materiais;
  const opcoesCampanhas=campanhas.map(ranking=>({value:ranking.campanhaId,label:ranking.campanhaNome}));
  const opcoesParticipantes=participantes.map(participante=>({value:participante.id,label:participante.nome}));
  const opcoesMateriais=materiais.map(material=>({value:material.key,label:`${material.nome} (${material.unidade})`}));
  abrirModal(`
    <div class="modal-head"><h3>Solicitar troca de materiais</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <p class="small-note">O pedido ficará pendente até que um administrador o confira e aprove. A seleção dos nomes não confirma a identidade de quem está solicitando. Por isso, selecione corretamente os nomes e informe as quantidades conforme o combinado.</p>
    ${renderPickerSolicitacao('solicitacaoCampanha','Campanha',opcoesCampanhas,preferida.campanhaId)}
    <div class="section-title" style="margin:14px 0 8px;font-size:13.5px;">Você oferece</div>
    <div class="grid grid-2">
      ${renderPickerSolicitacao('solicitacaoOrigem','Seu nome',opcoesParticipantes,participantes[0]?.id)}
      ${renderPickerSolicitacao('solicitacaoMaterialOrigem','Material',opcoesMateriais,materiais[0]?.key)}
    </div>
    <div class="field"><label for="solicitacaoQuantidadeOrigem">Quantidade que você oferece</label><input id="solicitacaoQuantidadeOrigem" type="number" min="1" max="9007199254740991" step="1" inputmode="numeric"></div>
    <div class="section-title" style="margin:14px 0 8px;font-size:13.5px;">Você receberá</div>
    <div class="grid grid-2">
      ${renderPickerSolicitacao('solicitacaoDestino','Outro colaborador',opcoesParticipantes,participantes[1]?.id)}
      ${renderPickerSolicitacao('solicitacaoMaterialDestino','Material',opcoesMateriais,materiais[1]?.key)}
    </div>
    <div class="field"><label for="solicitacaoQuantidadeDestino">Quantidade que o outro colaborador oferece</label><input id="solicitacaoQuantidadeDestino" type="number" min="1" max="9007199254740991" step="1" inputmode="numeric"></div>
    <p id="solicitacaoTrocaErro" class="auth-error" role="alert" style="display:none;"></p>
    <div class="modal-actions">
      <button class="btn btn-outline btn-block" type="button" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary btn-block" type="button" onclick="confirmarSolicitacaoTrocaPublica()">${icon('check',16)}Solicitar troca</button>
    </div>
  `,false,'swap-request');
}
function atualizarFormularioSolicitacaoTroca(){
  const campanhaEl=document.getElementById('solicitacaoCampanha');
  const origemEl=document.getElementById('solicitacaoOrigem');
  const destinoEl=document.getElementById('solicitacaoDestino');
  const materialOrigemEl=document.getElementById('solicitacaoMaterialOrigem');
  const materialDestinoEl=document.getElementById('solicitacaoMaterialDestino');
  if(!campanhaEl || !origemEl || !destinoEl || !materialOrigemEl || !materialDestinoEl) return;
  const ranking=rankingCampanhaParaSolicitacao(campanhaEl.value);
  if(!ranking) return;
  const origemAnterior=origemEl.value;
  const destinoAnterior=destinoEl.value;
  const materialOrigemAnterior=materialOrigemEl.value;
  const materialDestinoAnterior=materialDestinoEl.value;
  const participantes=ranking.participantes.slice().sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  const materiais=ranking.materiais;
  const opcoesParticipantes=participantes.map(p=>({value:p.id,label:p.nome}));
  const opcoesMateriais=materiais.map(m=>({value:m.key,label:`${m.nome} (${m.unidade})`}));
  const origem=opcoesParticipantes.some(opcao=>opcao.value===origemAnterior)?origemAnterior:opcoesParticipantes[0]?.value||'';
  const destino=opcoesParticipantes.some(opcao=>opcao.value===destinoAnterior)&&destinoAnterior!==origem
    ?destinoAnterior
    :opcoesParticipantes.find(opcao=>opcao.value!==origem)?.value||'';
  const materialOrigem=opcoesMateriais.some(opcao=>opcao.value===materialOrigemAnterior)
    ?materialOrigemAnterior
    :opcoesMateriais[0]?.value||'';
  const materialDestino=opcoesMateriais.some(opcao=>opcao.value===materialDestinoAnterior)&&materialDestinoAnterior!==materialOrigem
    ?materialDestinoAnterior
    :opcoesMateriais.find(opcao=>opcao.value!==materialOrigem)?.value||'';
  document.getElementById('solicitacaoOrigemPicker').outerHTML=renderPickerSolicitacao('solicitacaoOrigem','Seu nome',opcoesParticipantes,origem);
  document.getElementById('solicitacaoDestinoPicker').outerHTML=renderPickerSolicitacao('solicitacaoDestino','Outro colaborador',opcoesParticipantes,destino);
  document.getElementById('solicitacaoMaterialOrigemPicker').outerHTML=renderPickerSolicitacao('solicitacaoMaterialOrigem','Material',opcoesMateriais,materialOrigem);
  document.getElementById('solicitacaoMaterialDestinoPicker').outerHTML=renderPickerSolicitacao('solicitacaoMaterialDestino','Material',opcoesMateriais,materialDestino);
}
let pedidoTrocaPublicaPendente=null;
function confirmarSolicitacaoTrocaPublica(){
  const erroEl=document.getElementById('solicitacaoTrocaErro');
  const mostrarErro=mensagem=>{
    if(erroEl){ erroEl.textContent=mensagem; erroEl.style.display='block'; }
  };
  if(!FIREBASE_DB){ mostrarErro('A conexão com o Firebase não está disponível.'); return; }
  const campanhaId=document.getElementById('solicitacaoCampanha')?.value||'';
  const origemId=document.getElementById('solicitacaoOrigem')?.value||'';
  const destinoId=document.getElementById('solicitacaoDestino')?.value||'';
  const categoriaOrigem=document.getElementById('solicitacaoMaterialOrigem')?.value||'';
  const categoriaDestino=document.getElementById('solicitacaoMaterialDestino')?.value||'';
  const quantidadeOrigem=Number(document.getElementById('solicitacaoQuantidadeOrigem')?.value);
  const quantidadeDestino=Number(document.getElementById('solicitacaoQuantidadeDestino')?.value);
  const ranking=rankingCampanhaParaSolicitacao(campanhaId);
  const origem=ranking&&ranking.participantes.find(p=>p.id===origemId);
  const destino=ranking&&ranking.participantes.find(p=>p.id===destinoId);
  const materialOferecido=ranking&&ranking.materiais.find(m=>m.key===categoriaOrigem);
  const materialRecebido=ranking&&ranking.materiais.find(m=>m.key===categoriaDestino);
  if(!ranking || !origem || !destino || !materialOferecido || !materialRecebido){
    mostrarErro('Atualize a página e selecione novamente os colaboradores e materiais.');
    return;
  }
  if(origemId===destinoId){
    mostrarErro('Escolha dois colaboradores diferentes para realizar a troca.');
    return;
  }
  if(categoriaOrigem===categoriaDestino){
    mostrarErro('Escolha materiais diferentes para a troca.');
    return;
  }
  if(!Number.isSafeInteger(quantidadeOrigem) || quantidadeOrigem<=0 || quantidadeOrigem>9007199254740991
    || !Number.isSafeInteger(quantidadeDestino) || quantidadeDestino<=0 || quantidadeDestino>9007199254740991){
    mostrarErro('Informe quantidades inteiras maiores que zero para os dois materiais.');
    return;
  }
  if(erroEl) erroEl.style.display='none';
  pedidoTrocaPublicaPendente={
    campanhaId,
    campanhaNome:ranking.campanhaNome,
    colaboradorOrigemId:origem.id,
    colaboradorOrigemNome:origem.nome,
    categoriaOrigem:materialOferecido.key,
    materialOrigemNome:materialOferecido.nome,
    quantidadeOrigem,
    colaboradorDestinoId:destino.id,
    colaboradorDestinoNome:destino.nome,
    categoriaDestino:materialRecebido.key,
    materialDestinoNome:materialRecebido.nome,
    quantidadeDestino,
  };
  abrirSenhaSolicitacaoTrocaPublica();
}
function abrirSenhaSolicitacaoTrocaPublica(){
  abrirModal(`
    <div class="modal-head"><h3>Confirme com a senha</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <p class="small-note">Informe a senha de solicitação de troca definida pela administração para concluir o pedido. Se não souber a senha, procure um administrador.</p>
    <div class="field"><label for="solicitacaoTrocaSenha">Senha</label><input id="solicitacaoTrocaSenha" type="password" autocomplete="off"></div>
    <p id="solicitacaoTrocaSenhaErro" class="auth-error" role="alert" style="display:none;"></p>
    <div class="modal-actions">
      <button class="btn btn-outline btn-block" type="button" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary btn-block" type="button" onclick="enviarSolicitacaoTrocaPublica()">${icon('check',16)}Confirmar</button>
    </div>
  `,false,'swap-request-senha');
}
async function enviarSolicitacaoTrocaPublica(){
  const erroEl=document.getElementById('solicitacaoTrocaSenhaErro');
  const mostrarErro=mensagem=>{
    if(erroEl){ erroEl.textContent=mensagem; erroEl.style.display='block'; }
  };
  if(!FIREBASE_DB){ mostrarErro('A conexão com o Firebase não está disponível.'); return; }
  if(!pedidoTrocaPublicaPendente){
    mostrarErro('Atualize a página e refaça a solicitação.');
    return;
  }
  const senha=document.getElementById('solicitacaoTrocaSenha')?.value||'';
  if(erroEl) erroEl.style.display='none';
  const referencia=FIREBASE_DB.collection(SOLICITACAO_TROCA_COLLECTION).doc();
  const pedido={
    ...pedidoTrocaPublicaPendente,
    id:referencia.id,
    senha,
    solicitadoEm:firebase.firestore.FieldValue.serverTimestamp(),
    status:'pendente',
  };
  const botao=document.querySelector('#modalOverlay .modal-actions .btn-primary');
  if(botao) botao.disabled=true;
  try{
    await referencia.set(pedido);
    pedidoTrocaPublicaPendente=null;
    fecharModal();
    abrirModal(`
      <div class="success-icon" aria-hidden="true">${icon('check',28)}</div>
      <h3 class="success-title">Pedido enviado!</h3>
      <p class="success-message">Sua solicitação ficará pendente até um administrador conferir e aprovar. Os saldos só serão atualizados depois da aprovação.</p>
      <div class="modal-actions"><button class="btn btn-primary btn-block" type="button" onclick="fecharModal()">Entendi</button></div>
    `,false,'success');
  }catch(erro){
    console.error('Erro ao enviar solicitação pública de troca',erro);
    mostrarErro(erro.code==='permission-denied'
      ?'Senha incorreta. Confira com a administração e tente novamente.'
      :(erro.message||'Não foi possível enviar a solicitação. Tente novamente.'));
    if(botao) botao.disabled=false;
  }
}
window.abrirSolicitacaoTrocaPublica=abrirSolicitacaoTrocaPublica;
window.atualizarFormularioSolicitacaoTroca=atualizarFormularioSolicitacaoTroca;
window.confirmarSolicitacaoTrocaPublica=confirmarSolicitacaoTrocaPublica;
window.abrirSenhaSolicitacaoTrocaPublica=abrirSenhaSolicitacaoTrocaPublica;
window.enviarSolicitacaoTrocaPublica=enviarSolicitacaoTrocaPublica;
window.alternarPickerSolicitacao=alternarPickerSolicitacao;
window.selecionarOpcaoSolicitacao=selecionarOpcaoSolicitacao;
function montarResumoKitColaborador(campanha,cfgTroca,resultado,chave,categorias){
  const porKit=cfgTroca.kit||{};
  const trocas=STATE.trocas.filter(t=>t.campanhaId===campanha.id&&t.colaboradorId===resultado.colaborador.id&&t.data&&t.data.slice(0,7)<=chave);
  const kitsDe=t=>Number(t.quantidadeKits)||Math.floor((Number(t.cartelasEmitidas)||0)/(Number(cfgTroca.cartelasPorKit)||1));
  return {
    trocadosMes:trocas.filter(t=>t.data.slice(0,7)===chave).reduce((total,t)=>total+kitsDe(t),0),
    trocadosTotal:trocas.reduce((total,t)=>total+kitsDe(t),0),
    resgatesMes:trocas.filter(t=>t.data.slice(0,7)===chave).reduce((total,t)=>total+(Number(t.cartelasEmitidas)||0),0),
    resgatesTotal:trocas.reduce((total,t)=>total+(Number(t.cartelasEmitidas)||0),0),
    metaMensalResgates:Number(cfgTroca.metaMensalResgates)||0,
    disponiveis:kitsDisponiveis(campanha,resultado.totais),
    cartelasPorKit:Number(cfgTroca.cartelasPorKit)||1,
    informativoPublico:String(cfgTroca.informativoPublico||'').trim(),
    materiais:Object.keys(porKit).filter(key=>porKit[key]>0).map(key=>{
      const cat=categorias.find(c=>c.key===key);
      const disponivel=resultado.totais[key]||0;
      const kitsPossiveis=kitsDisponiveis(campanha,resultado.totais);
      return {nome:cat?cat.label.split(' (')[0]:key,unidade:cat?cat.unidade:'',porKit:porKit[key],disponivel,saldoAnterior:resultado.carryInsPorCategoria[key]||0,excedente:Math.max(0,disponivel-kitsPossiveis*porKit[key])};
    }),
  };
}
function renderDetalhesKit(kit,unidadeItem){
  const fmt=valor=>valor.toLocaleString('pt-BR',{maximumFractionDigits:2});
  const metaMensal=Number(kit.metaMensalResgates)||0;
  const informativo=String(kit.informativoPublico||'').trim();
  const rotuloItem=unidadeItem.charAt(0).toUpperCase()+unidadeItem.slice(1);
  return `
      <div class="kit-detail-grid">
        <div class="kit-detail-side">
          <div class="card stat-card"><div class="stat-label">Resgates no mês</div><div class="stat-value">${fmt(kit.resgatesMes||0)} ${escapeHtml(unidadeItem)}</div></div>
          ${metaMensal?`<div class="card stat-card"><div class="stat-label">Meta mensal</div><div class="stat-value">${fmt(metaMensal)} ${escapeHtml(unidadeItem)}</div></div>`:''}
          ${kit.disponiveis==null?'':`<div class="card stat-card"><div class="stat-label">${escapeHtml(rotuloItem)} disponíveis</div><div class="stat-value">${fmt(kit.disponiveis*(Number(kit.cartelasPorKit)||1))}</div></div>`}
        </div>
        ${kit.materiais.length?`<div class="card kit-detail-materials">        <div class="kit-detail-scroll" style="margin-top:0;"><table class="kit-materials-table"><thead><tr><th>MATERIAIS</th><th>Necessário</th><th>Disponível</th></tr></thead>
          <tbody>${kit.materiais.map(mat=>`<tr><td>${escapeHtml(mat.nome)}</td><td>${fmt(mat.porKit)} ${escapeHtml(mat.unidade)}</td><td>${fmt(mat.disponivel)} ${escapeHtml(mat.unidade)}</td></tr>`).join('')}</tbody></table></div></div>`:''}
      </div>
      ${informativo?`<p class="small-note" style="margin-top:12px;white-space:pre-line;">${escapeHtml(informativo)}</p>`:''}`;
}
function abrirDetalhesRankingPublico(indice){
  const ranking=rankingPublicoPorId(STATE.rankingPublicoSelecionadoId);
  const item=ranking&&ranking.ranking[indice];
  if(!item) return;
  const categorias=item.detalhes||[];
  if(item.kit||item.resumoTroca){
    const kit=item.kit||{
      resgatesMes:item.resumoTroca?.quantidade||0,
      resgatesTotal:null,
      metaMensalResgates:null,
      disponiveis:null,
      materiais:[],
    };
    const unidadeItem=item.resumoTroca?.unidade||'itens';
    abrirModal(`
      <div class="modal-head"><h3>${escapeHtml(item.nome)} - ${nomeMes(ranking.mes)}/${ranking.ano}</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
      ${renderDetalhesKit(kit,unidadeItem)}
    `, true, 'public-details');
    return;
  }
  if(!categorias.length) return;
  abrirModal(`
    <div class="modal-head"><h3>${escapeHtml(item.nome)} — ${nomeMes(ranking.mes)}/${ranking.ano}</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <p class="small-note" style="margin-top:-6px;">Como é calculada a pontuação: a posição no ranking é definida pela média do percentual de cumprimento das 6 categorias. Para o cálculo da média, cada categoria é limitada a 100%, evitando que resultados acima da meta compensem categorias abaixo dela.</p>
    <div class="table-wrap public-ranking-table">${renderTabelaDetalhesMateriais(categorias, !((campanhaPorId(ranking.campanhaId)||{}).trocaCartela||{}).ativo)}
    </div>
    <p class="small-note" style="margin-top:12px;">Sobre os valores: o percentual de cumprimento mostra o resultado real de cada categoria e pode ultrapassar 100% quando a meta é superada. Os indicadores ao lado das categorias representam saldos transferidos de meses anteriores ou para o mês seguinte.</p>
    <p class="small-note material-balance-legend"><span class="material-balance-legend-item"><span class="material-balance-swatch previous" aria-hidden="true"></span>Saldo mês anterior</span><span class="material-balance-legend-item"><span class="material-balance-swatch next" aria-hidden="true"></span>Saldo mês seguinte</span></p>
  `, true, 'public-details');
}
window.abrirDetalhesRankingPublico=abrirDetalhesRankingPublico;
function renderTabelaDetalhesMateriais(categorias, ordemPublicaFixa=false){
  const formatarQuantidade=valor=>valor.toLocaleString('pt-BR',{maximumFractionDigits:2});
  const cabecalho=ordemPublicaFixa
    ?'<th>Categoria</th><th>NECESSÁRIO</th><th>Disponível</th><th class="material-markers-column">Excedente</th><th>Cumprimento %</th>'
    :'<th>Categoria</th><th class="material-markers-column">Excedente</th><th>Disponível</th><th>META MENSAL</th><th>Cumprimento %</th>';
  return `<table class="material-detail-table${ordemPublicaFixa?' public-fixed-campaign-detail-table':''}"><thead><tr>${cabecalho}</tr></thead>
    <tbody>${categorias.map(cat=>{
      const cumprimento=ReciclarRankingLogic.resumirCategoria(cat.quantidade,cat.meta);
      const excedente=Math.max(0,cumprimento.quantidade-cat.meta);
      const temSaldoAnterior=cat.carryIn>0;
      const temSaldoSeguinte=excedente>0;
      const umaPilha=temSaldoAnterior!==temSaldoSeguinte;
      const metaAtingida=cumprimento.atingida;
      const percentualExibido=Math.floor(cumprimento.percentual).toFixed(0);
      const colunaExcedente=`<td class="material-markers-column">${temSaldoAnterior||temSaldoSeguinte?`<span class="material-balance-markers${umaPilha?' is-single':''}"><span class="badge badge-carryover material-balance-marker${temSaldoAnterior?'':' is-empty'}" title="Saldo mês anterior">${temSaldoAnterior?'+'+formatarQuantidade(cat.carryIn):'+'}</span><span class="badge badge-green badge-surplus material-balance-marker${temSaldoSeguinte?'':' is-empty'}" title="Saldo mês seguinte">${temSaldoSeguinte?'+'+formatarQuantidade(excedente):'+'}</span></span>`:''}</td>`;
      const colunaDisponivel=`<td><span class="material-quantity"><span>${formatarQuantidade(cumprimento.quantidade)}</span><span>${escapeHtml(cat.unidade)}</span></span></td>`;
      const colunaNecessario=`<td><span class="material-quantity"><span>${cat.meta.toLocaleString('pt-BR')}</span><span>${escapeHtml(cat.unidade)}</span></span></td>`;
      const colunaCumprimento=`<td>${metaAtingida?'<span class="badge badge-green">'+percentualExibido+'%</span>':percentualExibido+'%'}</td>`;
      return `<tr><td>${escapeHtml(cat.nome)}</td>${ordemPublicaFixa?colunaNecessario+colunaDisponivel+colunaExcedente:colunaExcedente+colunaDisponivel+colunaNecessario}${colunaCumprimento}</tr>`;
    }).join('')}</tbody></table>`;
}
async function voltarAoRankingPublico(){
  if(STATE.authUser && FIREBASE_AUTH){
    try { await FIREBASE_AUTH.signOut(); }
    catch(e){ console.error('Erro ao sair para o ranking público',e); alert('Não foi possível sair da conta. Tente novamente.'); return; }
  }
  STATE.mostrarLogin=false;
  STATE.authError='';
  renderApp();
}
window.selecionarRankingPublico=selecionarRankingPublico;
window.voltarAoRankingPublico=voltarAoRankingPublico;

function renderSeletorCampanhaTopo(){
  const campanhas = campanhasOrdenadas();
  if(campanhas.length===0) return '';
  const atualId = STATE.campanhaSelecionadaId || (campanhaAtiva()||{}).id || '';
  return `
    <div class="topbar-campaign-selector" style="display:flex;align-items:center;gap:6px;">
      <span class="small-note topbar-campaign-label" style="white-space:nowrap;">Campanha:</span>
      <select onchange="mudarCampanhaSelecionada(this.value)" style="min-width:170px;">
        ${campanhas.map(c=>`<option value="${c.id}" ${c.id===atualId?'selected':''}>${escapeHtml(c.nome)}${c.status==='ativa'?' (ativa)':c.status==='encerrada'?' (encerrada)':' (planejada)'}</option>`).join('')}
      </select>
    </div>
  `;
}
window.renderSeletorCampanhaTopo = renderSeletorCampanhaTopo;

function renderApp(){
  const app = document.getElementById('app');
  if(STORAGE_MODE==='firestore' && (!STATE.authUser || (!STATE.isAdmin && !STATE.isOperator))){
    app.innerHTML=STATE.authUser && !STATE.mostrarLogin ? renderTelaAutenticacao() : renderRankingPublico();
    aprimorarSeletoresNativos(app);
    return;
  }
  const navItems = navItemsVisiveis();
  if(!navItems.some(n=>n.key===STATE.view)) STATE.view='dashboard';
  const current = navItems.find(n=>n.key===STATE.view) || navItems[0];
  if(!app.querySelector('.sidebar')) {
    app.innerHTML = `
    <div class="sidebar">
      <div class="brand">
        <svg class="brand-icon" viewBox="0 0 40 40" fill="none" stroke="#8FCB9E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10 31h20l-3 7H13l-3-7Z"/><path d="M20 31V16"/>
          <path d="M20 24c-7 0-10-4-9-10 7 0 11 3 10 9M20 20c0-7 4-11 11-11 1 7-3 11-10 12"/>
        </svg>
        <div class="brand-text">
          <div class="brand-title">RECICLAPAC</div>
        </div>
      </div>
      <div class="nav">
        ${navItems.map(n=>`<button data-view="${n.key}" class="${n.key===STATE.view?'active':''}" onclick="irPara('${n.key}')">${icon(n.icon)}${n.label}</button>`).join('')}
        <button class="nav-help" type="button" onclick="abrirAjuda()">${icon('help')}Como usar o painel</button>
      </div>
      <div class="sidebar-foot">
        <div class="admin-pill">
          <button class="account-summary" style="padding:0;border:0;background:transparent;text-align:center;border-radius:0;" onclick="abrirPerfilUsuario()" title="Editar meu perfil">
            <span class="account-name"><span class="account-name-text">${escapeHtml(nomeExibicaoUsuario())}</span></span>
            <span class="account-role">${STATE.isAdmin?'Administrador':'Operador'}</span>
          </button>
          <button onclick="${STATE.authUser? 'sairAdmin()':'abrirLoginAdmin()'}">${STATE.authUser?icon('logout',15):icon('login',15)}<span>${STATE.authUser?'Sair':'Entrar'}</span></button>
        </div>
      </div>
    </div>
    <div class="main">
      <div class="topbar">
        <div>
          <h1>${current.label}</h1>
          <div class="desc">APAC de Imperatriz · Maranhão</div>
        </div>
        <div class="topbar-tools">
          ${renderSeletorCampanhaTopo()}
          <div class="topbar-icon-actions">
            ${STATE.isAdmin?renderBotaoNotificacoesTroca():''}
          </div>
        </div>
      </div>
      <div class="content" id="viewContent"></div>
    </div>
    <div class="bottomnav">
      <div class="bottomnav-row">
        ${navItems.slice(0,4).map(n=>`<button class="${n.key===STATE.view?'active':''}" onclick="irPara('${n.key}')">${icon(n.icon,20)}<span>${n.label.split(' ')[0]}</span></button>`).join('')}
        <button class="${['historico','relatorios','lixeira','config','registro-express'].includes(STATE.view)?'active':''}" onclick="abrirMaisSheet()">${icon('more',20)}<span>Mais</span></button>
      </div>
    </div>
  `;
  } else {
    // Reutiliza o shell: recriar a sidebar inteira em cada troca causava o flash lateral.
    app.querySelectorAll('.nav button[data-view]').forEach(button => {
      button.classList.toggle('active', button.dataset.view === STATE.view);
    });
    const title = app.querySelector('.topbar h1');
    if(title) title.textContent = current.label;
    const bottomButtons = app.querySelectorAll('.bottomnav button');
    bottomButtons.forEach((button, index) => {
      const keys = navItems.slice(0,4).map(n=>n.key);
      const extraActive = ['historico','relatorios','lixeira','config','registro-express'].includes(STATE.view);
      button.classList.toggle('active', index < 4 ? keys[index] === STATE.view : extraActive);
    });
  }
  // O shell é reutilizado entre renderizações; sincronize o sino com o estado atualizado.
  const notificationActions = app.querySelector('.topbar-icon-actions');
  if(notificationActions){
    const notificationMarkup = STATE.isAdmin ? renderBotaoNotificacoesTroca() : '';
    if(notificationActions.innerHTML !== notificationMarkup) notificationActions.innerHTML = notificationMarkup;
  }
  const content = document.getElementById('viewContent');
  const renderers = {
    dashboard: renderDashboard, colaboradores: renderColaboradores, entregas: renderEntregas,
    ranking: renderRanking, historico: renderHistorico, relatorios: renderRelatorios, lixeira: renderLixeira, config: renderConfig, 'registro-express': renderRegistroExpress,
  };
  content.innerHTML = renderers[STATE.view] ? renderers[STATE.view]() : '';
  if(STATE.view==='config' && STATE.isAdmin) selecionarAbaConfiguracoes('perfil');
  aprimorarSeletoresNativos(content);
  if(STATE.view==='colaboradores') renderTabelaColaboradores();
  if(STATE.view==='entregas') renderTabelaEntregas();
  if(STATE.view==='config' && STATE.isAdmin) renderTabelaCampanhas();
}

function abrirMaisSheet(){
  const extras = STATE.isAdmin? ['registro-express','historico','relatorios','lixeira','config'] : ['historico','registro-express'];
  abrirModal(`
    <div class="modal-head"><h3>Mais opções</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${STATE.authUser? `<div class="card" style="padding:12px;"><b>${escapeHtml(nomeExibicaoUsuario())}</b><div class="small-note">${STATE.isAdmin?'Administrador':'Operador'}</div></div>
      <button class="btn btn-outline btn-block" style="justify-content:flex-start" onclick="fecharModal();abrirPerfilUsuario()">Meu perfil</button>`:''}
      ${extras.map(k=>{
        const n = navItemsVisiveis().find(i=>i.key===k);
        if(!n) return '';
        return `<button class="btn btn-outline btn-block" style="justify-content:flex-start" onclick="fecharModal();irPara('${k}')">${icon(n.icon)}${n.label}</button>`;
      }).join('')}
      <button class="btn btn-outline btn-block" style="justify-content:flex-start" onclick="fecharModal();abrirAjuda()">${icon('help')}Como usar o painel</button>
      <button class="btn btn-outline btn-block" style="justify-content:flex-start" onclick="fecharModal();${STATE.authUser?'sairAdmin()':'abrirLoginAdmin()'}">${STATE.authUser?'🔒 Sair da conta':'🔑 Entrar'}</button>
    </div>
  `);
}
window.abrirMaisSheet = abrirMaisSheet;

/* ---------- MODAL GENÉRICO ---------- */
let modalScrollY=null;
const consultaTelaCompacta=window.matchMedia('(max-width:720px)');
function abrirModal(innerHtml, wide, modalClass=''){
  fecharModal();
  // No desktop o body fixo deslocava a barra lateral sticky e escondia a barra de rolagem; só travamos assim no mobile.
  if(modalScrollY===null && consultaTelaCompacta.matches){
    modalScrollY=window.scrollY||window.pageYOffset||0;
    document.body.style.position='fixed';
    document.body.style.top=`-${modalScrollY}px`;
    document.body.style.left='0';
    document.body.style.right='0';
    document.body.style.width='100%';
    document.body.style.overflow='hidden';
  }
  const wrap = document.createElement('div');
  wrap.className=`modal-overlay${modalClass?' modal-overlay-'+modalClass:''}`; wrap.id='modalOverlay';
  wrap.onclick=(e)=>{ if(e.target===wrap) fecharModal(); };
  wrap.addEventListener('wheel',e=>{ if(!e.target.closest('.modal')) e.preventDefault(); },{passive:false});
  wrap.innerHTML = `<div class="modal${modalClass?' modal-'+modalClass:''}" style="${wide?'max-width:720px':''}">${innerHtml}</div>`;
  document.body.appendChild(wrap);
  aprimorarSeletoresNativos(wrap);
}
function fecharModal(){
  const m=document.getElementById('modalOverlay');
  if(m) m.remove();
  if(modalScrollY!==null && !document.getElementById('modalOverlay')){
    const scrollY=modalScrollY;
    modalScrollY=null;
    document.body.style.position='';
    document.body.style.top='';
    document.body.style.left='';
    document.body.style.right='';
    document.body.style.width='';
    document.body.style.overflow='';
    window.scrollTo(0,scrollY);
  }
}
window.fecharModal = fecharModal;
