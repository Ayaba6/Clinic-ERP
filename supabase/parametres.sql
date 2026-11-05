-- =====================================================================
-- Clinique Nematoullah — Paramètres de la clinique
-- À exécuter UNE FOIS dans Supabase : SQL Editor > New query > Run.
-- Nécessite securite.sql. Relançable.
--
-- Une seule ligne : nom, adresse et coordonnées imprimés sur les
-- ordonnances, reçus et comptes rendus. Modifiable par l'admin dans
-- Administration > Paramètres de la clinique.
-- =====================================================================

create table if not exists public.parametres_clinique (
  id integer primary key default 1 check (id = 1),
  nom varchar not null,
  sous_titre varchar,
  adresse varchar,
  telephone varchar,
  email varchar,
  mention_documents text,
  updated_at timestamptz not null default now()
);

insert into public.parametres_clinique (id, nom, sous_titre, adresse)
values (
  1,
  'Clinique Nematoullah',
  'Clinique d''accouchement — Médecine générale et gynécologie-obstétrique',
  'Dassasgho, Arrondissement 12, Ouagadougou — Burkina Faso'
)
on conflict (id) do nothing;

alter table public.parametres_clinique enable row level security;

-- Lecture publique : le nom s'affiche aussi sur la page de connexion
drop policy if exists "parametres_select" on public.parametres_clinique;
create policy "parametres_select" on public.parametres_clinique
  for select to anon, authenticated using (true);

drop policy if exists "parametres_update_admin" on public.parametres_clinique;
create policy "parametres_update_admin" on public.parametres_clinique
  for update to authenticated
  using (public.mon_role() = 'admin')
  with check (public.mon_role() = 'admin');

create or replace function public.maj_parametres_date()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_maj_parametres_date on public.parametres_clinique;
create trigger trg_maj_parametres_date
  before update on public.parametres_clinique
  for each row execute function public.maj_parametres_date();

-- ---------------------------------------------------------------------
-- Identité visuelle (logo) : slogan et nom tel qu'écrit sur le logo
-- ---------------------------------------------------------------------
alter table public.parametres_clinique add column if not exists slogan varchar;

update public.parametres_clinique
set slogan = 'Sauvons d''abord les vies, le reste viendra de lui-même'
where id = 1 and slogan is null;

-- Orthographe du logo « NEEMATOULLAH » (seulement si le nom n'a pas été personnalisé)
update public.parametres_clinique
set nom = 'Clinique Neematoullah'
where id = 1 and nom = 'Clinique Nematoullah';
