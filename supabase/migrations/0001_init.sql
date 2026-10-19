-- Mapa de Tandeo — initial schema, RLS, and lagged public view.

create table blocks (
  id text primary key,
  colonia text not null,
  sector int not null,
  label text not null,
  lat double precision not null,
  lng double precision not null,
  grp text not null check (grp in ('study','comparison')),
  is_simulated boolean not null default true
);

create table devices (
  id uuid primary key default gen_random_uuid(),
  block_id text not null references blocks(id),
  owner uuid not null default auth.uid() references auth.users(id),
  label text not null check (char_length(label) between 1 and 60),
  before_shutoff_valve boolean not null default false,
  created_at timestamptz not null default now()
);

create table readings (
  id bigserial primary key,
  device_id uuid not null references devices(id) on delete cascade,
  owner uuid not null default auth.uid() references auth.users(id),
  ts timestamptz not null,
  pressure_bar real not null check (pressure_bar >= 0 and pressure_bar <= 10),
  source text not null check (source in ('simulated','real_test')),
  unique (device_id, ts)
);

create table block_week_stats (   -- written by the server after ML runs
  block_id text references blocks(id),
  week_start date not null,
  usable_hours real not null,
  events int not null,
  verified boolean not null,
  is_simulated boolean not null,
  primary key (block_id, week_start)
);

create table flags (
  id bigserial primary key,
  block_id text references blocks(id),
  week_start date not null,
  reason text not null,
  score real
);

alter table blocks enable row level security;
alter table devices enable row level security;
alter table readings enable row level security;
alter table block_week_stats enable row level security;
alter table flags enable row level security;

create policy "public read blocks" on blocks for select using (true);
create policy "public read stats" on block_week_stats for select using (true);
create policy "public read flags" on flags for select using (true);
create policy "own devices" on devices for all using (owner = auth.uid()) with check (owner = auth.uid());
create policy "own readings" on readings for all using (owner = auth.uid()) with check (owner = auth.uid()
  and exists (select 1 from devices d where d.id = device_id and d.owner = auth.uid()));

-- stats/flags: writes only from authenticated owners of a device on that block
create policy "owners write stats" on block_week_stats for insert to authenticated with check (
  exists (select 1 from devices d where d.block_id = block_week_stats.block_id and d.owner = auth.uid()));
create policy "owners update stats" on block_week_stats for update to authenticated using (
  exists (select 1 from devices d where d.block_id = block_week_stats.block_id and d.owner = auth.uid()));
create policy "owners write flags" on flags for insert to authenticated with check (
  exists (select 1 from devices d where d.block_id = flags.block_id and d.owner = auth.uid()));

-- Public view of raw minute data, lagged 14 days so only aggregates are ever "live".
-- No owner or device id is exposed — block_id only, via a join to devices.
create view readings_public with (security_invoker = false) as
  select d.block_id, r.ts, r.pressure_bar, r.source
  from readings r
  join devices d on d.id = r.device_id
  where r.ts < now() - interval '14 days';

grant select on readings_public to anon, authenticated;
