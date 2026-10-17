const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} = require('firebase/firestore');

const PROJECT_ID = 'demo-reciclapac';
const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 8080;
const FICHAS = 'reciclar-apac-fichas';
const RULES_PATH = path.resolve(__dirname, '..', 'firestore.rules');

let testEnv;
const firestoreByContext = new WeakMap();

function firestore(context) {
  if (!firestoreByContext.has(context)) {
    firestoreByContext.set(context, context.firestore());
  }
  return firestoreByContext.get(context);
}

function fichaRef(context, id = '123456') {
  return doc(firestore(context), FICHAS, id);
}

function fichaInicial(id = '123456') {
  return {
    id,
    status: 'emitida',
    colaboradorId: 'colaborador-1',
    colaboradorNome: 'Colaborador Teste',
    campanhaId: 'campanha-1',
    loteId: 'lote-1',
    emitidaPor: 'admin-1',
    emitidaEm: serverTimestamp(),
  };
}

function payloadUtilizada() {
  return {
    status: 'utilizada',
    utilizadaEm: serverTimestamp(),
    utilizadaPor: 'operador-1',
    entregaId: 'entrega-1',
    quantidades: [1, 2, 3, 4, 5, 6],
    total: 21,
    data: '2026-10-15',
  };
}

async function seedRole(uid, role) {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(firestore(context), 'reciclar-apac-roles', uid), { role });
  });
}

async function seedFicha(id = '123456') {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(fichaRef(context, id), {
      ...fichaInicial(id),
      emitidaEm: new Date('2026-10-15T12:00:00.000Z'),
    });
  });
}

async function seedMetaCampaign(metasDefault = { papel: 5 }) {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(
      doc(firestore(context), 'reciclar-apac', 'campanhas', 'records', 'campanha-1'),
      { id: 'campanha-1', metasDefault },
    );
  });
}

function metaSnapshot(metas = { papel: 5 }, id = 'campanha-1-2026-10', chave = '2026-10') {
  return {
    id,
    campanhaId: 'campanha-1',
    chave,
    metas,
  };
}

async function seedMetaSnapshot() {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(
      doc(firestore(context), 'reciclar-apac', 'metas', 'records', 'campanha-1-2026-10'),
      metaSnapshot(),
    );
  });
}

test.before(async () => {
  if (!fs.existsSync(RULES_PATH)) {
    throw new Error(`Arquivo de regras local ausente: ${RULES_PATH}`);
  }

  const rules = fs.readFileSync(RULES_PATH, 'utf8');
  if (!rules.trim()) throw new Error('firestore.rules está vazio.');

  const expectedEmulator = `${EMULATOR_HOST}:${EMULATOR_PORT}`;
  if (process.env.FIRESTORE_EMULATOR_HOST !== expectedEmulator) {
    throw new Error(
      `Execução recusada: FIRESTORE_EMULATOR_HOST deve ser ${expectedEmulator}; ` +
      `valor atual: ${process.env.FIRESTORE_EMULATOR_HOST || '(ausente)'}.`,
    );
  }
  if (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== PROJECT_ID) {
    throw new Error(
      `Execução recusada: GCLOUD_PROJECT deve ser ${PROJECT_ID}; ` +
      `valor atual: ${process.env.GCLOUD_PROJECT}.`,
    );
  }

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: EMULATOR_HOST,
      port: EMULATOR_PORT,
      rules,
    },
  });
});

test.after(async () => {
  if (testEnv) await testEnv.cleanup();
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedRole('admin-1', 'admin');
  await seedRole('operador-1', 'operator');
});

test('leitura de ficha: admin e operador podem ler; sem papel e anônimo são negados', async () => {
  await seedFicha();
  const admin = testEnv.authenticatedContext('admin-1');
  const operador = testEnv.authenticatedContext('operador-1');
  const semPapel = testEnv.authenticatedContext('sem-papel');
  const anonimo = testEnv.unauthenticatedContext();

  await assertSucceeds(getDoc(fichaRef(admin)));
  await assertSucceeds(getDoc(fichaRef(operador)));
  await assertFails(getDoc(fichaRef(semPapel)));
  await assertFails(getDoc(fichaRef(anonimo)));
});

