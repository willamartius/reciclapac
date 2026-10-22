const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'core.js'), 'utf8');
const start = source.indexOf('async function storageSet(key, value){');
const end = source.indexOf('\nasync function storageDeleteRecord', start);
assert.ok(start >= 0 && end > start, 'storageSet() deve existir antes de storageDeleteRecord().');
const fnSource = source.slice(start, end);
function stable(v){
  if(Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if(v && typeof v==='object') return `{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}
function harness({baseline=[], remote=[], fail=[]}={}){
  const reads=[], writes=[], syncs=[], batches=[]; let collectionReads=0;
  const remotes=new Map(remote.map(x=>[x.id,structuredClone(x)]));
  const base=new Map(baseline.map(x=>[x.id,stable(x)]));
  const db={
    collection(root){ assert.equal(root,'reciclar-apac'); return {doc(key){ return {
      collection(sub){ assert.equal(sub,'records'); return {
        get:async()=>{collectionReads++;return {docs:[...remotes].map(([id,data])=>({id,data:()=>structuredClone(data)}))};},
        doc(id){return {id,get:async()=>{reads.push(id);if(fail.includes(id))throw Error('read failed');const exists=remotes.has(id);return {exists,data:()=>exists?structuredClone(remotes.get(id)):undefined};}};},
      };}, set:async()=>{},
    };}};},
    batch(){const pending=[];return {set(ref,data){pending.push({id:ref.id,data:structuredClone(data)});},async commit(){batches.push({size:pending.length,readsAtCommit:reads.length});for(const x of pending){writes.push(x);remotes.set(x.id,structuredClone(x.data));}}};},
  };
  const s={console:{error(){}},STORAGE_MODE:'firestore',FIRESTORE_RECORD_COLLECTIONS:new Set(['colaboradores']),FIRESTORE_BASELINES:new Map([['colaboradores',base]]),STORAGE_ERRORS:new Map(),FIREBASE_DB:db,serializarEstavel:stable,agendarSincronizacaoRankingsPublicos:k=>syncs.push(k)};
  vm.createContext(s);new vm.Script(fnSource).runInContext(s);
  return {save:v=>s.storageSet('colaboradores',v),reads,writes,syncs,batches,base,errors:s.STORAGE_ERRORS,get collectionReads(){return collectionReads;}};
}
test('1 alteração em coleção grande lê somente o documento alterado',async()=>{
  const b=Array.from({length:100},(_,i)=>({id:`r${i}`,value:i}));const h=harness({baseline:b,remote:b});const v=structuredClone(b);v[42].value=999;
  assert.equal(await h.save(v),true);assert.deepEqual(h.reads,['r42']);assert.equal(h.collectionReads,0);assert.deepEqual(h.writes.map(x=>x.id),['r42']);
});
test('5 alterações em coleção grande geram exatamente 5 leituras direcionadas',async()=>{
  const b=Array.from({length:100},(_,i)=>({id:`r${i}`,value:i}));const h=harness({baseline:b,remote:b});const v=structuredClone(b);for(const i of [2,15,44,61,90])v[i].value+=1000;
  assert.equal(await h.save(v),true);assert.deepEqual(h.reads,['r2','r15','r44','r61','r90']);assert.equal(h.collectionReads,0);assert.equal(h.writes.length,5);
});
test('registros inalterados não geram leituras nem gravações',async()=>{
  const b=[{id:'a',value:1},{id:'b',value:2}],h=harness({baseline:b,remote:b});assert.equal(await h.save(structuredClone(b)),true);assert.deepEqual(h.reads,[]);assert.equal(h.collectionReads,0);assert.equal(h.writes.length,0);
});
test('conflito remoto impede todas as gravações',async()=>{
  const b=[{id:'a',value:1},{id:'b',value:2}],h=harness({baseline:b,remote:[{id:'a',value:777},{id:'b',value:2}]});assert.equal(await h.save([{id:'a',value:3},{id:'b',value:4}]),false);assert.deepEqual([...h.reads].sort(),['a','b']);assert.equal(h.writes.length,0);assert.equal(h.errors.has('colaboradores'),true);
});
test('falha de leitura não autoriza gravação',async()=>{
  const b=[{id:'a',value:1}],h=harness({baseline:b,remote:b,fail:['a']});assert.equal(await h.save([{id:'a',value:2}]),false);assert.equal(h.writes.length,0);assert.equal(h.errors.has('colaboradores'),true);
});
test('valor já salvo remotamente atualiza baseline sem gravar novamente',async()=>{
  const h=harness({baseline:[{id:'a',value:1}],remote:[{id:'a',value:2}]});assert.equal(await h.save([{id:'a',value:2}]),true);assert.deepEqual(h.reads,['a']);assert.equal(h.writes.length,0);assert.equal(h.base.get('a'),stable({id:'a',value:2}));
});
test('ID duplicado é rejeitado antes de qualquer leitura',async()=>{
  const h=harness();assert.equal(await h.save([{id:'a',value:1},{id:'a',value:2}]),false);assert.deepEqual(h.reads,[]);assert.equal(h.collectionReads,0);assert.equal(h.writes.length,0);
});


test('451 alteracoes sao lidas antes das gravacoes e divididas em lotes de ate 450', async () => {
  const b = Array.from({length:451}, (_,i)=>({id:`r${i}`,value:i}));
  const h = harness({baseline:b,remote:b});
  const v = structuredClone(b);
  for (const item of v) item.value += 1000;

  assert.equal(await h.save(v),true);
  assert.equal(h.reads.length,451);
  assert.equal(h.collectionReads,0);
  assert.equal(h.writes.length,451);
  assert.deepEqual(h.batches.map(x=>x.size),[450,1]);
  assert.deepEqual(h.batches.map(x=>x.readsAtCommit),[451,451]);
});

test('conflito na segunda faixa de leitura impede todas as gravacoes', async () => {
  const b = Array.from({length:451}, (_,i)=>({id:`r${i}`,value:i}));
  const remote = structuredClone(b);
  remote[450].value = 9999;
  const h = harness({baseline:b,remote});
  const v = structuredClone(b);
  for (const item of v) item.value += 1000;

  assert.equal(await h.save(v),false);
  assert.equal(h.reads.length,451);
  assert.equal(h.collectionReads,0);
  assert.equal(h.writes.length,0);
  assert.equal(h.batches.length,0);
  assert.equal(h.errors.has('colaboradores'),true);
});
