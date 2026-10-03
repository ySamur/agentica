import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { steps } from '../src/features/guide/catalog.ts';
import { lessons } from '../content/guide/index.ts';
import { compileLesson } from '../scripts/guideContent.ts';

const userId = '34ae3545-ae23-41b1-a2c1-8292e58ba0dc';
const otherId = '9b2f7c1e-5d4a-4e8b-b6f3-0c1d2e3f4a5b';
const member = { sub: userId, is_anonymous: false };
const other = { sub: otherId, is_anonymous: false };
const denied = error => error.code === '42501';
const invalid = error => error.code === '22023';
// The pilot lesson's answers, taken from its source so wording changes never break the test.
const planFirst = compileLesson(lessons.find(lesson => lesson.stepId === 'plan-first'));
const rightAnswers = Object.fromEntries(Object.entries(planFirst.key).map(([id, { correct }]) => [id, correct]));
const wrongAnswers = Object.fromEntries(Object.entries(planFirst.key).map(([id, { correct, why }]) => [id, [Object.keys(why).find(option => !correct.includes(option))]]));
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
  const submit = async answers => (await rows('select public.submit_guide_check($1, $2) as result', ['plan-first', JSON.stringify(answers)]))[0].result;
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

    await t.test('the private schema holds only the answer keys', async () =>
      assert.deepEqual((await rows("select tablename from pg_tables where schemaname = 'private'")).map(row => row.tablename), ['guide_checks']));

    await t.test('guide_steps: one row per catalog step, no more', async () => {
      const seeded = (await rows('select step_id from public.guide_steps order by step_id')).map(row => row.step_id);
      assert.deepEqual(seeded, steps.map(step => step.id).toSorted());
    });

    await t.test('guide_steps: guests cannot read step texts', () => asRole('anon', {}, () =>
      assert.rejects(db.query('select lesson from public.guide_steps'), denied)));

    await t.test('guide_steps: members read every step', () => asRole('authenticated', member, async () =>
      assert.equal((await rows('select lesson from public.guide_steps')).length, steps.length)));

    await t.test('guide_steps: lessons and answer keys in the database match content/guide', async () => {
      for (const source of lessons) {
        const { stepId, lesson, key } = compileLesson(source);
        const [row] = await rows('select steps.lesson, checks.key from public.guide_steps steps left join private.guide_checks checks using (step_id) where steps.step_id = $1', [stepId]);
        assert.deepEqual(row, { lesson, key }, `${stepId} changed: npm run guide:content -- ${stepId}`);
      }
      assert.deepEqual(await rows("select step_id from private.guide_checks checks join public.guide_steps steps using (step_id) where not coalesce(steps.lesson ? 'check', false)"), []);
    });

    await t.test('guide_steps: no identity or an anonymous account reads nothing', async () => {
      for (const claims of [{}, { sub: userId, is_anonymous: true }]) await asRole('authenticated', claims, async () =>
        assert.deepEqual(await rows('select * from public.guide_steps'), []));
    });

    await t.test('guide_steps: browser roles cannot write', async () => {
      for (const role of ['anon', 'authenticated']) await asRole(role, member, async () => {
        for (const sql of [
          "insert into public.guide_steps values ('injected', '{}')",
          'update public.guide_steps set lesson = null',
          'delete from public.guide_steps',
          'truncate public.guide_steps',
        ]) await assert.rejects(db.query(sql), denied);
      });
    });

    await t.test('guide_steps: browser roles hold no grants beyond authenticated SELECT', async () => {
      assert.deepEqual(await tablePrivileges('anon', 'public.guide_steps'), []);
      assert.deepEqual(await tablePrivileges('authenticated', 'public.guide_steps'), ['table SELECT', 'step_id SELECT', 'lesson SELECT']);
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

    // On a capstone step, which has no check: members mark it themselves.
    await t.test('guide_progress: members save statuses the way the API upserts them', () => asRole('authenticated', member, async () => {
      const upsert = "insert into public.guide_progress (step_id, status) values ($1, $2) on conflict (user_id, step_id) do update set step_id = excluded.step_id, status = excluded.status returning step_id, status";
      assert.deepEqual(await rows(upsert, ['before-after', 'skipped']), [{ step_id: 'before-after', status: 'skipped' }]);
      assert.deepEqual(await rows(upsert, ['before-after', 'done']), [{ step_id: 'before-after', status: 'done' }]);
      assert.deepEqual(await rows("delete from public.guide_progress where step_id = 'before-after' returning step_id"), [{ step_id: 'before-after' }]);
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

    // On a capstone step: it has no check, so RLS lets the constraints speak.
    await t.test('guide_progress: unknown steps and statuses are rejected', () => asRole('authenticated', member, async () => {
      await assert.rejects(db.query("insert into public.guide_progress (step_id, status) values ('no-such-step', 'done')"), error => error.code === '23503');
      await assert.rejects(db.query("insert into public.guide_progress (step_id, status) values ('public-profile', 'finished')"), error => error.code === '23514');
    }));

    await t.test('guide_progress: no identity or an anonymous account can neither read nor write', async () => {
      for (const claims of [{}, { sub: userId, is_anonymous: true }]) await asRole('authenticated', claims, async () => {
        assert.deepEqual(await rows('select * from public.guide_progress'), []);
        await assert.rejects(db.query("insert into public.guide_progress (step_id, status) values ('install', 'done')"));
        await assert.rejects(db.query("select * from public.open_guide_step('install')"));
      });
    });

    await t.test('guide_checks: answer keys are out of reach of browser roles', async () => {
      for (const role of ['anon', 'authenticated']) await asRole(role, member, async () => {
        await assert.rejects(db.query('select * from private.guide_checks'), denied);
        await assert.rejects(db.query("update private.guide_checks set key = '{}'"), denied);
        await assert.rejects(db.query("insert into private.guide_checks values ('install', '{}')"), denied);
      });
      for (const role of ['anon', 'authenticated']) assert.deepEqual(await tablePrivileges(role, 'private.guide_checks'), []);
    });

    await t.test('guide_progress: a step with a check is passed only through the check', () => asRole('authenticated', member, async () => {
      for (const sql of [
        "insert into public.guide_progress (step_id, status) values ('plan-first', 'done') on conflict (user_id, step_id) do update set status = excluded.status",
        "update public.guide_progress set status = 'skipped' where step_id = 'plan-first'",
      ]) await assert.rejects(db.query(sql), denied);
      // Returning it to work, resetting and opening it again still work.
      assert.deepEqual(await rows("update public.guide_progress set status = 'in_progress' where step_id = 'plan-first' returning status"), [{ status: 'in_progress' }]);
      assert.deepEqual(await rows("delete from public.guide_progress where step_id = 'plan-first' returning step_id"), [{ step_id: 'plan-first' }]);
      assert.deepEqual(await rows("select status from public.open_guide_step('plan-first')"), [{ status: 'in_progress' }]);
    }));

    await t.test('submit_guide_check: a wrong answer explains only the chosen options and changes nothing', () => asRole('authenticated', member, async () => {
      const progress = "select status, updated_at from public.guide_progress where step_id = 'plan-first'";
      const before = await rows(progress);
      const [first] = Object.keys(rightAnswers);
      const answers = { ...wrongAnswers, [first]: rightAnswers[first] };
      const result = await submit(answers);
      assert.equal(result.passed, false);
      assert.equal(result.progress, undefined);
      for (const [id, chosen] of Object.entries(answers)) assert.deepEqual(result.questions[id], {
        correct: id === first,
        why: Object.fromEntries(chosen.map(option => [option, planFirst.key[id].why[option]])),
      });
      assert.deepEqual(await rows(progress), before);
    }));

    await t.test('submit_guide_check: right answers pass the step and explain every option', async () => {
      await db.query("alter table public.guide_progress disable trigger guide_progress_touch");
      await db.query("update public.guide_progress set updated_at = '2026-01-01T00:00:00Z' where step_id = 'plan-first'");
      await db.query("alter table public.guide_progress enable trigger guide_progress_touch");
      await asRole('authenticated', member, async () => {
        const result = await submit(rightAnswers);
        assert.equal(result.passed, true);
        for (const [id, { why }] of Object.entries(planFirst.key)) assert.deepEqual(result.questions[id], { correct: true, why });
        assert.equal(result.progress.status, 'done');
        assert.deepEqual(await rows("select status, updated_at > '2026-01-01T00:00:00Z' as moved from public.guide_progress where step_id = 'plan-first'"), [{ status: 'done', moved: true }]);
        // Opening a passed step keeps it passed.
        assert.deepEqual(await rows("select * from public.open_guide_step('plan-first')"), []);
      });
      assert.deepEqual(await rows(`select step_id from public.guide_progress where user_id = '${otherId}' and step_id = 'plan-first'`), []);
    });

    await t.test('submit_guide_check: refuses guests, anonymous accounts, steps without a check and malformed answers', async () => {
      await asRole('anon', {}, () => assert.rejects(submit(rightAnswers), denied));
      for (const claims of [{}, { sub: userId, is_anonymous: true }]) await asRole('authenticated', claims, () => assert.rejects(submit(rightAnswers), denied));
      await asRole('authenticated', member, async () => {
        await assert.rejects(rows("select public.submit_guide_check('install', '{}')"), invalid);
        const [first] = Object.keys(rightAnswers);
        for (const answers of [[], { [first]: rightAnswers[first] }, { ...rightAnswers, [first]: [] }, { ...rightAnswers, [first]: ['no-such-option'] }, { ...rightAnswers, [first]: [1] }]) {
          await assert.rejects(submit(answers), invalid, JSON.stringify(answers));
        }
      });
    });

    await t.test('submit_guide_check: only members may run it, through a wrapper that holds no privileges', async () => {
      for (const fn of ['public.submit_guide_check(text, jsonb)', 'private.submit_guide_check(text, jsonb)']) {
        assert.equal(await execute('anon', fn), false);
        assert.equal(await execute('authenticated', fn), true);
      }
      assert.deepEqual(await rows("select pronamespace::regnamespace::text as schema, prosecdef from pg_proc where proname = 'submit_guide_check' order by schema"),
        [{ schema: 'private', prosecdef: true }, { schema: 'public', prosecdef: false }]);
      for (const [role, usage] of [['anon', false], ['authenticated', true]]) {
        assert.deepEqual(await rows("select has_schema_privilege($1, 'private', 'USAGE') as usage, has_schema_privilege($1, 'private', 'CREATE') as create", [role]), [{ usage, create: false }]);
      }
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
