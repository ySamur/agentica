import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// vercel.json serves the app: every address falls back to index.html, and the headers lock it down.
// The CSP allows index.html's one inline script by its hash, so editing that script needs a new hash.
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const headersFor = source => Object.fromEntries((vercel.headers.find(rule => rule.source === source)?.headers ?? []).map(({ key, value }) => [key, value]));
const page = headersFor('/(.*)');
const directive = name => page['Content-Security-Policy'].split(';').map(part => part.trim()).find(part => part.startsWith(`${name} `)) ?? '';

test('every address of the single-page app falls back to index.html', () => {
  assert.equal(vercel.outputDirectory, 'dist');
  assert.deepEqual(vercel.rewrites, [{ source: '/(.*)', destination: '/index.html' }]);
});

test("the CSP allows index.html's inline scripts by hash and nothing else inline", () => {
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(([, body]) => body);
  assert.ok(inline.length > 0);
  const script = directive('script-src');
  for (const body of inline) {
    const hash = `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
    assert.ok(script.includes(hash), `index.html's inline script changed: put ${hash} into script-src in vercel.json`);
  }
  assert.doesNotMatch(script, /unsafe-(inline|eval)/);
});

test('the CSP reaches only this site, Supabase and Google profile photos', () => {
  assert.equal(directive('default-src'), "default-src 'self'");
  assert.equal(directive('connect-src'), "connect-src 'self' https://*.supabase.co wss://*.supabase.co");
  assert.equal(directive('img-src'), "img-src 'self' data: https://*.supabase.co https://*.googleusercontent.com");
  for (const locked of ["object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"]) assert.ok(page['Content-Security-Policy'].includes(locked), locked);
});

test('pages carry the security headers, and hashed assets cache for a year', () => {
  assert.equal(page['X-Content-Type-Options'], 'nosniff');
  assert.equal(page['X-Frame-Options'], 'DENY');
  assert.equal(page['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.match(page['Strict-Transport-Security'], /^max-age=\d{8,}/);
  assert.match(page['Permissions-Policy'], /camera=\(\).*microphone=\(\).*geolocation=\(\)/);
  assert.equal(headersFor('/assets/(.*)')['Cache-Control'], 'public, max-age=31536000, immutable');
});