test('listagem de fichas: admin e operador podem listar; sem papel e anônimo são negados', async () => {
  await seedFicha();
  const admin = testEnv.authenticatedContext('admin-1');
  const operador = testEnv.authenticatedContext('operador-1');
  const semPapel = testEnv.authenticatedContext('sem-papel');
  const anonimo = testEnv.unauthenticatedContext();

  await assertSucceeds(getDocs(collection(firestore(admin), FICHAS)));
  await assertSucceeds(getDocs(collection(firestore(operador), FICHAS)));
  await assertFails(getDocs(collection(firestore(semPapel), FICHAS)));
  await assertFails(getDocs(collection(firestore(anonimo), FICHAS)));
});

test('criação: somente admin cria uma ficha válida', async () => {
  const admin = testEnv.authenticatedContext('admin-1');
  const operador = testEnv.authenticatedContext('operador-1');
  const semPapel = testEnv.authenticatedContext('sem-papel');
  const anonimo = testEnv.unauthenticatedContext();

  const fichaAdmin = fichaInicial('123455');
  const fichaOperador = { ...fichaInicial('234567'), emitidaPor: 'operador-1' };
  const fichaSemPapel = { ...fichaInicial('345678'), emitidaPor: 'sem-papel' };
  const fichaAnonima = fichaInicial('456780');

  await assertSucceeds(setDoc(fichaRef(admin, '123455'), fichaAdmin));
  await assertFails(setDoc(fichaRef(operador, '234567'), fichaOperador));
  await assertFails(setDoc(fichaRef(semPapel, '345678'), fichaSemPapel));
  await assertFails(setDoc(fichaRef(anonimo, '456780'), fichaAnonima));
});

test('criação: rejeita ID malformado, ID divergente, campos extras ou obrigatórios ausentes', async () => {
  const admin = testEnv.authenticatedContext('admin-1');

  await assertFails(setDoc(fichaRef(admin, '12A456'), fichaInicial('12A456')));
  await assertFails(setDoc(fichaRef(admin, '12345'), fichaInicial('12345')));
  await assertFails(setDoc(fichaRef(admin, '123457'), fichaInicial('123456')));
  await assertFails(setDoc(fichaRef(admin, '123456'), {
    ...fichaInicial(),
    campoExtra: true,
  }));
  const semCampo = fichaInicial();
  delete semCampo.loteId;
  await assertFails(setDoc(fichaRef(admin), semCampo));
});

test('criação: não reutiliza o ID de um documento existente', async () => {
  await seedFicha();
  const admin = testEnv.authenticatedContext('admin-1');

  await assertFails(setDoc(fichaRef(admin), fichaInicial()));
});

test.todo('PENDENTE DE DECISÃO DE PRODUTO: entregaId deve apontar para uma entrega existente?');

test('criação: valida o dígito Luhn, inclusive com zero à esquerda', async () => {
  const admin = testEnv.authenticatedContext('admin-1');

  await assertSucceeds(setDoc(fichaRef(admin, '000000'), fichaInicial('000000')));
  await assertSucceeds(setDoc(fichaRef(admin, '000018'), fichaInicial('000018')));
  await assertFails(setDoc(fichaRef(admin, '000001'), fichaInicial('000001')));
  await assertFails(setDoc(fichaRef(admin, '123456'), fichaInicial('123456')));
});

test('atualização de uso: admin e operador podem consumir uma ficha emitida uma vez', async () => {
  await seedFicha();
  const admin = testEnv.authenticatedContext('admin-1');
  const operador = testEnv.authenticatedContext('operador-1');

  await assertSucceeds(updateDoc(fichaRef(operador), payloadUtilizada()));

  await seedFicha('234567');
  await assertSucceeds(updateDoc(fichaRef(admin, '234567'), {
    ...payloadUtilizada(),
    utilizadaPor: 'admin-1',
  }));
});

test('atualização de uso: sem papel e anônimo não podem consumir ficha', async () => {
  await seedFicha();
  const semPapel = testEnv.authenticatedContext('sem-papel');
  const anonimo = testEnv.unauthenticatedContext();

  await assertFails(updateDoc(fichaRef(semPapel), payloadUtilizada()));
  await assertFails(updateDoc(fichaRef(anonimo), payloadUtilizada()));
});

test('atualização: operador não pode alterar campos imutáveis nem adicionar campos', async () => {
  await seedFicha();
  const operador = testEnv.authenticatedContext('operador-1');

  const alteracoesImutaveis = [
    { id: '654321' },
    { colaboradorNome: 'Outro nome' },
    { campanhaId: 'outra-campanha' },
    { loteId: 'outro-lote' },
    { emitidaPor: 'outro-usuario' },
    { emitidaEm: new Date('2026-10-16T12:00:00.000Z') },
  ];
  await assertFails(updateDoc(fichaRef(operador), {
    ...payloadUtilizada(),
    colaboradorId: 'outro-colaborador',
  }));
  for (const alteracao of alteracoesImutaveis) {
    await assertFails(updateDoc(fichaRef(operador), {
      ...payloadUtilizada(),
      ...alteracao,
    }));
  }
  await assertFails(updateDoc(fichaRef(operador), {
    ...payloadUtilizada(),
    campoExtra: true,
  }));
});

