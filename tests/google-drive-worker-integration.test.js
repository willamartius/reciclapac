const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const mainSource = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');

function carregarContextoMain(overrides = {}) {
  const context = {
    window: {},
    document: {
      getElementById: () => ({ style: {} }),
      createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, remove: () => {} }),
      body: { appendChild: () => {} },
    },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: (() => {
      const store = new Map();
      return {
        getItem: k => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: k => store.delete(k),
        clear: () => store.clear(),
        keys: () => Array.from(store.keys()),
        get length() { return store.size; },
      };
    })(),
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    URL,
    URLSearchParams,
    Number,
    JSON,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    Promise,
    Error,
    STATE: {
      isAdmin: false,
      authUser: null,
      googleDriveLink: null,
      googleDriveLinkError: '',
      googleDriveBusy: false,
      googleDriveStatus: '',
      googleDriveBackups: [],
      googleDriveBackupSelecionadoId: '',
      googleDriveBackupsVisiveis: false,
    },
    STORAGE_MODE: 'firestore',
    FIREBASE_AUTH: { onAuthStateChanged: () => {} },
    FIREBASE_DB: { collection: () => ({ doc: () => ({ get: async () => ({ exists: false }) }) }) },
    GOOGLE_DRIVE_LINK_COLLECTION: 'reciclar-apac-drive-links',
    GOOGLE_DRIVE_BACKUP_FOLDER_NAME: 'Reciclapac Backups',
    GOOGLE_DRIVE_API_BASE: 'https://www.googleapis.com/drive/v3',
    GOOGLE_DRIVE_BACKUP_LIMIT: 10,
    GOOGLE_DRIVE_TOKEN_SESSION_PREFIX: 'reciclapac_gdrive_token:',
    GOOGLE_DRIVE_TOKEN_CACHE: null,
    exigirAdmin: () => true,
    renderApp: () => {},
    detectarModoArmazenamento: async () => {},
    carregarDados: async () => {},
    finalizarCarregamento: () => {},
    ...overrides,
  };
  vm.createContext(context);
  return context;
}

test('GOOGLE_DRIVE_WORKER_URL aponta para o Worker Cloudflare de produção', () => {
  assert.match(mainSource, /const\s+GOOGLE_DRIVE_WORKER_URL\s*=\s*'https:\/\/reciclapac-drive-auth\.reciclapac\.workers\.dev';/);
});

test('verificarConfiguracaoGoogleDrive exige sessão administrativa autenticada com getIdToken', () => {
  const ctx = carregarContextoMain();
  vm.runInContext(mainSource, ctx);

  // Sem admin
  ctx.exigirAdmin = () => false;
  assert.throws(() => ctx.verificarConfiguracaoGoogleDrive(), /Entre com uma conta administradora/);

  // Sem authUser
  ctx.exigirAdmin = () => true;
  ctx.STATE.authUser = null;
  assert.throws(() => ctx.verificarConfiguracaoGoogleDrive(), /exige uma sessão administrativa autenticada/);

  // Sem getIdToken
  ctx.STATE.authUser = { uid: 'u1' };
  assert.throws(() => ctx.verificarConfiguracaoGoogleDrive(), /exige uma sessão administrativa autenticada/);

  // Válido
  ctx.STATE.authUser = { uid: 'u1', getIdToken: async () => 'id-token-123' };
  assert.doesNotThrow(() => ctx.verificarConfiguracaoGoogleDrive());
});

test('armazenamento e leitura de token de sessão respeitam expiração e isolamento por UID', () => {
  const ctx = carregarContextoMain();
  vm.runInContext(mainSource, ctx);

  const uid = 'admin-user-1';
  const googleSub = 'google-sub-123';

  // Guardar token válido por 1 hora
  const agora = Date.now();
  ctx.guardarTokenGoogleDriveSessao({
    uid,
    googleSub,
    accessToken: 'token-valido-abc',
    expiresAt: agora + 3600 * 1000,
  });

  const lido = ctx.lerTokenGoogleDriveSessao(uid, googleSub);
  assert.ok(lido, 'Deve retornar o token válido em cache');
  assert.equal(lido.accessToken, 'token-valido-abc');

  // Consulta para outro UID ou outro googleSub não deve retornar
  assert.equal(ctx.lerTokenGoogleDriveSessao('outro-user', googleSub), null);
  assert.equal(ctx.lerTokenGoogleDriveSessao(uid, 'outro-sub'), null);

  // Token expirado (menos de 60s restantes) deve ser invalidado
  ctx.guardarTokenGoogleDriveSessao({
    uid,
    googleSub,
    accessToken: 'token-expirado',
    expiresAt: agora + 30 * 1000,
  });
  assert.equal(ctx.lerTokenGoogleDriveSessao(uid, googleSub), null, 'Token prestes a expirar deve ser descartado');

  // Limpeza explícita de sessão
  ctx.guardarTokenGoogleDriveSessao({
    uid,
    googleSub,
    accessToken: 'token-valido-novo',
    expiresAt: agora + 3600 * 1000,
  });
  ctx.limparTokenGoogleDriveSessao(uid, googleSub);
  assert.equal(ctx.lerTokenGoogleDriveSessao(uid, googleSub), null, 'Token deve ter sido removido');
});

