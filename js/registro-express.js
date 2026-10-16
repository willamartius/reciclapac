/* =========================================================
   REGISTRO EXPRESS — leitura de fichas e gravação vinculada
   ========================================================= */
const REGISTRO_EXPRESS_MATERIAIS = Object.freeze([
  { tipo: 'papelao', label: 'Caixa de papelão' },
  { tipo: 'latinhas', label: 'Latinha' },
  { tipo: 'embalagens', label: 'Embalagem plástica' },
  { tipo: 'pet', label: 'Garrafa PET' },
  { tipo: 'ovos', label: 'Cartela de ovos' },
  { tipo: 'latas', label: 'Latas em geral' },
]);

function quantidadesFichaValidas(quantidades) {
  return Array.isArray(quantidades)
    && quantidades.length === REGISTRO_EXPRESS_MATERIAIS.length
    && quantidades.every(valor => Number.isInteger(valor) && valor >= 0 && valor <= 999);
}

function dataISORegistroExpressValida(data) {
  if (typeof data !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(data)) return false;
  if (Number(data.slice(0, 4)) < 1) return false;
  const dataUTC = new Date(`${data}T00:00:00.000Z`);
  return Number.isFinite(dataUTC.getTime()) && dataUTC.toISOString().slice(0, 10) === data;
}

function montarEntregasDaFicha({ fichaId, ficha, data, quantidades, responsavelContagem, observacoes, statusValidacao, criadoEm = Date.now() }) {
  if (typeof fichaId !== 'string' || !/^\d{6}$/.test(fichaId)) throw new Error('ID de ficha inválido.');
  if (!ficha || ficha.id !== fichaId || ficha.status !== 'emitida') throw new Error('A ficha não está disponível para registro.');
  if (!dataISORegistroExpressValida(data)) throw new Error('Informe uma data válida no formato AAAA-MM-DD.');
  if (!quantidadesFichaValidas(quantidades)) throw new Error('Informe seis quantidades inteiras entre 0 e 999.');
  if (!['pendente', 'validado'].includes(statusValidacao)) throw new Error('Selecione um status de validação válido.');
  const responsavel = String(responsavelContagem || '').trim();
  const nota = String(observacoes || '').trim();
  if (responsavel.length > 120 || nota.length > 500) throw new Error('Responsável ou observações excedem o limite permitido.');

  const entregaId = `${fichaId}-papelao`;
  return REGISTRO_EXPRESS_MATERIAIS.map((material, indice) => ({
    id: `${fichaId}-${material.tipo}`,
    criadoEm,
    data,
    colaboradorId: ficha.colaboradorId,
    tipo: material.tipo,
    quantidade: quantidades[indice],
    unidade: 'unidades',
    responsavelContagem: responsavel,
    observacoes: nota,
    statusValidacao,
    campanhaId: ficha.campanhaId,
    fichaId,
    entregaGrupoId: entregaId,
  }));
}

