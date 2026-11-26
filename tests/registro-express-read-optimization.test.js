const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'registro-express.js'), 'utf8');
const start = source.indexOf('function incorporarEntregasExpressNoEstado(entregas) {');
const end = source.indexOf('\nfunction quantidadesFichaValidas', start);
assert.ok(start >= 0 && end > start, 'helper de atualização local deve existir');
const helper = source.slice(start, end);

function harness({ mode = 'firestore', baseline = [], state = [] } = {}) {
  const map = new Map(baseline.map(item => [item.id, JSON.stringify(item)]));
  const sandbox = {
    STORAGE_MODE: mode,
    FIRESTORE_BASELINES: new Map([['entregas', map]]),
    STATE: { entregas: structuredClone(state) },
    serializarEstavel: JSON.stringify,
  };
  vm.createContext(sandbox);
  new vm.Script(helper).runInContext(sandbox);
  return { run: items => sandbox.incorporarEntregasExpressNoEstado(items), sandbox, map };
}

test('Registro Express incorpora entregas novas sem reler a coleção', () => {
  const anteriores = [{ id: 'antiga', total: 2 }];
  const novas = [{ id: 'ficha-1-papelao', total: 3 }, { id: 'ficha-1-pet', total: 1 }];
  const h = harness({ baseline: anteriores, state: anteriores });
  assert.equal(h.run(novas), true);
  assert.deepEqual(h.sandbox.STATE.entregas.map(item => item.id), ['antiga', 'ficha-1-papelao', 'ficha-1-pet']);
  assert.equal(h.map.get('ficha-1-papelao'), JSON.stringify(novas[0]));
  assert.equal(h.map.get('ficha-1-pet'), JSON.stringify(novas[1]));
});

test('Registro Express não duplica IDs já presentes no estado', () => {
  const atual = [{ id: 'existente', total: 2 }];
  const h = harness({ baseline: atual, state: atual });
  assert.equal(h.run([{ id: 'existente', total: 99 }]), true);
  assert.deepEqual(h.sandbox.STATE.entregas, atual);
  assert.equal(h.map.get('existente'), JSON.stringify(atual[0]));
});

test('sem baseline do Firestore mantém fallback para leitura segura', () => {
  const h = harness({ baseline: [], state: [] });
  h.sandbox.FIRESTORE_BASELINES.delete('entregas');
  assert.equal(h.run([{ id: 'nova', total: 1 }]), false);
  assert.deepEqual(h.sandbox.STATE.entregas, []);
});

test('modo não-Firestore atualiza estado local sem exigir baseline', () => {
  const h = harness({ mode: 'local', baseline: [], state: [] });
  h.sandbox.FIRESTORE_BASELINES.delete('entregas');
  assert.equal(h.run([{ id: 'nova', total: 1 }]), true);
  assert.deepEqual(h.sandbox.STATE.entregas.map(item => item.id), ['nova']);
});
