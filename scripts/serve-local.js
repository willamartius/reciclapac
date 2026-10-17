const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Invalid URL');
    return;
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.some(segment => segment.startsWith('.') || segment === '..')) {
    response.writeHead(404).end('Not found');
    return;
  }
  if (segments.length === 0) segments.push('index.html');

  const file = path.resolve(root, ...segments);
  if (!file.startsWith(`${root}${path.sep}`) || !mimeTypes[path.extname(file)]) {
    response.writeHead(404).end('Not found');
    return;
  }

  fs.readFile(file, (error, contents) => {
    if (error) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': mimeTypes[path.extname(file)],
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(contents);
  });
}).listen(8001, '127.0.0.1', () => {
  console.log('Reciclapac local: http://127.0.0.1:8001/?emulator=1');
});
