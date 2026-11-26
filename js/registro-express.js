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

function normalizarQuantidadeRegistroExpress(valor) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'string' && !/^\d{1,3}$/.test(valor.trim())) return null;
  const quantidade = Number(valor);
  return Number.isInteger(quantidade) && quantidade >= 0 && quantidade <= 999 ? quantidade : null;
}

function avancarEtapaRegistroExpress(etapa, quantidades, valor) {
  if (!Number.isInteger(etapa) || etapa < 1 || etapa > REGISTRO_EXPRESS_MATERIAIS.length) {
    return { ok: false, erro: 'Não há material nesta etapa.' };
  }
  const quantidade = normalizarQuantidadeRegistroExpress(valor);
  if (quantidade === null) return { ok: false, erro: 'Informe um número inteiro de 0 a 999.' };
  const valores = Array.from({ length: REGISTRO_EXPRESS_MATERIAIS.length }, (_, indice) => quantidades?.[indice] ?? '');
  valores[etapa - 1] = quantidade;
  return { ok: true, etapa: etapa === REGISTRO_EXPRESS_MATERIAIS.length ? 7 : etapa + 1, quantidades: valores };
}

function etapaAnteriorRegistroExpress(etapa) {
  return Number.isInteger(etapa) && etapa > 1 && etapa <= 7 ? etapa - 1 : etapa;
}

function dataCivilHojeISO(d = new Date()) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
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
  })).filter(entrega => entrega.quantidade > 0);
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
      excluida: ficha.quantidades[indice] > 0 && !entrega,
    };
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    REGISTRO_EXPRESS_MATERIAIS,
    quantidadesFichaValidas,
    normalizarQuantidadeRegistroExpress,
    avancarEtapaRegistroExpress,
    etapaAnteriorRegistroExpress,
    dataCivilHojeISO,
    dataISORegistroExpressValida,
    montarEntregasDaFicha,
    montarHistoricoEntregasExpress,
  };
}

let REGISTRO_EXPRESS_ABA = 'registrar';

let REGISTRO_EXPRESS_STATE = { fichaId: '', ficha: null, entregas: [], erro: '', sucesso: '', carregando: false, etapa: 0, formDraft: {} };

function rotuloEtapaRegistroExpress(etapa) {
  if (etapa === 0) return 'Identificar ficha';
  if (etapa === 7) return 'Revisar e confirmar';
  return `Material ${etapa} de ${REGISTRO_EXPRESS_MATERIAIS.length}`;
}

function focoEtapaRegistroExpress() {
  if (REGISTRO_EXPRESS_ABA !== 'registrar') return;
  const estado = REGISTRO_EXPRESS_STATE;
  const alvo = estado.ficha?.status === 'emitida'
    ? estado.etapa === 7 ? 'registroExpressData' : `registroExpressQtd${estado.etapa - 1}`
    : estado.ficha?.status === 'utilizada' ? 'registroExpressConsultarOutra' : estado.ficha?.status === 'cancelada' ? 'registroExpressFichaCancelada' : 'registroExpressId';
  requestAnimationFrame(() => document.getElementById(alvo)?.focus({ preventScroll: true }));
}

function renderProgressoRegistroExpress(etapa) {
  const progresso = etapa + 1;
  const detalhe = etapa >= 1 && etapa <= 6
    ? `${REGISTRO_EXPRESS_MATERIAIS[etapa - 1].label} · material ${etapa} de 6`
    : rotuloEtapaRegistroExpress(etapa);
  return `<div class="registro-express-progresso" aria-label="Etapa ${progresso} de 8: ${escapeHtml(detalhe)}">
    <div class="registro-express-progresso-texto"><span>${escapeHtml(detalhe)}</span><b>Etapa ${progresso} de 8</b></div>
    <progress max="8" value="${progresso}" aria-label="Progresso do Registro express"></progress>
  </div>`;
}

