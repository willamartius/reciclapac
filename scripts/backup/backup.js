const admin = require('firebase-admin');
const { google } = require('googleapis');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'apac-reciclar';
const FOLDER_NAME = 'Reciclar APAC Backups Automáticos';
const KEEP_BACKUPS = 10;
const BACKUP_FORMAT = 'reciclar-apac-backup';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parseServiceAccount() {
  const raw = requiredEnv('FIREBASE_SERVICE_ACCOUNT_JSON');
  const credentials = JSON.parse(raw);
  if (!credentials.project_id || !credentials.client_email || !credentials.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing required service account fields.');
  }
  return credentials;
}

async function readStoredValue(db, key, fallback) {
  const recordsRef = db.collection('reciclar-apac').doc(key).collection('records');
  const records = await recordsRef.get();
  if (!records.empty) {
    return records.docs.map((doc) => doc.data());
  }

  const marker = await db.collection('reciclar-apac-migrations').doc(key).get();
  if (marker.exists && marker.data().schemaVersion === 1) return [];

  const legacy = await db.collection('reciclar-apac').doc(key).get();
  if (!legacy.exists || legacy.data().value === undefined) return fallback;

  try {
    return JSON.parse(legacy.data().value);
  } catch {
    throw new Error(`Stored legacy value for "${key}" is not valid JSON.`);
  }
}

async function buildBackup(db) {
  const [colaboradores, entregas, transferencias, trocas, campanhas, metas, config] = await Promise.all([
    readStoredValue(db, 'colaboradores', []),
    readStoredValue(db, 'entregas', []),
    readStoredValue(db, 'transferencias', []),
    readStoredValue(db, 'trocas', []),
    readStoredValue(db, 'campanhas', []),
    readStoredValue(db, 'metas', []),
    readStoredValue(db, 'config', null),
  ]);

  for (const [name, value] of Object.entries({ colaboradores, entregas, transferencias, trocas, campanhas, metas })) {
    if (!Array.isArray(value)) throw new Error(`Firestore collection "${name}" did not resolve to an array.`);
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('The application config is missing or invalid; refusing to create an incomplete backup.');
  }

  const { senhaAdmin, ...configBackup } = config;
  const campanhasAtivas = campanhas.filter((c) => c && c.status === 'ativa');
  const campanhaSelecionadaId = campanhasAtivas.length
    ? campanhasAtivas[campanhasAtivas.length - 1].id
    : (campanhas.length ? campanhas[campanhas.length - 1].id : null);

  return {
    formato: BACKUP_FORMAT,
    versao: 1,
    criadoEm: new Date().toISOString(),
    dados: {
      colaboradores,
      entregas,
      transferencias,
      trocas,
      campanhas,
      metas,
      config: configBackup,
      metadata: {
        storageMode: 'firestore',
        campanhaSelecionadaId: campanhaSelecionadaId || null,
      },
    },
  };
}

async function getDriveClient() {
  const auth = new google.auth.OAuth2(
    requiredEnv('GOOGLE_CLIENT_ID'),
    requiredEnv('GOOGLE_CLIENT_SECRET'),
  );
  auth.setCredentials({ refresh_token: requiredEnv('GOOGLE_REFRESH_TOKEN') });
  return google.drive({ version: 'v3', auth });
}

async function findOrCreateBackupFolder(drive) {
  const response = await drive.files.list({
    q: `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id,name)',
    pageSize: 100,
    spaces: 'drive',
  });
  const folder = (response.data.files || [])[0];
  if (folder) return folder.id;

  const created = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id,name',
  });
  if (!created.data.id) throw new Error('Google Drive did not return an ID for the backup folder.');
  return created.data.id;
}

async function pruneOldBackups(drive, folderId) {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false and appProperties has { key='reciclapacBackup' and value='1' }`,
    orderBy: 'createdTime desc',
    pageSize: 1000,
    fields: 'files(id,name,createdTime,appProperties)',
    spaces: 'drive',
  });
  const files = response.data.files || [];
  const obsolete = files.slice(KEEP_BACKUPS);
  for (const file of obsolete) {
    await drive.files.delete({ fileId: file.id });
    console.log(`Removed old automatic backup: ${file.name}`);
  }
  console.log(`Retention complete: kept ${Math.min(files.length, KEEP_BACKUPS)} automatic backup(s).`);
}

async function main() {
  const serviceAccount = JSON.parse(requiredEnv('FIREBASE_SERVICE_ACCOUNT_JSON'));
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing required service account fields.');
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
  });
  const db = admin.firestore();
  const backup = await buildBackup(db);
  const serialized = JSON.stringify(backup, null, 2);

  // Validate before upload so an incomplete read cannot silently create a backup.
  if (backup.formato !== BACKUP_FORMAT || backup.versao !== 1
      || !backup.dados.config || !backup.dados.config.painelPeriodo
      || !Array.isArray(backup.dados.campanhas)
      || !Array.isArray(backup.dados.colaboradores)
      || !Array.isArray(backup.dados.entregas)
      || !Array.isArray(backup.dados.transferencias)
      || !Array.isArray(backup.dados.trocas)
      || !Array.isArray(backup.dados.metas)) {
    throw new Error('Generated backup failed structural validation; refusing to upload.');
  }

  const drive = await getDriveClient();
  const folderId = await findOrCreateBackupFolder(drive);
  const stamp = backup.criadoEm.slice(0, 16).replace(/[:T]/g, '-');
  const fileName = `backup-reciclar-${stamp}.json`;
  const uploaded = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: 'application/json',
      parents: [folderId],
      appProperties: { reciclapacBackup: '1', backupFormat: BACKUP_FORMAT },
    },
    media: {
      mimeType: 'application/json',
      body: serialized,
    },
    fields: 'id,name,createdTime,webViewLink',
  });
  if (!uploaded.data.id) throw new Error('Google Drive did not confirm the backup upload.');

  console.log(`Backup uploaded: ${uploaded.data.name} (${uploaded.data.id})`);
  console.log(`Counts: colaboradores=${backup.dados.colaboradores.length}, entregas=${backup.dados.entregas.length}, transferencias=${backup.dados.transferencias.length}, trocas=${backup.dados.trocas.length}, campanhas=${backup.dados.campanhas.length}, metas=${backup.dados.metas.length}`);
  await pruneOldBackups(drive, folderId);
}

main().catch((error) => {
  console.error('Automatic Reciclapac backup failed:', error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
