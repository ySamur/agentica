begin;

-- The library: materials members take with them (prompts, templates, checklists). Written in
-- content/library/ and published by generated migrations (`npm run library:content`).
-- Titles are open to every member, so locked materials point to their step; a body opens only
-- once its step is passed (`done`, or `skipped` through «Уже умею» where the step allows it).
create table public.library_items (
  id text primary key,
  step_id text not null references public.guide_steps on delete cascade,
  position integer not null,
  kind text not null check (kind in ('prompt', 'template', 'checklist')),
  title text not null,
  summary text not null
);

create index library_items_step_id_idx on public.library_items (step_id);

create table public.library_bodies (
  item_id text primary key references public.library_items on delete cascade,
  file text,
  body text not null
);

alter table public.library_items enable row level security;
alter table public.library_bodies enable row level security;
revoke all on public.library_items, public.library_bodies from public, anon, authenticated;
grant select on public.library_items, public.library_bodies to authenticated;

create policy "Members can read the library's titles"
  on public.library_items
  for select
  to authenticated
  using ((select auth.uid()) is not null and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false');

create policy "Members read the materials of the steps they passed"
  on public.library_bodies
  for select
  to authenticated
  using (
    coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false'
    and exists (
      select 1
      from public.library_items item
      join public.guide_progress progress on progress.step_id = item.step_id
      where item.id = library_bodies.item_id
        and progress.user_id = (select auth.uid())
        and progress.status in ('done', 'skipped')
    )
  );

commit;
