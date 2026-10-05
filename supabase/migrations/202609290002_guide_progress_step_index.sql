begin;

-- The primary key leads with user_id; removing a step text finds its progress rows by step_id.
create index guide_progress_step_id_idx on public.guide_progress (step_id);

commit;
