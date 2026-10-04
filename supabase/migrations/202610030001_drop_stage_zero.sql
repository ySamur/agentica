begin;

-- Stage 0 «Точка отсчёта» is gone from the route (catalog.ts): the route starts at stage 1.
-- Members' progress on these steps goes with them (guide_progress cascades).
delete from public.guide_steps where step_id in ('experience', 'where-now', 'goal', 'playground');

commit;
