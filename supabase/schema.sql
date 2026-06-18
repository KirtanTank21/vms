-- ============================================================
-- PROPERTIES
-- ============================================================
create table if not exists properties (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  address    text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- USERS  (mirrors auth.users via trigger)
-- role: guard | host | admin
-- ============================================================
create table if not exists users (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null,
  name              text not null,
  role              text not null check (role in ('guard', 'host', 'admin')),
  property_id       uuid references properties(id),
  push_subscription jsonb,
  created_at        timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'guard'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- VISITORS
-- ============================================================
create table if not exists visitors (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  phone          text,
  photo_url      text,
  host_id        uuid references users(id),
  host_name      text,                          -- denormalized copy for display
  purpose        text,
  checked_in_at  timestamptz not null default now(),
  checked_out_at timestamptz,
  badge_number   text,
  property_id    uuid references properties(id),
  logged_by      uuid references users(id),
  created_at     timestamptz not null default now()
);

create index if not exists idx_visitors_property_id    on visitors(property_id);
create index if not exists idx_visitors_host_id        on visitors(host_id);
create index if not exists idx_visitors_checked_out_at on visitors(checked_out_at);
create index if not exists idx_visitors_checked_in_at  on visitors(checked_in_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table properties enable row level security;
alter table users       enable row level security;
alter table visitors    enable row level security;

-- ---------- users policies ----------

-- Everyone reads their own profile
create policy "users: read own" on users
  for select using (auth.uid() = id);

-- Guards/admins read all users in their property (for host dropdown + admin mgmt)
create policy "users: read same property" on users
  for select using (
    property_id = (select property_id from users where id = auth.uid())
    and (select role from users where id = auth.uid()) in ('guard', 'admin')
  );

-- ---------- properties policies ----------

create policy "properties: read own" on properties
  for select using (
    id = (select property_id from users where id = auth.uid())
  );

-- ---------- visitors policies ----------

-- Guards and admins read all visitors in their property
create policy "visitors: guard reads property" on visitors
  for select using (
    property_id = (select property_id from users where id = auth.uid())
    and (select role from users where id = auth.uid()) in ('guard', 'admin')
  );

-- Hosts read only their own visitors
create policy "visitors: host reads own" on visitors
  for select using (
    host_id = auth.uid()
  );

-- Guards and admins can insert visitors for their property
create policy "visitors: guard can insert" on visitors
  for insert with check (
    logged_by = auth.uid()
    and property_id = (select property_id from users where id = auth.uid())
    and (select role from users where id = auth.uid()) in ('guard', 'admin')
  );

-- Guards and admins can update (check-out) visitors in their property
create policy "visitors: guard can checkout" on visitors
  for update using (
    property_id = (select property_id from users where id = auth.uid())
    and (select role from users where id = auth.uid()) in ('guard', 'admin')
  );
