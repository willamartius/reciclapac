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
  query,
  serverTimestamp,
  setDoc,
  runTransaction,
  updateDoc,
  where,
} = require('firebase/firestore');

const PROJECT_ID = 'demo-reciclapac';
const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 8080;
const FICHAS = 'reciclar-apac-fichas';
const ENTREGA_MATERIAIS = ['papelao', 'latinhas', 'embalagens', 'pet', 'ovos', 'latas'];
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
    await setDoc(doc(firestore(context), 'reciclar-apac', 'campanhas', 'records', 'campanha-1'), {
      id: 'campanha-1',
      anoInicio: 2026,
      mesInicio: 1,
      anoFim: 2026,
      mesFim: 12,
      metasDefault: { papel: 5 },
    });
    await setDoc(fichaRef(context, id), {
      ...fichaInicial(id),
      emitidaEm: new Date('2026-10-15T12:00:00.000Z'),
    });
  });
}

function payloadEntregasFicha(fichaId, quantidades, data = '2026-10-15', statusValidacao = 'pendente', overrides = {}) {
  const entregaGrupoId = `${fichaId}-papelao`;
  return ENTREGA_MATERIAIS.map((tipo, indice) => ({
    id: `${fichaId}-${tipo}`,
    criadoEm: 1000 + indice,
    data,
    colaboradorId: 'colaborador-1',
    tipo,
    quantidade: quantidades[indice],
    unidade: 'unidades',
    responsavelContagem: 'Responsável Teste',
    observacoes: 'Conferida',
    statusValidacao,
    campanhaId: 'campanha-1',
    fichaId,
    entregaGrupoId,
    ...overrides,
  }));
}

