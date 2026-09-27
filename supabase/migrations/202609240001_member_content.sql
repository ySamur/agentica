begin;

create table public.member_content (
  slug text primary key,
  body text not null
);

alter table public.member_content enable row level security;
revoke all on public.member_content from public, anon, authenticated;
grant select on public.member_content to authenticated;

create policy "Members can read content"
  on public.member_content
  for select
  to authenticated
  using ((select auth.uid()) is not null and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false');

insert into public.member_content (slug, body)
values ('test', 'тест контент');

commit;
