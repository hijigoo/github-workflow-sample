import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.mjs', ['app.mjs', 'text/javascript; charset=utf-8']],
  ['/query.mjs', ['query.mjs', 'text/javascript; charset=utf-8']],
  ['/inquiries.mjs', ['inquiries.mjs', 'text/javascript; charset=utf-8']],
  ['/version.mjs', ['version.mjs', 'text/javascript; charset=utf-8']],
]);

export async function startFixtureServer() {
  const server = createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405);
      response.end('Method not allowed');
      return;
    }
    let pathname;
    try {
      pathname = new URL(request.url, 'http://localhost').pathname;
    } catch (error) {
      response.writeHead(400);
      response.end('Invalid URL');
      return;
    }
    const asset = assets.get(pathname);
    if (!asset) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    try {
      const content = await readFile(new URL(`../../web/${asset[0]}`, import.meta.url));
      response.writeHead(200, { 'Content-Type': asset[1] });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        response.writeHead(404);
        response.end('Sample asset not found');
      } else {
        console.error('Sample asset read failed:', error);
        response.writeHead(500);
        response.end('Sample asset read failed');
      }
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    }),
  };
}
