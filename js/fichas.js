/* =========================================================
   FOLHAS DE ENTREGA — emissão e reserva dos IDs no Firestore
   ========================================================= */
const FICHAS_COLLECTION = 'reciclar-apac-fichas';
const FICHAS_POR_FOLHA = 20;

function digitoVerificadorFicha(corpo){
  let soma=0, dobrar=true;
  for(let i=corpo.length-1;i>=0;i--){
    let digito=Number(corpo[i]);
    if(dobrar){ digito*=2; if(digito>9) digito-=9; }
    soma+=digito;
    dobrar=!dobrar;
  }
  return String((10-(soma%10))%10);
}
function gerarIdFicha(usados){
  let id;
  do{
    const bytes=new Uint32Array(1);
    crypto.getRandomValues(bytes);
    // Rejeição para evitar o viés de módulo.
    const limite=Math.floor(0x100000000/100000)*100000;
    let valor=bytes[0];
    while(valor>=limite){ crypto.getRandomValues(bytes); valor=bytes[0]; }
    const corpo=String(valor%100000).padStart(5,'0');
    id=corpo+digitoVerificadorFicha(corpo);
  }while(usados.has(id));
  usados.add(id);
  return id;
}
function validarIdFicha(id){
  return /^\d{6}$/.test(String(id||'')) && digitoVerificadorFicha(String(id).slice(0,5))===String(id)[5];
}
function textoSeguroFicha(valor){
  return String(valor??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
let FOLHAS_ENTREGA_GERADAS=[];
let FOLHAS_ENTREGA_BUSY=false;

function renderFolhaEntrega(){
  if(!STATE.isAdmin){
    return '<div class="card"><div class="empty-state">A emissão de folhas é exclusiva do administrador.</div></div>';
  }
  const colaboradores=STATE.colaboradores
    .filter(c=>c.status!=='desligado')
    .slice()
    .sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  const opcoes=colaboradores.map(c=>'<option value="'+textoSeguroFicha(c.id)+'">'+textoSeguroFicha(c.nome)+'</option>').join('');
  const resumo=FOLHAS_ENTREGA_GERADAS.length
    ? '<div class="card" style="margin-top:14px;"><b>Última emissão confirmada</b><p class="small-note">'+FOLHAS_ENTREGA_GERADAS.length+' folha(s), '+(FOLHAS_ENTREGA_GERADAS.length*FICHAS_POR_FOLHA)+' fichas reservadas no banco.</p><div class="toolbar-right"><button class="btn btn-primary" type="button" onclick="imprimirFolhasEntrega()">Imprimir ou salvar PDF</button></div></div>'
    : '';
  return `
    <div class="card">
      <p class="small-note">Cada folha A4 contém 20 fichas. Os IDs têm 6 dígitos (5 dígitos e um verificador), são reservados no Firestore antes de liberar a impressão e não podem ser repetidos em outra emissão.</p>
      ${colaboradores.length?`
      <div class="grid grid-2" style="align-items:end;">
        <div class="field"><label for="folhaColaborador">Colaborador</label><select id="folhaColaborador" required>${opcoes}</select></div>
        <div class="field"><label for="folhaQuantidade">Folhas para este colaborador</label><input id="folhaQuantidade" type="number" min="1" max="10" value="1" inputmode="numeric"></div>
      </div>
      <div class="toolbar-right fichas-acoes-principais" style="margin-top:12px;">
        <button class="btn btn-primary" type="button" id="btnGerarFolhas" onclick="reservarFolhasEntrega()">Reservar IDs e preparar folhas</button>
        <button class="btn btn-secondary" type="button" id="btnHistoricoFichas" aria-expanded="false" aria-controls="historicoFichas" onclick="alternarHistoricoFichas()">Histórico</button>
      </div>
      <p id="folhasStatus" class="small-note" role="status" aria-live="polite"></p>
      `:'<div class="empty-state">Cadastre pelo menos um colaborador antes de emitir folhas.</div>'}
    </div>
    ${resumo}
    <section id="historicoFichas" class="historico-fichas" aria-label="Histórico de fichas emitidas" aria-live="polite" hidden></section>
  `;
}

function alternarHistoricoFichas(){
  if(!exigirAdmin()) return;
  const area=document.getElementById('historicoFichas');
  const botao=document.getElementById('btnHistoricoFichas');
  if(!area || !botao) return;

  if(!area.hidden){
    area.hidden=true;
    botao.setAttribute('aria-expanded','false');
    botao.textContent='Histórico';
    return;
  }

  area.hidden=false;
  botao.setAttribute('aria-expanded','true');
  botao.textContent='Fechar histórico';
  carregarHistoricoFichas();
}

async function carregarHistoricoFichas(){
  if(!exigirAdmin()) return;
  const area=document.getElementById('historicoFichas');
  const botao=document.getElementById('btnHistoricoFichas');
  if(!area || !FIREBASE_DB || STORAGE_MODE!=='firestore'){
    if(area) area.textContent='O histórico exige conexão com o Firestore.';
    return;
  }
  if(botao) botao.disabled=true;
  area.textContent='Carregando histórico...';
  try{
    const snapshot=await FIREBASE_DB.collection(FICHAS_COLLECTION)
      .orderBy('emitidaEm','desc')
      .limit(500)
      .get();
    const lotes=new Map();
    snapshot.forEach(doc=>{
      const ficha=doc.data();
      if(!ficha.loteId || !ficha.id || ficha.status==='cancelada') return;
      if(!lotes.has(ficha.loteId)){
        lotes.set(ficha.loteId,{
          loteId:ficha.loteId,
          nome:ficha.colaboradorNome||'Colaborador não identificado',
          campanhaId:ficha.campanhaId||'',
          emitidaEm:ficha.emitidaEm,
          fichas:[]
        });
      }
      lotes.get(ficha.loteId).fichas.push(String(ficha.id));
    });
    const lista=Array.from(lotes.values());
    lista.forEach(lote=>lote.fichas.sort());
    if(!lista.length){
      area.innerHTML='<p class="small-note">Nenhum lote emitido encontrado nos últimos 500 registros consultados.</p>';
      return;
    }
    area.innerHTML=lista.map((lote,i)=>{
      const data=lote.emitidaEm?.toDate ? lote.emitidaEm.toDate().toLocaleString('pt-BR') : 'Data indisponível';
      const dados=JSON.stringify({
        nome:lote.nome,
        ids:lote.fichas,
        loteId:lote.loteId
      }).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
      return '<article class="historico-fichas-lote"><div class="historico-fichas-detalhes"><strong>'+textoSeguroFicha(lote.nome)+'</strong><span>'+textoSeguroFicha(data)+'</span><span class="small-note">'+lote.fichas.length+' ficha(s) · Lote '+textoSeguroFicha(lote.loteId)+'</span></div><button class="btn btn-secondary historico-fichas-imprimir" type="button" data-lote="'+dados+'" onclick="reimprimirLoteHistorico(this)">Reimprimir / salvar PDF</button></article>';
    }).join('');
  }catch(erro){
    console.error('Falha ao carregar histórico de fichas',erro);
    area.textContent='Não foi possível carregar o histórico. Confira a conexão e as permissões.';
  }finally{
    if(botao) botao.disabled=false;
  }
}

function reimprimirLoteHistorico(botao){
  if(!exigirAdmin()) return;
  try{
    const lote=JSON.parse(botao.getAttribute('data-lote')||'{}');
    if(!lote.loteId || !Array.isArray(lote.ids) || !lote.ids.length) throw new Error('Lote inválido');
    const ids=lote.ids.filter(validarIdFicha);
    if(ids.length!==lote.ids.length) throw new Error('Há IDs inválidos no lote');
    const folhas=[];
    for(let inicio=0;inicio<ids.length;inicio+=FICHAS_POR_FOLHA){
      folhas.push({
        nome:lote.nome,
        numero:Math.floor(inicio/FICHAS_POR_FOLHA)+1,
        totalFolhas:Math.ceil(ids.length/FICHAS_POR_FOLHA),
        ids:ids.slice(inicio,inicio+FICHAS_POR_FOLHA)
      });
    }
    const anteriores=FOLHAS_ENTREGA_GERADAS;
    FOLHAS_ENTREGA_GERADAS=folhas;
    imprimirFolhasEntrega();
    FOLHAS_ENTREGA_GERADAS=anteriores;
  }catch(erro){
    console.error('Falha ao preparar reimpressão do lote',erro);
    alert('Não foi possível preparar a reimpressão deste lote.');
  }
}
async function reservarFolhasEntrega(){
  if(!exigirAdmin() || FOLHAS_ENTREGA_BUSY) return;
  if(STORAGE_MODE!=='firestore' || !FIREBASE_DB){
    alert('A emissão segura exige conexão com o Firestore. Nenhuma folha foi liberada para impressão.');
    return;
  }
  const colaboradorId=document.getElementById('folhaColaborador')?.value||'';
  const qtd=Number(document.getElementById('folhaQuantidade')?.value);
  const colaborador=STATE.colaboradores.find(c=>c.id===colaboradorId && c.status!=='desligado');
  if(!colaborador){ alert('Selecione um colaborador ativo.'); return; }
  if(!Number.isInteger(qtd)||qtd<1||qtd>10){ alert('Informe de 1 a 10 folhas por colaborador.'); return; }
  const campanhaId=STATE.campanhaSelecionadaId;
  if(!campanhaId){ alert('Selecione uma campanha antes de emitir as fichas.'); return; }
  const total=qtd*FICHAS_POR_FOLHA;
  const usados=new Set();
  const folhas=[];
  for(let n=1;n<=qtd;n++){
    const ids=[];
    for(let i=0;i<FICHAS_POR_FOLHA;i++) ids.push(gerarIdFicha(usados));
    folhas.push({nome:colaborador.nome,colaboradorId,numero:n,totalFolhas:qtd,ids});
  }
  const todosIds=folhas.flatMap(f=>f.ids);
  const loteId=uid();
  const referencia=FIREBASE_DB.collection(FICHAS_COLLECTION);
  const status=document.getElementById('folhasStatus');
  const botao=document.getElementById('btnGerarFolhas');
  FOLHAS_ENTREGA_BUSY=true;
  if(botao) botao.disabled=true;
  if(status){status.className='small-note';status.textContent='Reservando '+total+' IDs no banco. Aguarde; ainda não imprima.';}
  const reservados=[];
  try{
    for(let inicio=0;inicio<todosIds.length;inicio+=200){
      let parte=todosIds.slice(inicio,inicio+200);
      let concluido=false;
      for(let tentativa=0;tentativa<4&&!concluido;tentativa++){
        try{
          await FIREBASE_DB.runTransaction(async tx=>{
            const refs=parte.map(id=>referencia.doc(id));
            const snapshots=[];
            for(const ref of refs) snapshots.push(await tx.get(ref));
            if(snapshots.some(s=>s.exists)) throw new Error('COLISAO_ID');
            refs.forEach((ref,i)=>tx.set(ref,{
              id:parte[i],
              status:'emitida',
              colaboradorId,
              colaboradorNome:colaborador.nome,
              campanhaId,
              loteId,
              emitidaPor:STATE.authUser.uid,
              emitidaEm:firebase.firestore.FieldValue.serverTimestamp(),
            }));
          });
          concluido=true;
        }catch(erroReserva){
          if(erroReserva.message!=='COLISAO_ID' || tentativa===3) throw erroReserva;
          const novas=parte.map(()=>gerarIdFicha(usados));
          parte.forEach((id,i)=>{todosIds[inicio+i]=novas[i];});
          parte=novas;
          // Atualiza a posição exata dos IDs substituídos nas folhas.
          let cursor=0;
          folhas.forEach(folha=>{
            folha.ids.forEach((id,i)=>{
              const global=cursor+i;
              if(global>=inicio && global<inicio+parte.length) folha.ids[i]=todosIds[global];
            });
            cursor+=folha.ids.length;
          });
        }
      }
      reservados.push(...parte);
    }
    FOLHAS_ENTREGA_GERADAS=folhas;
    if(status){status.className='small-note';status.textContent='Emissão confirmada: '+qtd+' folha(s) e '+total+' IDs reservados. A impressão está liberada.';}
    renderApp();
  }catch(erro){
    console.error('Falha ao reservar IDs das fichas',erro);
    // Se uma etapa falhar, os IDs já reservados são cancelados quando possível.
    for(let inicio=0;inicio<reservados.length;inicio+=400){
      const lote=FIREBASE_DB.batch();
      reservados.slice(inicio,inicio+400).forEach(id=>lote.update(referencia.doc(id),{
        status:'cancelada',
        canceladaEm:firebase.firestore.FieldValue.serverTimestamp(),
        canceladaPor:STATE.authUser.uid,
      }));
      try{ await lote.commit(); }catch(erroCancelamento){console.error('Falha ao cancelar reserva parcial',erroCancelamento);}
    }
    FOLHAS_ENTREGA_GERADAS=[];
    if(status){status.className='auth-error';status.textContent='Não foi possível confirmar toda a emissão. A impressão não foi liberada. Tente novamente ou peça para conferir as reservas no banco.';}
    alert('A emissão não foi concluída. Nenhuma folha foi liberada para impressão.');
  }finally{
    FOLHAS_ENTREGA_BUSY=false;
    const atual=document.getElementById('btnGerarFolhas');
    if(atual) atual.disabled=false;
  }
}
function imprimirFolhasEntrega(){
  if(!exigirAdmin() || !FOLHAS_ENTREGA_GERADAS.length) return;
  const janela=window.open('','_blank');
  if(!janela){ alert('O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.'); return; }
  const folhasHtml=FOLHAS_ENTREGA_GERADAS.map(f=>`
    <section class="page">
      <header><strong>RECICLAPAC · FICHAS DE ENTREGA</strong><span>Folha ${f.numero} de ${f.totalFolhas}</span></header>
      <div class="colab"><span>COLABORADOR</span><b>${textoSeguroFicha(f.nome)}</b></div>
      <p class="rules">Use uma ficha por entrega, de cima para baixo. Escreva a data e três dígitos por material, com zero à esquerda (7 vira 007). Some as seis quantidades e escreva o total. Devolva a folha ao administrador após o preenchimento.</p>
      <div class="fichas">${f.ids.map((id,i)=>`
        <article class="ficha">
          <div class="fhead"><b>Ficha ${String(i+1).padStart(2,'0')}</b><strong>${id.slice(0,3)} ${id.slice(3)}</strong></div>
          ${['Caixa de papelão','Latinha','Embalagem plástica','Garrafa PET','Cartela de ovos','Latas em geral'].map(nome=>`<div class="linha"><span>${nome}</span><span class="digitos"><i></i><i></i><i></i></span></div>`).join('')}
          <div class="linha total"><b>Total</b><span class="digitos"><i></i><i></i><i></i><i></i></span></div>
          <div class="rodape"><span>Data ____ / ____ / ______</span><span>Visto __________________</span></div>
        </article>`).join('')}</div>
    </section>`).join('');
  janela.document.open();
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Folhas de entrega Reciclapac</title><style>
    @page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;font:10pt Arial,sans-serif;color:#111}.page{width:210mm;height:297mm;padding:5mm 6mm;page-break-after:always;break-after:page;overflow:hidden}.page:last-child{page-break-after:auto;break-after:auto}header{display:flex;justify-content:space-between;align-items:baseline;font-size:8.5pt}.colab{display:flex;align-items:baseline;gap:3mm;margin:1mm 0}.colab span{font-size:7.5pt;color:#444}.colab b{font-size:13pt}.rules{font-size:6.8pt;line-height:1.2;margin:0 0 1.5mm}.fichas{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:48mm;gap:2.5mm}.ficha{border:.3mm solid #333;border-radius:1mm;padding:1.2mm;overflow:hidden}.fhead{height:4.5mm;display:flex;justify-content:space-between;align-items:flex-end;gap:1mm;font-size:7.5pt}.fhead strong{font-size:8.5pt;letter-spacing:.03em}.linha{display:grid;grid-template-columns:minmax(0,1fr) 18mm;gap:1mm;align-items:center;height:5.2mm;border-bottom:.2mm solid #ddd;font-size:5.5pt}.digitos{display:flex;gap:.5mm}.digitos i{display:block;flex:1;height:3.8mm;border:.3mm solid #444}.linha.total{border-bottom:0;font-size:6.5pt}.linha.total .digitos i{border-width:.5mm}.rodape{display:flex;justify-content:space-between;gap:1mm;margin-top:0.8mm;padding-top:0.8mm;border-top:.2mm solid #bbb;font-size:5pt;color:#555;white-space:nowrap}
    @media screen{body{background:#ddd}.page{background:white;margin:10px auto;box-shadow:0 2px 12px #999}}@media print{.page{margin:0;box-shadow:none}}
  </style></head><body>${folhasHtml}<script>window.onload=()=>{setTimeout(()=>window.print(),250)};</script></body></html>`);
  janela.document.close();
}
function imprimirFichasComuns(){
  if(!exigirOperador()) return;
  const janela=window.open('','_blank');
  if(!janela){ alert('O navegador bloqueou a janela de impressão. Permita pop-ups e tente novamente.'); return; }
  const materiais=['Caixa de papelão','Latinha','Embalagem plástica','Garrafa PET','Cartela de ovos','Latas em geral'];
  const fichas=Array.from({length:20},(_,i)=>`
    <article class="ficha">
      <div class="fhead"><b>Ficha comum ${String(i+1).padStart(2,'0')}</b></div>
      ${materiais.map(nome=>`<div class="linha"><span>${nome}</span><span class="digitos"><i></i><i></i><i></i></span></div>`).join('')}
      <div class="linha total"><b>Total</b><span class="digitos"><i></i><i></i><i></i><i></i></span></div>
      <div class="rodape"><span>Data ____ / ____ / ______</span><span>Visto ____________</span></div>
    </article>`).join('');
  janela.document.open();
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Fichas comuns</title><style>
  @page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;font:10pt Arial;color:#111}
  .page{padding:5mm 6mm;width:210mm;height:297mm;overflow:hidden}
  header{font-size:8.5pt;margin-bottom:1.5mm}.fichas{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:48mm;gap:2.5mm}
  .ficha{border:.3mm solid #333;border-radius:1mm;padding:1.2mm;overflow:hidden}
  .fhead{height:4.5mm;font-size:7.5pt;display:flex;align-items:flex-end}
  .linha{display:grid;grid-template-columns:minmax(0,1fr) 18mm;gap:1mm;align-items:center;height:5.2mm;border-bottom:.2mm solid #ddd;font-size:5.5pt}
  .digitos{display:flex;gap:.5mm}.digitos i{display:block;flex:1;height:3.8mm;border:.3mm solid #444}
  .linha.total{border-bottom:0;font-size:6.5pt}.rodape{display:flex;justify-content:space-between;gap:1mm;margin-top:0.8mm;padding-top:0.8mm;border-top:.2mm solid #bbb;font-size:5pt;white-space:nowrap}
  @media screen{body{background:#ddd}.page{background:white;margin:10px auto;box-shadow:0 2px 12px #999}}@media print{.page{margin:0;box-shadow:none}}
  </style></head><body><section class="page"><header><b>RECICLAPAC · FICHAS COMUNS — SEM ID</b></header><div class="fichas">${fichas}</div></section><script>window.onload=()=>setTimeout(()=>window.print(),250);</script></body></html>`);
  janela.document.close();
}
window.imprimirFichasComuns=imprimirFichasComuns;
window.alternarHistoricoFichas=alternarHistoricoFichas;
window.carregarHistoricoFichas=carregarHistoricoFichas;
window.renderFolhaEntrega=renderFolhaEntrega;
window.reservarFolhasEntrega=reservarFolhasEntrega;
window.imprimirFolhasEntrega=imprimirFolhasEntrega;
