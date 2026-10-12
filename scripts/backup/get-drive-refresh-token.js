const http = require('node:http');
const { URL } = require('node:url');
const { google } = require('googleapis');

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

function requiredEnv(name) {
  if (!process.env[name]) throw new Error(`Set ${name} in your local environment first.`);
  return process.env[name];
}

const oauth = new google.auth.OAuth2(
  requiredEnv('GOOGLE_CLIENT_ID'),
  requiredEnv('GOOGLE_CLIENT_SECRET'),
  REDIRECT_URI,
);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/oauth2callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  if (url.searchParams.get('error')) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Google authorization was not completed. You can close this tab.');
    console.error('Authorization error:', url.searchParams.get('error'));
    server.close();
    process.exitCode = 1;
    return;
  }
  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400);
    res.end('Authorization code is missing.');
    return;
  }
  try {
    const { tokens } = await oauth.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error('Google did not return a refresh token. Revoke this app access in your Google Account and run the helper again with consent.');
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>Autorização concluída.</h2><p>Volte ao terminal para copiar o refresh token. Você pode fechar esta aba.</p>');
    console.log('\nRefresh token (não compartilhe nem coloque no repositório):\n');
    console.log(tokens.refresh_token);
    console.log('\nCopie esse valor para o secret GOOGLE_REFRESH_TOKEN do GitHub.\n');
    server.close();
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Could not complete authorization. Check the terminal for details.');
    console.error(error.message || error);
    server.close();
    process.exitCode = 1;
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const authUrl = oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [SCOPE],
  });
  console.log('Abra esta URL no navegador conectado à conta Google que receberá os backups:');
  console.log(authUrl);
  console.log(`\nO retorno OAuth será recebido em ${REDIRECT_URI}\n`);
});
