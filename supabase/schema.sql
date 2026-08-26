-- Schéma à coller dans Supabase → SQL Editor → Run.
-- Idempotent : tu peux le rejouer sans rien casser.

-- ----------------------------------------------------------------- réponses

create table if not exists rsvps (
  slug            text primary key,
  name            text not null,
  -- null = « pas répondu », ce qui n'est pas la même chose que « non ».
  attending       text check (attending in ('oui', 'non', 'peut-etre')),
  -- Pourquoi ce n'est pas encore sûr, rempli seulement si attending = 'peut-etre'.
  maybe_note      text    not null default '',
  plus_one        boolean,
  plus_one_name   text    not null default '',
  sleepover       boolean,
  sleep_gear      text    not null default '',
  vegetarian      boolean,
  diet_notes      text    not null default '',
  drinks_alcohol  boolean,
  drinks          text[]  not null default '{}',
  -- Mot libre laissé à l'hôte, après le choix des musiques.
  message         text    not null default '',
  updated_at      timestamptz not null default now()
);

-- Migrations pour un projet déjà créé avant l'ajout de ces champs : le create
-- table ci-dessus ne touche pas une table existante, donc on les ajoute ici
-- explicitement. Sans effet si la colonne est déjà là.
alter table rsvps add column if not exists maybe_note text not null default '';
alter table rsvps add column if not exists message    text not null default '';

-- ----------------------------------------------------------------- playlist

create table if not exists tracks (
  id          uuid primary key default gen_random_uuid(),
  guest_slug  text   not null,
  guest_name  text   not null,
  track_id    bigint not null,
  title       text   not null,
  artist      text   not null,
  artwork     text   not null default '',
  preview_url text,
  apple_url   text   not null default '',
  created_at  timestamptz not null default now(),
  -- Deux personnes ne peuvent pas proposer le même morceau.
  constraint tracks_unique_song unique (track_id)
);

create index if not exists tracks_guest_idx on tracks (guest_slug);

-- Plafond de 3 morceaux par invité, appliqué côté base : le contrôle dans
-- l'interface ne résiste pas à deux onglets ouverts en même temps.
create or replace function enforce_track_quota() returns trigger as $$
begin
  if (select count(*) from tracks where guest_slug = new.guest_slug) >= 3 then
    raise exception 'quota de 3 morceaux atteint pour %', new.guest_slug
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tracks_quota on tracks;
create trigger tracks_quota before insert on tracks
  for each row execute function enforce_track_quota();

-- ---------------------------------------------------------------------- RLS

-- Le site n'a pas de comptes : la clé anon est publique et tout le monde écrit
-- avec. On autorise donc lecture / création / modification, mais pas la
-- suppression des réponses (un invité peut seulement retirer ses morceaux).
alter table rsvps  enable row level security;
alter table tracks enable row level security;

drop policy if exists rsvps_read   on rsvps;
drop policy if exists rsvps_write  on rsvps;
drop policy if exists rsvps_update on rsvps;
create policy rsvps_read   on rsvps for select using (true);
create policy rsvps_write  on rsvps for insert with check (true);
create policy rsvps_update on rsvps for update using (true) with check (true);

drop policy if exists tracks_read   on tracks;
drop policy if exists tracks_write  on tracks;
drop policy if exists tracks_delete on tracks;
create policy tracks_read   on tracks for select using (true);
create policy tracks_write  on tracks for insert with check (true);
create policy tracks_delete on tracks for delete using (true);
