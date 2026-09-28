import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const userId = '34ae3545-ae23-41b1-a2c1-8292e58ba0dc';
const denied = error => error.code === '42501';

test('member_content migration enforces database privileges and RLS', async t => {
  const db = new PGlite();
  // Runs checks as a browser role with the given JWT claims.
  async function asRole(role, claims, run) {
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(claims)]);
    await db.exec(`set role ${role}`);
    try { await run(); } finally { await db.exec('reset role'); }
  }
  const rows = async sql => (await db.query(sql)).rows;
  try {
    // Real PostgreSQL policy execution. Only Supabase's JWT helper functions are stubbed.
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      grant usage on schema public, auth to anon, authenticated;
      create function auth.jwt() returns jsonb language sql stable as
        $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
      create function auth.uid() returns uuid language sql stable as
        $$ select (auth.jwt() ->> 'sub')::uuid $$;
    `);
    await db.exec(await readFile(new URL('../supabase/migrations/202609240001_member_content.sql', import.meta.url), 'utf8'));

    await t.test('guests cannot read the table', () => asRole('anon', {}, () =>
      assert.rejects(db.query('select * from public.member_content'), denied)));

    await t.test('authenticated users can read the seeded text', () => asRole('authenticated', { sub: userId, is_anonymous: false }, async () =>
      assert.deepEqual(await rows('select slug, body from public.member_content'), [{ slug: 'test', body: 'тест контент' }])));

    await t.test('authenticated role without a user identity cannot read rows', () => asRole('authenticated', {}, async () =>
      assert.deepEqual(await rows('select * from public.member_content'), [])));

    await t.test('anonymous Supabase accounts cannot read rows', () => asRole('authenticated', { sub: userId, is_anonymous: true }, async () =>
      assert.deepEqual(await rows('select * from public.member_content'), [])));

    await t.test('browser roles cannot insert, update, delete or truncate', async () => {
      for (const role of ['anon', 'authenticated']) await asRole(role, { sub: userId, is_anonymous: false }, async () => {
        for (const sql of [
          "insert into public.member_content values ('injected', 'unexpected')",
          "update public.member_content set body = 'unexpected'",
          'delete from public.member_content',
          'truncate public.member_content',
        ]) await assert.rejects(db.query(sql), denied);
      });
    });
  } finally {
    await db.close();
  }
});
