/* =========================================================
   RECICLAR É CUIDAR DA CASA COMUM — APAC IMPERATRIZ
   Aplicativo de ranking de arrecadação de recicláveis
   ========================================================= */

/* ---------- CONSTANTES DO REGULAMENTO ---------- */
const CATEGORIAS = [
  { key:'latinhas',  label:'Latinhas (refrigerante, cerveja, energético)', metaDefault:150, unidade:'Un.', aceitaKg:true, unidadesPorKg:75 },
  { key:'pet',       label:'Garrafas PET',                                  metaDefault:250, unidade:'Un.' },
  { key:'embalagens',label:'Embalagens plásticas (arroz, açúcar, leite, sal, fardos)', metaDefault:100, unidade:'Un.' },
  { key:'papelao',   label:'Caixas de papelão',                             metaDefault:100, unidade:'Un.' },
  { key:'latas',     label:'Latas em geral (sardinha, leite, kitut, feijoada)', metaDefault:80, unidade:'Un.' },
  { key:'ovos',      label:'Cartelas de ovos (30 unidades)',                metaDefault:25,  unidade:'Un.' },
];
const TIPO_OUTROS = 'outros';
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CATEGORIA_MAP = Object.fromEntries(CATEGORIAS.map(c=>[c.key,c]));
/* Cada campanha pode personalizar o nome exibido das seis categorias oficiais do
   regulamento (a chave interna nunca muda, só o rótulo) e também cadastrar materiais
   extras próprios, com sua própria meta. categoriasDaCampanha() devolve a lista completa
   (oficiais + extras) que o cálculo de pontuação, os formulários e os relatórios usam. */
function categoriasDaCampanha(campanha){
  const desativadas = (campanha && campanha.categoriasDesativadas) || [];
  const oficiais = CATEGORIAS
    .filter(cat => !desativadas.includes(cat.key))
    .map(cat => ({
      ...cat,
      label: (campanha && campanha.nomesPersonalizados && campanha.nomesPersonalizados[cat.key]) || cat.label,
    }));
  const extras = (campanha && campanha.materiaisExtras) || [];
  return [...oficiais, ...extras];
}
// Igual à anterior, mas sem excluir materiais desativados — usada só para exibir o nome de
// um material em registros já existentes (tabelas, CSV), nunca para calcular pontuação.
function todasCategoriasDaCampanha(campanha){
  const oficiais = CATEGORIAS.map(cat => ({
    ...cat,
    label: (campanha && campanha.nomesPersonalizados && campanha.nomesPersonalizados[cat.key]) || cat.label,
  }));
  const extras = (campanha && campanha.materiaisExtras) || [];
  return [...oficiais, ...extras];
}
function resolverCategoria(campanhaId, tipoKey){
  const campanha = campanhaPorId(campanhaId);
  return todasCategoriasDaCampanha(campanha).find(cat => cat.key === tipoKey) || null;
}

/* ---------- ESTADO ---------- */
let STATE = {
  colaboradores: [],
  entregas: [],
  transferencias: [],
  trocas: [],
  campanhas: [],
  lixeira: [],
  campanhaSelecionadaId: null,
  config: null,
  isAdmin: false,
  isOperator: false,
  authUser: null,
  authError: '',
  authLoadFailed: false,
  authNotice: '',
  loginCarregando: false,
  authEmail: '',
  mostrarLogin: false,
  rankingsPublicos: [],
  solicitacoesTrocaPublicas: [],
  solicitacoesTrocaError: '',
  solicitacaoTrocaBusyId: '',
  erroSolicitacaoTroca: '',
  manutencaoPublica: false,
  manutencaoPublicaCarregada: false,
  salvandoManutencaoPublica: false,
  erroManutencaoPublica: '',
  senhaSolicitacaoTroca: '',
  senhaSolicitacaoTrocaCarregada: false,
  salvandoSenhaSolicitacaoTroca: false,
  erroSenhaSolicitacaoTroca: '',
  googleDriveLink: null,
  googleDriveLinkError: '',
  googleDriveBusy: false,
  googleDriveStatus: '',
  googleDriveBackups: [],
  googleDriveBackupSelecionadoId: '',
  googleDriveBackupsVisiveis: false,
  rankingPublicoSelecionadoId: '',
  rankingPublicoCampanhaId: '',
  erroRankingPublico: '',
  metasSnapshots: [],
  entregasSecao: 'entregas',
  view: 'dashboard',
  dashMes: null, dashAno: null,
  rankMes: null, rankAno: null, rankSetor: '',
  histMes: null, histAno: null,
};
/* ---------- HELPERS DE ARMAZENAMENTO ---------- */
/* A configuração Firebase é pública; o controle de acesso efetivo fica nas regras
   do Firestore e nos papéis de usuário registrados no banco. */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDMpYOJrypaiE05HUoHNERSZTBhwj2Vouo",
  authDomain: "apac-reciclar.firebaseapp.com",
  projectId: "apac-reciclar",
  storageBucket: "apac-reciclar.firebasestorage.app",
  messagingSenderId: "309128467158",
  appId: "1:309128467158:web:a3a1c14fed86b00020ef77"
};
const GOOGLE_DRIVE_CLIENT_ID = '309128467158-kgldnn0k6n88crj1ca17phlguranao7c.apps.googleusercontent.com';
const GOOGLE_DRIVE_LINK_COLLECTION = 'reciclar-apac-drive-links';
const GOOGLE_DRIVE_BACKUP_FOLDER_NAME = 'Reciclapac Manual Backup';
const GOOGLE_DRIVE_BACKUP_LIMIT = 10;
const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const GOOGLE_DRIVE_SCOPE = 'openid email profile https://www.googleapis.com/auth/drive.file';
let GOOGLE_DRIVE_TOKEN_CACHE = null;
const GOOGLE_DRIVE_TOKEN_SESSION_PREFIX = 'reciclar-apac-drive-token:';
const SOLICITACAO_TROCA_COLLECTION = 'reciclar-apac-transfer-requests';
const PUBLIC_SETTINGS_COLLECTION = 'reciclar-apac-public-settings';
const SENHA_SOLICITACAO_TROCA_DOC = 'trocaSenha';

let FIREBASE_DB = null;
let FIREBASE_AUTH = null;
let STORAGE_MODE = 'none';
let solicitacoesTrocaUnsubscribe = null;
let solicitacoesTrocaListenerUid = '';
const FIRESTORE_RECORD_COLLECTIONS = new Set(['colaboradores','entregas','transferencias','trocas','campanhas','metas','lixeira']);
const FIRESTORE_MIGRATION_COLLECTIONS = new Set(['colaboradores','entregas','transferencias','trocas','campanhas','metas']);
const COLECOES_RESTAURAVEIS = new Set(['colaboradores','entregas','transferencias','trocas','campanhas']);
const PRAZO_LIXEIRA_MS = 30*24*60*60*1000;
const FIRESTORE_BASELINES = new Map();
const STORAGE_ERRORS = new Map();
const PUBLIC_RANKING_SOURCE_KEYS = new Set(['colaboradores','entregas','transferencias','trocas','campanhas','metas']);
let rankingPublicoSyncAtivo = false;
let rankingPublicoSyncTimer = null;
let rankingPublicoSyncMesTimer = null;
let rankingPublicoSyncPromise = null;
let rankingPublicoSyncPendente = false;
let rankingPublicoUltimoMesSincronizado = '';
let rankingsPublicosUnsubscribe = null;
let manutencaoPublicaUnsubscribe = null;
let senhaSolicitacaoTrocaUnsubscribe = null;
function serializarEstavel(valor){
  if(Array.isArray(valor)) return `[${valor.map(serializarEstavel).join(',')}]`;
  if(valor && typeof valor==='object'){
    return `{${Object.keys(valor).sort().map(chave=>`${JSON.stringify(chave)}:${serializarEstavel(valor[chave])}`).join(',')}}`;
  }
  return JSON.stringify(valor);
}