function renderHistoricoFichaExpress(ficha, historico) {
  return `<p class="small-note">Data: ${escapeHtml(ficha.data || '—')} · Total conferido: ${Number.isInteger(ficha.total) ? ficha.total : '—'} · ID da entrega principal: ${escapeHtml(ficha.entregaId || '—')}</p>
    <p class="small-note">Ficha de origem: <strong>${escapeHtml(ficha.id)}</strong> · Snapshot imutável. ID estável da entrega principal: <strong>${escapeHtml(ficha.entregaId || '—')}</strong>. O ID de cada material permanece associado à ficha mesmo após edição ou exclusão.</p>
    <div class="table-wrap"><table><thead><tr><th>Material</th><th>Quantidade original</th><th>Quantidade atual</th><th>Estado</th><th>Origem</th></tr></thead><tbody>${historico.map(item => {
      const material = REGISTRO_EXPRESS_MATERIAIS.find(entry => entry.tipo === item.tipo) || {};
      return `<tr><td>${escapeHtml(material.label || item.tipo)}</td><td>${escapeHtml(String(item.quantidadeOriginal))} unidades</td><td>${item.excluida ? '—' : `${escapeHtml(String(item.quantidadeAtual))} ${escapeHtml(item.unidade)}`}</td><td>${item.excluida ? 'Excluída; snapshot preservado' : item.statusValidacao === 'validado' ? 'Validado' : 'Pendente'}</td><td>${escapeHtml(item.id)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

function selecionarAbaRegistroExpress(aba) {
  if (!['registrar', 'emitir'].includes(aba)) return;
  if (aba === 'emitir' && !STATE.isAdmin) return;
  REGISTRO_EXPRESS_ABA = aba;
  renderApp();
}
function renderRegistroExpress() {
  if (!podeEditarDados()) return '<div class="card"><div class="empty-state">O Registro express exige perfil de administrador ou operador.</div></div>';
  const estado = REGISTRO_EXPRESS_STATE;
  const ficha = estado.ficha;
  const colaborador = ficha && STATE.colaboradores.find(item => item.id === ficha.colaboradorId);
  const campanha = ficha && campanhaPorId(ficha.campanhaId);
  const draft = estado.formDraft || {};
  const historico = ficha && ficha.status === 'utilizada' ? montarHistoricoEntregasExpress(ficha, estado.entregas) : [];
  const cabecalhoFicha = ficha ? `<div class="registro-express-ficha"><b>Ficha ${escapeHtml(ficha.id)}</b><span>${escapeHtml(colaborador ? colaborador.nome : ficha.colaboradorNome || 'Colaborador não localizado')} · ${escapeHtml(campanha ? campanha.nome : ficha.campanhaId)}</span></div>` : '';
  let etapaHtml = '';

  if (ficha?.status === 'utilizada') {
    etapaHtml = '';
  } else if (ficha?.status === 'cancelada') {
    etapaHtml = `<section class="card registro-express-etapa"><h2 id="registroExpressFichaCancelada" tabindex="-1">Ficha cancelada</h2><p role="status">Esta ficha não está disponível para registro.</p></section>`;
  } else if (ficha?.status === 'emitida' && estado.etapa >= 1 && estado.etapa <= 6) {
    const indice = estado.etapa - 1;
    const material = REGISTRO_EXPRESS_MATERIAIS[indice];
    etapaHtml = `<section class="card registro-express-etapa" aria-labelledby="registroExpressEtapaTitulo">
      ${renderProgressoRegistroExpress(estado.etapa)}
      <form onsubmit="event.preventDefault();avancarEtapaFichaExpress()">
        <h2 id="registroExpressEtapaTitulo" tabindex="-1">${escapeHtml(material.label)}</h2>
        <p class="small-note">Informe a quantidade desta ficha. Pressione Enter para confirmar e continuar.</p>
        <div class="registro-express-quantidade field"><label for="registroExpressQtd${indice}">Quantidade · 0 a 999</label><input id="registroExpressQtd${indice}" type="number" inputmode="numeric" min="0" max="999" step="1" required value="${escapeHtml(String(draft.quantidades?.[indice] ?? ''))}" aria-describedby="registroExpressQuantidadeAjuda" oninput="atualizarQuantidadeFichaExpress(${indice},this.value)"><span id="registroExpressQuantidadeAjuda" class="small-note">Somente números inteiros de 0 a 999.</span></div>
        <div class="registro-express-acoes">${estado.etapa > 1 ? '<button class="btn btn-outline" type="button" onclick="voltarEtapaFichaExpress()">Voltar</button>' : '<span></span>'}<button class="btn btn-primary" type="submit">${estado.etapa === 6 ? 'Revisar resumo' : 'Próximo material'}</button></div>
      </form>
    </section>`;
  } else if (ficha?.status === 'emitida' && estado.etapa === 7) {
    const quantidades = draft.quantidades || [];
    const total = quantidades.reduce((soma, valor) => soma + Number(valor || 0), 0);
    etapaHtml = `<section class="card registro-express-etapa" aria-labelledby="registroExpressResumoTitulo">
      ${renderProgressoRegistroExpress(7)}
      <h2 id="registroExpressResumoTitulo" tabindex="-1">Revise antes de registrar</h2>
      <p class="small-note">Confira as seis entregas da ficha ${escapeHtml(ficha.id)}. A gravação ocorrerá em uma única transação.</p>
      <div class="registro-express-resumo">${REGISTRO_EXPRESS_MATERIAIS.map((material, indice) => `<div><span>${escapeHtml(material.label)}</span><b>${escapeHtml(String(quantidades[indice] ?? 0))} unidades</b></div>`).join('')}<div class="registro-express-total"><span>Total</span><b>${total} unidades</b></div></div>
      <div class="grid grid-2 registro-express-dados-gerais">
        <div class="field"><label for="registroExpressData">Data da entrega</label><input id="registroExpressData" type="date" value="${escapeHtml(draft.data || dataCivilHojeISO())}" required oninput="atualizarCampoFichaExpress('data',this.value)"></div>
        <div class="field"><label for="registroExpressStatus">Validação</label><select id="registroExpressStatus" onchange="atualizarCampoFichaExpress('statusValidacao',this.value)"><option value="pendente" ${!draft.statusValidacao || draft.statusValidacao === 'pendente' ? 'selected' : ''}>Pendente</option><option value="validado" ${draft.statusValidacao === 'validado' ? 'selected' : ''}>Validado (conta no ranking)</option></select></div>
      </div>
      <div class="field"><label for="registroExpressResponsavel">Responsável pela contagem</label><input id="registroExpressResponsavel" maxlength="120" value="${escapeHtml(draft.responsavelContagem || '')}" placeholder="Opcional" oninput="atualizarCampoFichaExpress('responsavelContagem',this.value)"></div>
      <div class="field"><label for="registroExpressObservacoes">Observações</label><textarea id="registroExpressObservacoes" rows="2" maxlength="500" placeholder="Opcional" oninput="atualizarCampoFichaExpress('observacoes',this.value)">${escapeHtml(draft.observacoes || '')}</textarea></div>
      <p class="small-note">A ficha original será preservada como snapshot. As entregas poderão ser editadas individualmente na tela Entregas.</p>
      <div class="registro-express-acoes"><button class="btn btn-outline" type="button" onclick="voltarEtapaFichaExpress()">Corrigir quantidades</button><button class="btn btn-primary" type="button" onclick="registrarFichaExpress()" ${estado.carregando ? 'disabled' : ''}>${estado.carregando ? 'Salvando…' : 'Confirmar e registrar'}</button></div>
    </section>`;
  } else {
    etapaHtml = `<section class="card registro-express-etapa" aria-labelledby="registroExpressEtapaTitulo">
      ${renderProgressoRegistroExpress(0)}
      <h2 id="registroExpressEtapaTitulo" tabindex="-1">Identifique a ficha</h2>
      <p class="small-note">Digite ou leia o ID de seis dígitos. Vamos verificar se a ficha existe e está disponível antes de pedir as quantidades.</p>
      <form onsubmit="event.preventDefault();consultarFichaExpress()" class="registro-express-id-form">
        <div class="field"><label for="registroExpressId">ID da ficha</label><input id="registroExpressId" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]{6}" value="${escapeHtml(estado.fichaId)}" oninput="atualizarIdFichaExpress(this.value)" aria-describedby="registroExpressIdAjuda" required></div>
        <button class="btn btn-primary" type="submit" ${estado.carregando ? 'disabled' : ''}>${estado.carregando ? 'Consultando…' : 'Consultar ficha'}</button>
      </form>
    </section>`;
  }

  const fichaInfo = ficha && ficha.status !== 'utilizada'
    ? `<div class="registro-express-ficha"><b>Ficha ${escapeHtml(ficha.id)}</b><span>${escapeHtml(ficha.status === 'emitida' ? 'Emitida e disponível' : 'Cancelada')} · ${escapeHtml(colaborador ? colaborador.nome : ficha.colaboradorNome || 'Colaborador não localizado')}</span></div>`
    : '';
  requestAnimationFrame(focoEtapaRegistroExpress);
  return `<div class="registro-express-shell">
    <header class="registro-express-intro">
      <h1>Registro express</h1>
      <p class="small-note">Emita fichas ou registre uma entrega, sem misturar os fluxos.</p>
    </header>
    <div class="registro-express-tabs" role="tablist" aria-label="Registro express">
      <button id="registroExpressTabRegistrar" class="btn ${REGISTRO_EXPRESS_ABA === 'registrar' ? 'btn-primary' : 'btn-outline'}" type="button" role="tab" aria-selected="${REGISTRO_EXPRESS_ABA === 'registrar'}" aria-controls="registroExpressPainelRegistrar" onclick="selecionarAbaRegistroExpress('registrar')">Registrar fichas</button>
      ${STATE.isAdmin ? `<button id="registroExpressTabEmitir" class="btn ${REGISTRO_EXPRESS_ABA === 'emitir' ? 'btn-primary' : 'btn-outline'}" type="button" role="tab" aria-selected="${REGISTRO_EXPRESS_ABA === 'emitir'}" aria-controls="registroExpressPainelEmitir" onclick="selecionarAbaRegistroExpress('emitir')">Emitir fichas</button>` : ''}
    </div>
    ${STATE.isAdmin ? `<section id="registroExpressPainelEmitir" class="registro-express-panel registro-express-emissao" role="tabpanel" aria-labelledby="registroExpressTabEmitir" ${REGISTRO_EXPRESS_ABA === 'emitir' ? '' : 'hidden'}>
      <div class="section-title">Emissão de fichas</div>
      ${renderFolhaEntrega()}
    </section>` : ''}
    <section id="registroExpressPainelRegistrar" class="registro-express-panel registro-express-registro" role="tabpanel" aria-labelledby="registroExpressTabRegistrar" ${REGISTRO_EXPRESS_ABA === 'registrar' ? '' : 'hidden'}>
      ${fichaInfo}${etapaHtml}
      <div class="registro-express-mensagens" aria-live="polite" aria-atomic="true">${estado.carregando ? '<p class="small-note" role="status">Consultando ficha…</p>' : ''}${estado.erro ? `<p class="auth-error" role="alert">${escapeHtml(estado.erro)}</p>` : ''}${estado.sucesso ? `<p class="success-message" role="status">${escapeHtml(estado.sucesso)}</p>` : ''}</div>
      ${ficha?.status === 'utilizada' ? `<section class="card registro-express-etapa"><div class="toolbar"><div><b>Ficha ${escapeHtml(ficha.id)}</b><p class="small-note">Já registrada · ${escapeHtml(colaborador ? colaborador.nome : ficha.colaboradorNome || 'Colaborador não localizado')} · ${escapeHtml(campanha ? campanha.nome : ficha.campanhaId)}</p></div><span class="badge badge-green">utilizada</span></div>${renderHistoricoFichaExpress(ficha, historico)}<button id="registroExpressConsultarOutra" class="btn btn-outline" type="button" onclick="limparFichaExpress()">Consultar outra ficha</button></section>` : ''}
    </section>
  </div>`;
}

function atualizarIdFichaExpress(valor) {
  REGISTRO_EXPRESS_STATE.fichaId = String(valor || '').slice(0, 6);
}
function atualizarQuantidadeFichaExpress(indice, valor) {
  const quantidades = Array.from({ length: REGISTRO_EXPRESS_MATERIAIS.length }, (_, i) => REGISTRO_EXPRESS_STATE.formDraft?.quantidades?.[i] ?? '');
  quantidades[indice] = valor;
  REGISTRO_EXPRESS_STATE.formDraft = { ...REGISTRO_EXPRESS_STATE.formDraft, quantidades };
  REGISTRO_EXPRESS_STATE.erro = '';
}

function atualizarCampoFichaExpress(campo, valor) {
  REGISTRO_EXPRESS_STATE.formDraft = { ...REGISTRO_EXPRESS_STATE.formDraft, [campo]: valor };
  REGISTRO_EXPRESS_STATE.erro = '';
}

function avancarEtapaFichaExpress() {
  const estado = REGISTRO_EXPRESS_STATE;
  const indice = estado.etapa - 1;
  const input = document.getElementById(`registroExpressQtd${indice}`);
  const resultado = avancarEtapaRegistroExpress(estado.etapa, estado.formDraft?.quantidades, input?.value ?? '');
  if (!resultado.ok) {
    estado.erro = resultado.erro;
    renderApp();
    return;
  }
  estado.formDraft = { ...estado.formDraft, quantidades: resultado.quantidades };
  estado.etapa = resultado.etapa;
  estado.erro = '';
  renderApp();
}

function voltarEtapaFichaExpress() {
  const estado = REGISTRO_EXPRESS_STATE;
  estado.etapa = etapaAnteriorRegistroExpress(estado.etapa);
  estado.erro = '';
  renderApp();
}

function limparFichaExpress() {
  REGISTRO_EXPRESS_STATE = { fichaId: '', ficha: null, entregas: [], erro: '', sucesso: '', carregando: false, etapa: 0, formDraft: {} };
  renderApp();
}

async function consultarFichaExpress() {
  if (!exigirOperador()) return;
  if (REGISTRO_EXPRESS_STATE.carregando) return;
  const input = document.getElementById('registroExpressId');
  const fichaId = String(input ? input.value : REGISTRO_EXPRESS_STATE.fichaId).trim();
  REGISTRO_EXPRESS_STATE = { fichaId, ficha: null, entregas: [], erro: '', sucesso: '', carregando: true, etapa: 0, formDraft: {} };
  renderApp();
  if (STORAGE_MODE !== 'firestore' || !FIREBASE_DB) {
    REGISTRO_EXPRESS_STATE.carregando = false;
    REGISTRO_EXPRESS_STATE.erro = 'O Registro express exige conexão com o Firestore.';
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
    if (!['emitida', 'utilizada', 'cancelada'].includes(ficha.status)) throw new Error('Esta ficha tem um estado desconhecido e não pode ser registrada.');
    REGISTRO_EXPRESS_STATE = {
      fichaId, ficha, entregas, erro: '', sucesso: '', carregando: false,
      etapa: ficha.status === 'emitida' ? 1 : 0,
      formDraft: ficha.status === 'emitida' ? { quantidades: Array(REGISTRO_EXPRESS_MATERIAIS.length).fill(''), data: dataCivilHojeISO(), statusValidacao: 'pendente', responsavelContagem: '', observacoes: '' } : {},
    };
  } catch (erro) {
    REGISTRO_EXPRESS_STATE = { fichaId, ficha: null, entregas: [], erro: erro.message || 'Não foi possível consultar a ficha.', sucesso: '', carregando: false };
  }
  renderApp();
}

async function registrarFichaExpress() {
  if (!exigirOperador()) return;
  const estado = REGISTRO_EXPRESS_STATE;
  if (estado.carregando) return;
  const ficha = estado.ficha;
  if (!ficha || ficha.status !== 'emitida') {
    estado.erro = 'Consulte uma ficha emitida antes de registrar.';
    renderApp();
    return;
  }
  const data = document.getElementById('registroExpressData')?.value || estado.formDraft?.data || '';
  const quantidades = (estado.formDraft?.quantidades || []).map(valor => normalizarQuantidadeRegistroExpress(valor));
  const statusValidacao = document.getElementById('registroExpressStatus')?.value || estado.formDraft?.statusValidacao || '';
  const responsavelContagem = document.getElementById('registroExpressResponsavel')?.value ?? estado.formDraft?.responsavelContagem ?? '';
  const observacoes = document.getElementById('registroExpressObservacoes')?.value ?? estado.formDraft?.observacoes ?? '';
  estado.formDraft = { ...estado.formDraft, data, quantidades, statusValidacao, responsavelContagem, observacoes };
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
        entregaId: `${ficha.id}-papelao`,
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
      entregaId: `${ficha.id}-papelao`,
      quantidades,
      total: quantidades.reduce((soma, valor) => soma + valor, 0),
      data,
    };
    estado.entregas = entregas;
    estado.sucesso = `Ficha registrada. ${entregas.length} entrega(s) com quantidade positiva foram salvas e vinculadas.`;
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
  window.atualizarQuantidadeFichaExpress = atualizarQuantidadeFichaExpress;
  window.atualizarCampoFichaExpress = atualizarCampoFichaExpress;
  window.avancarEtapaFichaExpress = avancarEtapaFichaExpress;
  window.voltarEtapaFichaExpress = voltarEtapaFichaExpress;
  window.limparFichaExpress = limparFichaExpress;
}
