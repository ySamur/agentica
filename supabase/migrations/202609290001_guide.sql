begin;

-- Members-only step texts. The route's map (ids, titles, order) is public and lives in
-- src/features/guide/catalog.ts; the seeded ids must match it (tests/security.test.mjs).
create table public.guide_steps (
  step_id text primary key,
  body text not null
);

alter table public.guide_steps enable row level security;
revoke all on public.guide_steps from public, anon, authenticated;
grant select on public.guide_steps to authenticated;

create policy "Members can read step texts"
  on public.guide_steps
  for select
  to authenticated
  using ((select auth.uid()) is not null and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false');

insert into public.guide_steps (step_id, body)
select step_id, E'Текст этого шага готовится: скоро здесь появятся объяснение, пример в терминале и задание для вашего проекта.\n\nЖёсткого порядка нет. Если тема знакома, отметьте «Уже умею» — шаг засчитается.'
from unnest(array[
  'experience', 'where-now', 'goal', 'playground',
  'install', 'permissions', 'explore-code', 'first-edit', 'checkpoints',
  'project-view', 'claude-md', 'conventions', 'clean-context',
  'task-anatomy', 'plan-first', 'decomposition', 'iterations',
  'read-diff', 'agent-mistakes', 'tests-contract', 'security-deps', 'delegation-limit',
  'hooks', 'commands-skills', 'mcp', 'git-flow', 'agent-ci',
  'subagents', 'worktrees', 'agent-roles', 'agent-sdk', 'economics',
  'idea-to-pr', 'before-after', 'public-profile'
]) as step_id;

-- One row per started step; a missing row means «не начат». Steps can only be known ones,
-- which also caps each member at one row per step.
create table public.guide_progress (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  step_id text not null references public.guide_steps on delete cascade,
  status text not null check (status in ('in_progress', 'done', 'skipped')),
  updated_at timestamptz not null default now(),
  primary key (user_id, step_id)
);

-- The server's clock orders «last opened»; clients cannot set it (see the grants below).
create function public.guide_progress_touch() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger guide_progress_touch
  before insert or update on public.guide_progress
  for each row execute function public.guide_progress_touch();

revoke all on function public.guide_progress_touch() from public, anon, authenticated;

alter table public.guide_progress enable row level security;
revoke all on public.guide_progress from public, anon, authenticated;
grant select, delete on public.guide_progress to authenticated;
-- Column grants: `user_id` always comes from auth.uid() and can be neither set nor changed.
grant insert (step_id, status), update (step_id, status) on public.guide_progress to authenticated;

create policy "Members manage their own progress"
  on public.guide_progress
  for all
  to authenticated
  using (user_id = (select auth.uid()) and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false')
  with check (user_id = (select auth.uid()) and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false');

-- Opening a step starts it, or makes an unfinished one the latest opened. It never undoes
-- «выполнен» or «уже умею», even from a device with stale state. Returns the row it wrote, if any.
create function public.open_guide_step(step text) returns setof public.guide_progress
  language sql
  security invoker
  set search_path = ''
as $$
  insert into public.guide_progress (step_id, status)
  values (step, 'in_progress')
  on conflict (user_id, step_id) do update set status = excluded.status
    where public.guide_progress.status = 'in_progress'
  returning *;
$$;

revoke all on function public.open_guide_step(text) from public, anon, authenticated;
grant execute on function public.open_guide_step(text) to authenticated;

commit;
