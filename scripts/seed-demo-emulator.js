const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { doc, setDoc } = require('firebase/firestore');

const projectId = 'demo-reciclapac';
const authEmulator = 'http://127.0.0.1:9099';
const firestoreEmulator = { host: '127.0.0.1', port: 8080 };
const demoSuffix = crypto.randomBytes(8).toString('hex');
const email = `express-admin-${demoSuffix}@reciclapac.local`;
const password = crypto.randomBytes(18).toString('hex');

async function obterUsuarioDemo() {
  const response = await fetch(
    `${authEmulator}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Auth Emulator respondeu ${response.status}: ${result.error?.message || 'erro desconhecido'}`);
  }
  return result;
}

async function main() {
  const account = await obterUsuarioDemo();
  const rules = fs.readFileSync(path.resolve(__dirname, '..', 'firestore.rules'), 'utf8');
  const testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: { ...firestoreEmulator, rules },
  });

  try {
    await testEnvironment.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, 'reciclar-apac-roles', account.localId), { role: 'admin' });
      await setDoc(doc(db, 'reciclar-apac', 'campanhas', 'records', 'campanha-1'), {
        id: 'campanha-1',
        nome: 'Campanha demonstração',
        anoInicio: 2026,
        mesInicio: 1,
        anoFim: 2026,
        mesFim: 12,
        status: 'ativa',
        metasDefault: { papel: 5, plastico: 5, metal: 5, vidro: 5, eletronico: 5, oleo: 5 },
        metasHistorico: {},
        nomesPersonalizados: {},
        materiaisExtras: [],
        categoriasDesativadas: [],
      });
      await setDoc(doc(db, 'reciclar-apac', 'colaboradores', 'records', 'colaborador-demo'), {
        id: 'colaborador-demo',
        nome: 'Colaborador Demonstração',
        setor: 'Teste',
        ativo: true,
        campanhaId: 'campanha-1',
      });
      await setDoc(doc(db, 'reciclar-apac-fichas', '123455'), {
        id: '123455',
        status: 'emitida',
        colaboradorId: 'colaborador-demo',
        colaboradorNome: 'Colaborador Demonstração',
        campanhaId: 'campanha-1',
        loteId: 'lote-demo',
        emitidaPor: account.localId,
        emitidaEm: new Date('2026-10-15T12:00:00.000Z'),
      });
    });
  } finally {
    await testEnvironment.cleanup();
  }

  console.log('Dados demo semeados somente nos emuladores locais.');
  console.log(`E-mail: ${email}`);
  console.log('Senha: [REDACTED]');
  console.log('Ficha disponível: 123455');
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