test('aguardarRetornoOAuthGoogleDrive valida origem exata do Worker e estrutura da mensagem', async () => {
  const ctx = carregarContextoMain();
  vm.runInContext(mainSource, ctx);

  let messageListener = null;
  ctx.window.addEventListener = (tipo, fn) => {
    if (tipo === 'message') messageListener = fn;
  };
  ctx.window.removeEventListener = (tipo, fn) => {
    if (tipo === 'message') messageListener = null;
  };

  const fakePopup = { closed: false, close() { this.closed = true; } };
  const retornoPromise = ctx.aguardarRetornoOAuthGoogleDrive(fakePopup);

  assert.ok(typeof messageListener === 'function', 'Listener de postMessage deve ser registrado');

  // Mensagem de origem desconhecida/maliciosa deve ser ignorada
  messageListener({ origin: 'https://site-malicioso.com', data: { type: 'reciclapac-drive-oauth', status: 'success' } });
  assert.equal(fakePopup.closed, false, 'Popup não deve fechar com mensagem de origem inválida');

  // Mensagem com tipo diferente deve ser ignorada
  messageListener({ origin: 'https://reciclapac-drive-auth.reciclapac.workers.dev', data: { type: 'outro-tipo', status: 'success' } });
  assert.equal(fakePopup.closed, false, 'Popup não deve fechar com mensagem de outro tipo');

  // Mensagem legítima do Worker deve resolver
  messageListener({
    origin: 'https://reciclapac-drive-auth.reciclapac.workers.dev',
    data: { type: 'reciclapac-drive-oauth', status: 'success', message: 'Conta vinculada.' },
  });

  const resultado = await retornoPromise;
  assert.equal(resultado.status, 'success');
  assert.equal(resultado.message, 'Conta vinculada.');
  assert.equal(fakePopup.closed, true, 'Popup deve ser fechado após a resolução');
});

test('aguardarRetornoOAuthGoogleDrive rejeita erro retornado pelo Worker', async () => {
  const ctx = carregarContextoMain();
  vm.runInContext(mainSource, ctx);

  let messageListener = null;
  ctx.window.addEventListener = (tipo, fn) => {
    if (tipo === 'message') messageListener = fn;
  };
  ctx.window.removeEventListener = () => {};

  const fakePopup = { closed: false, close() { this.closed = true; } };
  const retornoPromise = ctx.aguardarRetornoOAuthGoogleDrive(fakePopup);

  messageListener({
    origin: 'https://reciclapac-drive-auth.reciclapac.workers.dev',
    data: { type: 'reciclapac-drive-oauth', status: 'error', message: 'Autorização cancelada.' },
  });

  await assert.rejects(retornoPromise, /Autorização cancelada\./);
  assert.equal(fakePopup.closed, true);
});

test('fluxos de backup continuam preservados (validação e formato de backup JSON)', () => {
  const ctx = carregarContextoMain();
  vm.runInContext(mainSource, ctx);

  const backupValido = {
    formato: 'reciclar-apac-backup',
    versao: 1,
    criadoEm: new Date().toISOString(),
    dados: {
      colaboradores: [{ id: 'colab-1', nome: 'Pessoa Teste' }],
      entregas: [],
      transferencias: [],
      trocas: [],
      campanhas: [{
        id: 'c1',
        nome: 'Campanha 2026',
        mesInicio: 1,
        anoInicio: 2026,
        status: 'ativa',
        metasDefault: {},
        metasHistorico: {},
      }],
      config: {
        painelPeriodo: { tipo: 'ano', ano: 2026 },
      },
    },
  };

  const resultado = ctx.validarBackupJSON(backupValido);
  assert.equal(resultado.ok, true);

  // Backup corrompido deve ser rejeitado
  const backupInvalido = { formato: 'outro', versao: 1 };
  const resultadoInvalido = ctx.validarBackupJSON(backupInvalido);
  assert.equal(resultadoInvalido.ok, false);
});

