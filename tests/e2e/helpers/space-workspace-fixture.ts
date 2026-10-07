import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

/** A second local origin makes browser redirects real without contacting an HF runner. */
export async function startWorkspaceFixtureServer() {
  const server = createServer((request, response) => {
    const provider = new URL(request.url!, 'http://fixture.local').searchParams.get('provider') ?? '';
    const escaped = provider.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end('<!doctype html><title>External workspace fixture</title><style>body{font:16px system-ui;background:#111827;color:white;padding:24px}input{display:block;margin-top:12px;padding:8px}</style><p>External workspace fixture</p><p data-testid="fixture-provider">' + escaped + '</p><label>Fixture input<input aria-label="Fixture input"></label>');
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
  return {
    origin,
    destination: (provider: string) => origin + '/?provider=' + encodeURIComponent(provider),
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}