test('atualização: rejeita adulteração dos metadados de utilização e cancelamento', async () => {
  const operador = testEnv.authenticatedContext('operador-1');
  const admin = testEnv.authenticatedContext('admin-1');

  await seedFicha();
  await assertFails(updateDoc(fichaRef(operador), {
    ...payloadUtilizada(),
    utilizadaPor: 'admin-1',
  }));

  await seedFicha('234567');
  await assertFails(updateDoc(fichaRef(admin, '234567'), {
    status: 'cancelada',
    canceladaEm: serverTimestamp(),
    canceladaPor: 'operador-1',
  }));

  await seedFicha('345678');
  await assertFails(updateDoc(fichaRef(admin, '345678'), {
    status: 'cancelada',
    canceladaEm: new Date('2026-10-16T12:00:00.000Z'),
    canceladaPor: 'admin-1',
  }));
});

test('atualização de uso: rejeita transição inválida e dados fora dos limites', async () => {
  const admin = testEnv.authenticatedContext('admin-1');

  await seedFicha();
  await assertFails(updateDoc(fichaRef(admin), { status: 'desconhecida' }));

  await seedFicha('234567');
  await assertFails(updateDoc(fichaRef(admin, '234567'), {
    ...payloadUtilizada(),
    quantidades: [1, 2, 3, 4, 5],
  }));

  await seedFicha('345678');
  await assertFails(updateDoc(fichaRef(admin, '345678'), {
    ...payloadUtilizada(),
    quantidades: [1, 2, 3, 4, 5, 1000],
  }));

  await seedFicha('456789');
  await assertFails(updateDoc(fichaRef(admin, '456789'), {
    ...payloadUtilizada(),
    total: 5995,
  }));
});

test('atualização de uso: total deve ser a soma exata das seis quantidades', async () => {
  const operador = testEnv.authenticatedContext('operador-1');

  await seedFicha();
  await assertSucceeds(updateDoc(fichaRef(operador), payloadUtilizada()));

  await seedFicha('234567');
  await assertFails(updateDoc(fichaRef(operador, '234567'), {
    ...payloadUtilizada(),
    total: 20,
  }));

  await seedFicha('345678');
  await assertFails(updateDoc(fichaRef(operador, '345678'), {
    ...payloadUtilizada(),
    total: 22,
  }));

  await seedFicha('456789');
  await assertSucceeds(updateDoc(fichaRef(operador, '456789'), {
    ...payloadUtilizada(),
    quantidades: [0, 0, 0, 0, 0, 0],
    total: 0,
  }));

  await seedFicha('567890');
  await assertSucceeds(updateDoc(fichaRef(operador, '567890'), {
    ...payloadUtilizada(),
    quantidades: [999, 999, 999, 999, 999, 999],
    total: 5994,
  }));
});

test('atualização de uso: data deve usar o formato ISO YYYY-MM-DD', async () => {
  const operador = testEnv.authenticatedContext('operador-1');

  await seedFicha();
  await assertFails(updateDoc(fichaRef(operador), {
    ...payloadUtilizada(),
    data: '15/10/2026',
  }));

  await seedFicha('234567');
  await assertFails(updateDoc(fichaRef(operador, '234567'), {
    ...payloadUtilizada(),
    data: '2026-13-15',
  }));

  await seedFicha('345678');
  await assertFails(updateDoc(fichaRef(operador, '345678'), {
    ...payloadUtilizada(),
    data: '2026-10-32',
  }));
});

test('cancelamento: somente admin cancela ficha emitida com metadados da requisição', async () => {
  const admin = testEnv.authenticatedContext('admin-1');
  const operador = testEnv.authenticatedContext('operador-1');
  const semPapel = testEnv.authenticatedContext('sem-papel');
  const anonimo = testEnv.unauthenticatedContext();
  const cancelamento = {
    status: 'cancelada',
    canceladaEm: serverTimestamp(),
    canceladaPor: 'admin-1',
  };

  await seedFicha();
  await assertSucceeds(updateDoc(fichaRef(admin), cancelamento));

  await seedFicha('234567');
  await assertFails(updateDoc(fichaRef(operador, '234567'), {
    ...cancelamento,
    canceladaPor: 'operador-1',
  }));

  await seedFicha('345678');
  await assertFails(updateDoc(fichaRef(semPapel, '345678'), cancelamento));

  await seedFicha('456789');
  await assertFails(updateDoc(fichaRef(anonimo, '456789'), cancelamento));
});

