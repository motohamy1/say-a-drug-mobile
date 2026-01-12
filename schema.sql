-- Create a table for public profiles link to auth.users
create table profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,

  constraint username_length check (char_length(username) >= 3)
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check ((select auth.uid()) = id);

create policy "Users can update own profile." on profiles
  for update using ((select auth.uid()) = id);

-- Create a table for drugs
create table drugs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  trade_name text not null,
  scientific_name text,
  price numeric not null,
  currency text default 'USD',
  manufacturer text,
  description text,
  image_url text,
  active_ingredients text[],
  dosage_form text,
  strength text
);

alter table drugs enable row level security;

create policy "Drugs are viewable by everyone." on drugs
  for select using (true);

-- Create a table for user favorites
create table user_favorites (
  user_id uuid references profiles(id) not null,
  drug_id uuid references drugs(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, drug_id)
);

alter table user_favorites enable row level security;

create policy "Users can view their own favorites." on user_favorites
  for select using ((select auth.uid()) = user_id);

create policy "Users can add their own favorites." on user_favorites
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can remove their own favorites." on user_favorites
  for delete using ((select auth.uid()) = user_id);
