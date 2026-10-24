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
  writeBatch,
} = require('firebase/firestore');

const PROJECT_ID = 'demo-reciclapac';
const HOST = '127.0.0.1';
const PORT = 8080;
const RULES_PATH = path.resolve(__dirname, '..', 'firestore.rules');
const REQUESTS = 'reciclar-apac-transfer-requests';
const RECORDS = ['reciclar-apac', 'transferencias', 'records'];

let env;
const firestoreByContext = new WeakMap();
const db = context => {
  if (!firestoreByContext.has(context)) firestoreByContext.set(context, context.firestore());
  return firestoreByContext.get(context);
};
const requestRef = (context, id = 'pedido-1') => doc(db(context), REQUESTS, id);
const transferRef = (context, id) => doc(db(context), ...RECORDS, id);

function requestPayload(id = 'pedido-1', overrides = {}) {
  return {
    id,
    campanhaId: 'campanha-1',
    campanhaNome: 'Campanha teste',
    colaboradorOrigemId: 'ana',
    colaboradorOrigemNome: 'Ana',
    categoriaOrigem: 'papelao',
    materialOrigemNome: 'Papelão',
    quantidadeOrigem: 10,
    colaboradorDestinoId: 'bia',
    colaboradorDestinoNome: 'Bia',
    categoriaDestino: 'latinhas',
    materialDestinoNome: 'Latinhas',
    quantidadeDestino: 5,
    solicitadoEm: serverTimestamp(),
    status: 'pendente',
    senha: '',
    ...overrides,
  };
}

async function seedRole(uid, role) {
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(db(context), 'reciclar-apac-roles', uid), { role });
  });
}

async function seedRequest(id = 'pedido-1') {
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(db(context), REQUESTS, id), {
      ...requestPayload(id),
      solicitadoEm: new Date('2026-10-23T12:00:00.000Z'),
    });
  });
}

test.before(async () => {
  const rules = fs.readFileSync(RULES_PATH, 'utf8');
  assert.ok(rules.trim(), 'firestore.rules não pode estar vazio');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, `${HOST}:${PORT}`,
    'estes testes só podem rodar contra o Firestore Emulator');
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: HOST, port: PORT, rules },
  });
});

test.after(async () => {
  if (env) await env.cleanup();
});

test.beforeEach(async () => {
  await env.clearFirestore();
  await seedRole('admin-1', 'admin');
  await seedRole('operator-1', 'operator');
});

test('troca pública: anônimo cria solicitação válida e não pode listar nem ler solicitações', async () => {
  const anon = env.unauthenticatedContext();
  await assertSucceeds(setDoc(requestRef(anon), requestPayload()));
  await assertFails(getDoc(requestRef(anon)));
  await assertFails(getDocs(collection(db(anon), REQUESTS)));
});

test('troca pública: rejeita dados inválidos, campos extras e criação autenticada', async () => {
  const anon = env.unauthenticatedContext();
  const admin = env.authenticatedContext('admin-1');
  await assertFails(setDoc(requestRef(anon, 'qtd-zero'), requestPayload('qtd-zero', { quantidadeOrigem: 0 })));
  await assertFails(setDoc(requestRef(anon, 'mesma-categoria'), requestPayload('mesma-categoria', { categoriaDestino: 'papelao' })));
  await assertFails(setDoc(requestRef(anon, 'mesma-pessoa'), requestPayload('mesma-pessoa', { colaboradorDestinoId: 'ana' })));
  await assertFails(setDoc(requestRef(anon, 'campo-extra'), requestPayload('campo-extra', { administrador: true })));
  await assertFails(setDoc(requestRef(admin, 'autenticado'), requestPayload('autenticado')));
});


test('troca pública: aprovação aceita par válido e grava transferências e solicitação atomicamente', async () => {
  await seedRequest();
  const admin = env.authenticatedContext('admin-1');
  const request = requestRef(admin);
  const motivo = 'Troca aprovada a partir da solicitação pública pedido-1';
  const first = {
    id: 'transf-valida-1', campanhaId: 'campanha-1', data: '2026-10-23',
    colaboradorOrigemId: 'ana', categoriaOrigem: 'papelao',
    colaboradorDestinoId: 'bia', categoriaDestino: 'papelao',
    quantidade: 10, motivo,
  };
  const second = {
    id: 'transf-valida-2', campanhaId: 'campanha-1', data: '2026-10-23',
    colaboradorOrigemId: 'bia', categoriaOrigem: 'latinhas',
    colaboradorDestinoId: 'ana', categoriaDestino: 'latinhas',
    quantidade: 5, motivo,
  };
  const approval = {
    status: 'aprovada',
    decididoEm: '2026-10-23T12:00:00.000Z',
    decididoPor: 'admin-1',
    transferenciaIds: [first.id, second.id],
  };

  const batch = writeBatch(db(admin));
  batch.set(transferRef(admin, first.id), first);
  batch.set(transferRef(admin, second.id), second);
  batch.update(request, approval);

  await assertSucceeds(batch.commit());
  assert.equal((await getDoc(transferRef(admin, first.id))).exists(), true);
  assert.equal((await getDoc(transferRef(admin, second.id))).exists(), true);
  const savedRequest = await getDoc(request);
  assert.equal(savedRequest.data().status, 'aprovada');
  assert.deepEqual(savedRequest.data().transferenciaIds, [first.id, second.id]);
});

test('troca pública: aprovação rejeita par com categoria de destino inconsistente', async () => {
  await seedRequest();
  const admin = env.authenticatedContext('admin-1');
  const operator = env.authenticatedContext('operator-1');
  const anon = env.unauthenticatedContext();
  const request = requestRef(admin);
  const first = {
    id: 'transf-1', campanhaId: 'campanha-1', data: '2026-10-23',
    colaboradorOrigemId: 'ana', categoriaOrigem: 'papelao',
    colaboradorDestinoId: 'bia', categoriaDestino: 'papelao',
    quantidade: 10, motivo: 'Troca aprovada a partir da solicitação pública pedido-1',
  };
  const second = {
    id: 'transf-2', campanhaId: 'campanha-1', data: '2026-10-23',
    colaboradorOrigemId: 'bia', categoriaOrigem: 'latinhas',
    colaboradorDestinoId: 'ana', categoriaDestino: 'latinhas',
    quantidade: 5, motivo: first.motivo,
  };
  const approval = {
    status: 'aprovada',
    decididoEm: '2026-10-23T12:00:00.000Z',
    decididoPor: 'admin-1',
    transferenciaIds: ['transf-1', 'transf-2'],
  };

  await assertFails(updateDoc(request, approval));
  await assertFails(updateDoc(requestRef(operator), approval));
  await assertFails(deleteDoc(requestRef(admin)));
  await assertFails(setDoc(requestRef(anon, 'anotacao'), requestPayload('anotacao', { status: 'aprovada' })));

  const invalidBatch = writeBatch(db(admin));
  invalidBatch.set(transferRef(admin, 'transf-1'), first);
  invalidBatch.set(transferRef(admin, 'transf-2'), { ...second, categoriaDestino: 'papelao' });
  invalidBatch.update(request, approval);
  await assertFails(invalidBatch.commit());

  assert.equal((await getDoc(transferRef(admin, 'transf-1'))).exists(), false);
  assert.equal((await getDoc(transferRef(admin, 'transf-2'))).exists(), false);
  assert.equal((await getDoc(request)).data().status, 'pendente');
});