function montarHistoricoEntregasExpress(ficha, entregas = []) {
  if (!ficha || ficha.status !== 'utilizada' || !quantidadesFichaValidas(ficha.quantidades)) return [];
  const existentes = new Map(entregas.map(entrega => [entrega.id, entrega]));
  const entregaGrupoId = `${ficha.id}-papelao`;
  return REGISTRO_EXPRESS_MATERIAIS.map((material, indice) => {
    const id = `${ficha.id}-${material.tipo}`;
    const entrega = existentes.get(id);
    return {
      id,
      tipo: material.tipo,
      fichaId: ficha.id,
      entregaGrupoId,
      quantidadeOriginal: ficha.quantidades[indice],
      quantidadeAtual: entrega && entrega.quantidade,
      statusValidacao: entrega && entrega.statusValidacao,
      unidade: entrega && entrega.unidade || 'unidades',
      excluida: !entrega,
    };
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    REGISTRO_EXPRESS_MATERIAIS,
    quantidadesFichaValidas,
    dataISORegistroExpressValida,
    montarEntregasDaFicha,
    montarHistoricoEntregasExpress,
  };
}

let REGISTRO_EXPRESS_STATE = { fichaId: '', ficha: null, entregas: [], erro: '', sucesso: '', carregando: false };

function renderRegistroExpress() {
  if (!podeEditarDados()) return '<div class="card"><div class="empty-state">O Registro Express exige perfil de administrador ou operador.</div></div>';
  const estado = REGISTRO_EXPRESS_STATE;
  const ficha = estado.ficha;
  const colaborador = ficha && STATE.colaboradores.find(item => item.id === ficha.colaboradorId);
  const campanha = ficha && campanhaPorId(ficha.campanhaId);
  const statusFicha = ficha ? (ficha.status === 'emitida' ? 'Emitida, aguardando registro' : ficha.status === 'utilizada' ? 'Já registrada' : 'Cancelada') : '';
  const quantidades = ficha && ficha.quantidades;
  const total = quantidadesFichaValidas(quantidades) ? quantidades.reduce((soma, valor) => soma + valor, 0) : null;
  const historico = ficha && ficha.status === 'utilizada' ? montarHistoricoEntregasExpress(ficha, estado.entregas) : [];
  const draft = estado.formDraft || {};
  return `
    <div class="card">
      <div class="section-title">Registrar uma ficha preenchida</div>
      <p class="small-note">Digite ou leia o ID de seis dígitos da ficha. O sistema confere a reserva e grava as seis categorias junto com o consumo da ficha em uma única operação.</p>
      <form onsubmit="event.preventDefault();consultarFichaExpress()" class="grid grid-2" style="align-items:end;">
        <div class="field"><label for="registroExpressId">ID da ficha</label><input id="registroExpressId" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]{6}" value="${escapeHtml(estado.fichaId)}" aria-describedby="registroExpressIdAjuda"><span id="registroExpressIdAjuda" class="small-note">Seis dígitos, incluindo zero inicial.</span></div>
        <button class="btn btn-primary" type="submit" ${estado.carregando ? 'disabled' : ''}>${estado.carregando ? 'Consultando…' : 'Consultar ficha'}</button>
      </form>
      ${estado.erro ? `<p class="auth-error" role="alert">${escapeHtml(estado.erro)}</p>` : ''}
      ${estado.sucesso ? `<p class="success-message" role="status">${escapeHtml(estado.sucesso)}</p>` : ''}
    </div>
    ${ficha ? `
      <div class="card" style="margin-top:14px;">
        <div class="toolbar"><div><b>Ficha ${escapeHtml(ficha.id)}</b><p class="small-note">${escapeHtml(statusFicha)} · ${escapeHtml(colaborador ? colaborador.nome : ficha.colaboradorNome || 'Colaborador não localizado')} · ${escapeHtml(campanha ? campanha.nome : ficha.campanhaId)}</p></div><span class="badge ${ficha.status === 'utilizada' ? 'badge-green' : ficha.status === 'cancelada' ? 'badge-amber' : 'badge-green'}">${escapeHtml(ficha.status)}</span></div>
        ${ficha.status === 'utilizada' ? `
          <p class="small-note">Data: ${escapeHtml(ficha.data || '—')} · Total conferido: ${Number.isInteger(ficha.total) ? ficha.total : '—'} · ID da entrega principal: ${escapeHtml(ficha.entregaId || '—')}</p>
          <p class="small-note">Snapshot imutável da ficha de origem. O vínculo identifica o Registro Express mesmo se uma entrega individual for editada ou removida.</p>
          <div class="table-wrap"><table><thead><tr><th>Material</th><th>Quantidade original</th><th>Quantidade atual</th><th>Estado</th><th>Origem</th></tr></thead><tbody>${historico.map(item => {
            const material = REGISTRO_EXPRESS_MATERIAIS.find(entry => entry.tipo === item.tipo) || {};
            return `<tr><td>${escapeHtml(material.label || item.tipo)}</td><td>${escapeHtml(String(item.quantidadeOriginal))} unidades</td><td>${item.excluida ? '—' : `${escapeHtml(String(item.quantidadeAtual))} ${escapeHtml(item.unidade)}`}</td><td>${item.excluida ? 'Excluída; snapshot preservado' : item.statusValidacao === 'validado' ? 'Validado' : 'Pendente'}</td><td>${escapeHtml(item.fichaId)} · ${escapeHtml(item.entregaGrupoId)}</td></tr>`;
          }).join('')}</tbody></table></div>
        ` : ficha.status === 'emitida' ? `
          <form onsubmit="event.preventDefault();registrarFichaExpress()">
            <div class="grid grid-2">
              <div class="field"><label for="registroExpressData">Data da entrega</label><input id="registroExpressData" type="date" value="${escapeHtml(draft.data || new Date().toISOString().slice(0, 10))}" required></div>
              <div class="field"><label for="registroExpressStatus">Validação</label><select id="registroExpressStatus"><option value="pendente" ${!draft.statusValidacao || draft.statusValidacao === 'pendente' ? 'selected' : ''}>Pendente</option><option value="validado" ${draft.statusValidacao === 'validado' ? 'selected' : ''}>Validado (conta no ranking)</option></select></div>
            </div>
            <div class="section-title">Quantidades registradas na ficha</div>
            <div class="grid grid-2">${REGISTRO_EXPRESS_MATERIAIS.map((material, indice) => `<div class="field"><label for="registroExpressQtd${indice}">${escapeHtml(material.label)}</label><input id="registroExpressQtd${indice}" type="number" inputmode="numeric" min="0" max="999" step="1" value="${escapeHtml(String(draft.quantidades?.[indice] ?? 0))}" required oninput="atualizarTotalFichaExpress()"></div>`).join('')}</div>
            <div class="banner" style="margin:12px 0;"><span>Total da ficha</span><b id="registroExpressTotal">${escapeHtml(String(draft.quantidades && quantidadesFichaValidas(draft.quantidades) ? draft.quantidades.reduce((soma, valor) => soma + valor, 0) : 0))}</b></div>
            <div class="field"><label for="registroExpressResponsavel">Responsável pela contagem</label><input id="registroExpressResponsavel" maxlength="120" value="${escapeHtml(draft.responsavelContagem || '')}" placeholder="Opcional"></div>
            <div class="field"><label for="registroExpressObservacoes">Observações</label><textarea id="registroExpressObservacoes" rows="2" maxlength="500" placeholder="Opcional">${escapeHtml(draft.observacoes || '')}</textarea></div>
            <p class="small-note">A ficha original será preservada como snapshot. As seis entregas poderão ser editadas individualmente na tela Entregas; exclusões feitas por administrador continuarão disponíveis em Itens apagados.</p>
            <button class="btn btn-primary" type="submit" ${estado.carregando ? 'disabled' : ''}>${estado.carregando ? 'Salvando…' : 'Registrar seis entregas'}</button>
          </form>
        ` : '<p class="small-note">Esta ficha não pode ser registrada porque está cancelada.</p>'}
      </div>
    ` : ''}
  `;
}

function atualizarTotalFichaExpress() {
  const valores = REGISTRO_EXPRESS_MATERIAIS.map((_, indice) => Number(document.getElementById(`registroExpressQtd${indice}`)?.value));
  const total = quantidadesFichaValidas(valores) ? valores.reduce((soma, valor) => soma + valor, 0) : '—';
  const destino = document.getElementById('registroExpressTotal');
  if (destino) destino.textContent = String(total);
}

function limparFichaExpress() {
  REGISTRO_EXPRESS_STATE = { fichaId: '', ficha: null, entregas: [], erro: '', sucesso: '', carregando: false };
  renderApp();
}

async function consultarFichaExpress() {
  if (!exigirOperador()) return;
  const input = document.getElementById('registroExpressId');
  const fichaId = String(input ? input.value : REGISTRO_EXPRESS_STATE.fichaId).trim();
  REGISTRO_EXPRESS_STATE = { fichaId, ficha: null, entregas: [], erro: '', sucesso: '', carregando: true };
  renderApp();
  if (STORAGE_MODE !== 'firestore' || !FIREBASE_DB) {
    REGISTRO_EXPRESS_STATE.carregando = false;
    REGISTRO_EXPRESS_STATE.erro = 'O Registro Express exige conexão com o Firestore.';
    renderApp();
    return;
  }
  if (!validarIdFicha(fichaId)) {
    REGISTRO_EXPRESS_STATE.carregando = false;
    REGISTRO_EXPRESS_STATE.erro = 'ID inválido. Confira os seis dígitos da ficha.';
    renderApp();
    return;
  }
  try {
    const snapshot = await FIREBASE_DB.collection(FICHAS_COLLECTION).doc(fichaId).get();
    if (!snapshot.exists) throw new Error('Ficha não encontrada. Confira o ID ou peça ao administrador para verificar a reserva.');
    const ficha = snapshot.data();
    let entregas = [];
    if (ficha.status === 'utilizada') {
      const vinculadas = await FIREBASE_DB.collection('reciclar-apac').doc('entregas').collection('records').where('fichaId', '==', fichaId).get();
      entregas = vinculadas.docs.map(doc => doc.data()).sort((a, b) => REGISTRO_EXPRESS_MATERIAIS.findIndex(item => item.tipo === a.tipo) - REGISTRO_EXPRESS_MATERIAIS.findIndex(item => item.tipo === b.tipo));
    }
    REGISTRO_EXPRESS_STATE = { fichaId, ficha, entregas, erro: '', sucesso: '', carregando: false };
  } catch (erro) {
    REGISTRO_EXPRESS_STATE = { fichaId, ficha: null, entregas: [], erro: erro.message || 'Não foi possível consultar a ficha.', sucesso: '', carregando: false };
  }
  renderApp();
}

async function registrarFichaExpress() {
  if (!exigirOperador()) return;
  const estado = REGISTRO_EXPRESS_STATE;
  const ficha = estado.ficha;
  if (!ficha || ficha.status !== 'emitida') {
    estado.erro = 'Consulte uma ficha emitida antes de registrar.';
    renderApp();
    return;
  }
  const data = document.getElementById('registroExpressData')?.value || '';
  const quantidades = REGISTRO_EXPRESS_MATERIAIS.map((_, indice) => Number(document.getElementById(`registroExpressQtd${indice}`)?.value));
  const statusValidacao = document.getElementById('registroExpressStatus')?.value || '';
  const responsavelContagem = document.getElementById('registroExpressResponsavel')?.value || '';
  const observacoes = document.getElementById('registroExpressObservacoes')?.value || '';
  estado.formDraft = { data, quantidades, statusValidacao, responsavelContagem, observacoes };
  if (!dataISORegistroExpressValida(data)) {
    estado.erro = 'Informe uma data válida.';
    renderApp();
    return;
  }
  if (!quantidadesFichaValidas(quantidades)) {
    estado.erro = 'Cada material deve ter uma quantidade inteira de 0 a 999.';
    renderApp();
    return;
  }
  if (!dataDentroDaCampanha(ficha.campanhaId, data).ok) {
    estado.erro = dataDentroDaCampanha(ficha.campanhaId, data).motivo;
    renderApp();
    return;
  }
  let entregas;
  try {
    entregas = montarEntregasDaFicha({ fichaId: ficha.id, ficha, data, quantidades, responsavelContagem, observacoes, statusValidacao });
  } catch (erro) {
    estado.erro = erro.message;
    renderApp();
    return;
  }

  estado.erro = '';
  estado.sucesso = '';
  estado.carregando = true;
  renderApp();
  const fichaRef = FIREBASE_DB.collection(FICHAS_COLLECTION).doc(ficha.id);
  const entregasRef = entregas.map(entrega => FIREBASE_DB.collection('reciclar-apac').doc('entregas').collection('records').doc(entrega.id));
  try {
    await garantirSnapshotMetas(ficha.campanhaId, Number(data.slice(5, 7)), Number(data.slice(0, 4)));
    await FIREBASE_DB.runTransaction(async transaction => {
      const atual = await transaction.get(fichaRef);
      if (!atual.exists || atual.data().status !== 'emitida') throw new Error('Esta ficha já foi registrada ou cancelada. Consulte novamente o ID.');
      const existentes = [];
      for (const ref of entregasRef) existentes.push(await transaction.get(ref));
      if (existentes.some(snapshot => snapshot.exists)) throw new Error('Já existem entregas com este ID de ficha. Nenhuma alteração foi salva.');
      transaction.update(fichaRef, {
        status: 'utilizada',
        utilizadaEm: firebase.firestore.FieldValue.serverTimestamp(),
        utilizadaPor: STATE.authUser.uid,
        entregaId: entregas[0].id,
        quantidades,
        total: quantidades.reduce((soma, valor) => soma + valor, 0),
        data,
        statusValidacao,
        responsavelContagem: String(responsavelContagem || '').trim(),
        observacoes: String(observacoes || '').trim(),
      });
      entregas.forEach((entrega, indice) => transaction.set(entregasRef[indice], entrega));
    });
    estado.ficha = {
      ...ficha,
      status: 'utilizada',
      utilizadaPor: STATE.authUser.uid,
      entregaId: entregas[0].id,
      quantidades,
      total: quantidades.reduce((soma, valor) => soma + valor, 0),
      data,
    };
    estado.entregas = entregas;
    estado.sucesso = 'Ficha registrada. As seis entregas foram salvas e vinculadas.';
    try { STATE.entregas = await storageGet('entregas', []); }
    catch (erroAtualizacao) { estado.sucesso += ' Atualize a tela Entregas para carregar a lista.'; }
  } catch (erro) {
    estado.erro = erro.message || 'Não foi possível registrar a ficha. Nenhuma entrega foi salva.';
  } finally {
    estado.carregando = false;
    renderApp();
  }
}

if (typeof window !== 'undefined') {
  window.renderRegistroExpress = renderRegistroExpress;
  window.consultarFichaExpress = consultarFichaExpress;
  window.registrarFichaExpress = registrarFichaExpress;
  window.atualizarTotalFichaExpress = atualizarTotalFichaExpress;
  window.limparFichaExpress = limparFichaExpress;
}