test('estados terminais: ficha utilizada ou cancelada não pode ser reutilizada nem cancelada', async () => {
  const admin = testEnv.authenticatedContext('admin-1');
  const operador = testEnv.authenticatedContext('operador-1');

  await seedFicha();
  await assertSucceeds(updateDoc(fichaRef(operador), payloadUtilizada()));
  await assertFails(updateDoc(fichaRef(admin), {
    status: 'cancelada',
    canceladaEm: serverTimestamp(),
    canceladaPor: 'admin-1',
  }));
  await assertFails(updateDoc(fichaRef(operador), payloadUtilizada()));

  await seedFicha('234567');
  await assertSucceeds(updateDoc(fichaRef(admin, '234567'), {
    status: 'cancelada',
    canceladaEm: serverTimestamp(),
    canceladaPor: 'admin-1',
  }));
  await assertFails(updateDoc(fichaRef(admin, '234567'), {
    ...payloadUtilizada(),
    utilizadaPor: 'admin-1',
  }));
  await assertFails(updateDoc(fichaRef(admin, '234567'), {
    status: 'cancelada',
    canceladaEm: serverTimestamp(),
    canceladaPor: 'admin-1',
  }));
});

test('exclusão: nenhum perfil cliente pode excluir ficha', async () => {
  await seedFicha();
  const admin = testEnv.authenticatedContext('admin-1');
  const operador = testEnv.authenticatedContext('operador-1');
  const semPapel = testEnv.authenticatedContext('sem-papel');
  const anonimo = testEnv.unauthenticatedContext();

  await assertFails(deleteDoc(fichaRef(admin)));
  await assertFails(deleteDoc(fichaRef(operador)));
  await assertFails(deleteDoc(fichaRef(semPapel)));
  await assertFails(deleteDoc(fichaRef(anonimo)));
});

test('metas: operador cria snapshot válido e não cria snapshot divergente', async () => {
  const operador = testEnv.authenticatedContext('operador-1');
  await seedMetaCampaign();

  await assertSucceeds(setDoc(
    doc(firestore(operador), 'reciclar-apac', 'metas', 'records', 'campanha-1-2026-10'),
    metaSnapshot(),
  ));

  await seedMetaCampaign({ papel: 10 });
  await assertFails(setDoc(
    doc(firestore(operador), 'reciclar-apac', 'metas', 'records', 'campanha-1-2026-11'),
    metaSnapshot({ papel: 5 }, 'campanha-1-2026-11', '2026-11'),
  ));
});

test('metas: admin e operador leem; usuário sem papel e anônimo são negados', async () => {
  await seedMetaCampaign();
  await seedMetaSnapshot();
  const admin = testEnv.authenticatedContext('admin-1');
  const operador = testEnv.authenticatedContext('operador-1');
  const semPapel = testEnv.authenticatedContext('sem-papel');
  const anonimo = testEnv.unauthenticatedContext();
  const metaRef = context => doc(
    firestore(context), 'reciclar-apac', 'metas', 'records', 'campanha-1-2026-10',
  );

  await assertSucceeds(getDoc(metaRef(admin)));
  await assertSucceeds(getDoc(metaRef(operador)));
  await assertFails(getDoc(metaRef(semPapel)));
  await assertFails(getDoc(metaRef(anonimo)));
});

test('metas: operador não atualiza nem exclui; admin mantém esses privilégios', async () => {
  await seedMetaCampaign();
  await seedMetaSnapshot();
  const operador = testEnv.authenticatedContext('operador-1');
  const admin = testEnv.authenticatedContext('admin-1');
  const metaRefOperador = doc(firestore(operador), 'reciclar-apac', 'metas', 'records', 'campanha-1-2026-10');
  const metaRefAdmin = doc(firestore(admin), 'reciclar-apac', 'metas', 'records', 'campanha-1-2026-10');

  await assertFails(updateDoc(metaRefOperador, { metas: { papel: 6 } }));
  await assertFails(deleteDoc(metaRefOperador));
  await assertSucceeds(updateDoc(metaRefAdmin, { metas: { papel: 6 } }));
  await assertSucceeds(deleteDoc(metaRefAdmin));
});
