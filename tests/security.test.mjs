import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('member_content migration enforces database privileges and RLS', async t => {
  const db = new PGlite();
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

    await t.test('guests cannot read the table', async () => {
      await db.exec('set role anon');
      await assert.rejects(db.query('select * from public.member_content'), error => error.code === '42501');
      await db.exec('reset role');
    });

    await t.test('authenticated users can read the seeded text', async () => {
      await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: '34ae3545-ae23-41b1-a2c1-8292e58ba0dc', is_anonymous: false })]);
      await db.exec('set role authenticated');
      const result = await db.query('select slug, body from public.member_content');
      assert.deepEqual(result.rows, [{ slug: 'test', body: 'тест контент' }]);
      await db.exec('reset role');
    });

    await t.test('authenticated role without a user identity cannot read rows', async () => {
      await db.query("select set_config('request.jwt.claims', '{}', false)");
      await db.exec('set role authenticated');
      assert.deepEqual((await db.query('select * from public.member_content')).rows, []);
      await db.exec('reset role');
    });

    await t.test('anonymous Supabase accounts cannot read rows', async () => {
      await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: '34ae3545-ae23-41b1-a2c1-8292e58ba0dc', is_anonymous: true })]);
      await db.exec('set role authenticated');
      assert.deepEqual((await db.query('select * from public.member_content')).rows, []);
      await db.exec('reset role');
    });

    await t.test('browser roles cannot insert, update, delete or truncate', async () => {
      for (const role of ['anon', 'authenticated']) {
        await db.exec(`set role ${role}`);
        for (const sql of [
          "insert into public.member_content values ('injected', 'unexpected')",
          "update public.member_content set body = 'unexpected'",
          'delete from public.member_content',
          'truncate public.member_content',
        ]) await assert.rejects(db.query(sql), error => error.code === '42501');
        await db.exec('reset role');
      }
    });
  } finally {
    await db.close();
  }
});
