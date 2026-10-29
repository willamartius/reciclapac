/* ---------- CARD PNG PARA WHATSAPP ---------- */
function gerarCardRanking(mes,ano){
  if(!exigirAdmin()) return;
  const resultados = calcularResultadosMes(STATE.campanhaSelecionadaId, mes,ano);
  const top3 = resultados.filter(r=> r.pontuacao>0 || r.totalMateriais>0).slice(0,3);
  const W=1080,H=1350;
  const canvas = document.createElement('canvas'); canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#173B27'); grad.addColorStop(1,'#0D2116');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
  // leaf watermark circle
  ctx.globalAlpha=0.08; ctx.fillStyle='#8FCB9E'; ctx.beginPath(); ctx.arc(W-120,160,260,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;

  ctx.textAlign='center';
  ctx.fillStyle='#8FCB9E'; ctx.font='600 34px Georgia, serif'; ctx.fillText('♻️ RECICLAR É CUIDAR', W/2, 120);
  ctx.fillText('DA CASA COMUM', W/2, 165);
  ctx.fillStyle='#DCEBDF'; ctx.font='500 26px Georgia, serif'; ctx.fillText('APAC de Imperatriz — Maranhão', W/2, 210);
  ctx.fillStyle='#B9CDC0'; ctx.font='400 24px Arial'; ctx.fillText(`Resultado do mês: ${nomeMes(mes)} de ${ano}`, W/2, 250);

  ctx.fillStyle='#ffffff'; ctx.font='700 36px Georgia, serif'; ctx.fillText('🏆 TOP 3 COLABORADORES', W/2, 340);

  const medalColors = ['#C08A22','#9AA6AE','#B0703F'];
  const medals = ['🥇','🥈','🥉'];
  let y = 420;
  top3.forEach((r,i)=>{
    ctx.fillStyle='rgba(255,255,255,0.06)';
    roundRect(ctx,90,y-50,W-180,120,18); ctx.fill();
    ctx.strokeStyle=medalColors[i]; ctx.lineWidth=3; roundRect(ctx,90,y-50,W-180,120,18); ctx.stroke();
    ctx.textAlign='left'; ctx.fillStyle='#ffffff'; ctx.font='44px Arial'; ctx.fillText(medals[i], 120, y+20);
    ctx.font='700 32px Georgia, serif'; ctx.fillText(truncar(r.colaborador.nome,26), 200, y-5);
    ctx.font='400 24px Arial'; ctx.fillStyle='#C9DCCE';
    ctx.fillText(`${r.pontuacao.toFixed(0)} pontos · Meta atingida: ${r.mediaReal.toFixed(0)}%`, 200, y+35);
    y += 150;
  });

  const totalMateriais = resultados.reduce((a,r)=>a+r.totalMateriais,0);
  const atingiramMeta = resultados.filter(r=>r.metaAtingida).length;
  ctx.textAlign='center';
  ctx.fillStyle='#ffffff'; ctx.font='700 32px Georgia, serif'; ctx.fillText('📊 RESULTADO GERAL', W/2, y+40);
  ctx.font='400 26px Arial'; ctx.fillStyle='#DCEBDF';
  ctx.fillText(`Participantes: ${resultados.length}   ·   Atingiram a meta: ${atingiramMeta}`, W/2, y+90);
  ctx.fillText(`Total arrecadado: ${totalMateriais.toLocaleString('pt-BR')} unidades`, W/2, y+130);

  ctx.font='italic 28px Georgia, serif'; ctx.fillStyle='#8FCB9E';
  wrapText(ctx,'🌱 Parabéns a todos que contribuíram com a campanha!', W/2, y+210, W-160, 36);

  canvas.toBlob(async (blob)=>{
    const url = URL.createObjectURL(blob);
    const fname = `ranking-${nomeMes(mes)}-${ano}.png`;
    if(navigator.canShare && navigator.canShare({files:[new File([blob],fname,{type:'image/png'})]})){
      try{ await navigator.share({files:[new File([blob],fname,{type:'image/png'})], title:'Ranking Reciclar é Cuidar da Casa Comum'}); return; }catch(e){}
    }
    const a = document.createElement('a'); a.href=url; a.download=fname; document.body.appendChild(a); a.click(); a.remove();
    abrirModal(`<div class="modal-head"><h3>Card gerado</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
      <img src="${url}" style="width:100%;border-radius:12px;border:1px solid var(--border);">
      <p class="small-note" style="margin-top:10px;">A imagem foi baixada para o seu aparelho. Abra o WhatsApp e anexe o arquivo para compartilhar.</p>`);
  }, 'image/png');
}
function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function truncar(s,n){ return s.length>n? s.slice(0,n-1)+'…' : s; }
function wrapText(ctx,text,x,y,maxWidth,lineHeight){
  const words = text.split(' '); let line=''; let lines=[];
  words.forEach(w=>{ const test=line+w+' '; if(ctx.measureText(test).width>maxWidth && line){ lines.push(line); line=w+' '; } else line=test; });
  lines.push(line);
  lines.forEach((l,i)=> ctx.fillText(l.trim(), x, y+i*lineHeight));
}
window.gerarCardRanking = gerarCardRanking;

/* =========================================================
   HISTÓRICO
   ========================================================= */
function renderHistorico(){
  const campanhaId = STATE.campanhaSelecionadaId;
  if(!campanhaId){
    return `<div class="card"><div class="empty-state">Nenhuma campanha cadastrada ainda.</div></div>`;
  }
  const meses = mesesComDados(campanhaId);
  const mes=STATE.histMes, ano=STATE.histAno;
  const chaveSel = chaveMA(mes,ano);
  const resumoMes = chave=>{
    const [a,m] = chave.split('-').map(Number);
    const entregas = STATE.entregas.filter(e=>e.campanhaId===campanhaId && e.data && e.data.slice(0,7)===chave);
    const validadas = entregas.filter(e=>e.statusValidacao==='validado');
    return {
      mes:m, ano:a, chave,
      entregas:entregas.length,
      validadas:validadas.length,
      participantes:new Set(validadas.map(e=>e.colaboradorId)).size,
      transferencias:transferenciasDoMes(campanhaId,m,a).length,
      resgates:trocasDoMes(campanhaId,m,a).length,
    };
  };
  const linhasMeses = meses.map(resumoMes);
  const atual = resumoMes(chaveSel);
  const eventos = [
    ...STATE.entregas.filter(e=>e.campanhaId===campanhaId && e.data && e.data.slice(0,7)===chaveSel).map(e=>{
      const c = STATE.colaboradores.find(x=>x.id===e.colaboradorId);
      const cat = resolverCategoria(campanhaId,e.tipo);
      const unid = e.tipo==='latinhas'&&e.unidade==='kg' ? 'kg' : 'unid.';
      return {
        data:e.data,
        criadoEm:e.criadoEm,
        tipo:'Entrega',
        cor:'badge-green',
        texto:`${c?c.nome:'(removido)'} entregou ${e.quantidade} ${unid} de ${cat?cat.label.split(' (')[0]:'outros materiais'}`,
        extra:e.statusValidacao==='validado'?'Validada':'Pendente',
      };
    }),
    ...transferenciasDoMes(campanhaId,mes,ano).map(t=>{
      const {origem:o,destino:d,catOrigem,catDestino,campanhaOrigem,campanhaDestino}=partesTransferencia(t);
      const nomeCat=c=>c?c.label.split(' (')[0]:'material';
      const texto=t.entreCampanhas
        ?`${o?o.nome:'(removido)'} (${campanhaOrigem?campanhaOrigem.nome:'campanha removida'}) para ${d?d.nome:'(removido)'} (${campanhaDestino?campanhaDestino.nome:'campanha removida'}): ${t.quantidade} de ${nomeCat(catOrigem||catDestino)}`
        :`${o?o.nome:'(removido)'} para ${d?d.nome:'(removido)'}: ${t.quantidade} de ${nomeCat(catOrigem)}`;
      return {data:t.data,criadoEm:t.criadoEm,tipo:'Transferência',cor:'badge-amber',texto,extra:t.motivo||''};
    }),
    ...trocasDoMes(campanhaId,mes,ano).map(t=>{
      const c = STATE.colaboradores.find(x=>x.id===t.colaboradorId);
      return {data:t.data,tipo:'Resgate',cor:'badge-green',texto:`${c?c.nome:'(removido)'} resgatou ${t.cartelasEmitidas||0} item(ns)`,extra:t.quantidadeKits?`${t.quantidadeKits} kit(s)`:''};
    }),
  ].sort((a,b)=>{
    const timestampA=a.tipo==='Entrega'?normalizarTimestampRegistro(a.criadoEm):null;
    const timestampB=b.tipo==='Entrega'?normalizarTimestampRegistro(b.criadoEm):null;
    const ordemA=timestampA===null?Date.parse(`${a.data||''}T00:00:00`):timestampA;
    const ordemB=timestampB===null?Date.parse(`${b.data||''}T00:00:00`):timestampB;
    if(Number.isFinite(ordemA)&&Number.isFinite(ordemB)&&ordemA!==ordemB) return ordemB-ordemA;
    return String(b.data).localeCompare(String(a.data));
  });
  const cartao=(rotulo,valor)=>`<div class="card stat-card"><div class="stat-label">${rotulo}</div><div class="stat-value">${valor}</div></div>`;
  return `
    <div class="toolbar">
      <div class="toolbar-left filters">${seletorMesAno('hist', mes, ano)}</div>
      ${STATE.isAdmin? `<div class="toolbar-right"><button class="btn btn-outline btn-sm" onclick="exportarCsvEntregas(${mes},${ano})">${icon('download',15)}Exportar entregas</button></div>` : ''}
    </div>
    ${meses.length===0? `<div class="card"><div class="empty-state">Nenhum histórico registrado ainda nesta campanha.</div></div>` : `
    <div class="grid grid-4">
      ${cartao('Entregas',atual.entregas)}
      ${cartao('Validadas',atual.validadas)}
      ${cartao('Participantes',atual.participantes)}
      ${cartao('Resgates e transferências',atual.resgates+atual.transferencias)}
    </div>
    <div class="section-title">Linha do tempo da campanha</div>
    <div class="card" style="padding:0;"><div class="table-wrap"><table>
      <thead><tr><th>Mês</th><th class="table-cell-center">Entregas</th><th class="table-cell-center">Participantes</th><th class="table-cell-center">Transf.</th><th class="table-cell-center">Resgates</th></tr></thead>
      <tbody>${linhasMeses.map(l=>`<tr style="cursor:pointer;${l.chave===chaveSel?'background:var(--verde-100);':''}" onclick="mudarMesHist(${l.mes},${l.ano})">
        <td style="font-weight:700;">${nomeMes(l.mes)}/${l.ano}</td>
        <td class="table-cell-center">${l.entregas}</td><td class="table-cell-center">${l.participantes}</td>
        <td class="table-cell-center">${l.transferencias}</td><td class="table-cell-center">${l.resgates}</td></tr>`).join('')}</tbody>
    </table></div></div>
    <div class="section-title">Movimentações de ${nomeMes(mes)} de ${ano}</div>
    <div class="card" style="padding:0;"><div class="table-wrap">${eventos.length? `<table><thead><tr><th>Registro no sistema</th><th>Tipo</th><th>Detalhe</th><th>Obs.</th></tr></thead><tbody>
      ${eventos.map(ev=>{
        const dataPrincipal=['Entrega','Transferência'].includes(ev.tipo)?formatarDataHoraRegistro(ev.criadoEm):formatarData(ev.data);
        const dataSecundaria=ev.tipo==='Entrega'?'<div class="small-note">Coleta: '+escapeHtml(formatarData(ev.data))+'</div>':'';
        return `<tr><td style="white-space:nowrap;"><span>${dataPrincipal}</span>${dataSecundaria}</td><td><span class="badge ${ev.cor}">${ev.tipo}</span></td><td>${escapeHtml(ev.texto)}</td><td>${escapeHtml(ev.extra)}</td></tr>`;
      }).join('')}
    </tbody></table>` : `<div class="table-empty">Nenhuma movimentação neste mês.</div>`}</div></div>
    `}
  `;
}
function renderTabelaEntregasHistorico(mes,ano){
  const campanhaId = STATE.campanhaSelecionadaId;
  const chave = chaveMA(mes,ano);
  const lista = ordenarEntregasPorRegistro(STATE.entregas.filter(e=>e.campanhaId===campanhaId && e.data && e.data.slice(0,7)===chave));
  if(lista.length===0) return `<div class="table-empty">Nenhuma entrega neste mês.</div>`;
  return `<table><thead><tr><th>Registro no sistema</th><th>Colaborador</th><th>Material</th><th>Qtd.</th><th>Status</th></tr></thead>
    <tbody>${lista.map(e=>{
      const c = STATE.colaboradores.find(x=>x.id===e.colaboradorId);
      const cat = resolverCategoria(campanhaId, e.tipo);
      const rotuloData = 'Coleta';
      return `<tr><td><span>${formatarDataHoraRegistro(e.criadoEm)}</span><div class="small-note">${rotuloData}: ${formatarData(e.data)}</div></td><td>${escapeHtml(c?c.nome:'(removido)')}</td><td>${cat?escapeHtml(cat.label.split(' (')[0]):'Outros'}</td><td>${e.quantidade}</td><td>${e.statusValidacao==='validado'?'<span class="badge badge-green">Validado</span>':'<span class="badge badge-amber">Pendente</span>'}</td></tr>`;
    }).join('')}</tbody></table>`;
}
function baixarArquivo(conteudo, nome, tipo){
  const partes = /^text\/csv/.test(tipo) ? ['\ufeff',conteudo] : [conteudo];
  const blob = new Blob(partes,{type:tipo.replace(/;\s*$/,'')});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=nome; a.rel='noopener'; a.style.display='none';
  document.body.appendChild(a);
  setTimeout(()=>{
    a.click();
    setTimeout(()=>{ a.remove(); URL.revokeObjectURL(url); },1500);
  },0);
}
window.baixarArquivo=baixarArquivo;
function exportarCsvEntregas(mes,ano){
  if(!exigirAdmin()) return;
  const campanhaId = STATE.campanhaSelecionadaId;
  const chave = chaveMA(mes,ano);
  const lista = STATE.entregas.filter(e=>e.campanhaId===campanhaId && e.data && e.data.slice(0,7)===chave);
  let csv = 'Data,Colaborador,Setor,Material,Quantidade,Unidade,Status,ResponsavelContagem,Observacoes\n';
  lista.forEach(e=>{
    const c = STATE.colaboradores.find(x=>x.id===e.colaboradorId);
    const cat = resolverCategoria(campanhaId, e.tipo);
    const linha = [e.data, c?c.nome:'', c?c.setor:'', cat?cat.label:'Outros', e.quantidade, e.unidade, e.statusValidacao, e.responsavelContagem||'', (e.observacoes||'').replace(/,/g,';')];
    csv += linha.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')+'\n';
  });
  baixarArquivo(csv, `entregas-${nomeMes(mes)}-${ano}.csv`, 'text/csv;charset=utf-8;');
}
window.exportarCsvEntregas = exportarCsvEntregas;

/* =========================================================
   RELATÓRIOS
   ========================================================= */
function renderRelatorios(){
  if(!STATE.isAdmin) return `<div class="card"><div class="empty-state">Entre como administrador para acessar as exportações.</div></div>`;
  const mes=STATE.rankMes, ano=STATE.rankAno;
  const campanhaId=STATE.campanhaSelecionadaId;
  const campanha = campanhaPorId(STATE.campanhaSelecionadaId);
  const cfgTroca = campanha && campanha.trocaCartela && campanha.trocaCartela.ativo ? campanha.trocaCartela : null;
  const entregasMes=STATE.entregas.filter(item=>item.campanhaId===campanhaId&&item.data&&item.data.slice(0,7)===chaveMA(mes,ano));
  const entregasValidadas=entregasValidadasDoMes(campanhaId,mes,ano);
  const participantes=new Set(entregasValidadas.map(item=>item.colaboradorId)).size;
  const totalMateriais=calcularResultadosMes(campanhaId,mes,ano).reduce((total,item)=>total+item.totalMateriais,0);
  const totalExcedentes=dadosExcedentesDoMes(campanhaId,mes,ano).reduce((total,item)=>total+item.total,0);
  const cardRelatorio=(titulo,descricao,acao,rotulo)=>`
    <article class="card report-card">
      <div class="stat-label">${titulo}</div>
      <p class="small-note">${descricao}</p>
      <button class="btn btn-outline btn-sm" type="button" onclick="${acao}">${icon('download',15)}${rotulo}</button>
    </article>`;
  return `
    <div class="card report-period">
      <div><div class="stat-label">Período de referência</div><p class="small-note" style="margin:4px 0 0;">${escapeHtml(campanha?campanha.nome:'Nenhuma campanha selecionada')}</p></div>
      <div class="filters" style="flex:1;min-width:min(100%,260px);">${seletorMesAno('rank', mes, ano)}</div>
    </div>
    <div class="grid grid-4" style="margin-top:12px;">
      <div class="card stat-card"><div class="stat-label">Entregas registradas</div><div class="stat-value">${entregasMes.length}</div><div class="stat-sub">${entregasValidadas.length} validadas</div></div>
      <div class="card stat-card"><div class="stat-label">Colaboradores participantes</div><div class="stat-value">${participantes}</div><div class="stat-sub">com entrega validada</div></div>
      <div class="card stat-card"><div class="stat-label">Materiais computados</div><div class="stat-value">${Math.round(totalMateriais).toLocaleString('pt-BR')}</div><div class="stat-sub">unidades equivalentes</div></div>
      <div class="card stat-card"><div class="stat-label">Excedentes trazidos</div><div class="stat-value">${Math.round(totalExcedentes).toLocaleString('pt-BR')}</div><div class="stat-sub">unidades equivalentes</div></div>
    </div>
    <div class="section-title">Relatórios para baixar</div>
    <div class="grid report-grid">
      ${cardRelatorio('Ranking mensal','Posição, pontuação, cumprimento médio e metas dos colaboradores.',`exportarCsvRanking(${mes},${ano})`,'Exportar ranking')}
      ${cardRelatorio('Entregas detalhadas','Registros individuais, material, quantidade, status e responsável.',`exportarCsvEntregas(${mes},${ano})`,'Exportar entregas')}
      ${cardRelatorio('Resumo por material','Quantidade validada por categoria, comparada à meta mensal.',`exportarCsvResumoMateriais(${mes},${ano})`,'Exportar resumo')}
      ${cardRelatorio('Excedentes por colaborador','Saldo de meses anteriores, separado por colaborador e material.',`exportarCsvExcedentes(${mes},${ano})`,'Exportar excedentes')}
      ${cardRelatorio('Transferências','Reatribuições de material do mês selecionado.',`exportarCsvTransferencias(${mes},${ano})`,'Exportar transferências')}
      ${cardRelatorio('Cadastro de colaboradores','Lista completa com setor, cargo, situação e data de cadastro.','exportarCsvColaboradores()','Exportar cadastro')}
      ${cfgTroca? `
      ${cardRelatorio(`Resgates de ${escapeHtml(cfgTroca.nomeItem)}`,'Histórico de resgates, colaborador e quantidade de kits.',`exportarCsvTrocas()`,'Exportar resgates')}` : ''}
    </div>
  `;
}
function exportarCsvResumoMateriais(mes,ano){
  if(!exigirAdmin()) return;
  const campanhaId=STATE.campanhaSelecionadaId;
  const campanha=campanhaPorId(campanhaId);
  const categorias=categoriasDaCampanha(campanha);
  const metas=getMetasDoMes(campanhaId,mes,ano);
  const agregados=new Map(categorias.map(cat=>[cat.key,{registros:0,quantidade:0}]));
  const outros=new Map();
  entregasValidadasDoMes(campanhaId,mes,ano).forEach(entrega=>{
    const categoria=resolverCategoria(campanhaId,entrega.tipo);
    if(categoria&&agregados.has(categoria.key)){
      const total=agregados.get(categoria.key);
      total.registros++;
      total.quantidade+=normalizarQuantidadeUnidades(entrega);
      return;
    }
    const unidade=entrega.unidade||'unidades';
    const total=outros.get(unidade)||{registros:0,quantidade:0};
    total.registros++;
    total.quantidade+=Number(entrega.quantidade)||0;
    outros.set(unidade,total);
  });
  const linhas=[['Material','Unidade','EntregasValidadas','Quantidade','MetaMensal','CumprimentoPercentual']];
  categorias.forEach(cat=>{
    const total=agregados.get(cat.key);
    const meta=Number(metas[cat.key]??cat.metaDefault)||0;
    linhas.push([cat.label,cat.unidade,total.registros,total.quantidade,meta,meta?total.quantidade/meta*100:0]);
  });
  outros.forEach((total,unidade)=>{
    linhas.push(['Outros materiais',unidade,total.registros,total.quantidade,'','']);
  });
  const csv=linhas.map(linha=>linha.map(valor=>`"${String(valor).replace(/"/g,'""')}"`).join(',')).join('\n')+'\n';
  baixarArquivo(csv,`resumo-materiais-${nomeMes(mes)}-${ano}.csv`,'text/csv;charset=utf-8;');
}
function exportarCsvExcedentes(mes,ano){
  if(!exigirAdmin()) return;
  const lista=dadosExcedentesDoMes(STATE.campanhaSelecionadaId,mes,ano);
  const linhas=[['Colaborador','Setor','Material','Unidade','Excedente']];
  lista.forEach(item=>item.itens.forEach(material=>{
    linhas.push([item.colaborador.nome,item.colaborador.setor||'',material.categoria,material.unidade,material.valor]);
  }));
  const csv=linhas.map(linha=>linha.map(valor=>`"${String(valor).replace(/"/g,'""')}"`).join(',')).join('\n')+'\n';
  baixarArquivo(csv,`excedentes-${nomeMes(mes)}-${ano}.csv`,'text/csv;charset=utf-8;');
}
function exportarCsvRanking(mes,ano){
  if(!exigirAdmin()) return;
  const resultados = calcularResultadosMes(STATE.campanhaSelecionadaId, mes,ano);
  let csv = 'Posicao,Colaborador,Setor,Pontuacao,PercentualMedio,MetaAtingida,TotalMateriais\n';
  resultados.forEach(r=>{
    csv += [r.posicao, r.colaborador.nome, r.colaborador.setor||'', r.pontuacao.toFixed(1), r.mediaReal.toFixed(1), r.metaAtingida?'Sim':'Nao', r.totalMateriais]
      .map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')+'\n';
  });
  baixarArquivo(csv, `ranking-${nomeMes(mes)}-${ano}.csv`,'text/csv;charset=utf-8;');
}
function exportarCsvColaboradores(){
  if(!exigirAdmin()) return;
  let csv = 'Nome,Setor,Cargo,Status,DataCadastro\n';
  STATE.colaboradores.forEach(c=>{ csv += [c.nome,c.setor||'',c.cargo||'',c.status,c.dataCadastro].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')+'\n'; });
  baixarArquivo(csv,'colaboradores.csv','text/csv;charset=utf-8;');
}
function exportarCsvTransferencias(mes,ano){
  if(!exigirAdmin()) return;
  const lista = transferenciasDoMes(STATE.campanhaSelecionadaId, mes,ano);
  let csv = 'Data,ColaboradorOrigem,CategoriaOrigem,ColaboradorDestino,CategoriaDestino,Quantidade,Motivo\n';
  lista.forEach(t=>{
    const {origem,destino,catOrigem:catO,catDestino:catD}=partesTransferencia(t);
    csv += [t.data, origem?origem.nome:'', catO?catO.label:'', destino?destino.nome:'', catD?catD.label:'', t.quantidade, (t.motivo||'').replace(/,/g,';')]
      .map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')+'\n';
  });
  baixarArquivo(csv, `transferencias-${nomeMes(mes)}-${ano}.csv`, 'text/csv;charset=utf-8;');
}
function exportarCsvTrocas(){
  if(!exigirAdmin()) return;
  const campanhaId = STATE.campanhaSelecionadaId;
  const lista = STATE.trocas.filter(t=>t.campanhaId===campanhaId);
  let csv = 'Data,Colaborador,QuantidadeKits,ItemEmitido,QuantidadeEmitida\n';
  lista.forEach(t=>{
    const c = STATE.colaboradores.find(x=>x.id===t.colaboradorId);
    csv += [t.data, c?c.nome:'', t.quantidadeKits, t.nomeItem||'', t.cartelasEmitidas]
      .map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')+'\n';
  });
  baixarArquivo(csv, `trocas.csv`, 'text/csv;charset=utf-8;');
}
window.exportarCsvRanking=exportarCsvRanking; window.exportarCsvColaboradores=exportarCsvColaboradores; window.exportarCsvTransferencias=exportarCsvTransferencias; window.exportarCsvTrocas=exportarCsvTrocas;

/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */
function resumoItemLixeira(item){
  const registro=item.registro;
  if(item.colecao==='colaboradores') return registro.nome||'Colaborador sem nome';
  if(item.colecao==='campanhas') return registro.nome||'Campanha sem nome';
  if(item.colecao==='entregas'){
    const colaborador=STATE.colaboradores.find(colab=>colab.id===registro.colaboradorId);
    const categoria=resolverCategoria(registro.campanhaId,registro.tipo);
    return `Entrega · ${colaborador?colaborador.nome:'colaborador removido'} · ${categoria?categoria.label.split(' (')[0]:'material'} · ${formatarData(registro.data)}`;
  }
  if(item.colecao==='transferencias'){
    const {origem,destino}=partesTransferencia(registro);
    return `Transferência · ${origem?origem.nome:'origem removida'} → ${destino?destino.nome:'destino removido'} · ${formatarData(registro.data)}`;
  }
  if(item.colecao==='trocas'){
    const colaborador=STATE.colaboradores.find(colab=>colab.id===registro.colaboradorId);
    return `Resgate · ${colaborador?colaborador.nome:'colaborador removido'} · ${registro.nomeItem||'item'} · ${formatarData(registro.data)}`;
  }
  return 'Registro';
}
function renderLixeira(){
  if(!STATE.isAdmin) return `<div class="card"><div class="empty-state">Esta área é restrita ao administrador.</div></div>`;
  const itens=[...STATE.lixeira]
    .filter(item=>Date.now()-Date.parse(item.excluidoEm)<PRAZO_LIXEIRA_MS)
    .sort((a,b)=>Date.parse(b.excluidoEm)-Date.parse(a.excluidoEm));
  if(!itens.length) return `<div class="card"><div class="empty-state">A lixeira está vazia.<p class="small-note">Itens apagados ficam disponíveis para restauração por até 30 dias.</p></div></div>`;
  const rotulos={colaboradores:'Colaborador',entregas:'Entrega',transferencias:'Transferência',trocas:'Resgate',campanhas:'Campanha'};
  return `<div class="card">
    <p class="small-note">Os itens são removidos definitivamente após 30 dias. Restaure um item para devolvê-lo à coleção original.</p>
    <div class="table-wrap"><table class="trash-table"><thead><tr><th>Tipo</th><th>Item</th><th>Apagado em</th><th>Prazo</th><th></th></tr></thead>
      <tbody>${itens.map(item=>{
        const diasRestantes=Math.max(0,Math.ceil((Date.parse(item.excluidoEm)+PRAZO_LIXEIRA_MS-Date.now())/86400000));
        return `<tr>
          <td data-label="Tipo">${rotulos[item.colecao]||'Registro'}</td>
          <td class="trash-item-cell" data-label="Item">${escapeHtml(resumoItemLixeira(item))}</td>
          <td data-label="Apagado em">${escapeHtml(new Date(item.excluidoEm).toLocaleString('pt-BR'))}</td>
          <td data-label="Prazo">${diasRestantes} dia${diasRestantes===1?'':'s'}</td>
          <td class="trash-actions-cell"><div class="trash-actions">
            <button class="btn btn-outline btn-sm" type="button" onclick="restaurarRegistroLixeira('${escapeHtml(item.id)}')">${icon('upload',15)}Restaurar item</button>
            <button class="btn btn-danger btn-sm" type="button" onclick="excluirDefinitivamenteLixeira('${escapeHtml(item.id)}')">${icon('trash',15)}Excluir item definitivamente</button>
          </div></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
  </div>`;
}
function limparAvisoPublico(tipo){
  const id=tipo==='manutencao'?'avisoManutencaoPublicaInput':'avisoRankingPublicoInput';
  const campo=document.getElementById(id);
  if(campo) campo.innerHTML='';
  campo?.focus();
}
let selecaoAvisoPublico=null;
function preservarSelecaoAvisoPublico(id){
  const campo=document.getElementById(id);
  const selecao=window.getSelection();
  if(!campo||!selecao||!selecao.rangeCount)return;
  const intervalo=selecao.getRangeAt(0);
  if(campo.contains(intervalo.commonAncestorContainer))selecaoAvisoPublico={id,intervalo:intervalo.cloneRange()};
}
function restaurarSelecaoAvisoPublico(id){
  const campo=document.getElementById(id);
  if(!campo)return null;
  campo.focus();
  const selecao=window.getSelection();
  if(selecaoAvisoPublico?.id===id&&selecao){
    selecao.removeAllRanges();
    selecao.addRange(selecaoAvisoPublico.intervalo);
  }
  const intervalo=selecao?.rangeCount?selecao.getRangeAt(0):null;
  return intervalo&&campo.contains(intervalo.commonAncestorContainer)?intervalo:null;
}
function aplicarEstiloAvisoPublico(id, propriedade, valor){
  const intervalo=restaurarSelecaoAvisoPublico(id);
  if(!intervalo||intervalo.collapsed)return;
  if(propriedade==='fontSize'&&!['8px','10px','12px','14px','16px','18px','24px','32px'].includes(valor))return;
  if(propriedade==='color'&&!['#202820','#176b3a','#1d4ed8','#b42318','#9333ea','#d97706'].includes(valor))return;
  const span=document.createElement('span');
  span.style[propriedade]=valor;
  span.appendChild(intervalo.extractContents());
  intervalo.insertNode(span);
  const selecao=window.getSelection();
  const novoIntervalo=document.createRange();
  novoIntervalo.selectNodeContents(span);
  selecao.removeAllRanges();
  selecao.addRange(novoIntervalo);
  selecaoAvisoPublico={id,intervalo:novoIntervalo.cloneRange()};
}
function alterarTamanhoAvisoPublico(id, direcao){
  const valores=[8,10,12,14,16,18,24,32];
  const saida=document.getElementById(id+'FonteValor');
  const atual=Number(saida?.dataset.tamanho||16);
  const indice=valores.indexOf(atual);
  const tamanho=valores[Math.max(0,Math.min(valores.length-1,(indice<0?4:indice)+direcao))];
  if(saida){saida.dataset.tamanho=String(tamanho);saida.textContent=tamanho+' px';}
  aplicarEstiloAvisoPublico(id,'fontSize',tamanho+'px');
}
function formatarAvisoPublico(id, comando, valor){
  const campo=document.getElementById(id);
  if(!campo)return;
  if(comando==='fontSize'){aplicarEstiloAvisoPublico(id,'fontSize',String(valor));return;}
  if(comando==='foreColor'){aplicarEstiloAvisoPublico(id,'color',String(valor));return;}
  campo.focus();
  if(selecaoAvisoPublico?.id===id){
    const selecao=window.getSelection();
    selecao.removeAllRanges();
    selecao.addRange(selecaoAvisoPublico.intervalo);
  }
  if(comando==='createLink'){
    const url=prompt('Informe o endereço do link (https://...)');
    if(!url||!/^https?:\/\//i.test(url.trim()))return;
    document.execCommand('createLink',false,url.trim());
  }else document.execCommand(comando,false,null);
  selecaoAvisoPublico=null;
}
window.alterarTamanhoAvisoPublico=alterarTamanhoAvisoPublico;
window.formatarAvisoPublico=formatarAvisoPublico;
async function salvarAvisoPublico(tipo){
  if(!exigirAdmin()) return;
  const manutencao=tipo==='manutencao';
  const campo=document.getElementById(manutencao?'avisoManutencaoPublicaInput':'avisoRankingPublicoInput');
  const mensagem=sanitizarAvisoPublicoHtml((campo?.innerHTML||'').trim(),1000);
  const erroElemento=document.getElementById('avisosPublicosErro');
  const chaveTexto=manutencao?'avisoManutencaoPublico':'avisoRankingPublico';
  const chaveMostrar=manutencao?'mostrarAvisoManutencaoPublico':'mostrarAvisoRankingPublico';
  const campoFirestore=manutencao?'avisoManutencao':'avisoRanking';
  const mostrar=mensagem.length>0;
  const anteriorTexto=STATE[chaveTexto]||'';
  const anteriorMostrar=!!STATE[chaveMostrar];
  if(erroElemento){erroElemento.textContent='';}
  try{
    if(STORAGE_MODE==='firestore'){
      await FIREBASE_DB.collection('reciclar-apac-public-settings').doc('maintenance').set({
        ativada:!!STATE.manutencaoPublica,
        atualizadoEm:new Date().toISOString(),
        [campoFirestore]:mensagem,
        [manutencao?'mostrarAvisoManutencao':'mostrarAvisoRanking']:mostrar,
      },{merge:true});
    }else{
      STATE.config[chaveTexto]=mensagem;
      STATE.config[chaveMostrar]=mostrar;
      if(!await salvarConfig()) throw STORAGE_ERRORS.get('config')||new Error('Não foi possível salvar a mensagem.');
    }
    STATE[chaveTexto]=mensagem;
    STATE[chaveMostrar]=mostrar;
    if(erroElemento){erroElemento.textContent=mensagem?'Mensagem salva e ativada.':'Mensagem removida e desativada.';}
  }catch(erro){
    STATE[chaveTexto]=anteriorTexto;
    STATE[chaveMostrar]=anteriorMostrar;
    if(erroElemento){erroElemento.textContent=erro.message||'Não foi possível salvar a mensagem.';}
    console.error('Erro ao salvar aviso público',erro);
  }finally{}
}
window.limparAvisoPublico=limparAvisoPublico;
window.salvarAvisoPublico=salvarAvisoPublico;

function renderConfig(){
  if(!STATE.isAdmin){
    return `<div class="card"><div class="empty-state">Esta área é restrita ao administrador.</div></div>`;
  }
  return `
    <div class="settings-tabs" role="tablist" aria-label="Seções das configurações">
      <button type="button" class="settings-tab ${abaConfiguracoesAtiva==='perfil'?'is-active':''}" role="tab" aria-selected="${abaConfiguracoesAtiva==='perfil'?'true':'false'}" data-settings-tab="perfil" onclick="selecionarAbaConfiguracoes('perfil')">Perfil</button>
      <button type="button" class="settings-tab ${abaConfiguracoesAtiva==='campanhas'?'is-active':''}" role="tab" aria-selected="${abaConfiguracoesAtiva==='campanhas'?'true':'false'}" data-settings-tab="campanhas" onclick="selecionarAbaConfiguracoes('campanhas')">Campanhas</button>
      <button type="button" class="settings-tab ${abaConfiguracoesAtiva==='backup'?'is-active':''}" role="tab" aria-selected="${abaConfiguracoesAtiva==='backup'?'true':'false'}" data-settings-tab="backup" onclick="selecionarAbaConfiguracoes('backup')">Backup</button>
      <button type="button" class="settings-tab ${abaConfiguracoesAtiva==='manutencao'?'is-active':''}" role="tab" aria-selected="${abaConfiguracoesAtiva==='manutencao'?'true':'false'}" data-settings-tab="manutencao" onclick="selecionarAbaConfiguracoes('manutencao')">Manutenção</button>
      <button type="button" class="settings-tab ${abaConfiguracoesAtiva==='tecnica'?'is-active':''}" role="tab" aria-selected="${abaConfiguracoesAtiva==='tecnica'?'true':'false'}" data-settings-tab="tecnica" onclick="selecionarAbaConfiguracoes('tecnica')">Desenvolvedor</button>
    </div>
    <div class="settings-panel" data-settings-panel="perfil" ${abaConfiguracoesAtiva!=='perfil'?'hidden':''}>
    <div class="section-title">Meu perfil</div>
    <div class="card">
      <p class="small-note">Seu nome aparece junto ao botão de sair. O perfil administrativo ou operacional é carregado do Firebase e não pode ser alterado por este formulário.</p>
      <form onsubmit="event.preventDefault();salvarPerfilUsuario('perfilConfig')">
        ${renderCamposPerfilUsuario('perfilConfig')}
        <button class="btn btn-outline" type="submit">Salvar nome</button>
      </form>
    </div>

    </div>
    <div class="settings-panel" data-settings-panel="campanhas" ${abaConfiguracoesAtiva!=='campanhas'?'hidden':''}>
    <div class="section-title">Campanhas</div>
    <div class="card">
      <p class="small-note">Cada campanha é independente: pode coexistir com outras, mesmo com períodos sobrepostos. Uma entrega ou transferência sempre pertence a uma campanha específica, escolhida no momento do registro, nunca deduzida pela data. Cada campanha tem suas próprias metas e seu próprio acúmulo de excedente.</p>
      <div class="filters" style="margin-top:12px;">
        <div><select id="filtroStatusCampanha" onchange="renderTabelaCampanhas()"><option value="">Todos os status</option><option value="ativa">Ativas</option><option value="planejada">Planejadas</option><option value="encerrada">Encerradas</option></select></div>
      </div>
      <div class="table-wrap" style="margin-top:12px;" id="tabelaCampanhasWrap"></div>
      <button class="btn btn-primary" style="margin-top:12px;" onclick="abrirFormCampanha()">${icon('plus',16)}Nova campanha</button>
    </div>

    </div>
    <div class="settings-panel" data-settings-panel="manutencao" ${abaConfiguracoesAtiva!=='manutencao'?'hidden':''}>
    <div class="section-title">Segurança</div>
    <div class="card">
      <p class="small-note">A autenticação é gerenciada pelo Firebase Authentication e as permissões são controladas pelos papéis definidos no Firestore. Para alterar sua senha, solicite um link de redefinição por e-mail.</p>
      <button class="btn btn-outline" onclick="enviarRedefinicaoSenha()">Enviar link de redefinição de senha</button>
    </div>

    <div class="section-title">Página pública</div>
    <div class="card">
      <label class="maintenance-toggle-row">
        <span><b>Exibir aviso de manutenção</b><span class="small-note" style="display:block;font-weight:400;margin-top:4px;">Substitui temporariamente o ranking público por um aviso de manutenção. O acesso administrativo permanece disponível.</span></span>
        <span class="toggle-switch">
          <input id="manutencaoPublicaCheckbox" type="checkbox" ${STATE.manutencaoPublica?'checked':''} ${STATE.salvandoManutencaoPublica?'disabled':''} onchange="alterarManutencaoPublica(this.checked)" role="switch" aria-label="Exibir aviso de manutenção">
          <span class="toggle-switch-track" aria-hidden="true"></span>
        </span>
      </label>
      <p id="manutencaoPublicaErro" class="auth-error" role="alert" ${STATE.erroManutencaoPublica?'':'hidden'}>${escapeHtml(STATE.erroManutencaoPublica)}</p>
    </div>

    <div class="card" style="display:grid;gap:18px;">
      <section class="public-notice-editor">
        <h3>Manutenção</h3>
        <div class="field"><label for="avisoManutencaoPublicaInput">Mensagem extra na página de manutenção</label>
          <div class="rich-text-toolbar" role="toolbar" aria-label="Formatação da mensagem de manutenção">
            <button class="btn btn-outline btn-sm" type="button" aria-label="Negrito" title="Negrito" onclick="formatarAvisoPublico('avisoManutencaoPublicaInput','bold')"><b>B</b></button>
            <button class="btn btn-outline btn-sm" type="button" aria-label="Itálico" title="Itálico" onclick="formatarAvisoPublico('avisoManutencaoPublicaInput','italic')"><i>I</i></button>
            <button class="btn btn-outline btn-sm" type="button" aria-label="Sublinhado" title="Sublinhado" onclick="formatarAvisoPublico('avisoManutencaoPublicaInput','underline')"><u>U</u></button>
            <button class="btn btn-outline btn-sm" type="button" aria-label="Lista com marcadores" onclick="formatarAvisoPublico('avisoManutencaoPublicaInput','insertUnorderedList')">• Lista</button>
            <button class="btn btn-outline btn-sm" type="button" aria-label="Lista numerada" onclick="formatarAvisoPublico('avisoManutencaoPublicaInput','insertOrderedList')">1. Lista</button>
            <button class="btn btn-outline btn-sm" type="button" aria-label="Inserir link" onclick="formatarAvisoPublico('avisoManutencaoPublicaInput','createLink')">Link</button>
            <span class="rich-text-size-control"><span class="rich-text-control-label">Fonte:</span>
              <button class="rich-text-stepper" type="button" aria-label="Diminuir tamanho da fonte" title="Diminuir fonte" onmousedown="preservarSelecaoAvisoPublico('avisoManutencaoPublicaInput')" onclick="alterarTamanhoAvisoPublico('avisoManutencaoPublicaInput',-1)">−</button>
              <span class="rich-text-size-value" id="avisoManutencaoPublicaInputFonteValor" data-tamanho="16">16 px</span>
              <button class="rich-text-stepper" type="button" aria-label="Aumentar tamanho da fonte" title="Aumentar fonte" onmousedown="preservarSelecaoAvisoPublico('avisoManutencaoPublicaInput')" onclick="alterarTamanhoAvisoPublico('avisoManutencaoPublicaInput',1)">+</button>
            </span>
            <span class="rich-text-color-control" role="group" aria-label="Cor da fonte">
              <span class="rich-text-control-label">Cor:</span>
              <button class="rich-text-color-swatch" type="button" style="--swatch:#202820" aria-label="Cor preta" title="Preto" onmousedown="preservarSelecaoAvisoPublico('avisoManutencaoPublicaInput')" onclick="formatarAvisoPublico('avisoManutencaoPublicaInput','foreColor','#202820')"></button>
              <button class="rich-text-color-swatch" type="button" style="--swatch:#176b3a" aria-label="Cor verde" title="Verde" onmousedown="preservarSelecaoAvisoPublico('avisoManutencaoPublicaInput')" onclick="formatarAvisoPublico('avisoManutencaoPublicaInput','foreColor','#176b3a')"></button>
              <button class="rich-text-color-swatch" type="button" style="--swatch:#1d4ed8" aria-label="Cor azul" title="Azul" onmousedown="preservarSelecaoAvisoPublico('avisoManutencaoPublicaInput')" onclick="formatarAvisoPublico('avisoManutencaoPublicaInput','foreColor','#1d4ed8')"></button>
              <button class="rich-text-color-swatch" type="button" style="--swatch:#b42318" aria-label="Cor vermelha" title="Vermelho" onmousedown="preservarSelecaoAvisoPublico('avisoManutencaoPublicaInput')" onclick="formatarAvisoPublico('avisoManutencaoPublicaInput','foreColor','#b42318')"></button>
              <button class="rich-text-color-swatch" type="button" style="--swatch:#9333ea" aria-label="Cor roxa" title="Roxo" onmousedown="preservarSelecaoAvisoPublico('avisoManutencaoPublicaInput')" onclick="formatarAvisoPublico('avisoManutencaoPublicaInput','foreColor','#9333ea')"></button>
              <button class="rich-text-color-swatch" type="button" style="--swatch:#d97706" aria-label="Cor laranja" title="Laranja" onmousedown="preservarSelecaoAvisoPublico('avisoManutencaoPublicaInput')" onclick="formatarAvisoPublico('avisoManutencaoPublicaInput','foreColor','#d97706')"></button>
            </span>
          </div>
          <div id="avisoManutencaoPublicaInput" class="rich-text-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Mensagem extra na página de manutenção" data-placeholder="Opcional: aparece abaixo do aviso padrão">${sanitizarAvisoPublicoHtml(STATE.avisoManutencaoPublico||STATE.config?.avisoManutencaoPublico||'')}</div>
        </div>
        <div class="public-notice-actions"><button class="btn btn-outline btn-sm" type="button" onclick="limparAvisoPublico('manutencao')">Limpar</button><button class="btn btn-primary btn-sm" type="button" onclick="salvarAvisoPublico('manutencao')">Salvar</button></div>
      </section>
      <section class="public-notice-editor">
        <h3>Ranking público</h3>
        <div class="field"><label for="avisoRankingPublicoInput">Mensagem extra no ranking público</label>
          <div class="rich-text-toolbar" role="toolbar" aria-label="Formatação da mensagem do ranking público">
            <button class="btn btn-outline btn-sm" type="button" aria-label="Negrito" title="Negrito" onclick="formatarAvisoPublico('avisoRankingPublicoInput','bold')"><b>B</b></button>
            <button class="btn btn-outline btn-sm" type="button" aria-label="Itálico" title="Itálico" onclick="formatarAvisoPublico('avisoRankingPublicoInput','italic')"><i>I</i></button>
            <button class="btn btn-outline btn-sm" type="button" aria-label="Sublinhado" title="Sublinhado" onclick="formatarAvisoPublico('avisoRankingPublicoInput','underline')"><u>U</u></button>
            <button class="btn btn-outline btn-sm" type="button" aria-label="Lista com marcadores" onclick="formatarAvisoPublico('avisoRankingPublicoInput','insertUnorderedList')">• Lista</button>
            <button class="btn btn-outline btn-sm" type="button" aria-label="Lista numerada" onclick="formatarAvisoPublico('avisoRankingPublicoInput','insertOrderedList')">1. Lista</button>
            <button class="btn btn-outline btn-sm" type="button" aria-label="Inserir link" onclick="formatarAvisoPublico('avisoRankingPublicoInput','createLink')">Link</button>
            <span class="rich-text-size-control"><span class="rich-text-control-label">Fonte:</span>
              <button class="rich-text-stepper" type="button" aria-label="Diminuir tamanho da fonte" title="Diminuir fonte" onmousedown="preservarSelecaoAvisoPublico('avisoRankingPublicoInput')" onclick="alterarTamanhoAvisoPublico('avisoRankingPublicoInput',-1)">−</button>
              <span class="rich-text-size-value" id="avisoRankingPublicoInputFonteValor" data-tamanho="16">16 px</span>
              <button class="rich-text-stepper" type="button" aria-label="Aumentar tamanho da fonte" title="Aumentar fonte" onmousedown="preservarSelecaoAvisoPublico('avisoRankingPublicoInput')" onclick="alterarTamanhoAvisoPublico('avisoRankingPublicoInput',1)">+</button>
            </span>
            <span class="rich-text-color-control" role="group" aria-label="Cor da fonte">
              <span class="rich-text-control-label">Cor:</span>
              <button class="rich-text-color-swatch" type="button" style="--swatch:#202820" aria-label="Cor preta" title="Preto" onmousedown="preservarSelecaoAvisoPublico('avisoRankingPublicoInput')" onclick="formatarAvisoPublico('avisoRankingPublicoInput','foreColor','#202820')"></button>
              <button class="rich-text-color-swatch" type="button" style="--swatch:#176b3a" aria-label="Cor verde" title="Verde" onmousedown="preservarSelecaoAvisoPublico('avisoRankingPublicoInput')" onclick="formatarAvisoPublico('avisoRankingPublicoInput','foreColor','#176b3a')"></button>
              <button class="rich-text-color-swatch" type="button" style="--swatch:#1d4ed8" aria-label="Cor azul" title="Azul" onmousedown="preservarSelecaoAvisoPublico('avisoRankingPublicoInput')" onclick="formatarAvisoPublico('avisoRankingPublicoInput','foreColor','#1d4ed8')"></button>
              <button class="rich-text-color-swatch" type="button" style="--swatch:#b42318" aria-label="Cor vermelha" title="Vermelho" onmousedown="preservarSelecaoAvisoPublico('avisoRankingPublicoInput')" onclick="formatarAvisoPublico('avisoRankingPublicoInput','foreColor','#b42318')"></button>
              <button class="rich-text-color-swatch" type="button" style="--swatch:#9333ea" aria-label="Cor roxa" title="Roxo" onmousedown="preservarSelecaoAvisoPublico('avisoRankingPublicoInput')" onclick="formatarAvisoPublico('avisoRankingPublicoInput','foreColor','#9333ea')"></button>
              <button class="rich-text-color-swatch" type="button" style="--swatch:#d97706" aria-label="Cor laranja" title="Laranja" onmousedown="preservarSelecaoAvisoPublico('avisoRankingPublicoInput')" onclick="formatarAvisoPublico('avisoRankingPublicoInput','foreColor','#d97706')"></button>
            </span>
          </div>
          <div id="avisoRankingPublicoInput" class="rich-text-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Mensagem extra no ranking público" data-placeholder="Opcional: aparece acima dos filtros do ranking">${sanitizarAvisoPublicoHtml(STATE.avisoRankingPublico||STATE.config?.avisoRankingPublico||'')}</div>
        </div>
        <div class="public-notice-actions"><button class="btn btn-outline btn-sm" type="button" onclick="limparAvisoPublico('ranking')">Limpar</button><button class="btn btn-primary btn-sm" type="button" onclick="salvarAvisoPublico('ranking')">Salvar</button></div>
      </section>
      <p id="avisosPublicosErro" class="small-note" role="status" aria-live="polite" style="min-height:1.4em;margin:0;"></p>
    </div>

    <div class="section-title">Senha de solicitação de troca</div>
    <div class="card">
      <p class="small-note">Defina uma senha que será pedida na página pública depois que o colaborador clicar em "Solicitar troca". Deixe em branco para não exigir senha.</p>
      <div class="field"><label for="senhaSolicitacaoTrocaInput">Senha</label><input id="senhaSolicitacaoTrocaInput" type="text" autocomplete="off" value="${escapeHtml(STATE.senhaSolicitacaoTroca||'')}" ${STATE.salvandoSenhaSolicitacaoTroca?'disabled':''}></div>
      <button class="btn btn-outline" onclick="salvarSenhaSolicitacaoTroca()" ${STATE.salvandoSenhaSolicitacaoTroca?'disabled':''}>Salvar senha</button>
      <p id="senhaSolicitacaoTrocaErro" class="auth-error" role="alert" ${STATE.erroSenhaSolicitacaoTroca?'':'hidden'}>${escapeHtml(STATE.erroSenhaSolicitacaoTroca)}</p>
    </div>

    </div>
    <div class="settings-panel" data-settings-panel="backup" ${abaConfiguracoesAtiva!=='backup'?'hidden':''}>
    <div class="section-title">Backup e restauração</div>
    <div class="card" style="display:grid;gap:12px;">
      <div>
        <p class="small-note">Gere uma cópia local dos dados do aplicativo como camada adicional de recuperação. O backup local complementa o armazenamento principal no Firebase, mas não o substitui.</p>
      </div>
      <div class="backup-actions">
        <button class="btn btn-outline btn-block" onclick="exportarBackupLocal()">${icon('download',16)}Exportar backup</button>
        <label class="btn btn-outline btn-block backup-import-btn">
          ${icon('upload',16)}Importar backup
          <input type="file" id="arquivoBackupImport" accept="application/json,.json" style="display:none;" onchange="importarBackupLocal(this.files[0])">
        </label>
      </div>
    </div>

    <div class="section-title">Backup no Google Drive</div>
    <div class="card drive-backup-card" id="cardBackupGoogleDrive" style="display:grid;gap:12px;">
      ${renderCardBackupGoogleDriveConteudo()}
    </div>

    </div>
    <div class="settings-panel" data-settings-panel="tecnica" ${abaConfiguracoesAtiva!=='tecnica'?'hidden':''}>
    <div class="section-title">Desenvolvedor</div>
    <div class="card" id="firestoreMonitorContent" style="display:grid;gap:12px;">
      <p class="small-note">Preparando o monitoramento de leituras do Firestore…</p>
    </div>

    <div class="card settings-resources">
      <div class="section-title" style="margin-top:0">Documentação e recursos</div>
      <p class="small-note">Referências dos serviços usados pelo Reciclapac e documentos do sistema.</p>
      <ul>
        <li><a href="https://github.com/willamartius/reciclapac" target="_blank" rel="noopener noreferrer">Repositório do Reciclapac no GitHub</a></li>
        <li><a href="https://firebase.google.com/docs/firestore" target="_blank" rel="noopener noreferrer">Documentação do Cloud Firestore</a></li>
        <li><a href="https://firebase.google.com/docs/projects/billing/firebase-pricing-plans" target="_blank" rel="noopener noreferrer">Planos e preços do Firebase</a></li>
        <li><a href="https://developers.cloudflare.com/workers/" target="_blank" rel="noopener noreferrer">Documentação do Cloudflare Workers</a></li>
        <li><a href="https://developers.google.com/drive/api/guides/about-sdk" target="_blank" rel="noopener noreferrer">Documentação da API do Google Drive</a></li>
        <li><a href="/termos.html" target="_blank" rel="noopener noreferrer">Termos de uso</a> · <a href="/privacidade.html" target="_blank" rel="noopener noreferrer">Política de privacidade</a></li>
      </ul>
    </div>
    </div>
  `;
}
function abrirFormCampanha(id){
  if(!exigirAdmin()) return;
  const c = id? STATE.campanhas.find(x=>x.id===id) : null;
  const hoje = mesAnoAtual();
  const metas = c? c.metasDefault : Object.fromEntries(CATEGORIAS.map(cat=>[cat.key,cat.metaDefault]));
  const nomesPersonalizados = (c && c.nomesPersonalizados) || {};
  window._materiaisExtrasForm = c ? JSON.parse(JSON.stringify(c.materiaisExtras||[])) : [];
  const trocaCartela = (c && c.trocaCartela) || { ativo:false, nomeItem:'cartela', cartelasPorKit:2, kit:{} };
  const dataInicioValor = c? `${c.anoInicio}-${String(c.mesInicio).padStart(2,'0')}-01` : `${hoje.ano}-${String(hoje.mes).padStart(2,'0')}-01`;
  const dataFimValor = c && c.anoFim? `${c.anoFim}-${String(c.mesFim).padStart(2,'0')}-01` : '';
  abrirModal(`
    <div class="modal-head"><h3>${c?'Editar campanha':'Nova campanha'}</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <div class="field"><label>Nome da campanha</label><input type="text" id="cpNome" value="${c?escapeHtml(c.nome):''}" placeholder="Ex: Reciclar é Cuidar da Casa Comum 2027"></div>
    <div class="grid grid-2">
      <div class="field"><label>Data de início</label><input type="date" id="cpDataInicio" value="${dataInicioValor}"></div>
      <div class="field"><label>Data de encerramento (opcional)</label><input type="date" id="cpDataFim" value="${dataFimValor}"></div>
    </div>
    <p class="small-note" style="margin-top:-8px;">O sistema controla as metas por mês, então só o mês e o ano da data escolhida são considerados. Deixe o encerramento em branco para uma campanha em andamento, sem data para acabar.</p>
    <div class="field"><label>Status</label>
      <select id="cpStatus">
        <option value="planejada" ${c&&c.status==='planejada'?'selected':''}>Planejada</option>
        <option value="ativa" ${!c||c.status==='ativa'?'selected':''}>Ativa</option>
        <option value="encerrada" ${c&&c.status==='encerrada'?'selected':''}>Encerrada</option>
      </select>
    </div>
    <div class="section-title" style="margin:16px 0 8px 0;font-size:13.5px;">Materiais e metas mensais desta campanha</div>
    <p class="small-note" style="margin-top:-4px;">O nome de cada material pode ser personalizado para esta campanha. Desmarque um material do regulamento que não se aplica aqui — ele fica de fora do cálculo desta campanha, sem apagar a definição oficial. Alterar uma meta aqui vale para os próximos meses; meses já registrados mantêm a meta que estava em vigor na época.</p>
    <div class="grid grid-2" style="margin-top:8px;">
      ${CATEGORIAS.map(cat=>{
        const ativo = !((c && c.categoriasDesativadas) || []).includes(cat.key);
        return `
        <div class="field">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" id="cpUsar_${cat.key}" ${ativo?'checked':''} onchange="atualizarCampoMaterialOficial('${cat.key}')" style="width:auto;">
            Usar este material nesta campanha
          </label>
          <input type="text" id="cpNomeCat_${cat.key}" value="${escapeHtml(nomesPersonalizados[cat.key]||cat.label)}" style="margin-top:6px;" oninput="atualizarNomeMaterialCampanha('${cat.key}','cpNomeCat')" ${ativo?'':'disabled'}>
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px;">
            <input type="number" min="0" id="cpMeta_${cat.key}" value="${metas[cat.key]}" ${ativo?'':'disabled'}>
            <span class="small-note" style="white-space:nowrap;">${cat.unidade}</span>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="section-title" style="margin:16px 0 8px 0;font-size:13.5px;">Materiais extras desta campanha</div>
    <p class="small-note" style="margin-top:-4px;">Além dos seis materiais do regulamento, esta campanha pode aceitar outros materiais próprios, cada um com sua meta mensal.</p>
    <div id="extrasWrap" style="margin-top:8px;"></div>
    <button type="button" class="btn btn-outline btn-sm" style="margin-top:4px;" onclick="adicionarMaterialExtra()">${icon('plus',14)}Adicionar material</button>
    <p class="small-note" id="avisoSemMateriais" style="display:none;color:var(--vermelho);margin-top:8px;">Pelo menos um material precisa ficar ativo.</p>

    <div class="section-title" style="margin:16px 0 8px 0;font-size:13.5px;">Resgate por itens</div>
    <p class="small-note" style="margin-top:-4px;">Permite resgatar um item, como uma cartela de bingo, usando um kit de materiais. O saldo do colaborador é descontado quando o resgate é registrado. Deixe desativado se esta campanha não usa esse recurso.</p>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-top:8px;">
      <input type="checkbox" id="tcAtivo" ${trocaCartela.ativo?'checked':''} onchange="atualizarSecaoTrocaCartela()" style="width:auto;">
      Ativar resgate por itens nesta campanha
    </label>
    <div id="trocaCartelaWrap" style="display:${trocaCartela.ativo?'block':'none'};margin-top:10px;">
      <div class="grid grid-2">
        <div class="field"><label>Nome do item entregue</label><input type="text" id="tcNomeItem" value="${escapeHtml(trocaCartela.nomeItem||'cartela')}" placeholder="Ex: cartela de bingo"></div>
        <div class="field"><label>Itens por kit fechado</label><input type="number" min="1" id="tcCartelasPorKit" value="${trocaCartela.cartelasPorKit||2}"></div>
      </div>
      <div class="field">
        <label for="tcMetaMensalResgates">Meta mensal de resgates (${escapeHtml(trocaCartela.nomeItem||'cartela')})</label>
        <input type="number" id="tcMetaMensalResgates" min="0" step="1" value="${Number(trocaCartela.metaMensalResgates)||0}" placeholder="0">
        <p class="small-note">Deixe em 0 se não houver uma meta. A meta é apenas informativa e não altera a posição no ranking.</p>
      </div>
      <div class="field">
        <label for="tcInformativoPublico">Informativo exibido nos detalhes do ranking público</label>
        <textarea id="tcInformativoPublico" rows="3" maxlength="500" placeholder="Escreva uma orientação simples para os participantes.">${escapeHtml(trocaCartela.informativoPublico||'')}</textarea>
        <p class="small-note">Texto livre, mostrado abaixo dos dados de resgate na página pública. Exemplo: “Cada resgate utiliza um kit completo de materiais.”</p>
      </div>
      <p class="small-note">Quantidade exigida de cada material para fechar 1 kit. Deixe em branco ou 0 para um material que não entra no kit.</p>
      <div class="grid grid-2" id="tcKitWrap">${renderKitTrocaFormMarkup(trocaCartela,c,nomesPersonalizados)}</div>
    </div>

    <div id="campanhaErro" style="color:var(--vermelho);font-size:12.5px;display:none;margin:8px 0;"></div>
    <div class="modal-actions">
      <button class="btn btn-outline btn-block" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary btn-block" onclick="salvarCampanha('${id||''}')">${icon('check',16)}Salvar</button>
    </div>
  `);
  renderMateriaisExtrasForm();
}
function renderMateriaisExtrasForm(){
  const wrap = document.getElementById('extrasWrap');
  if(!wrap) return;
  const lista = window._materiaisExtrasForm || [];
  if(lista.length===0){
    wrap.innerHTML = `<p class="small-note">Nenhum material extra cadastrado ainda.</p>`;
    return;
  }
  wrap.innerHTML = lista.map(item => {
    const nome=document.getElementById(`extraNome_${item.key}`)?.value??item.label??'';
    const meta=document.getElementById(`extraMeta_${item.key}`)?.value??item.metaDefault??0;
    const unidade=document.getElementById(`extraUnidade_${item.key}`)?.value??item.unidade??'unidades';
    return `
      <div class="grid grid-3" style="align-items:flex-end;margin-bottom:8px;" data-extra-key="${item.key}">
        <div class="field" style="margin-bottom:0;"><label>Nome do material</label><input type="text" id="extraNome_${item.key}" value="${escapeHtml(nome)}" placeholder="Ex: Cobre" oninput="atualizarNomeMaterialCampanha('${item.key}','extraNome')"></div>
        <div class="field" style="margin-bottom:0;"><label>Meta mensal</label><input type="number" min="0" id="extraMeta_${item.key}" value="${escapeHtml(meta)}"></div>
        <div class="field" style="margin-bottom:0;display:flex;gap:8px;align-items:center;">
          <input type="text" id="extraUnidade_${item.key}" value="${escapeHtml(unidade)}" placeholder="unidade" style="flex:1;">
          <button type="button" class="btn btn-ghost btn-sm" onclick="removerMaterialExtra('${item.key}')" style="color:var(--vermelho);">${icon('trash',16)}</button>
        </div>
      </div>
    `;
  }).join('');
}
function renderKitTrocaForm(trocaCartela){
  const wrap=document.getElementById('tcKitWrap');
  if(!wrap) return;
  const campanha=campanhaPorId(STATE.campanhaSelecionadaId);
  wrap.innerHTML=renderKitTrocaFormMarkup(trocaCartela,campanha,(campanha&&campanha.nomesPersonalizados)||{},true);
}
function renderKitTrocaFormMarkup(trocaCartela,campanha,nomesPersonalizados={},preservarFormulario=false){
  return todasCategoriasMateriaisFormulario(campanha).map(cat=>{
    const nomeInput=preservarFormulario&&document.getElementById(`tcNomeMaterial_${cat.key}`);
    const campoNome=nomeInput
      ? nomeInput.value
      : (nomesPersonalizados[cat.key]
        || cat.label);
    const campoQuantidade=preservarFormulario&&document.getElementById(`tcKit_${cat.key}`);
    const quantidade=campoQuantidade
      ? campoQuantidade.value
      : (trocaCartela&&trocaCartela.kit&&trocaCartela.kit[cat.key])||'';
    return `
      <div class="field">
        <label for="tcNomeMaterial_${cat.key}">Nome do material</label>
        <input type="text" id="tcNomeMaterial_${cat.key}" value="${escapeHtml(campoNome)}" oninput="atualizarNomeMaterialCampanha('${cat.key}','tcNomeMaterial')">
        <label for="tcKit_${cat.key}" style="margin-top:8px;">Quantidade para fechar o kit</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="number" min="0" step="1" id="tcKit_${cat.key}" value="${escapeHtml(String(quantidade))}" placeholder="0">
          <span class="small-note" style="white-space:nowrap;">${escapeHtml(cat.unidade)}</span>
        </div>
      </div>`;
  }).join('');
}
function todasCategoriasMateriaisFormulario(c){
  return [...CATEGORIAS, ...((window._materiaisExtrasForm)||(c&&c.materiaisExtras)||[])];
}
function atualizarSecaoTrocaCartela(){
  document.getElementById('trocaCartelaWrap').style.display = document.getElementById('tcAtivo').checked ? 'block' : 'none';
}
window.atualizarSecaoTrocaCartela = atualizarSecaoTrocaCartela;
function atualizarCampoMaterialOficial(key){
  const ativo = document.getElementById('cpUsar_'+key).checked;
  document.getElementById('cpNomeCat_'+key).disabled = !ativo;
  document.getElementById('cpMeta_'+key).disabled = !ativo;
}
window.atualizarCampoMaterialOficial = atualizarCampoMaterialOficial;
function atualizarNomeMaterialCampanha(key, origem){
  const origemEl=document.getElementById(`${origem}_${key}`);
  if(!origemEl) return;
  ['cpNomeCat','extraNome','tcNomeMaterial'].forEach(prefixo=>{
    const campo=document.getElementById(`${prefixo}_${key}`);
    if(campo&&campo!==origemEl) campo.value=origemEl.value;
  });
}
window.atualizarNomeMaterialCampanha=atualizarNomeMaterialCampanha;
window.renderMateriaisExtrasForm = renderMateriaisExtrasForm;
function adicionarMaterialExtra(){
  window._materiaisExtrasForm = window._materiaisExtrasForm || [];
  window._materiaisExtrasForm.push({ key: 'extra_'+uid(), label:'', metaDefault:0, unidade:'unidades' });
  renderMateriaisExtrasForm();
  renderKitTrocaForm();
}
window.adicionarMaterialExtra = adicionarMaterialExtra;
function removerMaterialExtra(key){
  window._materiaisExtrasForm = (window._materiaisExtrasForm||[]).filter(x=>x.key!==key);
  renderMateriaisExtrasForm();
  renderKitTrocaForm();
}
window.removerMaterialExtra = removerMaterialExtra;
async function salvarCampanha(id){
  if(!exigirAdmin()) return;
  const nome = document.getElementById('cpNome').value.trim();
  const dataInicio = document.getElementById('cpDataInicio').value;
  const dataFim = document.getElementById('cpDataFim').value;
  const status = document.getElementById('cpStatus').value;
  const erroEl = document.getElementById('campanhaErro');
  erroEl.style.display='none';
  if(!nome){ erroEl.textContent='Informe o nome da campanha.'; erroEl.style.display='block'; return; }
  if(!dataInicio){ erroEl.textContent='Informe a data de início.'; erroEl.style.display='block'; return; }
  const mesInicio = +dataInicio.slice(5,7), anoInicio = +dataInicio.slice(0,4);
  let mesFim=null, anoFim=null;
  if(dataFim){
    mesFim = +dataFim.slice(5,7); anoFim = +dataFim.slice(0,4);
    if(anoFim*12+mesFim < anoInicio*12+mesInicio){ erroEl.textContent='A data de encerramento não pode ser antes da data de início.'; erroEl.style.display='block'; return; }
  }
  const metasDefault = {};
  const nomesPersonalizados = {};
  const categoriasDesativadas = [];
  let erroMetaNegativa = '';
  CATEGORIAS.forEach(cat=>{
    const ativo = document.getElementById('cpUsar_'+cat.key).checked;
    if(!ativo) categoriasDesativadas.push(cat.key);
    const metaOficial = parseFloat(document.getElementById('cpMeta_'+cat.key).value);
    if(metaOficial<0) erroMetaNegativa = cat.label;
    metasDefault[cat.key] = metaOficial || cat.metaDefault;
    const nomeDigitado = document.getElementById('cpNomeCat_'+cat.key).value.trim();
    if(nomeDigitado && nomeDigitado!==cat.label) nomesPersonalizados[cat.key] = nomeDigitado;
  });
  const materiaisExtras = [];
  if(erroMetaNegativa){ erroEl.textContent=`A meta de "${erroMetaNegativa}" não pode ser negativa.`; erroEl.style.display='block'; return; }
  let erroMaterial = false;
  (window._materiaisExtrasForm||[]).forEach(item=>{
    const nomeEl = document.getElementById('extraNome_'+item.key);
    if(!nomeEl) return; // linha removida da tela
    const label = nomeEl.value.trim();
    if(!label) return; // ignora linhas deixadas em branco
    const metaDefault = parseFloat(document.getElementById('extraMeta_'+item.key).value) || 0;
    if(metaDefault<0){ erroEl.textContent=`A meta de "${label}" não pode ser negativa.`; erroEl.style.display='block'; erroMaterial=true; return; }
    const unidade = (document.getElementById('extraUnidade_'+item.key)||{value:''}).value.trim() || 'unidades';
    materiaisExtras.push({ key: item.key, label, metaDefault, unidade });
    metasDefault[item.key] = metaDefault;
  });
  if(erroMaterial) return;
  const totalAtivos = (CATEGORIAS.length - categoriasDesativadas.length) + materiaisExtras.length;
  const avisoEl = document.getElementById('avisoSemMateriais');
  if(totalAtivos===0){ avisoEl.style.display='block'; erroEl.textContent='Pelo menos um material precisa ficar ativo nesta campanha.'; erroEl.style.display='block'; return; }
  avisoEl.style.display='none';
  const trocaAtiva = document.getElementById('tcAtivo').checked;
  let trocaCartela = { ativo:false };
  if(trocaAtiva){
    const nomeItem = document.getElementById('tcNomeItem').value.trim() || 'cartela';
    const cartelasPorKit = parseInt(document.getElementById('tcCartelasPorKit').value,10) || 1;
    const metaMensalResgates = parseInt(document.getElementById('tcMetaMensalResgates').value,10) || 0;
    if(metaMensalResgates<0){
      erroEl.textContent='A meta mensal de resgates não pode ser negativa.';
      erroEl.style.display='block';
      return;
    }
    const informativoPublico = document.getElementById('tcInformativoPublico').value.trim();
    const kit = {};
    for(const cat of todasCategoriasMateriaisFormulario()){
      const el = document.getElementById('tcKit_'+cat.key);
      const valor = el ? parseFloat(el.value) : 0;
      if(valor>0 && !ReciclarRankingLogic.quantidadeUnitariaValida(valor,false)){
        erroEl.textContent='As quantidades do kit precisam ser números inteiros de unidades.';
        erroEl.style.display='block';
        return;
      }
      if(valor>0) kit[cat.key] = valor;
    }
    if(Object.keys(kit).length===0){ erroEl.textContent='Informe a quantidade exigida de pelo menos um material para o kit de troca.'; erroEl.style.display='block'; return; }
    trocaCartela = { ativo:true, nomeItem, cartelasPorKit, metaMensalResgates, informativoPublico, kit };
  }
  const campanhasAnteriores=JSON.parse(JSON.stringify(STATE.campanhas));
  if(id){
    const c = STATE.campanhas.find(x=>x.id===id);
    Object.assign(c, {nome, mesInicio, anoInicio, mesFim, anoFim, status, metasDefault, nomesPersonalizados, materiaisExtras, categoriasDesativadas, trocaCartela});
  } else {
    STATE.campanhas.push({ id:uid(), nome, mesInicio, anoInicio, mesFim, anoFim, status, metasDefault, metasHistorico:{}, nomesPersonalizados, materiaisExtras, categoriasDesativadas, trocaCartela });
  }
  if(!await salvarCampanhas()){
    STATE.campanhas=campanhasAnteriores;
    const erro=STORAGE_ERRORS.get('campanhas');
    const codigo=erro&&erro.code;
    const mensagem=codigo==='permission-denied'
      ? 'O Firestore recusou a gravação. Confirme que esta conta tem papel de administrador e que as regras implantadas permitem gravar campanhas.'
      : codigo==='unavailable' || codigo==='deadline-exceeded'
        ? 'Não foi possível conectar ao Firestore. Verifique a conexão e tente novamente.'
        : codigo==='failed-precondition'
          ? 'O Firestore recusou a gravação por uma condição inválida. Verifique os dados da campanha e tente novamente.'
          : erro&&erro.message
            ? `Erro do Firestore (${codigo||'sem código'}): ${erro.message}`
            : 'Não foi possível salvar a campanha. Verifique sua conexão, atualize a página e tente novamente.';
    erroEl.textContent=mensagem;
    erroEl.style.display='block';
    return;
  }
  if(!STATE.campanhaSelecionadaId) STATE.campanhaSelecionadaId = STATE.campanhas[STATE.campanhas.length-1].id;
  fecharModal(); renderApp();
}
function confirmarExcluirCampanha(id){
  if(!exigirAdmin()) return;
  const c = STATE.campanhas.find(x=>x.id===id);
  if(campanhaTemEntregas(id)){
    abrirModal(`
      <div class="modal-head"><h3>Não é possível excluir</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
      <p>A campanha <b>${escapeHtml(c.nome)}</b> já possui movimentações ou metas registradas. Para preservar o histórico, marque-a como "Encerrada" em vez de excluir.</p>
      <div class="modal-actions"><button class="btn btn-primary btn-block" onclick="fecharModal()">Entendi</button></div>
    `);
    return;
  }
  abrirModal(`
    <div class="modal-head"><h3>Excluir campanha</h3><button class="modal-close" onclick="fecharModal()">${icon('x')}</button></div>
    <p>Tem certeza que deseja excluir a campanha <b>${escapeHtml(c.nome)}</b>? Ela poderá ser restaurada em "Itens apagados" por até 30 dias.</p>
    <div class="modal-actions">
      <button class="btn btn-outline btn-block" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-danger btn-block" onclick="excluirCampanha('${id}')">${icon('trash',16)}Excluir</button>
    </div>
  `);
}
async function excluirCampanha(id){
  if(!exigirAdmin()) return;
  if(!await moverRegistroParaLixeira('campanhas',id)){ alert('Não foi possível mover a campanha para Itens apagados. Atualize a página e tente novamente.'); return; }
  if(STATE.campanhaSelecionadaId===id) STATE.campanhaSelecionadaId = (campanhaAtiva()||{}).id || null;
  fecharModal(); renderApp();
}
window.abrirFormCampanha=abrirFormCampanha; window.salvarCampanha=salvarCampanha;
window.confirmarExcluirCampanha=confirmarExcluirCampanha; window.excluirCampanha=excluirCampanha;
function renderTabelaCampanhas(){
  const wrap = document.getElementById('tabelaCampanhasWrap');
  if(!wrap) return;
  const filtro = document.getElementById('filtroStatusCampanha')?.value || '';
  const lista = campanhasOrdenadas().filter(c=> !filtro || c.status===filtro);
  if(lista.length===0){ wrap.innerHTML = `<div class="table-empty">Nenhuma campanha ${filtro?'com esse status':'cadastrada'} ainda.</div>`; return; }
  wrap.innerHTML = `
    <table><thead><tr><th>Nome</th><th>Início</th><th>Fim</th><th>Status</th><th></th></tr></thead>
    <tbody>
      ${lista.map(c=>`
        <tr>
          <td style="font-weight:700;">${escapeHtml(c.nome)}</td>
          <td>${nomeMes(c.mesInicio)}/${c.anoInicio}</td>
          <td>${c.anoFim? nomeMes(c.mesFim)+'/'+c.anoFim : 'Em andamento'}</td>
          <td>${c.status==='ativa'?'<span class="badge badge-green">Ativa</span>':c.status==='encerrada'?'<span class="badge badge-grey">Encerrada</span>':'<span class="badge badge-amber">Planejada</span>'}</td>
          <td style="text-align:right;white-space:nowrap;">
            <button class="btn btn-ghost btn-sm" onclick="abrirFormCampanha('${c.id}')">${icon('edit',16)}</button>
            <button class="btn btn-ghost btn-sm" onclick="confirmarExcluirCampanha('${c.id}')" style="color:var(--vermelho);">${icon('trash',16)}</button>
          </td>
        </tr>`).join('')}
    </tbody></table>
  `;
}
window.renderTabelaCampanhas = renderTabelaCampanhas;
async function enviarRedefinicaoSenha(){
  if(!exigirAdmin()) return;
  if(!STATE.authUser || !STATE.authUser.email){ alert('A conta atual não tem um e-mail cadastrado.'); return; }
  try{
    await FIREBASE_AUTH.sendPasswordResetEmail(STATE.authUser.email);
    alert('Enviamos um link de redefinição para o e-mail da conta.');
  }catch(e){
    console.error('Erro ao solicitar redefinição de senha',e);
    alert('Não foi possível enviar o e-mail de redefinição. Tente novamente ou verifique o Firebase Authentication.');
  }
}
function gerarBackupJSON(){
  const dados = {
    formato: 'reciclar-apac-backup',
    versao: 1,
    criadoEm: new Date().toISOString(),
    dados: {
      colaboradores: STATE.colaboradores,
      entregas: STATE.entregas,
      transferencias: STATE.transferencias,
      trocas: STATE.trocas,
      campanhas: STATE.campanhas,
      metas: STATE.metasSnapshots,
      config: (()=>{ const {senhaAdmin, ...configBackup} = STATE.config || {}; return configBackup; })(),
      metadata: {
        storageMode: STORAGE_MODE,
        campanhaSelecionadaId: STATE.campanhaSelecionadaId,
      }
    }
  };
  return dados;
}
function exportarBackupLocal(){
  if(!exigirAdmin()) return;
  try {
    baixarBackupJSON(gerarBackupJSON(), `backup-reciclar-${new Date().toISOString().slice(0,16).replace(/[:T]/g,'-')}.json`);
  } catch (erro) {
    console.error('Erro ao exportar backup', erro);
    alert('Não foi possível exportar o backup: ' + (erro && erro.message ? erro.message : 'erro inesperado'));
  }
}
window.exportarBackupLocal = exportarBackupLocal;
async function carregarVinculoGoogleDrive(){
  if(!STATE.isAdmin || !STATE.authUser || !FIREBASE_DB) return;
  const uid=STATE.authUser.uid;
  try{
    const documento=await FIREBASE_DB.collection(GOOGLE_DRIVE_LINK_COLLECTION).doc(uid).get();
    if(!STATE.authUser || STATE.authUser.uid!==uid || !STATE.isAdmin) return;
    if(!documento.exists){
      STATE.googleDriveLink=null;
      STATE.googleDriveLinkError='';
      return;
    }
    const vinculo=documento.data();
    if(typeof vinculo.googleSub!=='string' || !vinculo.googleSub
      || typeof vinculo.email!=='string' || !vinculo.email
      || typeof vinculo.linkedAt!=='string' || !Number.isFinite(Date.parse(vinculo.linkedAt))){
      throw new Error('O vínculo Google Drive salvo tem formato inválido.');
    }
    STATE.googleDriveLink={googleSub:vinculo.googleSub,email:vinculo.email,linkedAt:vinculo.linkedAt};
    STATE.googleDriveLinkError='';
  }catch(erro){
    if(!STATE.authUser || STATE.authUser.uid!==uid || !STATE.isAdmin) return;
    STATE.googleDriveLink=null;
    STATE.googleDriveLinkError=erro.message||'Não foi possível carregar o vínculo do Google Drive.';
    console.error('Erro ao carregar vínculo do Google Drive',erro);
  }
}
const GOOGLE_DRIVE_WORKER_URL='https://reciclapac-drive-auth.reciclapac.workers.dev';
function verificarConfiguracaoGoogleDrive(){
  if(!exigirAdmin()) throw new Error('Entre com uma conta administradora para usar o Google Drive.');
  if(STORAGE_MODE!=='firestore' || !FIREBASE_DB || !STATE.authUser || !STATE.authUser.uid
    || typeof STATE.authUser.getIdToken!=='function'){
    throw new Error('O Google Drive exige uma sessão administrativa autenticada no Firebase.');
  }
}
function chaveTokenGoogleDrive(uid,googleSub){
  return `${GOOGLE_DRIVE_TOKEN_SESSION_PREFIX}${encodeURIComponent(uid)}:${encodeURIComponent(googleSub)}`;
}
function lerTokenGoogleDriveSessao(uid,googleSub){
  try{
    const serializado=sessionStorage.getItem(chaveTokenGoogleDrive(uid,googleSub));
    if(!serializado) return null;
    const cache=JSON.parse(serializado);
    if(!cache || typeof cache.accessToken!=='string' || !cache.accessToken
      || cache.uid!==uid || cache.googleSub!==googleSub
      || !Number.isFinite(cache.expiresAt) || cache.expiresAt<=Date.now()+60000){
      sessionStorage.removeItem(chaveTokenGoogleDrive(uid,googleSub));
      return null;
    }
    return cache;
  }catch(erro){
    console.warn('Não foi possível ler o token temporário do Google Drive desta sessão.',erro);
    return null;
  }
}
function guardarTokenGoogleDriveSessao(cache){
  GOOGLE_DRIVE_TOKEN_CACHE=cache;
  try{
    sessionStorage.setItem(chaveTokenGoogleDrive(cache.uid,cache.googleSub),JSON.stringify(cache));
  }catch(erro){
    console.warn('Não foi possível guardar o token temporário do Google Drive nesta sessão.',erro);
  }
}
function limparTokenGoogleDriveSessao(uid,googleSub){
  if(!uid){
    GOOGLE_DRIVE_TOKEN_CACHE=null;
    return;
  }
  if(GOOGLE_DRIVE_TOKEN_CACHE && GOOGLE_DRIVE_TOKEN_CACHE.uid===uid
    && (!googleSub || GOOGLE_DRIVE_TOKEN_CACHE.googleSub===googleSub)){
    GOOGLE_DRIVE_TOKEN_CACHE=null;
  }
  if(googleSub){
    try{ sessionStorage.removeItem(chaveTokenGoogleDrive(uid,googleSub)); }
    catch(erro){ console.warn('Não foi possível remover o token temporário do Google Drive desta sessão.',erro); }
    return;
  }
  try{
    const prefixo=`${GOOGLE_DRIVE_TOKEN_SESSION_PREFIX}${encodeURIComponent(uid)}:`;
    Object.keys(sessionStorage).filter(chave=>chave.startsWith(prefixo)).forEach(chave=>sessionStorage.removeItem(chave));
  }catch(erro){
    console.warn('Não foi possível limpar os tokens temporários do Google Drive desta sessão.',erro);
  }
}
async function obterTokenVinculadoGoogleDrive(){
  if(!STATE.googleDriveLink) throw new Error('Vincule uma conta Google Drive antes de continuar.');
  const uid=STATE.authUser&&STATE.authUser.uid;
  const vinculo=STATE.googleDriveLink;
  let cache=GOOGLE_DRIVE_TOKEN_CACHE;
  if(!cache || cache.uid!==uid || cache.googleSub!==vinculo.googleSub || cache.expiresAt<=Date.now()+60000){
    cache=lerTokenGoogleDriveSessao(uid,vinculo.googleSub);
  }
  if(cache && cache.uid===uid && cache.googleSub===vinculo.googleSub && cache.expiresAt>Date.now()+60000){
    GOOGLE_DRIVE_TOKEN_CACHE=cache;
    return cache.accessToken;
  }
  const idToken=await STATE.authUser.getIdToken();
  const resposta=await fetch(`${GOOGLE_DRIVE_WORKER_URL}/token`,{
    method:'POST',
    headers:{Authorization:`Bearer ${idToken}`,'Content-Type':'application/json'},
  });
  const resultado=await resposta.json().catch(()=>({}));
  if(!resposta.ok || typeof resultado.accessToken!=='string' || !resultado.accessToken){
    throw new Error(resultado.error||'Não foi possível obter uma autorização temporária do Google Drive.');
  }
  if(!STATE.isAdmin || !STATE.authUser || STATE.authUser.uid!==uid
    || !STATE.googleDriveLink || STATE.googleDriveLink.googleSub!==vinculo.googleSub){
    throw new Error('A sessão administrativa ou o vínculo Google mudou durante a autorização. Tente novamente.');
  }
  const expiresIn=Number(resultado.expiresIn)||3600;
  guardarTokenGoogleDriveSessao({
    uid,
    googleSub:vinculo.googleSub,
    accessToken:resultado.accessToken,
    expiresAt:Date.now()+expiresIn*1000,
  });
  return resultado.accessToken;
}
async function requisicaoGoogleDrive(token,url,opcoes={}){
  const resposta=await fetch(url,{
    ...opcoes,
    headers:{Authorization:`Bearer ${token}`,...(opcoes.headers||{})},
  });
  if(resposta.status===204) return null;
  const resultado=await resposta.json().catch(()=>({}));
  if(!resposta.ok){
    if(resposta.status===401 && GOOGLE_DRIVE_TOKEN_CACHE && GOOGLE_DRIVE_TOKEN_CACHE.accessToken===token){
      limparTokenGoogleDriveSessao(GOOGLE_DRIVE_TOKEN_CACHE.uid,GOOGLE_DRIVE_TOKEN_CACHE.googleSub);
    }
    const mensagem=resultado.error && resultado.error.message;
    throw new Error(mensagem||`A solicitação ao Google Drive falhou (HTTP ${resposta.status}).`);
  }
  return resultado;
}
async function localizarPastaBackupGoogleDrive(token){
  const query=`name='${GOOGLE_DRIVE_BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const parametros=new URLSearchParams({
    q:query,
    spaces:'drive',
    pageSize:'100',
    orderBy:'createdTime asc',
    fields:'files(id,name,mimeType,createdTime)',
  });
  const resultado=await requisicaoGoogleDrive(token,`${GOOGLE_DRIVE_API_BASE}/files?${parametros}`);
  if(resultado.files && resultado.files.length) return resultado.files[0];
  return requisicaoGoogleDrive(token,`${GOOGLE_DRIVE_API_BASE}/files?fields=id,name,mimeType,createdTime`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      name:GOOGLE_DRIVE_BACKUP_FOLDER_NAME,
      mimeType:'application/vnd.google-apps.folder',
    }),
  });
}
async function listarArquivosBackupGoogleDrive(token,pastaId){
  const arquivos=[];
  let pageToken='';
  do{
    const parametros=new URLSearchParams({
      q:`'${pastaId}' in parents and trashed=false and appProperties has { key='reciclapacBackup' and value='1' }`,
      spaces:'drive',
      pageSize:'100',
      orderBy:'createdTime desc',
      fields:'nextPageToken,files(id,name,mimeType,createdTime,size)',
    });
    if(pageToken) parametros.set('pageToken',pageToken);
    const resultado=await requisicaoGoogleDrive(token,`${GOOGLE_DRIVE_API_BASE}/files?${parametros}`);
    arquivos.push(...(resultado.files||[]));
    pageToken=resultado.nextPageToken||'';
  }while(pageToken);
  return arquivos;
}
function renderCardBackupGoogleDriveConteudo(){
  return `
    <p class="small-note" style="margin:0;">Cada administrador vincula sua própria conta Google. Os backups são armazenados de forma privada em uma pasta do Google Drive, e o aplicativo mantém os dez arquivos de restauração mais recentes.</p>
    ${STATE.googleDriveLink?`<p class="small-note" style="margin:0;">Conta vinculada: <b>${escapeHtml(STATE.googleDriveLink.email)}</b></p>`:'<p class="small-note" style="margin:0;">Nenhuma conta Google vinculada a este usuário administrador.</p>'}
    ${STATE.googleDriveStatus?`<p class="small-note" role="status" style="margin:0;">${escapeHtml(STATE.googleDriveStatus)}</p>`:''}
    ${STATE.googleDriveLinkError?`<p class="auth-error" role="alert" style="margin:0;">${escapeHtml(STATE.googleDriveLinkError)}</p>`:''}
    <div class="backup-actions drive-backup-actions">
      ${STATE.googleDriveLink
        ?`<button class="btn btn-outline btn-block" type="button" onclick="desvincularGoogleDrive()" ${STATE.googleDriveBusy?'disabled':''}>Desvincular Conta Google</button>`
        :`<button class="btn btn-outline btn-block" type="button" onclick="conectarGoogleDrive()" ${STATE.googleDriveBusy?'disabled':''}>Vincular Conta Google</button>`}
      <button class="btn btn-outline btn-block" type="button" onclick="criarBackupGoogleDrive()" ${!STATE.googleDriveLink||STATE.googleDriveBusy?'disabled':''}>${icon('download',16)}Salvar backup</button>
      <button class="btn btn-outline btn-block" type="button" onclick="listarBackupsGoogleDrive()" ${!STATE.googleDriveLink||STATE.googleDriveBusy?'disabled':''}>${icon('upload',16)}Exibir backup</button>
    </div>
    ${STATE.googleDriveBackupsVisiveis&&STATE.googleDriveBackups.length?`<div class="field drive-backup-restore" style="margin:0;">
      <label for="googleDriveBackupSelecionado">Backup para restaurar</label>
      <select id="googleDriveBackupSelecionado" onchange="selecionarBackupGoogleDrive(this.value)" ${STATE.googleDriveBusy?'disabled':''}>
        ${STATE.googleDriveBackups.map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===STATE.googleDriveBackupSelecionadoId?'selected':''}>${escapeHtml(item.name)} · ${escapeHtml(item.createdTime?new Date(item.createdTime).toLocaleString('pt-BR'):'data desconhecida')}</option>`).join('')}
      </select>
      <button class="btn btn-outline" style="margin-top:8px;" type="button" onclick="restaurarBackupGoogleDrive()" ${STATE.googleDriveBusy?'disabled':''}>${icon('upload',16)}Restaurar backup do Drive</button>
    </div>`:''}
  `;
}
function renderCardBackupGoogleDrive(){
  if(typeof document==='undefined') return;
  const card=document.getElementById('cardBackupGoogleDrive')||(document.querySelector&&document.querySelector('.drive-backup-card'));
  if(!card || !card.nodeType) return;
  card.innerHTML=renderCardBackupGoogleDriveConteudo();
  if(typeof aprimorarSeletoresNativos==='function'){
    aprimorarSeletoresNativos(card);
  }
}
function definirEstadoGoogleDrive({ocupado=STATE.googleDriveBusy,status=STATE.googleDriveStatus,erro=''}={}){
  STATE.googleDriveBusy=ocupado;
  STATE.googleDriveStatus=status;
  STATE.googleDriveLinkError=erro;
  renderCardBackupGoogleDrive();
}
function sessaoAdminGoogleDriveAtiva(uid){
  return STATE.isAdmin && STATE.authUser && STATE.authUser.uid===uid;
}
function aguardarRetornoOAuthGoogleDrive(popup){
  return new Promise((resolve,reject)=>{
    const origemWorker=new URL(GOOGLE_DRIVE_WORKER_URL).origin;
    let finalizado=false;
    const limpar=()=>{
      finalizado=true;
      window.removeEventListener('message',aoReceberMensagem);
      clearTimeout(limite);
      clearInterval(verificarPopup);
    };
    const aoReceberMensagem=evento=>{
      if(evento.origin!==origemWorker || !evento.data || evento.data.type!=='reciclapac-drive-oauth') return;
      limpar();
      try{ if(popup && !popup.closed) popup.close(); }catch(e){}
      if(evento.data.status==='success') resolve(evento.data);
      else reject(new Error(evento.data.message||'Não foi possível vincular a conta Google.'));
    };
    const limite=setTimeout(()=>{
      limpar();
      try{ if(popup && !popup.closed) popup.close(); }catch(e){}
      reject(new Error('A autorização Google expirou. Tente novamente.'));
    },10*60*1000);
    let popupFechadoTempo=0;
    const verificarPopup=setInterval(()=>{
      if(finalizado) return;
      try{
        if(popup && popup.closed){
          if(!popupFechadoTempo){
            popupFechadoTempo=Date.now();
            return;
          }
          if(Date.now()-popupFechadoTempo>1200){
            limpar();
            reject(new Error('A janela de autorização foi fechada antes de concluir o vínculo.'));
          }
        }else{
          popupFechadoTempo=0;
        }
      }catch(e){}
    },500);
    window.addEventListener('message',aoReceberMensagem);
  });
}
async function conectarGoogleDrive(){
  const firebaseUid=STATE.authUser&&STATE.authUser.uid;
  let popup=null;
  try{
    verificarConfiguracaoGoogleDrive();
    popup=window.open('about:blank','reciclapac-drive-oauth','popup,width=520,height=700');
    if(!popup) throw new Error('O navegador bloqueou a janela de autorização. Permita pop-ups para reciclapac.com.br e tente novamente.');
    try{
      popup.document.write('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Reciclapac</title><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9fbf9;color:#2e4a36;text-align:center;"><p>Conectando ao Google...</p></body></html>');
    }catch(e){}
  }catch(erro){
    definirEstadoGoogleDrive({status:'',erro:erro.message});
    return;
  }
  const retornoOAuth=aguardarRetornoOAuthGoogleDrive(popup);
  // Se a chamada inicial falhar antes de aguardarmos o retorno, evita rejeição não tratada.
  retornoOAuth.catch(()=>{});
  definirEstadoGoogleDrive({ocupado:true,status:'Abrindo a autorização segura do Google...',erro:''});
  try{
    const idToken=await STATE.authUser.getIdToken();
    const resposta=await fetch(`${GOOGLE_DRIVE_WORKER_URL}/oauth/start`,{
      method:'POST',
      headers:{Authorization:`Bearer ${idToken}`,'Content-Type':'application/json'},
      body:JSON.stringify({mode:'connect'}),
    });
    const resultado=await resposta.json().catch(()=>({}));
    if(!resposta.ok || typeof resultado.authUrl!=='string'){
      throw new Error(resultado.error||'Não foi possível iniciar a autorização Google.');
    }
    popup.location.href=resultado.authUrl;
    await retornoOAuth;
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    await carregarVinculoGoogleDrive();
    if(!STATE.googleDriveLink) throw new Error(STATE.googleDriveLinkError||'O vínculo Google não foi encontrado após a autorização.');
    limparTokenGoogleDriveSessao(firebaseUid);
    STATE.googleDriveBackups=[];
    STATE.googleDriveBackupSelecionadoId='';
    STATE.googleDriveBackupsVisiveis=false;
    definirEstadoGoogleDrive({ocupado:false,status:`Conta ${STATE.googleDriveLink.email} vinculada.`,erro:''});
  }catch(erro){
    if(popup && !popup.closed) popup.close();
    console.error('Erro ao vincular conta Google Drive',erro);
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    definirEstadoGoogleDrive({ocupado:false,status:'',erro:erro.message||'Não foi possível vincular a conta Google Drive.'});
  }
}
window.conectarGoogleDrive=conectarGoogleDrive;
async function desvincularGoogleDrive(){
  if(!exigirAdmin() || !STATE.authUser || !STATE.googleDriveLink) return;
  abrirModal(`
    <div class="modal-head"><h3>Desvincular Google Drive?</h3><button class="modal-close" type="button" onclick="fecharModal()">${icon('x')}</button></div>
    <p>Deseja remover o vínculo da conta <b>${escapeHtml(STATE.googleDriveLink.email)}</b> deste usuário administrador? Os arquivos no Google Drive serão mantidos.</p>
    <div class="modal-actions">
      <button class="btn btn-outline btn-block" type="button" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-danger btn-block" type="button" onclick="confirmarDesvincularGoogleDrive()">${icon('x',16)}Desvincular</button>
    </div>
  `);
}
async function confirmarDesvincularGoogleDrive(){
  if(!exigirAdmin() || !STATE.authUser || !STATE.googleDriveLink) return;
  fecharModal();
  const firebaseUid=STATE.authUser.uid;
  definirEstadoGoogleDrive({ocupado:true,status:'Removendo vínculo...',erro:''});
  try{
    const googleSub=STATE.googleDriveLink.googleSub;
    const idToken=await STATE.authUser.getIdToken();
    const resposta=await fetch(`${GOOGLE_DRIVE_WORKER_URL}/link`,{
      method:'DELETE',
      headers:{Authorization:`Bearer ${idToken}`},
    });
    const resultado=await resposta.json().catch(()=>({}));
    if(!resposta.ok) throw new Error(resultado.error||'Não foi possível remover o vínculo Google Drive.');
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    STATE.googleDriveLink=null;
    limparTokenGoogleDriveSessao(firebaseUid,googleSub);
    STATE.googleDriveBackups=[];
    STATE.googleDriveBackupSelecionadoId='';
    STATE.googleDriveBackupsVisiveis=false;
    definirEstadoGoogleDrive({ocupado:false,status:'Conta Google desvinculada. Os arquivos no Drive foram mantidos.',erro:''});
  }catch(erro){
    console.error('Erro ao desvincular conta Google Drive',erro);
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    definirEstadoGoogleDrive({ocupado:false,status:'',erro:erro.message||'Não foi possível remover o vínculo Google Drive.'});
  }
}
window.desvincularGoogleDrive=desvincularGoogleDrive;
window.confirmarDesvincularGoogleDrive=confirmarDesvincularGoogleDrive;
async function listarBackupsGoogleDrive(){
  if(!exigirAdmin()) return;
  const firebaseUid=STATE.authUser&&STATE.authUser.uid;
  let tokenPromise;
  try{
    verificarConfiguracaoGoogleDrive();
    tokenPromise=obterTokenVinculadoGoogleDrive();
  }catch(erro){
    definirEstadoGoogleDrive({status:'',erro:erro.message});
    return;
  }
  definirEstadoGoogleDrive({ocupado:true,status:'Buscando backups no Google Drive...',erro:''});
  try{
    const token=await tokenPromise;
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    const pasta=await localizarPastaBackupGoogleDrive(token);
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    const arquivos=await listarArquivosBackupGoogleDrive(token,pasta.id);
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    STATE.googleDriveBackups=arquivos;
    STATE.googleDriveBackupSelecionadoId=arquivos[0]?arquivos[0].id:'';
    STATE.googleDriveBackupsVisiveis=true;
    definirEstadoGoogleDrive({ocupado:false,status:arquivos.length?`${arquivos.length} backup${arquivos.length===1?'':'s'} encontrado${arquivos.length===1?'':'s'}.`:'Nenhum backup encontrado no Google Drive.',erro:''});
  }catch(erro){
    console.error('Erro ao listar backups do Google Drive',erro);
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    definirEstadoGoogleDrive({ocupado:false,status:'',erro:erro.message||'Não foi possível listar os backups do Google Drive.'});
  }
}
window.listarBackupsGoogleDrive=listarBackupsGoogleDrive;
async function criarBackupGoogleDrive(){
  if(!exigirAdmin()) return;
  const firebaseUid=STATE.authUser&&STATE.authUser.uid;
  let tokenPromise;
  try{
    verificarConfiguracaoGoogleDrive();
    tokenPromise=obterTokenVinculadoGoogleDrive();
  }catch(erro){
    definirEstadoGoogleDrive({status:'',erro:erro.message});
    return;
  }
  definirEstadoGoogleDrive({ocupado:true,status:'Criando backup no Google Drive...',erro:''});
  let backupCriado=false;
  try{
    const token=await tokenPromise;
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    const pasta=await localizarPastaBackupGoogleDrive(token);
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    const criadoEm=new Date().toISOString();
    const nome=`backup-reciclar-${criadoEm.slice(0,16).replace(/[:T]/g,'-')}.json`;
    const limite=`reciclapac-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const metadados={
      name:nome,
      mimeType:'application/json',
      parents:[pasta.id],
      appProperties:{reciclapacBackup:'1'},
    };
    const conteudo=JSON.stringify({...gerarBackupJSON(),criadoEm},null,2);
    const corpo=[
      `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadados)}`,
      `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${conteudo}`,
      `--${limite}--`,
    ].join('\r\n');
    await requisicaoGoogleDrive(token,`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime`,{
      method:'POST',
      headers:{'Content-Type':`multipart/related; boundary=${limite}`},
      body:corpo,
    });
    backupCriado=true;
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    const arquivos=await listarArquivosBackupGoogleDrive(token,pasta.id);
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    for(const antigo of arquivos.slice(GOOGLE_DRIVE_BACKUP_LIMIT)){
      await requisicaoGoogleDrive(token,`${GOOGLE_DRIVE_API_BASE}/files/${encodeURIComponent(antigo.id)}`,{method:'DELETE'});
    }
    STATE.googleDriveBackups=arquivos.slice(0,GOOGLE_DRIVE_BACKUP_LIMIT);
    STATE.googleDriveBackupSelecionadoId=STATE.googleDriveBackups[0]?STATE.googleDriveBackups[0].id:'';
    definirEstadoGoogleDrive({ocupado:false,status:`Backup enviado. Mantidos os ${Math.min(arquivos.length,GOOGLE_DRIVE_BACKUP_LIMIT)} mais recentes.`,erro:''});
  }catch(erro){
    console.error('Erro ao criar backup no Google Drive',erro);
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    const prefixo=backupCriado?'O backup foi enviado, mas houve uma falha ao limitar os arquivos antigos. ':'';
    definirEstadoGoogleDrive({ocupado:false,status:'',erro:prefixo+(erro.message||'Não foi possível criar o backup no Google Drive.')});
  }
}
window.criarBackupGoogleDrive=criarBackupGoogleDrive;
function selecionarBackupGoogleDrive(id){
  STATE.googleDriveBackupSelecionadoId=id;
}
window.selecionarBackupGoogleDrive=selecionarBackupGoogleDrive;
async function restaurarBackupGoogleDrive(){
  if(!exigirAdmin()) return;
  const firebaseUid=STATE.authUser&&STATE.authUser.uid;
  const backupSelecionado=STATE.googleDriveBackups.find(item=>item.id===STATE.googleDriveBackupSelecionadoId);
  if(!backupSelecionado){
    definirEstadoGoogleDrive({status:'',erro:'Selecione um backup do Google Drive para restaurar.'});
    return;
  }
  let tokenPromise;
  try{
    verificarConfiguracaoGoogleDrive();
    tokenPromise=obterTokenVinculadoGoogleDrive();
  }catch(erro){
    definirEstadoGoogleDrive({status:'',erro:erro.message});
    return;
  }
  definirEstadoGoogleDrive({ocupado:true,status:'Carregando backup do Google Drive...',erro:''});
  try{
    const token=await tokenPromise;
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    const pasta=await localizarPastaBackupGoogleDrive(token);
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    const arquivos=await listarArquivosBackupGoogleDrive(token,pasta.id);
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    if(!arquivos.some(item=>item.id===backupSelecionado.id)){
      throw new Error('O backup selecionado não está mais na pasta do Google Drive. Atualize a lista e tente novamente.');
    }
    const resposta=await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${encodeURIComponent(backupSelecionado.id)}?alt=media`,{
      headers:{Authorization:`Bearer ${token}`},
    });
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    if(!resposta.ok){
      if(resposta.status===401 && GOOGLE_DRIVE_TOKEN_CACHE && GOOGLE_DRIVE_TOKEN_CACHE.accessToken===token){
        limparTokenGoogleDriveSessao(GOOGLE_DRIVE_TOKEN_CACHE.uid,GOOGLE_DRIVE_TOKEN_CACHE.googleSub);
      }
      const detalhe=await resposta.json().catch(()=>({}));
      throw new Error(detalhe.error&&detalhe.error.message||`Não foi possível baixar o backup (HTTP ${resposta.status}).`);
    }
    const arquivo=new File([await resposta.blob()],backupSelecionado.name,{type:'application/json'});
    definirEstadoGoogleDrive({ocupado:false,status:'',erro:''});
    await importarBackupLocal(arquivo);
    return;
  }catch(erro){
    console.error('Erro ao restaurar backup do Google Drive',erro);
    if(!sessaoAdminGoogleDriveAtiva(firebaseUid)) return;
    definirEstadoGoogleDrive({ocupado:false,status:'',erro:erro.message||'Não foi possível restaurar o backup do Google Drive.'});
  }
}
window.restaurarBackupGoogleDrive=restaurarBackupGoogleDrive;
function baixarBackupJSON(backup, nome){
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function objetoValido(valor){
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}
function dataISOValida(valor){
  if(typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T00:00:00Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0,10) === valor;
}
function validarBackupJSON(obj){
  if(!objetoValido(obj)) return { ok:false, motivo:'Arquivo de backup inválido.' };
  if(obj.formato !== 'reciclar-apac-backup') return { ok:false, motivo:'Este arquivo não pertence ao formato de backup esperado.' };
  if(obj.versao !== 1) return { ok:false, motivo:'Versão de backup inválida ou não suportada.' };
  if(typeof obj.criadoEm !== 'string' || !Number.isFinite(Date.parse(obj.criadoEm))) return { ok:false, motivo:'Data de criação do backup ausente ou inválida.' };
  if(!objetoValido(obj.dados)) return { ok:false, motivo:'Estrutura interna do backup ausente.' };
  const dados = obj.dados;
  const colecoes = ['colaboradores','entregas','transferencias','trocas','campanhas'];
  for(const nome of colecoes){
    if(!Array.isArray(dados[nome])) return { ok:false, motivo:`A coleção "${nome}" está ausente ou inválida.` };
    const ids = new Set();
    for(const [indice, registro] of dados[nome].entries()){
      if(!objetoValido(registro) || typeof registro.id !== 'string' || !registro.id.trim()){
        return { ok:false, motivo:`Registro ${indice+1} inválido na coleção "${nome}".` };
      }
      if(ids.has(registro.id)) return { ok:false, motivo:`ID duplicado na coleção "${nome}".` };
      ids.add(registro.id);
    }
  }
  if(dados.metas !== undefined && !Array.isArray(dados.metas)) return { ok:false, motivo:'As metas mensais do backup estão inválidas.' };
  if(!objetoValido(dados.config) || !objetoValido(dados.config.painelPeriodo)
    || typeof dados.config.painelPeriodo.tipo !== 'string'
    || (dados.config.painelPeriodo.ano !== null && !Number.isInteger(dados.config.painelPeriodo.ano))){
    return { ok:false, motivo:'As configurações do backup estão ausentes ou inválidas.' };
  }
  if(dados.metadata !== undefined && !objetoValido(dados.metadata)) return { ok:false, motivo:'Os metadados do backup estão inválidos.' };
  const campanhas = new Map(dados.campanhas.map(c=>[c.id,c]));
  for(const [indice, campanha] of dados.campanhas.entries()){
    if(typeof campanha.nome !== 'string' || !campanha.nome.trim()
      || !Number.isInteger(campanha.mesInicio) || campanha.mesInicio<1 || campanha.mesInicio>12
      || !Number.isInteger(campanha.anoInicio) || !objetoValido(campanha.metasDefault)
      || !objetoValido(campanha.metasHistorico)
      || !['ativa','planejada','encerrada'].includes(campanha.status)
      || (campanha.anoFim !== null && campanha.anoFim !== undefined
        && (!Number.isInteger(campanha.mesFim) || campanha.mesFim<1 || campanha.mesFim>12
        || !Number.isInteger(campanha.anoFim) || campanha.anoFim*12+campanha.mesFim<campanha.anoInicio*12+campanha.mesInicio))){
      return { ok:false, motivo:`Campanha ${indice+1} inválida.` };
    }
  }
  for(const [indice, meta] of (dados.metas||[]).entries()){
    if(!objetoValido(meta) || typeof meta.id!=='string' || !meta.id
      || !campanhas.has(meta.campanhaId) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(meta.chave)
      || !objetoValido(meta.metas)){
      return { ok:false, motivo:`Snapshot de metas ${indice+1} inválido.` };
    }
  }
  for(const [indice, colaborador] of dados.colaboradores.entries()){
    if(typeof colaborador.nome !== 'string' || !colaborador.nome.trim()){
      return { ok:false, motivo:`Colaborador ${indice+1} sem nome válido.` };
    }
  }
  const camposPorColecao = {
    entregas: ['campanhaId','colaboradorId','tipo'],
    transferencias: ['campanhaId','colaboradorOrigemId','categoriaOrigem','colaboradorDestinoId','categoriaDestino'],
    trocas: ['campanhaId','colaboradorId'],
  };
  for(const [nome, campos] of Object.entries(camposPorColecao)){
    for(const [indice, registro] of dados[nome].entries()){
      if(!campos.every(campo=>typeof registro[campo] === 'string' && registro[campo].trim())
        || !campanhas.has(registro.campanhaId)
        || !dataISOValida(registro.data)
        || !Number.isFinite(registro.quantidadeKits ?? registro.quantidade)
        || (registro.quantidadeKits ?? registro.quantidade) < 0){
        return { ok:false, motivo:`Registro ${indice+1} inválido na coleção "${nome}".` };
      }
    }
  }
  if(dados.metadata && dados.metadata.campanhaSelecionadaId
    && !campanhas.has(dados.metadata.campanhaSelecionadaId)){
    return { ok:false, motivo:'A campanha selecionada nos metadados não existe neste backup.' };
  }
  return { ok:true };
}
let backupLocalPendente=null;
async function importarBackupLocal(file){
  if(!exigirAdmin()) return;
  if(!file) return;
  try {
    const texto = await file.text();
    const backup = JSON.parse(texto);
    const validacao = validarBackupJSON(backup);
    if(!validacao.ok){ throw new Error(validacao.motivo); }
    const dados = {...backup.dados, metas:Array.isArray(backup.dados.metas)?backup.dados.metas:[]};
    const resumo = [
      `${dados.colaboradores.length} colaboradores`,
      `${dados.entregas.length} entregas`,
      `${dados.transferencias.length} transferências`,
      `${dados.trocas.length} resgates`,
      `${dados.campanhas.length} campanhas`,
      `${Object.keys(dados.config).length} configurações`
    ].join(' · ');
    backupLocalPendente={dados,criadoEm:backup.criadoEm};
    abrirModal(`
      <div class="modal-head"><h3>Restaurar backup?</h3><button class="modal-close" type="button" onclick="cancelarImportacaoBackupLocal()">${icon('x')}</button></div>
      <p>Esta ação substituirá os dados atuais pelos dados do backup de <b>${escapeHtml(backup.criadoEm)}</b>.</p>
      <p class="small-note">${escapeHtml(resumo)}</p>
      <label style="display:flex;align-items:flex-start;gap:8px;margin-top:14px;">
        <input type="checkbox" id="backupAntesRestaurar" checked style="width:auto;margin-top:2px;">
        Baixar um backup dos dados atuais antes de continuar
      </label>
      <div class="modal-actions">
        <button class="btn btn-outline btn-block" type="button" onclick="cancelarImportacaoBackupLocal()">Cancelar</button>
        <button class="btn btn-danger btn-block" type="button" onclick="confirmarImportacaoBackupLocal()">${icon('upload',16)}Restaurar backup</button>
      </div>
    `);
  } catch (erro) {
    console.error('Erro ao importar backup', erro);
    alert('Não foi possível importar o backup: ' + (erro && erro.message ? erro.message : 'arquivo inválido'));
  } finally {
    const input = document.getElementById('arquivoBackupImport');
    if(input) input.value = '';
  }
}
function cancelarImportacaoBackupLocal(){
  backupLocalPendente=null;
  fecharModal();
}
window.cancelarImportacaoBackupLocal=cancelarImportacaoBackupLocal;
async function confirmarImportacaoBackupLocal(){
  if(!exigirAdmin() || !backupLocalPendente) return;
  const {dados,criadoEm}=backupLocalPendente;
  const criarBackupAntes=document.getElementById('backupAntesRestaurar')?.checked===true;
  backupLocalPendente=null;
  fecharModal();
  if(criarBackupAntes){
    baixarBackupJSON(gerarBackupJSON(), `backup-reciclar-antes-restauracao-${new Date().toISOString().slice(0,16).replace(/[:T]/g,'-')}.json`);
  }
  const anterior=gerarBackupJSON().dados;
  const gravacoes=[
    ['colaboradores',dados.colaboradores,anterior.colaboradores],
    ['entregas',dados.entregas,anterior.entregas],
    ['transferencias',dados.transferencias,anterior.transferencias],
    ['trocas',dados.trocas,anterior.trocas],
    ['campanhas',dados.campanhas,anterior.campanhas],
    ['metas',dados.metas||[],anterior.metas],
    ['config',dados.config,anterior.config],
  ];
  let tentativas=0;
  try{
    for(const [chave,valor] of gravacoes){
      tentativas++;
      const salvo=FIRESTORE_RECORD_COLLECTIONS.has(chave)
        ?await storageReplaceCollection(chave,valor)
        :await storageSet(chave,valor);
      if(!salvo) throw new Error(`Não foi possível salvar "${chave}".`);
    }
  }catch(erro){
    const falhasRollback=[];
    for(let i=tentativas-1;i>=0;i--){
      const [chave,,valorAnterior]=gravacoes[i];
      const restaurado=FIRESTORE_RECORD_COLLECTIONS.has(chave)
        ?await storageReplaceCollection(chave,valorAnterior)
        :await storageSet(chave,valorAnterior);
      if(!restaurado) falhasRollback.push(chave);
    }
    const avisoRollback=falhasRollback.length
      ?` A restauração parcial não pôde ser revertida para: ${falhasRollback.join(', ')}. Faça uma nova conferência dos dados e use um backup caso necessário.`
      :' Os dados anteriores foram mantidos.';
    console.error('Erro ao restaurar backup',erro);
    alert(`${erro.message}${avisoRollback}`);
    return;
  }
  STATE.colaboradores=dados.colaboradores;
  STATE.entregas=dados.entregas;
  STATE.transferencias=dados.transferencias;
  STATE.trocas=dados.trocas;
  STATE.campanhas=dados.campanhas;
  STATE.metasSnapshots=dados.metas||[];
  STATE.config=dados.config;
  const campanhaDoBackup=dados.metadata&&dados.metadata.campanhaSelecionadaId;
  STATE.campanhaSelecionadaId=campanhaDoBackup||(campanhaPadrao()||{}).id||null;
  salvarCampanhaSelecionadaPersistida(STATE.campanhaSelecionadaId);
  renderApp();
  abrirModal(`
    <div class="success-icon" aria-hidden="true">${icon('check',28)}</div>
    <h3 class="success-title">Backup restaurado</h3>
    <p class="success-message">Os dados do backup de ${escapeHtml(criadoEm)} foram restaurados.</p>
    <div class="modal-actions"><button class="btn btn-primary btn-block" type="button" onclick="fecharModal()">Entendi</button></div>
  `,false,'success');
}
window.confirmarImportacaoBackupLocal=confirmarImportacaoBackupLocal;
window.importarBackupLocal = importarBackupLocal;

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */
async function iniciar(){
  await detectarModoArmazenamento();
  if(STORAGE_MODE==='firestore' && FIREBASE_AUTH){
    FIREBASE_AUTH.onAuthStateChanged(user=>{
      processarSessaoFirebase(user).catch(erro=>{
        console.error('Erro ao carregar o acesso do usuário',erro);
        STATE.loginCarregando=false;
        STATE.isAdmin=false; STATE.isOperator=false;
        STATE.authLoadFailed=true;
        STATE.authError=erro && erro.message ? erro.message : 'Não foi possível validar o acesso.';
        finalizarCarregamento();
      });
    });
    return;
  }
  await carregarDados();
  finalizarCarregamento();
}
function finalizarCarregamento(){
  if(STORAGE_MODE==='firestore' && !STATE.authUser && !STATE.manutencaoPublicaCarregada) return;
  document.getElementById('loading').style.display='none';
  document.getElementById('app').style.display='flex';
  renderApp();
  // As tabelas das seções são renderizadas pelo renderApp após montar o conteúdo.
}
async function processarSessaoFirebase(user){
  pararObservacaoSolicitacoesTroca();
  pararObservacaoConfigSenhaSolicitacaoTroca();
  const uidAnterior=STATE.authUser&&STATE.authUser.uid;
  if(uidAnterior && (!user || user.uid!==uidAnterior)) limparTokenGoogleDriveSessao(uidAnterior);
  STATE.authUser=user;
  STATE.authError='';
  STATE.authLoadFailed=false;
  STATE.erroRankingPublico='';
  if(GOOGLE_DRIVE_TOKEN_CACHE && (!user || GOOGLE_DRIVE_TOKEN_CACHE.uid!==user.uid)){
    GOOGLE_DRIVE_TOKEN_CACHE=null;
  }
  STATE.googleDriveLink=null;
  STATE.googleDriveLinkError='';
  STATE.googleDriveBusy=false;
  STATE.googleDriveStatus='';
  STATE.googleDriveBackups=[];
  STATE.googleDriveBackupSelecionadoId='';
  STATE.googleDriveBackupsVisiveis=false;
  STATE.isAdmin=false;
  STATE.isOperator=false;
  STATE.solicitacoesTrocaPublicas=[];
  STATE.solicitacoesTrocaError='';
  rankingPublicoSyncAtivo=false;
  clearTimeout(rankingPublicoSyncMesTimer);
  rankingPublicoUltimoMesSincronizado='';
  await carregarRankingsPublicos();
  if(!user){
    STATE.loginCarregando=false;
    STATE.mostrarLogin=false;
    STATE.colaboradores=[]; STATE.entregas=[]; STATE.transferencias=[]; STATE.trocas=[];
    STATE.campanhas=[]; STATE.lixeira=[]; STATE.metasSnapshots=[]; STATE.config=null;
    finalizarCarregamento();
    return;
  }
  const perfil=await FIREBASE_DB.collection('reciclar-apac-roles').doc(user.uid).get();
  const role=perfil.exists ? perfil.data().role : null;
  if(role!=='admin' && role!=='operator'){
    STATE.loginCarregando=false;
    STATE.authError='Esta conta ainda não recebeu um perfil de administrador ou operador.';
    finalizarCarregamento();
    return;
  }
  STATE.mostrarLogin=false;
  STATE.isAdmin=role==='admin';
  STATE.isOperator=role==='operator';
  const vinculoDrive=STATE.isAdmin ? carregarVinculoGoogleDrive() : Promise.resolve();
  if(STATE.isAdmin){
    await migrarColecoesFirestoreLegadas();
  } else {
    const [pendentes]=await Promise.all([verificarMigracaoFirestoreLegada(),verificarInstalacaoFirestore()]);
    if(pendentes.length) throw new Error(`O administrador precisa migrar estes dados antes do acesso do operador: ${pendentes.join(', ')}.`);
  }
  await carregarDados();
  await vinculoDrive;
  if(STATE.isAdmin){ obterSolicitacoesTroca(); obterConfigSenhaSolicitacaoTroca(); }
  STATE.loginCarregando=false;
  rankingPublicoSyncAtivo=true;
  agendarSincronizacaoRankingPublicoNaViradaDoMes();
  sincronizarRankingsPublicos().catch(mostrarErroSincronizacaoRankingPublico);
  finalizarCarregamento();
}
function carregarRankingsPublicos(){
  if(!FIREBASE_DB) return;
  if(!manutencaoPublicaUnsubscribe){
    manutencaoPublicaUnsubscribe=FIREBASE_DB.collection('reciclar-apac-public-settings').doc('maintenance').onSnapshot(documento=>{
      try{
        if(documento.exists){
          const dados=documento.data();
          if(typeof dados.ativada!=='boolean' || typeof dados.atualizadoEm!=='string'
            || !Number.isFinite(Date.parse(dados.atualizadoEm))){
            throw new Error('A configuração pública de manutenção tem formato inválido.');
          }
          STATE.manutencaoPublica=dados.ativada;
          STATE.avisoManutencaoPublico=typeof dados.avisoManutencao==='string'?dados.avisoManutencao.slice(0,1000):'';
          STATE.mostrarAvisoManutencaoPublico=dados.mostrarAvisoManutencao===true;
          STATE.avisoRankingPublico=typeof dados.avisoRanking==='string'?dados.avisoRanking.slice(0,1000):'';
          STATE.mostrarAvisoRankingPublico=dados.mostrarAvisoRanking===true;
        }else{
          STATE.manutencaoPublica=false;
          STATE.avisoManutencaoPublico='';
          STATE.mostrarAvisoManutencaoPublico=false;
          STATE.avisoRankingPublico='';
          STATE.mostrarAvisoRankingPublico=false;
        }
        const primeiraLeitura=!STATE.manutencaoPublicaCarregada;
        STATE.manutencaoPublicaCarregada=true;
        if(!STATE.authUser){
          if(primeiraLeitura) finalizarCarregamento();
          else renderApp();
        }
      }catch(erro){
        console.error('Erro ao carregar o aviso público de manutenção',erro);
        STATE.manutencaoPublica=true;
        const primeiraLeitura=!STATE.manutencaoPublicaCarregada;
        STATE.manutencaoPublicaCarregada=true;
        if(!STATE.authUser){
          if(primeiraLeitura) finalizarCarregamento();
          else renderApp();
        }
      }
    },erro=>{
      console.error('Erro ao carregar o aviso público de manutenção',erro);
      const primeiraLeitura=!STATE.manutencaoPublicaCarregada;
      STATE.manutencaoPublicaCarregada=true;
      if(primeiraLeitura && !STATE.authUser) finalizarCarregamento();
    });
  }
  if(rankingsPublicosUnsubscribe) return;
  rankingsPublicosUnsubscribe=FIREBASE_DB.collection('reciclar-apac-public-ranking').onSnapshot(snapshot=>{
    try{
    const rankingAnterior=rankingPublicoPorId(STATE.rankingPublicoSelecionadoId);
    const rankingMaisRecenteAnterior=[...STATE.rankingsPublicos]
      .sort((a,b)=>(b.ano*12+b.mes)-(a.ano*12+a.mes))[0];
    const estavaNoMaisRecente=!rankingAnterior || !rankingMaisRecenteAnterior
      || rankingAnterior.id===rankingMaisRecenteAnterior.id;
    const rankings=snapshot.docs.map(doc=>{
      const data=doc.data();
      if(typeof data.campanhaId!=='string' || typeof data.campanhaNome!=='string' || !data.campanhaNome.trim()
        || !Number.isInteger(data.mes) || data.mes<1 || data.mes>12
        || !Number.isInteger(data.ano) || data.ano<2000 || data.ano>9999
        || typeof data.atualizadoEm!=='string' || !Number.isFinite(Date.parse(data.atualizadoEm))
        || !Array.isArray(data.ranking)
        || (data.participantes!==undefined && !Array.isArray(data.participantes))
        || (data.materiais!==undefined && !Array.isArray(data.materiais))
        || (data.solicitacoesPermitidas!==undefined && typeof data.solicitacoesPermitidas!=='boolean')){
        throw new Error('Um dos rankings públicos salvos tem formato inválido.');
      }
      const participantes=(data.participantes||[]).map(participante=>{
        if(!participante || typeof participante.id!=='string' || !participante.id.trim()
          || typeof participante.nome!=='string' || !participante.nome.trim()){
          throw new Error('A lista de participantes do ranking público tem formato inválido.');
        }
        return {id:participante.id,nome:participante.nome};
      });
      const materiais=(data.materiais||[]).map(material=>{
        if(!material || typeof material.key!=='string' || !material.key.trim()
          || typeof material.nome!=='string' || !material.nome.trim()
          || typeof material.unidade!=='string' || !material.unidade.trim()){
          throw new Error('A lista de materiais do ranking público tem formato inválido.');
        }
        return {key:material.key,nome:material.nome,unidade:material.unidade};
      });
      const entradas=data.ranking.map(item=>{
        if(!item || (item.posicao!==null && (!Number.isInteger(item.posicao) || item.posicao<1))
          || typeof item.nome!=='string' || !item.nome.trim()
          || typeof item.pontuacao!=='number' || !Number.isFinite(item.pontuacao) || item.pontuacao<0
          || (item.percentualGeral!==undefined && (typeof item.percentualGeral!=='number' || !Number.isFinite(item.percentualGeral) || item.percentualGeral<0))
          || (item.totalMateriais!==undefined && (typeof item.totalMateriais!=='number' || !Number.isFinite(item.totalMateriais) || item.totalMateriais<0))){
          throw new Error('Uma entrada do ranking público tem formato inválido.');
        }
        let detalhes;
        let resumoTroca;
        if(item.detalhes!==undefined){
          if(!Array.isArray(item.detalhes)){
            throw new Error('Os detalhes de uma entrada do ranking público têm formato inválido.');
          }
          detalhes=item.detalhes.map(cat=>{
            if(!cat || typeof cat.nome!=='string' || !cat.nome.trim()
              || typeof cat.unidade!=='string' || !cat.unidade.trim()
              || typeof cat.quantidade!=='number' || !Number.isFinite(cat.quantidade)
              || typeof cat.meta!=='number' || !Number.isFinite(cat.meta) || cat.meta<0
              || (cat.carryIn!==undefined && (typeof cat.carryIn!=='number' || !Number.isFinite(cat.carryIn) || cat.carryIn<0))
              || (cat.percentual!==undefined && (typeof cat.percentual!=='number' || !Number.isFinite(cat.percentual)))){
              throw new Error('Um detalhe por material do ranking público tem formato inválido.');
            }
            const cumprimento=ReciclarRankingLogic.resumirCategoria(cat.quantidade,cat.meta);
            return {
              nome:cat.nome,
              unidade:cat.unidade,
              quantidade:cumprimento.quantidade,
              ...(Number.isFinite(cat.carryIn)?{carryIn:cat.carryIn}:{}),
              meta:cat.meta,
              percentual:cumprimento.percentual
            };
          });
        }
        const resumoDetalhes=detalhes&&detalhes.length
          ?ReciclarRankingLogic.resumirDetalhesCategorias(detalhes)
          :null;
        if(item.resumoTroca!==undefined){
          if(!item.resumoTroca || typeof item.resumoTroca.quantidade!=='number'
            || !Number.isInteger(item.resumoTroca.quantidade) || item.resumoTroca.quantidade<0
            || typeof item.resumoTroca.unidade!=='string' || !item.resumoTroca.unidade.trim()){
            throw new Error('O resumo de trocas de uma entrada do ranking público tem formato inválido.');
          }
          resumoTroca={quantidade:item.resumoTroca.quantidade,unidade:item.resumoTroca.unidade};
        }
        let kit;
        if(item.kit && typeof item.kit==='object'){
          const num=v=>Number.isFinite(v)&&v>=0?v:0;
          kit={
            trocadosMes:num(item.kit.trocadosMes),
            trocadosTotal:num(item.kit.trocadosTotal),
            resgatesMes:num(item.kit.resgatesMes),
            resgatesTotal:num(item.kit.resgatesTotal),
            metaMensalResgates:num(item.kit.metaMensalResgates),
            disponiveis:Number.isFinite(item.kit.disponiveis)?Math.max(0,item.kit.disponiveis):null,
            cartelasPorKit:num(item.kit.cartelasPorKit)||1,
            informativoPublico:typeof item.kit.informativoPublico==='string'?item.kit.informativoPublico.slice(0,1000):'',
            materiais:(Array.isArray(item.kit.materiais)?item.kit.materiais:[]).filter(m=>m&&typeof m.nome==='string').map(m=>({
              nome:m.nome,
              unidade:typeof m.unidade==='string'?m.unidade:'',
              porKit:num(m.porKit),
              disponivel:num(m.disponivel),
              saldoAnterior:num(m.saldoAnterior),
              excedente:num(m.excedente)
            }))
          };
        }
        return {
          posicao:item.posicao,
          nome:item.nome,
          pontuacao:item.pontuacao,
          ...(resumoDetalhes
            ?{percentualGeral:resumoDetalhes.percentualGeral,totalMateriais:resumoDetalhes.totalMateriais}
            :{
              ...(Number.isFinite(item.percentualGeral)?{percentualGeral:item.percentualGeral}:{}),
              ...(Number.isFinite(item.totalMateriais)?{totalMateriais:item.totalMateriais}:{})
            }),
          ...(resumoTroca?{resumoTroca}:{}),
          ...(kit?{kit}:{}),
          ...(detalhes?{detalhes}:{})
        };
      }).sort((a,b)=>(a.posicao||Number.MAX_SAFE_INTEGER)-(b.posicao||Number.MAX_SAFE_INTEGER));
      const entradasComPosicoes=ReciclarRankingLogic.atribuirPosicoes(entradas);
      const temDados=data.temDados===true || entradas.some(item=>item.pontuacao>0
        || (item.detalhes||[]).some(cat=>cat.quantidade>0));
      return {
        id:doc.id,
        campanhaId:data.campanhaId,
        campanhaNome:data.campanhaNome,
        mes:data.mes,
        ano:data.ano,
        atualizadoEm:data.atualizadoEm,
        temDados,
        participantes,
        materiais,
        solicitacoesPermitidas:data.solicitacoesPermitidas===true,
        ranking:entradasComPosicoes,
      };
    }).filter(ranking=>ranking.temDados);
    STATE.rankingsPublicos=rankings;
    STATE.erroRankingPublico='';
    const rankingMaisRecente=[...rankings].sort((a,b)=>(b.ano*12+b.mes)-(a.ano*12+a.mes))[0];
    if(estavaNoMaisRecente || !rankings.some(item=>item.id===STATE.rankingPublicoSelecionadoId)){
      STATE.rankingPublicoSelecionadoId=rankingMaisRecente?rankingMaisRecente.id:'';
    }
    if(!STATE.authUser) renderApp();
    }catch(e){
    console.error('Erro ao carregar rankings públicos',e);
    STATE.rankingsPublicos=[];
    STATE.erroRankingPublico='Não foi possível carregar o ranking público. Tente atualizar a página.';
    if(!STATE.authUser) renderApp();
    }
  },e=>{
    console.error('Erro ao carregar rankings públicos',e);
    STATE.rankingsPublicos=[];
    STATE.erroRankingPublico='Não foi possível carregar o ranking público. Tente atualizar a página.';
    if(!STATE.authUser) renderApp();
  });
}
const _origRenderApp = renderApp;
renderApp = function(){
  _origRenderApp();
  if(STATE.view==='config' && STATE.isAdmin && typeof renderMonitoramentoFirestore==='function') setTimeout(renderMonitoramentoFirestore,0);
};
iniciar();

let abaConfiguracoesAtiva='perfil';
function selecionarAbaConfiguracoes(aba){
  const raiz=document.querySelector('#viewContent .settings-tabs');
  if(!raiz)return;
  const permitidas=['perfil','campanhas','backup','manutencao','tecnica'];
  abaConfiguracoesAtiva=permitidas.includes(aba)?aba:'perfil';
  const ativa=abaConfiguracoesAtiva;
  document.querySelectorAll('#viewContent [data-settings-panel]').forEach(p=>{p.hidden=p.dataset.settingsPanel!==ativa;});
  document.querySelectorAll('#viewContent [data-settings-tab]').forEach(b=>{
    const selecionada=b.dataset.settingsTab===ativa;
    b.classList.toggle('is-active',selecionada);
    b.setAttribute('aria-selected',selecionada?'true':'false');
    b.tabIndex=selecionada?0:-1;
  });
}
