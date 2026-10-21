-- Public per-business review stats. security_invoker makes the view follow
-- the reviews RLS ("Anyone can view reviews"), so no security definer needed.
create or replace view public.business_review_stats
with (security_invoker = true) as
select business_id,
       round(avg(rating)::numeric, 1) as average_rating,
       count(*)::int as review_count
from public.reviews
group by business_id;

grant select on public.business_review_stats to anon, authenticated;