function inicializarFirebase(config){
  try{
    const localEmulatorsAtivos = typeof window !== 'undefined'
      && ['localhost','127.0.0.1'].includes(window.location.hostname)
      && new URLSearchParams(window.location.search).get('emulator') === '1';
    const configuracaoAtiva = localEmulatorsAtivos ? {...config, projectId:'demo-reciclapac'} : config;
    if(!firebase.apps.length) firebase.initializeApp(configuracaoAtiva);
    FIREBASE_DB = firebase.firestore();
    FIREBASE_AUTH = firebase.auth();
    if(localEmulatorsAtivos){
      FIREBASE_DB.useEmulator('127.0.0.1',8080);
      FIREBASE_AUTH.useEmulator('http://127.0.0.1:9099',{disableWarnings:true});
      console.info('Reciclapac conectado somente aos emuladores locais demo-reciclapac.');
    }
    return true;
  }catch(e){ console.error('Erro ao iniciar Firebase', e); return false; }
}
async function detectarModoArmazenamento(){
  if(window.storage){ STORAGE_MODE='claude'; return; }
  if(FIREBASE_CONFIG && typeof firebase!=='undefined' && inicializarFirebase(FIREBASE_CONFIG)){ STORAGE_MODE='firestore'; return; }
  STORAGE_MODE='local';
}
async function storageGet(key, fallback){
  try{
    if(STORAGE_MODE==='claude'){
      const r = await window.storage.get(key, true);
      return r && r.value !== undefined ? JSON.parse(r.value) : fallback;
    }
    if(STORAGE_MODE==='firestore'){
      if(FIRESTORE_RECORD_COLLECTIONS.has(key)){
        const records = await FIREBASE_DB.collection('reciclar-apac').doc(key).collection('records').get();
        if(!records.empty){
          const baseline = new Map();
          const valores = records.docs.map(doc=>{
            const valor = doc.data();
            baseline.set(doc.id, serializarEstavel(valor));
            return valor;
          });
          FIRESTORE_BASELINES.set(key, baseline);
          return valores;
        }
        FIRESTORE_BASELINES.set(key, new Map());
        const marcador=await FIREBASE_DB.collection('reciclar-apac-migrations').doc(key).get();
        if(marcador.exists && marcador.data().schemaVersion===1) return [];
      }
      const doc = await FIREBASE_DB.collection('reciclar-apac').doc(key).get();
      return doc.exists && doc.data().value !== undefined ? JSON.parse(doc.data().value) : fallback;
    }
    const raw = localStorage.getItem('reciclar-apac:'+key);
    return raw!==null ? JSON.parse(raw) : fallback;
  }catch(e){
    console.error('Erro ao carregar', key, e);
    if(STORAGE_MODE==='firestore') throw new Error(`Não foi possível carregar "${key}" no Firestore. Verifique as regras e tente novamente.`);
    return fallback;
  }
}
async function storageSet(key, value){
  try{
    if(STORAGE_MODE==='claude'){ await window.storage.set(key, JSON.stringify(value), true); STORAGE_ERRORS.delete(key); return true; }
    if(STORAGE_MODE==='firestore'){
      if(!FIRESTORE_RECORD_COLLECTIONS.has(key)){
        await FIREBASE_DB.collection('reciclar-apac').doc(key).set({value: JSON.stringify(value)});
        agendarSincronizacaoRankingsPublicos(key);
        STORAGE_ERRORS.delete(key);
        return true;
      }
      if(!Array.isArray(value)) throw new Error(`A coleção "${key}" precisa ser uma lista.`);
      const base = FIRESTORE_BASELINES.get(key) || new Map();
      const referencia = FIREBASE_DB.collection('reciclar-apac').doc(key).collection('records');
      const atuais = await referencia.get();
      const remotos = new Map(atuais.docs.map(doc=>[doc.id, serializarEstavel(doc.data())]));
      const alterados = [];
      const ids = new Set();
      for(const registro of value){
        if(!registro || typeof registro.id!=='string' || !registro.id.trim() || ids.has(registro.id)){
          throw new Error(`Registro inválido ou ID duplicado na coleção "${key}".`);
        }
        ids.add(registro.id);
        const serializado = serializarEstavel(registro);
        const original = base.get(registro.id);
        const remoto = remotos.get(registro.id);
        if(original===serializado || remoto===serializado) continue;
        if((original===undefined && remoto!==undefined) || (original!==undefined && remoto!==original)){
          throw new Error(`O registro "${registro.id}" foi alterado por outra pessoa. Atualize a página antes de salvar.`);
        }
        alterados.push({id:registro.id, registro, serializado});
      }
      for(let inicio=0;inicio<alterados.length;inicio+=450){
        const parte = alterados.slice(inicio,inicio+450);
        const lote = FIREBASE_DB.batch();
        parte.forEach(item=>lote.set(referencia.doc(item.id), item.registro));
        await lote.commit();
        parte.forEach(item=>{
          base.set(item.id,item.serializado);
          remotos.set(item.id,item.serializado);
        });
      }
      FIRESTORE_BASELINES.set(key,base);
      agendarSincronizacaoRankingsPublicos(key);
      STORAGE_ERRORS.delete(key);
      return true;
    }
    localStorage.setItem('reciclar-apac:'+key, JSON.stringify(value));
    STORAGE_ERRORS.delete(key);
    return true;
  }catch(e){
    console.error('Erro ao salvar', key, e);
    STORAGE_ERRORS.set(key,e);
    return false;
  }
}
async function storageDeleteRecord(key,id){
  if(STORAGE_MODE!=='firestore') return true;
  try{
    if(!FIRESTORE_RECORD_COLLECTIONS.has(key)) throw new Error(`A coleção "${key}" não permite excluir registros individuais.`);
    const baseline=FIRESTORE_BASELINES.get(key)||new Map();
    const original=baseline.get(id);
    if(original===undefined) throw new Error(`O registro "${id}" não está na versão carregada. Atualize a página antes de excluir.`);
    const referencia=FIREBASE_DB.collection('reciclar-apac').doc(key).collection('records').doc(id);
    const atual=await referencia.get();
    if(!atual.exists || serializarEstavel(atual.data())!==original){
      throw new Error(`O registro "${id}" foi alterado por outra pessoa. Atualize a página antes de excluir.`);
    }
    await referencia.delete();
    baseline.delete(id);
    FIRESTORE_BASELINES.set(key,baseline);
    agendarSincronizacaoRankingsPublicos(key);
    return true;
  }catch(e){
    console.error('Erro ao excluir registro',key,id,e);
    return false;
  }
}
async function moverRegistroParaLixeira(colecao,id){
  if(!STATE.isAdmin || !COLECOES_RESTAURAVEIS.has(colecao)) return false;
  const registros=STATE[colecao];
  const registro=registros.find(item=>item.id===id);
  if(!registro) return false;
  const registroLixeira={
    id:uid(),
    colecao,
    registroId:id,
    registro:JSON.parse(JSON.stringify(registro)),
    excluidoEm:new Date().toISOString(),
    excluidoPor:STATE.authUser?STATE.authUser.uid:'',
  };
  try{
    if(STORAGE_MODE==='firestore'){
      const referencia=FIREBASE_DB.collection('reciclar-apac').doc(colecao).collection('records');
      const lixeiraReferencia=FIREBASE_DB.collection('reciclar-apac').doc('lixeira').collection('records');
      const serializadoOriginal=(FIRESTORE_BASELINES.get(colecao)||new Map()).get(id);
      if(serializadoOriginal===undefined) throw new Error('O registro não está na versão carregada. Atualize a página antes de excluir.');
      if(serializarEstavel(registro)!==serializadoOriginal) throw new Error('O registro foi alterado localmente. Atualize a página antes de excluir.');
      await FIREBASE_DB.runTransaction(async transacao=>{
        const snapshot=await transacao.get(referencia.doc(id));
        if(!snapshot.exists || serializarEstavel(snapshot.data())!==serializadoOriginal){
          throw new Error('O registro foi alterado por outra pessoa. Atualize a página antes de excluir.');
        }
        transacao.set(lixeiraReferencia.doc(registroLixeira.id),registroLixeira);
        transacao.delete(referencia.doc(id));
      });
      const baseColecao=FIRESTORE_BASELINES.get(colecao)||new Map();
      baseColecao.delete(id);
      FIRESTORE_BASELINES.set(colecao,baseColecao);
      const baseLixeira=FIRESTORE_BASELINES.get('lixeira')||new Map();
      baseLixeira.set(registroLixeira.id,serializarEstavel(registroLixeira));
      FIRESTORE_BASELINES.set('lixeira',baseLixeira);
    }else{
      const lixeiraNova=[...STATE.lixeira,registroLixeira];
      const registrosNovos=registros.filter(item=>item.id!==id);
      if(!await storageSet('lixeira',lixeiraNova)) return false;
      if(!await storageSet(colecao,registrosNovos)){
        if(!await storageSet('lixeira',STATE.lixeira)) console.error('Não foi possível desfazer o arquivamento após falha ao excluir',registroLixeira.id);
        return false;
      }
    }
    STATE.lixeira=[...STATE.lixeira,registroLixeira];
    STATE[colecao]=registros.filter(item=>item.id!==id);
    agendarSincronizacaoRankingsPublicos(colecao);
    return true;
  }catch(erro){
    console.error('Erro ao mover registro para a lixeira',colecao,id,erro);
    return false;
  }
}
async function restaurarRegistroLixeira(id){
  if(!exigirAdmin()) return;
  const registroLixeira=STATE.lixeira.find(item=>item.id===id);
  if(!registroLixeira || !COLECOES_RESTAURAVEIS.has(registroLixeira.colecao)
    || !registroLixeira.registro || registroLixeira.registro.id!==registroLixeira.registroId){
    alert('Este item da lixeira não pode ser restaurado. Atualize a página.');
    return;
  }
  const excluidoEm=Date.parse(registroLixeira.excluidoEm);
  if(!Number.isFinite(excluidoEm) || Date.now()-excluidoEm>=PRAZO_LIXEIRA_MS){
    await limparLixeiraExpirada();
    alert('O prazo de restauração de 30 dias deste item expirou.');
    renderApp();
    return;
  }
  const colecao=registroLixeira.colecao;
  const registros=STATE[colecao];
  if(registros.some(item=>item.id===registroLixeira.registroId)){
    alert('Já existe um registro com este identificador. O item não foi restaurado.');
    return;
  }
  try{
    if(STORAGE_MODE==='firestore'){
      const referencia=FIREBASE_DB.collection('reciclar-apac').doc(colecao).collection('records');
      const lixeiraReferencia=FIREBASE_DB.collection('reciclar-apac').doc('lixeira').collection('records');
      await FIREBASE_DB.runTransaction(async transacao=>{
        const [origem,alvo]=await Promise.all([
          transacao.get(lixeiraReferencia.doc(id)),
          transacao.get(referencia.doc(registroLixeira.registroId)),
        ]);
        if(!origem.exists || serializarEstavel(origem.data())!==serializarEstavel(registroLixeira)){
          throw new Error('O item da lixeira foi alterado. Atualize a página antes de restaurar.');
        }
        if(alvo.exists) throw new Error('Já existe um registro com este identificador.');
        transacao.set(referencia.doc(registroLixeira.registroId),registroLixeira.registro);
        transacao.delete(lixeiraReferencia.doc(id));
      });
      const baseColecao=FIRESTORE_BASELINES.get(colecao)||new Map();
      baseColecao.set(registroLixeira.registroId,serializarEstavel(registroLixeira.registro));
      FIRESTORE_BASELINES.set(colecao,baseColecao);
      const baseLixeira=FIRESTORE_BASELINES.get('lixeira')||new Map();
      baseLixeira.delete(id);
      FIRESTORE_BASELINES.set('lixeira',baseLixeira);
    }else{
      const lixeiraAnterior=STATE.lixeira;
      STATE[colecao]=[...registros,registroLixeira.registro];
      if(!await storageSet(colecao,STATE[colecao])){
        STATE[colecao]=registros;
        throw new Error('Não foi possível gravar o registro restaurado.');
      }
      STATE.lixeira=lixeiraAnterior.filter(item=>item.id!==id);
      if(!await storageSet('lixeira',STATE.lixeira)){
        STATE.lixeira=lixeiraAnterior;
        STATE[colecao]=registros;
        const rollback=await storageSet(colecao,registros);
        if(!rollback) console.error('Não foi possível desfazer uma restauração parcial',id);
        throw new Error('Não foi possível remover o item da lixeira após restaurá-lo.');
      }
    }
    STATE[colecao]=[...registros,registroLixeira.registro];
    STATE.lixeira=STATE.lixeira.filter(item=>item.id!==id);
    agendarSincronizacaoRankingsPublicos(colecao);
    renderApp();
  }catch(erro){
    console.error('Erro ao restaurar registro da lixeira',id,erro);
    alert(erro.message||'Não foi possível restaurar este item. Atualize a página e tente novamente.');
  }
}
window.restaurarRegistroLixeira=restaurarRegistroLixeira;
async function excluirDefinitivamenteLixeira(id){
  if(!exigirAdmin()) return;
  const item=STATE.lixeira.find(registro=>registro.id===id);
  if(!item) return;
  abrirModal(`
    <div class="modal-head"><h3>Excluir definitivamente?</h3><button class="modal-close" type="button" onclick="fecharModal()">${icon('x')}</button></div>
    <p>O item <b>${escapeHtml(resumoItemLixeira(item))}</b> será apagado permanentemente. Esta ação não pode ser desfeita.</p>
    <div class="modal-actions">
      <button class="btn btn-outline btn-block" type="button" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-danger btn-block" type="button" onclick="confirmarExcluirDefinitivamenteLixeira('${escapeHtml(id)}')">${icon('trash',16)}Excluir definitivamente</button>
    </div>
  `);
}
async function confirmarExcluirDefinitivamenteLixeira(id){
  if(!exigirAdmin()) return;
  const item=STATE.lixeira.find(registro=>registro.id===id);
  if(!item) return;
  try{
    if(STORAGE_MODE==='firestore'){
      const baseline=FIRESTORE_BASELINES.get('lixeira')||new Map();
      const original=baseline.get(id);
      if(original===undefined) throw new Error('O item não está na versão carregada. Atualize a página antes de excluir.');
      const referencia=FIREBASE_DB.collection('reciclar-apac').doc('lixeira').collection('records').doc(id);
      await FIREBASE_DB.runTransaction(async transacao=>{
        const snapshot=await transacao.get(referencia);
        if(!snapshot.exists || serializarEstavel(snapshot.data())!==original){
          throw new Error('O item foi alterado por outra pessoa. Atualize a página antes de excluir.');
        }
        transacao.delete(referencia);
      });
      baseline.delete(id);
      FIRESTORE_BASELINES.set('lixeira',baseline);
    }else{
      const lixeiraAtualizada=STATE.lixeira.filter(registro=>registro.id!==id);
      if(!await storageSet('lixeira',lixeiraAtualizada)){
        throw STORAGE_ERRORS.get('lixeira')||new Error('Não foi possível excluir definitivamente o item.');
      }
    }
    STATE.lixeira=STATE.lixeira.filter(registro=>registro.id!==id);
    fecharModal();
    renderApp();
  }catch(erro){
    console.error('Erro ao excluir definitivamente item da lixeira',id,erro);
    alert(erro.message||'Não foi possível excluir definitivamente o item. Atualize a página e tente novamente.');
  }
}
window.excluirDefinitivamenteLixeira=excluirDefinitivamenteLixeira;
window.confirmarExcluirDefinitivamenteLixeira=confirmarExcluirDefinitivamenteLixeira;
async function limparLixeiraExpirada(){
  if(!STATE.isAdmin || !Array.isArray(STATE.lixeira)) return;
  const limite=Date.now()-PRAZO_LIXEIRA_MS;
  const expirados=STATE.lixeira.filter(item=>{
    const data=Date.parse(item.excluidoEm);
    return Number.isFinite(data) && data<=limite;
  });
  if(!expirados.length) return;
  if(STORAGE_MODE==='firestore'){
    for(const item of expirados){
      if(!await storageDeleteRecord('lixeira',item.id)){
        console.error('Não foi possível remover um item expirado da lixeira',item.id);
        return;
      }
      STATE.lixeira=STATE.lixeira.filter(atual=>atual.id!==item.id);
    }
  }else{
    const idsExpirados=new Set(expirados.map(item=>item.id));
    STATE.lixeira=STATE.lixeira.filter(item=>!idsExpirados.has(item.id));
    if(!await storageSet('lixeira',STATE.lixeira)){
      STATE.lixeira=[...STATE.lixeira,...expirados];
      console.error('Não foi possível remover itens expirados da lixeira');
    }
  }
}
async function storageReplaceCollection(key,records){
  if(STORAGE_MODE!=='firestore') return storageSet(key,records);
  if(!FIRESTORE_RECORD_COLLECTIONS.has(key) || !Array.isArray(records)) return false;
  const atuais=await storageGet(key,[]);
  const manter=new Set(records.map(registro=>registro.id));
  for(const registro of atuais){
    if(!manter.has(registro.id) && !await storageDeleteRecord(key,registro.id)) return false;
  }
  return storageSet(key,records);
}
function firestoreCollectionMatches(records, snapshot){
  if(snapshot.size!==records.length) return false;
  const documents=new Map(snapshot.docs.map(doc=>[doc.id,doc]));
  return records.every(record=>{
    if(!record || typeof record.id!=='string') return false;
    const doc=documents.get(record.id);
    return !!doc && serializarEstavel(doc.data())===serializarEstavel(record);
  });
}
async function carregarMarcadoresMigracao(){
  const snapshot=await FIREBASE_DB.collection('reciclar-apac-migrations').get();
  return new Set(snapshot.docs.filter(doc=>doc.data().schemaVersion===1).map(doc=>doc.id));
}
async function migrarColecoesFirestoreLegadas(){
  const base=FIREBASE_DB.collection('reciclar-apac');
  const migradas=await carregarMarcadoresMigracao();
  for(const key of FIRESTORE_MIGRATION_COLLECTIONS){
    const marcadorRef=FIREBASE_DB.collection('reciclar-apac-migrations').doc(key);
    if(migradas.has(key)) continue;
    const legado=await base.doc(key).get();
    if(legado.exists && legado.data().value!==undefined){
      let registros;
      try { registros=JSON.parse(legado.data().value); }
      catch(e){ throw new Error(`Os dados antigos de "${key}" não são um JSON válido.`); }
      if(!Array.isArray(registros)) throw new Error(`Os dados antigos de "${key}" não têm o formato esperado.`);
      if(!await storageSet(key,registros)) throw new Error(`Não foi possível migrar a coleção "${key}".`);
      const atuais=await base.doc(key).collection('records').get();
      if(!firestoreCollectionMatches(registros,atuais)){
        throw new Error(`A conferência da migração de "${key}" encontrou diferenças. Os dados antigos foram preservados; peça ao administrador para revisar a coleção no Firestore.`);
      }
    }
    await marcadorRef.set({schemaVersion:1});
  }
  const docConfig=await base.doc('config').get();
  if(docConfig.exists && docConfig.data().value!==undefined){
    let config;
    try { config=JSON.parse(docConfig.data().value); }
    catch(e){ throw new Error('As configurações antigas não são um JSON válido.'); }
    if(config && Object.prototype.hasOwnProperty.call(config,'senhaAdmin')){
      delete config.senhaAdmin;
      if(!await storageSet('config',config)) throw new Error('Não foi possível remover a senha antiga das configurações do Firebase.');
    }
  }
}
async function verificarMigracaoFirestoreLegada(){
  const base=FIREBASE_DB.collection('reciclar-apac');
  const pendentes=[];
  const migradas=await carregarMarcadoresMigracao();
  for(const key of FIRESTORE_MIGRATION_COLLECTIONS){
    if(migradas.has(key)) continue;
    const legado=await base.doc(key).get();
    if(!legado.exists || legado.data().value===undefined) continue;
    let registros;
    try { registros=JSON.parse(legado.data().value); }
    catch(e){ throw new Error(`Os dados antigos de "${key}" não são um JSON válido.`); }
    if(!Array.isArray(registros)) throw new Error(`Os dados antigos de "${key}" não têm o formato esperado.`);
    const atuais=await base.doc(key).collection('records').get();
    if(!firestoreCollectionMatches(registros,atuais)) pendentes.push(key);
  }
  return pendentes;
}
async function verificarInstalacaoFirestore(){
  const config=await FIREBASE_DB.collection('reciclar-apac').doc('config').get();
  const marcadores=await FIREBASE_DB.collection('reciclar-apac-migrations').get();
  if(!config.exists || [...FIRESTORE_MIGRATION_COLLECTIONS].some(key=>!marcadores.docs.some(doc=>doc.id===key && doc.data().schemaVersion===1))){
    throw new Error('O administrador precisa entrar primeiro para inicializar o app e migrar os dados antigos.');
  }
}
function defaultConfig(){
  return {
    painelPeriodo: { ano: null, tipo: '6' }, // ver calcularJanelaPainel() — a campanha é escolhida à parte, em STATE.campanhaSelecionadaId
    senhaSolicitacaoTroca: '', // usada apenas fora do modo Firestore; no Firestore a senha fica em reciclar-apac-public-settings/trocaSenha
  };
}
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function campanhaSelecionadaPersistida(){
  let valor = null;
  try { valor = sessionStorage.getItem('reciclar-apac:campanhaSelecionadaId'); } catch (e) { /* armazenamento de sessão indisponível */ }
  if(!valor) try { valor = localStorage.getItem('reciclar-apac:campanhaSelecionadaId'); } catch (e) { /* armazenamento local indisponível */ }
  if(!valor) return null;
  const campanha = campanhaPorId(valor);
  return campanha ? valor : null;
}
function salvarCampanhaSelecionadaPersistida(id){
  if(!id){
    try { sessionStorage.removeItem('reciclar-apac:campanhaSelecionadaId'); } catch (e) { /* armazenamento de sessão indisponível */ }
    try { localStorage.removeItem('reciclar-apac:campanhaSelecionadaId'); } catch (e) { /* armazenamento local indisponível */ }
    return;
  }
  try { sessionStorage.setItem('reciclar-apac:campanhaSelecionadaId', id); } catch (e) { /* armazenamento de sessão indisponível */ }
  try { localStorage.setItem('reciclar-apac:campanhaSelecionadaId', id); } catch (e) { /* quota/privacidade do navegador */ }
}
function campanhaPadrao(){
  const nomePadrao = 'Reciclar é Cuidar da Casa Comum';
  const porNome = STATE.campanhas.find(c => c.nome === nomePadrao);
  if(porNome) return porNome;
  const ativas = campanhasOrdenadas().filter(c => c.status === 'ativa');
  if(ativas.length) return ativas[ativas.length - 1];
  return campanhasOrdenadas()[0] || null;
}
function hoje(){ return new Date(); }
function dataCivilHojeISO(d = hoje()){
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
function mesAnoAtual(){ const d=hoje(); return {mes:d.getMonth()+1, ano:d.getFullYear()}; }
function chaveMA(mes,ano){ return ano+'-'+String(mes).padStart(2,'0'); }
function nomeMes(mes){ return MESES_PT[mes-1]; }

/* ---------- CAMPANHAS ----------
   Cada campanha é uma entidade independente e explícita: toda entrega e toda
   transferência guardam o campo campanhaId dizendo a qual campanha pertencem.
   A data do registro NUNCA decide a campanha — duas campanhas podem ter
   períodos sobrepostos, ou até entregas na mesma data, sem nenhum conflito.
   Cada campanha tem suas próprias metas (com histórico mês a mês) e seu
   próprio acúmulo de excedente, isolado das demais. */
const CAMPANHA_LEGADO_INICIO = { mes: 5, ano: 2026 }; // usado só na migração da 1ª vez
async function salvarTrocas(){ await storageSet('trocas', STATE.trocas); }
function trocasDoMes(campanhaId, mes, ano){
  const chave = chaveMA(mes,ano);
  return STATE.trocas.filter(t=>t.campanhaId===campanhaId && t.data && t.data.slice(0,7)===chave);
}
/* Quantos kits um colaborador já pode trocar agora, dado o saldo atual dele em cada
   material do kit. É o menor resultado entre (saldo do material ÷ quantidade exigida),
   arredondado para baixo — precisa fechar a quantidade em TODOS os materiais do kit. */
function kitsDisponiveis(campanha, totaisPorCategoria){
  const cfg = campanha && campanha.trocaCartela;
  if(!cfg || !cfg.ativo || !cfg.kit) return 0;
  const chaves = Object.keys(cfg.kit).filter(k=>cfg.kit[k]>0);
  if(chaves.length===0) return 0;
  return Math.floor(Math.min(...chaves.map(k => (totaisPorCategoria[k]||0) / cfg.kit[k])));
}
const CAMPANHA_LEGADO_ID = 'campanha-legado-reciclar-2026'; // id estável — nunca gerado de novo a cada migração
function campanhasOrdenadas(){
  return [...STATE.campanhas].sort((a,b)=> (a.anoInicio*12+a.mesInicio) - (b.anoInicio*12+b.mesInicio));
}
function campanhaPorId(id){ return STATE.campanhas.find(c=>c.id===id) || null; }
function campanhaAtiva(){
  const ordenadas = campanhasOrdenadas();
  const ativas = ordenadas.filter(c=>c.status==='ativa');
  if(ativas.length) return ativas[ativas.length-1];
  return ordenadas.length? ordenadas[ordenadas.length-1] : null;
}
function selecionarCampanhaPadraoSeNecessario(){
  const persistida = campanhaSelecionadaPersistida();
  if(persistida){
    STATE.campanhaSelecionadaId = persistida;
    return;
  }
  const padrao = campanhaPadrao();
  STATE.campanhaSelecionadaId = padrao ? padrao.id : null;
  salvarCampanhaSelecionadaPersistida(STATE.campanhaSelecionadaId);
}
function campanhaTemEntregas(campanhaId){
  return STATE.entregas.some(e=>e.campanhaId===campanhaId)
    || STATE.transferencias.some(t=>t.campanhaId===campanhaId)
    || STATE.trocas.some(t=>t.campanhaId===campanhaId)
    || STATE.metasSnapshots.some(meta=>meta.campanhaId===campanhaId);
}
async function salvarCampanhas(){ return storageSet('campanhas', STATE.campanhas); }
async function migrarParaCampanhas(configAntigo){
  // Idempotente: nunca substitui a lista de campanhas já existente, nunca gera um id novo
  // para a campanha histórica, e só toca em entregas/transferências que ainda não têm
  // campanhaId. Rodar esta função mais de uma vez não deve mudar nada que já esteja migrado.
  let campanhas = Array.isArray(STATE.campanhas) && STATE.campanhas.length ? [...STATE.campanhas] : [];
  let campanhaLegado = campanhas.find(c => c.id === CAMPANHA_LEGADO_ID)
    || campanhas.find(c => c.nome === 'Reciclar é Cuidar da Casa Comum'); // reconhece a legada mesmo se já existir com outro id
  if(!campanhaLegado){
    const metasDefault = (configAntigo && configAntigo.metasDefault) || Object.fromEntries(CATEGORIAS.map(c=>[c.key,c.metaDefault]));
    const metasHistorico = (configAntigo && configAntigo.metasHistorico) || {};
    campanhaLegado = {
      id: CAMPANHA_LEGADO_ID,
      nome: 'Reciclar é Cuidar da Casa Comum',
      mesInicio: CAMPANHA_LEGADO_INICIO.mes, anoInicio: CAMPANHA_LEGADO_INICIO.ano,
      mesFim: null, anoFim: null,
      status: 'ativa',
      metasDefault, metasHistorico,
    };
    campanhas.push(campanhaLegado);
  }
  STATE.campanhas = campanhas;
  await salvarCampanhas();
  // registros já existentes (entregas e transferências anteriores a esta versão) que ainda não
  // têm campanhaId são associados à campanha legada; registros que já têm campanhaId — de
  // qualquer campanha — nunca são alterados.
  let mudouEntregas=false, mudouTransf=false;
  STATE.entregas.forEach(e=>{ if(!e.campanhaId){ e.campanhaId = campanhaLegado.id; mudouEntregas=true; } });
  STATE.transferencias.forEach(t=>{ if(!t.campanhaId){ t.campanhaId = campanhaLegado.id; mudouTransf=true; } });
  if(mudouEntregas) await salvarEntregas();
  if(mudouTransf) await salvarTransferencias();
  return campanhaLegado;
}

/* ---------- CARREGAMENTO INICIAL ---------- */
async function carregarDados(){
  const [colaboradores,entregas,transferencias,trocas,lixeira,metas,config,campanhas]=await Promise.all([
    storageGet('colaboradores', []),
    storageGet('entregas', []),
    storageGet('transferencias', []),
    storageGet('trocas', []),
    STATE.isAdmin ? storageGet('lixeira', []) : Promise.resolve([]),
    storageGet('metas', []),
    storageGet('config', null),
    storageGet('campanhas', null),
  ]);
  STATE.colaboradores = colaboradores;
  STATE.entregas = entregas;
  STATE.transferencias = transferencias;
  STATE.trocas = trocas;
  STATE.lixeira = lixeira;
  await limparLixeiraExpirada();
  STATE.metasSnapshots = metas;
  STATE.config = config;
  const configAntigoParaMigrar = STATE.config; // pode conter metasDefault/metasHistorico do formato anterior
  if(STATE.config) delete STATE.config.senhaAdmin;
  if(!STATE.config){
    STATE.config = defaultConfig();
    await storageSet('config', STATE.config);
  }
  if(!STATE.config.painelPeriodo) STATE.config.painelPeriodo = { ano: null, tipo: '6' };
  if(typeof STATE.config.senhaSolicitacaoTroca!=='string') STATE.config.senhaSolicitacaoTroca = '';
  STATE.campanhas = campanhas;
  if(!STATE.campanhas || STATE.campanhas.length===0){
    await migrarParaCampanhas(configAntigoParaMigrar);
  } else {
    // Correção de auto-cura: entregas ou transferências criadas por uma versão intermediária
    // do app (sem o campo campanhaId ainda implementado) ficariam invisíveis para sempre, já
    // que a migração só roda quando a coleção de campanhas ainda não existe. Aqui, toda vez
    // que o app carrega, qualquer registro sem campanhaId é associado à campanha legada,
    // sem tocar em nenhum registro que já tenha uma campanha definida.
    const legado = campanhaPorId(CAMPANHA_LEGADO_ID)
      || STATE.campanhas.find(c => c.nome === 'Reciclar é Cuidar da Casa Comum')
      || campanhaAtiva();
    if(legado){
      let mudouEntregas=false, mudouTransf=false;
      STATE.entregas.forEach(e=>{ if(!e.campanhaId){ e.campanhaId = legado.id; mudouEntregas=true; } });
      STATE.transferencias.forEach(t=>{ if(!t.campanhaId){ t.campanhaId = legado.id; mudouTransf=true; } });
      if(mudouEntregas) await salvarEntregas();
      if(mudouTransf) await salvarTransferencias();
    }
  }
  selecionarCampanhaPadraoSeNecessario();
  const {mes,ano} = mesAnoAtual();
  STATE.dashMes=mes; STATE.dashAno=ano;
  STATE.rankMes=mes; STATE.rankAno=ano;
  STATE.histMes=mes; STATE.histAno=ano;
}
async function salvarColaboradores(){ return storageSet('colaboradores', STATE.colaboradores); }
async function salvarEntregas(){ return storageSet('entregas', STATE.entregas); }
async function salvarTransferencias(){ return storageSet('transferencias', STATE.transferencias); }
async function salvarConfig(){ return storageSet('config', STATE.config); }
function mudarCampanhaSelecionada(id){
  STATE.campanhaSelecionadaId = id;
  salvarCampanhaSelecionadaPersistida(id);
  renderApp();
}
window.mudarCampanhaSelecionada = mudarCampanhaSelecionada;
/* A campanha nunca é escolhida pela data — mas, depois de escolhida, a data do
   registro precisa estar dentro do período daquela campanha específica. */
function dataDentroDaCampanha(campanhaId, dataISO){
  const campanha = campanhaPorId(campanhaId);
  if(!campanha || !dataISO) return { ok:false, motivo:'Selecione uma campanha válida.' };
  const mes = +dataISO.slice(5,7), ano = +dataISO.slice(0,4);
  const alvo = ano*12+mes;
  const inicio = campanha.anoInicio*12+campanha.mesInicio;
  const fim = campanha.anoFim? (campanha.anoFim*12+campanha.mesFim) : Infinity;
  if(alvo<inicio){
    return { ok:false, motivo:`Essa data é anterior ao início da campanha "${campanha.nome}" (${nomeMes(campanha.mesInicio)}/${campanha.anoInicio}).` };
  }
  if(alvo>fim){
    return { ok:false, motivo:`Essa data é posterior ao encerramento da campanha "${campanha.nome}" (${nomeMes(campanha.mesFim)}/${campanha.anoFim}).` };
  }
  return { ok:true };
}

/* ---------- LÓGICA DE NEGÓCIO ---------- */
function normalizarQuantidadeUnidades(entrega){
  if(entrega.tipo==='latinhas'){
    const cat = CATEGORIA_MAP.latinhas;
    if(entrega.unidade==='kg') return entrega.quantidade * cat.unidadesPorKg;
    if(entrega.unidade==='kg-x10') return (entrega.quantidade/10) * cat.unidadesPorKg;
    return entrega.quantidade;
  }
  return entrega.quantidade;
}
function getMetasDoMes(campanhaId, mes, ano){
  const campanha = campanhaPorId(campanhaId);
  if(!campanha) return Object.fromEntries(CATEGORIAS.map(c=>[c.key,c.metaDefault]));
  const chave = chaveMA(mes,ano);
  const snapshot = STATE.metasSnapshots.find(m=>m.campanhaId===campanhaId && m.chave===chave);
  if(snapshot) return snapshot.metas;
  if(campanha.metasHistorico[chave]) return campanha.metasHistorico[chave];
  return campanha.metasDefault;
}
async function garantirSnapshotMetas(campanhaId, mes, ano){
  const campanha = campanhaPorId(campanhaId);
  if(!campanha) return;
  const chave = chaveMA(mes,ano);
  if(campanha.metasHistorico[chave] || STATE.metasSnapshots.some(m=>m.campanhaId===campanhaId && m.chave===chave)) return;
  const snapshot={id:`${campanhaId}-${chave}`,campanhaId,chave,metas:{...campanha.metasDefault}};
  STATE.metasSnapshots.push(snapshot);
  if(!await storageSet('metas',STATE.metasSnapshots)){
    STATE.metasSnapshots=STATE.metasSnapshots.filter(m=>m.id!==snapshot.id);
    throw new Error(`Não foi possível registrar a meta deste mês (${chave}).`);
  }
}
function entregasValidadasDoMes(campanhaId, mes, ano){
  return ReciclarRankingLogic.filtrarEntregasValidadas(STATE.entregas,campanhaId,mes,ano);
}
function transferenciasDoMes(campanhaId, mes, ano){
  const chave = chaveMA(mes,ano);
  return STATE.transferencias.filter(t=>t.campanhaId===campanhaId && t.data && t.data.slice(0,7)===chave);
}
function mesAnteriorDe(campanhaId, mes, ano){
  let m=mes-1, a=ano;
  if(m<1){ m=12; a--; }
  const campanha = campanhaPorId(campanhaId);
  if(!campanha) return null;
  if(a<campanha.anoInicio || (a===campanha.anoInicio && m<campanha.mesInicio)) return null; // antes do início da campanha
  return {mes:m, ano:a};
}
function todosMesesEntre(mesA,anoA,mesB,anoB){
  const lista = [];
  let m=mesA, a=anoA;
  if(anoA*12+mesA > anoB*12+mesB) return lista;
  while(a<anoB || (a===anoB && m<=mesB)){
    lista.push({mes:m,ano:a});
    m++; if(m>12){ m=1; a++; }
  }
  return lista;
}
function todosMesesDaCampanhaAte(campanhaId, mesAlvo,anoAlvo){
  const campanha = campanhaPorId(campanhaId);
  if(!campanha) return [{mes:mesAlvo,ano:anoAlvo}];
  return todosMesesEntre(campanha.mesInicio,campanha.anoInicio,mesAlvo,anoAlvo);
}
/* Janela de exibição do painel geral (gráfico de evolução + resumo de acompanhamento).
   Independente do cálculo de pontuação: aqui o usuário escolhe o ano e o período
   (3/6/12 meses, ano inteiro, ou intervalo personalizado) para a campanha já
   selecionada em STATE.campanhaSelecionadaId. */
function ultimoMesValidoNoAno(campanha, anoSelecionado){
  const hoje = mesAnoAtual();
  if(anoSelecionado > hoje.ano) return null;
  let mes = (anoSelecionado===hoje.ano) ? hoje.mes : 12;
  let ano = anoSelecionado;
  if(campanha && campanha.anoFim){
    const fimCampanha = campanha.anoFim*12+campanha.mesFim;
    if(ano*12+mes > fimCampanha){
      if(campanha.anoFim!==anoSelecionado) return null;
      mes = campanha.mesFim; ano = campanha.anoFim;
    }
  }
  if(campanha){
    const inicioCampanha = campanha.anoInicio*12+campanha.mesInicio;
    if(ano*12+mes < inicioCampanha) return null;
  }
  return {mes,ano};
}
function calcularJanelaPainel(){
  const pref = STATE.config.painelPeriodo;
  const campanha = campanhaPorId(STATE.campanhaSelecionadaId) || campanhaAtiva();
  if(!campanha) return { campanha:null, meses:[] };
  let meses = [];
  if(pref.tipo==='personalizado' && pref.mesInicio && pref.anoInicio && pref.mesFim && pref.anoFim){
    meses = todosMesesEntre(pref.mesInicio,pref.anoInicio,pref.mesFim,pref.anoFim);
  } else {
    const anoSel = pref.ano || mesAnoAtual().ano;
    const alvo = ultimoMesValidoNoAno(campanha, anoSel);
    if(!alvo) return { campanha, meses:[] };
    if(pref.tipo==='anoAtual'){
      meses = todosMesesEntre(1, anoSel, alvo.mes, alvo.ano);
    } else {
      const n = parseInt(pref.tipo,10) || 6;
      const todos = todosMesesEntre(campanha.mesInicio, campanha.anoInicio, alvo.mes, alvo.ano);
      meses = todos.slice(-n);
    }
  }
  const ini = campanha.anoInicio*12+campanha.mesInicio;
  const fim = campanha.anoFim? (campanha.anoFim*12+campanha.mesFim) : Infinity;
  meses = meses.filter(({mes,ano})=>{ const v=ano*12+mes; return v>=ini && v<=fim; });
  return { campanha, meses };
}
async function mudarPainelPeriodo(campo, valor){
  if(!exigirAdmin()){ renderApp(); return; }
  const pref = STATE.config.painelPeriodo;
  if(campo==='ano') pref.ano = valor? parseInt(valor,10) : null;
  else if(campo==='tipo') pref.tipo = valor;
  else if(['mesInicio','anoInicio','mesFim','anoFim'].includes(campo)) pref[campo] = parseInt(valor,10);
  await salvarConfig();
  renderApp();
}
window.mudarPainelPeriodo = mudarPainelPeriodo;
/* Calcula, para cada colaborador e categoria, o saldo mês a mês desde o início da campanha
   até o mês alvo, já considerando: entregas validadas, transferências recebidas/enviadas, e
   o excedente (o que passou da meta) transportado automaticamente para o mês seguinte.
   Tudo isolado dentro da campanha informada — nada aqui vaza para outra campanha. */
function calcularSaldosAcumulados(campanhaId, mesAlvo,anoAlvo){
  const meses = todosMesesDaCampanhaAte(campanhaId, mesAlvo,anoAlvo);
  const categorias = categoriasDaCampanha(campanhaPorId(campanhaId));
  const saldos = {};
  STATE.colaboradores.forEach(c=>{ saldos[c.id]={}; categorias.forEach(cat=> saldos[c.id][cat.key]={}); });
  meses.forEach(({mes,ano})=>{
    const chave = chaveMA(mes,ano);
    const metas = getMetasDoMes(campanhaId, mes,ano);
    const transferencias = transferenciasDoMes(campanhaId, mes,ano);
    const trocas = trocasDoMes(campanhaId, mes,ano);
    const anterior = mesAnteriorDe(campanhaId, mes,ano);
    const chaveAnterior = anterior? chaveMA(anterior.mes,anterior.ano) : null;
    STATE.colaboradores.forEach(c=>{
      categorias.forEach(cat=>{
        const creditosEntregas = ReciclarRankingLogic.somarEntregasValidadas(
          STATE.entregas,campanhaId,mes,ano,c.id,cat.key,normalizarQuantidadeUnidades
        );
        const recebidos = transferencias.filter(t=>t.colaboradorDestinoId===c.id && t.categoriaDestino===cat.key).reduce((total,t)=>total+t.quantidade,0);
        const enviados = transferencias.filter(t=>t.colaboradorOrigemId===c.id && t.categoriaOrigem===cat.key).reduce((total,t)=>total+t.quantidade,0);
        const consumidosEmTrocas = trocas.filter(t=>t.colaboradorId===c.id && t.kitConsumido && t.kitConsumido[cat.key]).reduce((total,t)=>total+t.kitConsumido[cat.key],0);
        const creditos = creditosEntregas+recebidos-enviados-consumidosEmTrocas;
        const carryIn = chaveAnterior && saldos[c.id][cat.key][chaveAnterior] ? saldos[c.id][cat.key][chaveAnterior].leftover : 0;
        const meta = metas[cat.key] || cat.metaDefault;
        let saldoMensal;
        try{
          saldoMensal=ReciclarRankingLogic.calcularSaldoMensal(creditos,carryIn,meta);
        }catch(erro){
          if(creditos+carryIn<0 && Number.isFinite(creditos) && Number.isFinite(carryIn) && carryIn>=0 && meta>=0){
            // Resgate maior que o saldo registrado: mantém o app utilizável com saldo zerado.
            console.warn(`Saldo negativo ajustado para zero: ${c.nome} / ${cat.label||cat.key} em ${String(mes).padStart(2,'0')}/${ano}. Entregas: ${creditosEntregas}; recebidas: ${recebidos}; enviadas: ${enviados}; consumo em trocas: ${consumidosEmTrocas}; saldo anterior: ${carryIn}.`);
            saldoMensal={totalDisponivel:0,leftover:0};
          }else{
            throw new Error(`Saldo inválido para ${c.nome} / ${cat.label||cat.key} em ${String(mes).padStart(2,'0')}/${ano}. Entregas: ${creditosEntregas}; transferências recebidas: ${recebidos}; transferências enviadas: ${enviados}; consumo em trocas: ${consumidosEmTrocas}; saldo anterior: ${carryIn}; meta: ${meta}. ${erro.message}`);
          }
        }
        const {totalDisponivel,leftover}=saldoMensal;
        saldos[c.id][cat.key][chave] = { creditos, carryIn, totalDisponivel, leftover, meta };
      });
    });
  });
  return saldos;
}
function saldoDisponivelAntes(campanhaId, colaboradorId, categoria, mes, ano){
  const saldos = calcularSaldosAcumulados(campanhaId, mes,ano);
  const s = saldos[colaboradorId]?.[categoria]?.[chaveMA(mes,ano)];
  return s? s.totalDisponivel : 0;
}
function resultadosDoMesUsandoSaldos(saldos, campanhaId, mes, ano, setorFiltro){
  const chave = chaveMA(mes,ano);
  const categorias = categoriasDaCampanha(campanhaPorId(campanhaId));
  let colaboradores = STATE.colaboradores.filter(c=> !setorFiltro || c.setor===setorFiltro);
  colaboradores = colaboradores.filter(c=> !c.dataCadastro || c.dataCadastro.slice(0,7) <= chave);
  const entregasDoMes = entregasValidadasDoMes(campanhaId, mes,ano);
  const resultados = colaboradores.map(c=>{
    const totais = {}, percentuais = {}, percentuaisReais={}, frescos = {}, carryInsPorCategoria={}, totaisAcumulados = {}, metasPorCategoria = {}, categoriasAtingidas = {};
    categorias.forEach(cat=>{
      const s = saldos[c.id]?.[cat.key]?.[chave];
      const totalDisponivelBruto = s? s.totalDisponivel : 0;
      const meta = s? s.meta : (getMetasDoMes(campanhaId, mes,ano)[cat.key]||cat.metaDefault);
      const cumprimento = ReciclarRankingLogic.resumirCategoria(totalDisponivelBruto,meta);
      totais[cat.key] = cumprimento.quantidade;
      metasPorCategoria[cat.key] = meta;
      categoriasAtingidas[cat.key] = cumprimento.atingida;
      frescos[cat.key] = Math.max(0, s? s.creditos : 0);
      carryInsPorCategoria[cat.key] = Math.max(0, s? s.carryIn : 0);
      percentuais[cat.key] = cumprimento.percentual;
      percentuaisReais[cat.key] = meta>0 ? totalDisponivelBruto/meta*100 : 0;
      totaisAcumulados[cat.key] = Object.values(saldos[c.id]?.[cat.key] || {}).reduce((a,x)=>a+x.creditos, 0);
    });
    const percentuaisCapped = categorias.map(cat=>Math.min(100,percentuais[cat.key]));
    const pontuacao = percentuaisCapped.reduce((a,b)=>a+b,0)/categorias.length;
    const mediaReal = categorias.reduce((soma,cat)=>soma+percentuaisReais[cat.key],0)/categorias.length;
    const metaAtingida = categorias.every(cat=>categoriasAtingidas[cat.key]);
    const totalMateriais = Math.round(categorias.reduce((a,cat)=>a+totais[cat.key],0));
    const datasDoColaborador = entregasDoMes.filter(e=>e.colaboradorId===c.id).map(e=>e.data).sort();
    const primeiraEntrega = datasDoColaborador.length? datasDoColaborador[0] : null;
    return { colaborador:c, totais, carryInsPorCategoria, metasPorCategoria, totaisAcumulados, percentuais, pontuacao, mediaReal, metaAtingida, totalMateriais, primeiraEntrega };
  });
  resultados.sort((a,b)=>
    b.pontuacao-a.pontuacao
    || b.mediaReal-a.mediaReal
    || (a.primeiraEntrega||'9999-99-99').localeCompare(b.primeiraEntrega||'9999-99-99')
    || a.colaborador.nome.localeCompare(b.colaborador.nome)
  );
  return ReciclarRankingLogic.atribuirPosicoes(resultados);
}
function calcularResultadosMes(campanhaId, mes,ano,setorFiltro){
  const saldos = calcularSaldosAcumulados(campanhaId, mes,ano);
  return resultadosDoMesUsandoSaldos(saldos, campanhaId, mes, ano, setorFiltro);
}
function setoresExistentes(){
  return [...new Set(STATE.colaboradores.map(c=>c.setor).filter(Boolean))].sort();
}
function mesesComDados(campanhaId){
  const chaves = new Set();
  STATE.entregas.forEach(e=>{ if(e.campanhaId===campanhaId && e.data) chaves.add(e.data.slice(0,7)); });
  const campanha = campanhaPorId(campanhaId);
  if(campanha) Object.keys(campanha.metasHistorico||{}).forEach(k=>chaves.add(k));
  return [...chaves].sort().reverse();
}

/* VALIDACAO GLOBAL PT-BR */
(function instalarValidacaoGlobalPtBr() {
  if (typeof document === 'undefined') return;

  function mensagemValidacao(campo) {
    const v = campo.validity;

    if (v.valueMissing) {
      if (campo.type === 'checkbox') return 'Marque esta opção para continuar.';
      if (campo.type === 'radio') return 'Selecione uma opção para continuar.';
      return 'Preencha este campo para continuar.';
    }
    if (v.typeMismatch && campo.type === 'email')
      return 'Informe um endereço de e-mail válido.';
    if (v.typeMismatch && campo.type === 'url')
      return 'Informe um endereço de site válido.';
    if (v.patternMismatch) {
      if (campo.id === 'registroExpressId')
        return 'Informe o ID da ficha com exatamente 6 dígitos.';
      return 'Confira o formato informado.';
    }
    if (v.rangeUnderflow)
      return 'O valor deve ser igual ou posterior a ' + campo.min + '.';
    if (v.rangeOverflow)
      return 'O valor deve ser igual ou anterior a ' + campo.max + '.';
    if (v.tooShort)
      return 'Digite pelo menos ' + campo.minLength + ' caracteres.';
    if (v.tooLong)
      return 'Digite no máximo ' + campo.maxLength + ' caracteres.';
    if (v.stepMismatch)
      return 'Informe um valor válido para este campo.';
    if (v.badInput)
      return 'Confira o valor digitado.';
    return 'Confira os dados informados.';
  }

  document.addEventListener('invalid', function(evento) {
    const campo = evento.target;
    if (!(campo instanceof HTMLInputElement ||
          campo instanceof HTMLSelectElement ||
          campo instanceof HTMLTextAreaElement)) return;

    // Não substitui mensagens personalizadas definidas por outros módulos.
    if (campo.validity.customError) return;

    campo.setCustomValidity(mensagemValidacao(campo));
    campo.dataset.validacaoPtBr = '1';
  }, true);

  function limparMensagem(evento) {
    const campo = evento.target;
    if (!(campo instanceof HTMLInputElement ||
          campo instanceof HTMLSelectElement ||
          campo instanceof HTMLTextAreaElement)) return;

    if (campo.dataset.validacaoPtBr === '1') {
      campo.setCustomValidity('');
      delete campo.dataset.validacaoPtBr;
    }
  }

  document.addEventListener('input', limparMensagem, true);
  document.addEventListener('change', limparMensagem, true);
})();

