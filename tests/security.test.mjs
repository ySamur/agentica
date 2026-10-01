import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { steps } from '../src/features/guide/catalog.ts';

const userId = '34ae3545-ae23-41b1-a2c1-8292e58ba0dc';
const otherId = '9b2f7c1e-5d4a-4e8b-b6f3-0c1d2e3f4a5b';
const member = { sub: userId, is_anonymous: false };
const other = { sub: otherId, is_anonymous: false };
const denied = error => error.code === '42501';
const migrations = new URL('../supabase/migrations/', import.meta.url);

test('migrations enforce database privileges and RLS', async t => {
  const db = new PGlite();
  // Runs checks as a browser role with the given JWT claims.
  async function asRole(role, claims, run) {
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(claims)]);
    await db.exec(`set role ${role}`);
    try { return await run(); } finally { await db.exec('reset role'); }
  }
  const rows = async (sql, params) => (await db.query(sql, params)).rows;
  const execute = async (role, fn) => (await rows('select has_function_privilege($1, $2, $3) as granted', [role, fn, 'EXECUTE']))[0].granted;
  // Effective privileges (direct, PUBLIC, inherited), since RLS rejects writes with the same 42501.
  async function tablePrivileges(role, table) {
    const held = [];
    for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']) {
      for (const mode of [privilege, `${privilege} WITH GRANT OPTION`]) {
        const { rows: [{ granted }] } = await db.query('select has_table_privilege($1, $2, $3) as granted', [role, table, mode]);
        if (granted) held.push(`table ${mode}`);
      }
    }
    const { rows: columns } = await db.query(`select attname from pg_attribute where attrelid = $1::regclass and attnum > 0 and not attisdropped order by attnum`, [table]);
    for (const { attname } of columns) {
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) {
        const { rows: [{ granted }] } = await db.query('select has_column_privilege($1, $2, $3, $4) as granted', [role, table, attname, privilege]);
        if (granted) held.push(`${attname} ${privilege}`);
      }
    }
    return held;
  }
  try {
    // Real PostgreSQL policy execution. Only Supabase's auth schema, JWT helpers and auto-RLS function are stubbed.
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      grant usage on schema public, auth to anon, authenticated;
      create table auth.users (id uuid primary key);
      insert into auth.users values ('${userId}'), ('${otherId}');
      create function auth.jwt() returns jsonb language sql stable as
        $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
      create function auth.uid() returns uuid language sql stable as
        $$ select (auth.jwt() ->> 'sub')::uuid $$;
      create function public.rls_auto_enable() returns event_trigger language plpgsql security definer as
        $$ begin end $$;
      grant execute on function public.rls_auto_enable() to anon, authenticated;
    `);
    for (const file of (await readdir(migrations)).filter(name => name.endsWith('.sql')).toSorted()) {
      await db.exec(await readFile(new URL(file, migrations), 'utf8'));
    }

    await t.test('the public schema holds only the route tables', async () =>
      assert.deepEqual((await rows("select tablename from pg_tables where schemaname = 'public' order by tablename")).map(row => row.tablename), ['guide_progress', 'guide_steps']));

    await t.test('guide_progress rows are found by step for step removals', async () =>
      assert.deepEqual(await rows("select indexdef from pg_indexes where schemaname = 'public' and indexname = 'guide_progress_step_id_idx'"),
        [{ indexdef: 'CREATE INDEX guide_progress_step_id_idx ON public.guide_progress USING btree (step_id)' }]));

    await t.test('guide_steps: one text per catalog step, no more', async () => {
      const seeded = (await rows('select step_id from public.guide_steps order by step_id')).map(row => row.step_id);
      assert.deepEqual(seeded, steps.map(step => step.id).toSorted());
    });

    await t.test('guide_steps: guests cannot read step texts', () => asRole('anon', {}, () =>
      assert.rejects(db.query('select body from public.guide_steps'), denied)));

    await t.test('guide_steps: members read every step text', () => asRole('authenticated', member, async () =>
      assert.equal((await rows('select body from public.guide_steps')).length, steps.length)));

    await t.test('guide_steps: no identity or an anonymous account reads nothing', async () => {
      for (const claims of [{}, { sub: userId, is_anonymous: true }]) await asRole('authenticated', claims, async () =>
        assert.deepEqual(await rows('select * from public.guide_steps'), []));
    });

    await t.test('guide_steps: browser roles cannot write', async () => {
      for (const role of ['anon', 'authenticated']) await asRole(role, member, async () => {
        for (const sql of [
          "insert into public.guide_steps values ('injected', 'unexpected')",
          "update public.guide_steps set body = 'unexpected'",
          'delete from public.guide_steps',
          'truncate public.guide_steps',
        ]) await assert.rejects(db.query(sql), denied);
      });
    });

    await t.test('guide_steps: browser roles hold no grants beyond authenticated SELECT', async () => {
      assert.deepEqual(await tablePrivileges('anon', 'public.guide_steps'), []);
      assert.deepEqual(await tablePrivileges('authenticated', 'public.guide_steps'), ['table SELECT', 'step_id SELECT', 'body SELECT']);
    });

    await t.test('guide_progress: guests can neither read, write nor open steps', () => asRole('anon', {}, async () => {
      for (const sql of [
        'select * from public.guide_progress',
        "insert into public.guide_progress (step_id, status) values ('install', 'done')",
        "update public.guide_progress set status = 'done'",
        'delete from public.guide_progress',
        "select * from public.open_guide_step('install')",
      ]) await assert.rejects(db.query(sql), denied);
    }));

    await t.test('guide_progress: opening a step starts it for the signed-in member only', async () => {
      const [opened] = await asRole('authenticated', member, () => rows("select user_id, step_id, status from public.open_guide_step('plan-first')"));
      assert.deepEqual(opened, { user_id: userId, step_id: 'plan-first', status: 'in_progress' });
      await asRole('authenticated', other, async () => assert.deepEqual(await rows('select * from public.guide_progress'), []));
    });

    await t.test('guide_progress: members save statuses the way the API upserts them', () => asRole('authenticated', member, async () => {
      const upsert = "insert into public.guide_progress (step_id, status) values ($1, $2) on conflict (user_id, step_id) do update set step_id = excluded.step_id, status = excluded.status returning step_id, status";
      assert.deepEqual(await rows(upsert, ['claude-md', 'skipped']), [{ step_id: 'claude-md', status: 'skipped' }]);
      assert.deepEqual(await rows(upsert, ['claude-md', 'done']), [{ step_id: 'claude-md', status: 'done' }]);
      assert.deepEqual(await rows("delete from public.guide_progress where step_id = 'claude-md' returning step_id"), [{ step_id: 'claude-md' }]);
    }));

    await t.test('guide_progress: opening never undoes a finished step and moves an unfinished one forward', async () => {
      await asRole('authenticated', member, () => db.query("insert into public.guide_progress (step_id, status) values ('hooks', 'done'), ('mcp', 'skipped')"));
      // As the owner, with the clock trigger paused: age the rows, so a fresh write shows in updated_at.
      await db.query("alter table public.guide_progress disable trigger guide_progress_touch");
      await db.query("update public.guide_progress set updated_at = '2026-01-01T00:00:00Z'");
      await db.query("alter table public.guide_progress enable trigger guide_progress_touch");
      await asRole('authenticated', member, async () => {
        assert.deepEqual(await rows("select * from public.open_guide_step('hooks')"), []);
        assert.deepEqual(await rows("select * from public.open_guide_step('mcp')"), []);
        const [reopened] = await rows("select status, updated_at > '2026-01-01T00:00:00Z' as moved from public.open_guide_step('plan-first')");
        assert.deepEqual(reopened, { status: 'in_progress', moved: true });
        assert.deepEqual(await rows("select step_id, status, updated_at = '2026-01-01T00:00:00Z' as kept from public.guide_progress where step_id in ('hooks', 'mcp') order by step_id"),
          [{ step_id: 'hooks', status: 'done', kept: true }, { step_id: 'mcp', status: 'skipped', kept: true }]);
      });
    });

    await t.test("guide_progress: members cannot see, change or remove another member's rows", async () => {
      const before = await rows('select * from public.guide_progress order by step_id');
      await asRole('authenticated', other, async () => {
        assert.deepEqual(await rows('select * from public.guide_progress'), []);
        assert.deepEqual(await rows("update public.guide_progress set status = 'done' returning step_id"), []);
        assert.deepEqual(await rows('delete from public.guide_progress returning step_id'), []);
        // Opening the same step starts the other member's own row.
        assert.deepEqual(await rows("select user_id, status from public.open_guide_step('hooks')"), [{ user_id: otherId, status: 'in_progress' }]);
      });
      assert.deepEqual(await rows(`select * from public.guide_progress where user_id = '${userId}' order by step_id`), before);
    });

    await t.test('guide_progress: the owner and the clock cannot be set or changed', () => asRole('authenticated', member, async () => {
      for (const sql of [
        `insert into public.guide_progress (user_id, step_id, status) values ('${otherId}', 'install', 'done')`,
        `insert into public.guide_progress (user_id, step_id, status) values ('${userId}', 'install', 'done')`,
        `update public.guide_progress set user_id = '${otherId}'`,
        "insert into public.guide_progress (step_id, status, updated_at) values ('install', 'done', '2099-01-01')",
        "update public.guide_progress set updated_at = '2099-01-01'",
      ]) await assert.rejects(db.query(sql), denied);
    }));

    await t.test('guide_progress: unknown steps and statuses are rejected', () => asRole('authenticated', member, async () => {
      await assert.rejects(db.query("insert into public.guide_progress (step_id, status) values ('no-such-step', 'done')"), error => error.code === '23503');
      await assert.rejects(db.query("insert into public.guide_progress (step_id, status) values ('install', 'finished')"), error => error.code === '23514');
    }));

    await t.test('guide_progress: no identity or an anonymous account can neither read nor write', async () => {
      for (const claims of [{}, { sub: userId, is_anonymous: true }]) await asRole('authenticated', claims, async () => {
        assert.deepEqual(await rows('select * from public.guide_progress'), []);
        await assert.rejects(db.query("insert into public.guide_progress (step_id, status) values ('install', 'done')"));
        await assert.rejects(db.query("select * from public.open_guide_step('install')"));
      });
    });

    await t.test('guide_progress: deleting an account deletes its progress', async () => {
      await db.query(`delete from auth.users where id = '${userId}'`);
      assert.deepEqual(await rows(`select * from public.guide_progress where user_id = '${userId}'`), []);
    });

    await t.test('guide_progress: grants are exactly as designed', async () => {
      assert.deepEqual(await tablePrivileges('anon', 'public.guide_progress'), []);
      assert.deepEqual(await tablePrivileges('authenticated', 'public.guide_progress'), [
        'table SELECT', 'table DELETE',
        'user_id SELECT',
        'step_id SELECT', 'step_id INSERT', 'step_id UPDATE',
        'status SELECT', 'status INSERT', 'status UPDATE',
        'updated_at SELECT',
      ]);
      assert.equal(await execute('anon', 'public.open_guide_step(text)'), false);
      assert.equal(await execute('authenticated', 'public.open_guide_step(text)'), true);
      for (const role of ['anon', 'authenticated']) assert.equal(await execute(role, 'public.guide_progress_touch()'), false);
    });

    await t.test("browser roles cannot call Supabase's auto-RLS function", async () => {
      for (const role of ['anon', 'authenticated']) assert.equal(await execute(role, 'public.rls_auto_enable()'), false);
    });
  } finally {
    await db.close();
  }
});