test('obterTokenVinculadoGoogleDrive obtém token do Worker com Bearer auth e armazena em cache', async () => {
  let fetchChamado = null;
  const mockFetch = async (url, opts) => {
    fetchChamado = { url, opts };
    return {
      ok: true,
      status: 200,
      json: async () => ({ accessToken: 'token-gerado-pelo-worker', expiresIn: 3600 }),
    };
  };

  const ctx = carregarContextoMain({ fetch: mockFetch });
  vm.runInContext(mainSource, ctx);

  ctx.STATE.isAdmin = true;
  ctx.STATE.authUser = { uid: 'admin-1', getIdToken: async () => 'firebase-id-token-xyz' };
  ctx.STATE.googleDriveLink = { googleSub: 'google-sub-456', email: 'admin@reciclapac.com.br' };

  const token = await ctx.obterTokenVinculadoGoogleDrive();

  assert.equal(token, 'token-gerado-pelo-worker');
  assert.equal(fetchChamado.url, 'https://reciclapac-drive-auth.reciclapac.workers.dev/token');
  assert.equal(fetchChamado.opts.method, 'POST');
  assert.equal(fetchChamado.opts.headers.Authorization, 'Bearer firebase-id-token-xyz');

  // Segunda chamada deve usar o cache sem fazer fetch novamente
  fetchChamado = null;
  const tokenCache = await ctx.obterTokenVinculadoGoogleDrive();
  assert.equal(tokenCache, 'token-gerado-pelo-worker');
  assert.equal(fetchChamado, null, 'Não deve chamar fetch quando o cache estiver válido');
});

test('requisicaoGoogleDrive limpa o token em cache se receber 401 (token expirado ou revogado)', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: { message: 'Invalid Credentials' } }),
  });

  const ctx = carregarContextoMain({ fetch: mockFetch });
  vm.runInContext(mainSource, ctx);

  const uid = 'admin-1';
  const googleSub = 'sub-1';
  ctx.guardarTokenGoogleDriveSessao({
    uid,
    googleSub,
    accessToken: 'token-invalido',
    expiresAt: Date.now() + 3600 * 1000,
  });

  await assert.rejects(
    ctx.requisicaoGoogleDrive('token-invalido', 'https://www.googleapis.com/drive/v3/files'),
    /Invalid Credentials/
  );

  assert.equal(ctx.lerTokenGoogleDriveSessao(uid, googleSub), null, 'Token deve ter sido expurgado da sessão');
});

test('confirmarDesvincularGoogleDrive invoca DELETE /link no Worker e limpa vínculo local', async () => {
  let deleteChamado = null;
  const mockFetch = async (url, opts) => {
    deleteChamado = { url, opts };
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    };
  };

  const ctx = carregarContextoMain({
    fetch: mockFetch,
    fecharModal: () => {},
  });
  vm.runInContext(mainSource, ctx);

  ctx.STATE.isAdmin = true;
  ctx.STATE.authUser = { uid: 'admin-1', getIdToken: async () => 'id-token-admin' };
  ctx.STATE.googleDriveLink = { googleSub: 'sub-789', email: 'admin@reciclapac.com.br' };
  ctx.guardarTokenGoogleDriveSessao({
    uid: 'admin-1',
    googleSub: 'sub-789',
    accessToken: 'token-abc',
    expiresAt: Date.now() + 3600 * 1000,
  });

  await ctx.confirmarDesvincularGoogleDrive();

  assert.ok(deleteChamado, 'DELETE /link deve ter sido chamado');
  assert.equal(deleteChamado.url, 'https://reciclapac-drive-auth.reciclapac.workers.dev/link');
  assert.equal(deleteChamado.opts.method, 'DELETE');
  assert.equal(deleteChamado.opts.headers.Authorization, 'Bearer id-token-admin');
  assert.equal(ctx.STATE.googleDriveLink, null, 'Vínculo deve ser limpo do STATE');
  assert.equal(ctx.lerTokenGoogleDriveSessao('admin-1', 'sub-789'), null, 'Token deve ser limpo do cache');
});

test('atualizações de estado do backup no Google Drive atualizam o card diretamente sem chamar renderApp', () => {
  let renderAppChamado = 0;
  let seletoresAprimoradosCom = null;
  const mockCard = {
    nodeType: 1,
    innerHTML: '',
  };

  const ctx = carregarContextoMain({
    renderApp: () => { renderAppChamado++; },
    aprimorarSeletoresNativos: el => { seletoresAprimoradosCom = el; },
    document: {
      getElementById: id => (id === 'cardBackupGoogleDrive' ? mockCard : null),
      querySelector: () => mockCard,
    },
    escapeHtml: s => String(s || ''),
    icon: () => '<svg></svg>',
  });
  vm.runInContext(mainSource, ctx);

  ctx.STATE.googleDriveLink = { email: 'admin@reciclapac.com.br' };
  ctx.definirEstadoGoogleDrive({ ocupado: true, status: 'Buscando backups no Google Drive...' });

  assert.equal(renderAppChamado, 0, 'renderApp não deve ser chamado para evitar flicker e salto de rolagem');
  assert.ok(mockCard.innerHTML.includes('Buscando backups no Google Drive...'), 'O conteúdo do card deve conter a mensagem de status');
  assert.ok(mockCard.innerHTML.includes('disabled'), 'Os botões de ação devem refletir o estado ocupado');
  assert.equal(seletoresAprimoradosCom, mockCard, 'aprimorarSeletoresNativos deve ser chamado para o card isolado');
});

