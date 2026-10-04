begin;

-- Steps become lessons (src/features/guide/lesson/types.ts). Lessons are written in content/guide/
-- and arrive through generated migrations (`npm run guide:content`). `null`: not written yet.
alter table public.guide_steps drop column body;
alter table public.guide_steps add column lesson jsonb;

-- Answer keys never reach a browser: the `private` schema is not exposed through the API, and its
-- table has RLS on and no grants. Only submit_guide_check reads it. Members need schema usage
-- only to run that function through its public wrapper.
create schema private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table private.guide_checks (
  step_id text primary key references public.guide_steps on delete cascade,
  key jsonb not null
);

alter table private.guide_checks enable row level security;
revoke all on private.guide_checks from public, anon, authenticated;

-- A step with a check is passed only through submit_guide_check. Members may still open such a
-- step (in_progress), return it to work and reset it; other steps they mark themselves.
drop policy "Members manage their own progress" on public.guide_progress;

create policy "Members read their own progress"
  on public.guide_progress
  for select
  to authenticated
  using (user_id = (select auth.uid()) and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false');

create policy "Members reset their own progress"
  on public.guide_progress
  for delete
  to authenticated
  using (user_id = (select auth.uid()) and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false');

create policy "Members start their own steps and mark unchecked ones"
  on public.guide_progress
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid()) and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false'
    and (status = 'in_progress' or not exists (
      select 1 from public.guide_steps checked
      where checked.step_id = guide_progress.step_id and checked.lesson ? 'check'))
  );

create policy "Members change their own steps, but pass checked ones only by the check"
  on public.guide_progress
  for update
  to authenticated
  using (user_id = (select auth.uid()) and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false')
  with check (
    user_id = (select auth.uid()) and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false'
    and (status = 'in_progress' or not exists (
      select 1 from public.guide_steps checked
      where checked.step_id = guide_progress.step_id and checked.lesson ? 'check'))
  );

-- Grades one attempt. `answers`: {"<question id>": ["<option id>", …]} for every question.
-- Returns {passed, questions: {<id>: {correct, why}}}; `why` explains the chosen options, or every
-- option once all answers are right. Then the step is passed and `progress` holds its new row.
create function private.submit_guide_check(step text, answers jsonb) returns jsonb
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  member uuid := (select auth.uid());
  answer_key jsonb;
  question record;
  chosen text[];
  expected text[];
  verdicts jsonb := '{}';
  passed boolean := true;
  saved public.guide_progress;
begin
  if member is null or coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'false' then
    raise exception 'Only members can take a check' using errcode = '42501';
  end if;
  select checks.key into answer_key from private.guide_checks checks where checks.step_id = step;
  if answer_key is null then
    raise exception 'Step % has no check', step using errcode = '22023';
  end if;
  if jsonb_typeof(answers) is distinct from 'object' then
    raise exception 'Answers must be an object' using errcode = '22023';
  end if;

  for question in select entry.key as id, entry.value as spec from jsonb_each(answer_key) entry loop
    if jsonb_typeof(answers -> question.id) is distinct from 'array'
      or jsonb_array_length(answers -> question.id) = 0
      or exists (select 1 from jsonb_array_elements(answers -> question.id) item where jsonb_typeof(item) <> 'string') then
      raise exception 'Question % needs an answer', question.id using errcode = '22023';
    end if;
    select array_agg(distinct item order by item) into chosen from jsonb_array_elements_text(answers -> question.id) item;
    if exists (select 1 from unnest(chosen) option_id where not (question.spec -> 'why') ? option_id) then
      raise exception 'Question % has no such option', question.id using errcode = '22023';
    end if;
    select coalesce(array_agg(item order by item), '{}') into expected from jsonb_array_elements_text(question.spec -> 'correct') item;
    verdicts := verdicts || jsonb_build_object(question.id, jsonb_build_object(
      'correct', chosen = expected,
      'why', (select jsonb_object_agg(option_id, question.spec -> 'why' -> option_id) from unnest(chosen) option_id)));
    passed := passed and chosen = expected;
  end loop;

  if not passed then
    return jsonb_build_object('passed', false, 'questions', verdicts);
  end if;

  select jsonb_object_agg(entry.key, jsonb_build_object('correct', true, 'why', entry.value -> 'why'))
    into verdicts from jsonb_each(answer_key) entry;
  insert into public.guide_progress (user_id, step_id, status)
  values (member, step, 'done')
  on conflict (user_id, step_id) do update set status = excluded.status
  returning * into saved;
  return jsonb_build_object('passed', true, 'questions', verdicts,
    'progress', jsonb_build_object('status', saved.status, 'updated_at', saved.updated_at));
end;
$$;

revoke all on function private.submit_guide_check(text, jsonb) from public, anon, authenticated;
grant execute on function private.submit_guide_check(text, jsonb) to authenticated;

-- The API's entry point. It holds no privileges itself, so no SECURITY DEFINER function sits in
-- an exposed schema.
create function public.submit_guide_check(step text, answers jsonb) returns jsonb
  language sql
  security invoker
  set search_path = ''
as $$
  select private.submit_guide_check(step, answers);
$$;

revoke all on function public.submit_guide_check(text, jsonb) from public, anon, authenticated;
grant execute on function public.submit_guide_check(text, jsonb) to authenticated;

commit;