async function registrarFicha(context, fichaId, actor, quantidades, options = {}) {
  const db = firestore(context);
  const ficha = doc(db, FICHAS, fichaId);
  const entregas = payloadEntregasFicha(
    fichaId,
    quantidades,
    options.data || '2026-10-15',
    options.statusValidacao || 'pendente',
    options.deliveryOverrides || {},
  );
  const entregaRefs = entregas.map(item => doc(db, 'reciclar-apac', 'entregas', 'records', item.id));
  await runTransaction(db, async tx => {
    const fichaSnapshot = await tx.get(ficha);
    if (!fichaSnapshot.exists()) throw new Error('Ficha ausente');
    for (const ref of entregaRefs) await tx.get(ref);
    tx.update(ficha, {
      status: 'utilizada',
      utilizadaEm: serverTimestamp(),
      utilizadaPor: actor,
      entregaId: entregas[0].id,
      quantidades,
      total: quantidades.reduce((sum, value) => sum + value, 0),
      data: options.data || '2026-10-15',
      statusValidacao: options.statusValidacao || 'pendente',
      responsavelContagem: options.responsavelContagem || 'Responsável Teste',
      observacoes: options.observacoes || 'Conferida',
    });
    entregas.forEach((item, index) => {
      if (index !== options.omitIndex) tx.set(entregaRefs[index], item);
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

test.todo('PENDENTE: definir se entregaId precisa continuar apontando para uma entrega após exclusão individual por admin');

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

  await assertSucceeds(registrarFicha(operador, '123456', 'operador-1', [1, 2, 3, 4, 5, 6]));

  await seedFicha('234567');
  await assertSucceeds(registrarFicha(admin, '234567', 'admin-1', [1, 2, 3, 4, 5, 6]));
});

test('Registro Express: uma transação consome a ficha e cria seis entregas vinculadas', async () => {
  await seedFicha();
  const operador = testEnv.authenticatedContext('operador-1');
  const db = firestore(operador);
  const quantidades = [1, 2, 3, 4, 5, 6];

  await assertSucceeds(registrarFicha(operador, '123456', 'operador-1', quantidades, {
    statusValidacao: 'validado',
    responsavelContagem: 'Responsável Teste',
    observacoes: 'Conferida',
  }));

  const fichaSnapshot = await getDoc(doc(db, FICHAS, '123456'));
  const entregasSnapshot = await getDocs(query(
    collection(firestore(operador), 'reciclar-apac', 'entregas', 'records'),
    where('fichaId', '==', '123456'),
  ));
  assert.equal(fichaSnapshot.data().status, 'utilizada');
  assert.equal(fichaSnapshot.data().entregaId, '123456-papelao');
  assert.equal(fichaSnapshot.data().total, 21);
  assert.equal(entregasSnapshot.size, 6);
  assert.deepEqual(entregasSnapshot.docs.map(item => item.data()).sort((a, b) => a.id.localeCompare(b.id)).map(item => item.quantidade).sort((a, b) => a - b), quantidades);
  assert.ok(entregasSnapshot.docs.every(item => item.data().entregaGrupoId === '123456-papelao'));
  await assertFails(registrarFicha(operador, '123456', 'operador-1', quantidades));
});

test('Registro Express: regras rejeitam transação parcial e data fora do período da campanha sem gravar nada', async () => {
  const operador = testEnv.authenticatedContext('operador-1');
  await seedFicha();

  await assertFails(registrarFicha(operador, '123456', 'operador-1', [1, 2, 3, 4, 5, 6], { omitIndex: 5 }));
  let fichaSnapshot = await getDoc(fichaRef(operador));
  let entregasSnapshot = await getDocs(query(
    collection(firestore(operador), 'reciclar-apac', 'entregas', 'records'),
    where('fichaId', '==', '123456'),
  ));
  assert.equal(fichaSnapshot.data().status, 'emitida');
  assert.equal(entregasSnapshot.size, 0);

  await assertFails(registrarFicha(operador, '123456', 'operador-1', [1, 2, 3, 4, 5, 6], { data: '2027-01-15' }));
  fichaSnapshot = await getDoc(fichaRef(operador));
  entregasSnapshot = await getDocs(query(
    collection(firestore(operador), 'reciclar-apac', 'entregas', 'records'),
    where('fichaId', '==', '123456'),
  ));
  assert.equal(fichaSnapshot.data().status, 'emitida');
  assert.equal(entregasSnapshot.size, 0);
});

test('Registro Express: operador não pode criar entrega vinculada fora do consumo atômico da ficha', async () => {
  await seedFicha();
  const operador = testEnv.authenticatedContext('operador-1');
  const entrega = payloadEntregasFicha('123456', [1, 2, 3, 4, 5, 6])[0];

  await assertFails(setDoc(
    doc(firestore(operador), 'reciclar-apac', 'entregas', 'records', entrega.id),
    entrega,
  ));
  await assertFails(registrarFicha(operador, '123456', 'operador-1', [1, 2, 3, 4, 5, 6], {
    deliveryOverrides: { quantidade: 99 },
  }));

  assert.equal((await getDoc(fichaRef(operador))).data().status, 'emitida');
});

test('Registro Express: vínculo não pode ser removido por operador; edição e exclusão admin continuam disponíveis', async () => {
  await seedFicha();
  const operador = testEnv.authenticatedContext('operador-1');
  const admin = testEnv.authenticatedContext('admin-1');
  await assertSucceeds(registrarFicha(operador, '123456', 'operador-1', [1, 2, 3, 4, 5, 6]));

  const entregaOperador = doc(firestore(operador), 'reciclar-apac', 'entregas', 'records', '123456-papelao');
  await assertFails(updateDoc(entregaOperador, { fichaId: '654321' }));
  await assertSucceeds(updateDoc(entregaOperador, { quantidade: 7 }));

  const entregaAdmin = doc(firestore(admin), 'reciclar-apac', 'entregas', 'records', '123456-papelao');
  await assertSucceeds(deleteDoc(entregaAdmin));
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
  await assertSucceeds(registrarFicha(operador, '123456', 'operador-1', [1, 2, 3, 4, 5, 6]));

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
  await assertSucceeds(registrarFicha(operador, '456789', 'operador-1', [0, 0, 0, 0, 0, 0]));

  await seedFicha('567890');
  await assertSucceeds(registrarFicha(operador, '567890', 'operador-1', [999, 999, 999, 999, 999, 999]));
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
  await assertSucceeds(registrarFicha(operador, '123456', 'operador-1', [1, 2, 3, 4, 5, 6]));
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
  await assertFails(registrarFicha(admin, '234567', 'admin-1', [1, 2, 3, 4, 5, 6]));
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
