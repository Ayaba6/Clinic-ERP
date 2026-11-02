-- =====================================================================
-- Clinic ERP — Module Bloc opératoire
-- À exécuter UNE FOIS dans Supabase : SQL Editor > New query > Run.
-- Nécessite securite.sql et caisse.sql. Relançable.
--
-- Cycle d'une intervention :
--   demande (médecin) -> programme (chirurgien) -> en_cours -> termine
--   annule possible tant que l'intervention n'est pas terminée.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Salles d'opération
-- ---------------------------------------------------------------------
create table if not exists public.salles_bloc (
  id uuid primary key default gen_random_uuid(),
  nom varchar not null unique,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.salles_bloc enable row level security;

drop policy if exists "salles_select" on public.salles_bloc;
create policy "salles_select" on public.salles_bloc
  for select to authenticated using (true);

drop policy if exists "salles_write_admin" on public.salles_bloc;
create policy "salles_write_admin" on public.salles_bloc
  for all to authenticated
  using (public.mon_role() = 'admin')
  with check (public.mon_role() = 'admin');

insert into public.salles_bloc (nom) values ('Salle 1'), ('Salle 2')
on conflict (nom) do nothing;

-- ---------------------------------------------------------------------
-- 2. Interventions : colonnes complémentaires
-- ---------------------------------------------------------------------
alter table public.interventions_bloc alter column chirurgien_principal_id drop not null;
alter table public.interventions_bloc alter column date_programmee drop not null;

alter table public.interventions_bloc add column if not exists duree_prevue_min integer not null default 60
  check (duree_prevue_min between 5 and 1440);
alter table public.interventions_bloc add column if not exists type_anesthesie varchar
  check (type_anesthesie in ('generale', 'locoregionale', 'locale', 'sedation', 'aucune'));
alter table public.interventions_bloc add column if not exists equipe text;
alter table public.interventions_bloc add column if not exists notes_preop text;
alter table public.interventions_bloc add column if not exists complications text;
alter table public.interventions_bloc add column if not exists debut_reel timestamptz;
alter table public.interventions_bloc add column if not exists fin_reel timestamptz;
alter table public.interventions_bloc add column if not exists tarif_id uuid references public.tarifs(id) on delete set null;
alter table public.interventions_bloc add column if not exists prix numeric check (prix >= 0);
alter table public.interventions_bloc add column if not exists demande_par uuid references public.profiles(id) default auth.uid();
alter table public.interventions_bloc add column if not exists motif_annulation text;
alter table public.interventions_bloc add column if not exists facture_id uuid references public.factures(id) on delete set null;

alter table public.interventions_bloc drop constraint if exists interventions_bloc_statut_check;
alter table public.interventions_bloc add constraint interventions_bloc_statut_check
  check (statut in ('demande', 'programme', 'en_cours', 'termine', 'annule'));

create index if not exists interventions_bloc_date_idx on public.interventions_bloc (date_programmee);

-- ---------------------------------------------------------------------
-- 3. Droits : le médecin peut DEMANDER une intervention ; le chirurgien
--    et l'admin gèrent tout ; infirmiers, médecins et caisse consultent.
-- ---------------------------------------------------------------------
drop policy if exists "interventions_bloc_insert_demande" on public.interventions_bloc;
create policy "interventions_bloc_insert_demande" on public.interventions_bloc
  for insert to authenticated
  with check (public.mon_role() = 'medecin' and statut = 'demande');

-- ---------------------------------------------------------------------
-- 4. Contrôles à chaque écriture
-- ---------------------------------------------------------------------
create or replace function public.controler_intervention()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.statut = 'annule' then
      raise exception 'Cette intervention est annulée';
    end if;
    if old.statut = 'termine' and new.statut <> 'termine' then
      raise exception 'Cette intervention est terminée';
    end if;
  end if;

  if new.statut in ('programme', 'en_cours', 'termine') then
    if new.date_programmee is null or new.salle_operation is null or new.chirurgien_principal_id is null then
      raise exception 'Date, salle et chirurgien sont obligatoires pour programmer';
    end if;
  end if;

  if new.statut = 'en_cours' and (tg_op = 'INSERT' or old.statut <> 'en_cours') then
    new.debut_reel := coalesce(new.debut_reel, now());
  end if;

  if new.statut = 'termine' and (tg_op = 'INSERT' or old.statut <> 'termine') then
    if coalesce(trim(new.rapport_operatoire), '') = '' then
      raise exception 'Le compte rendu opératoire est obligatoire pour terminer';
    end if;
    new.debut_reel := coalesce(new.debut_reel, new.date_programmee);
    new.fin_reel := now();
  end if;

  if new.statut = 'annule' and (tg_op = 'INSERT' or old.statut <> 'annule') then
    if coalesce(trim(new.motif_annulation), '') = '' then
      raise exception 'Indiquez le motif de l''annulation';
    end if;
  end if;

  -- Une salle ne peut accueillir qu'une intervention à la fois
  if new.statut in ('programme', 'en_cours') and new.date_programmee is not null then
    if exists (
      select 1 from public.interventions_bloc i
      where i.id <> new.id
        and i.salle_operation = new.salle_operation
        and i.statut in ('programme', 'en_cours')
        and i.date_programmee is not null
        and tstzrange(i.date_programmee, i.date_programmee + make_interval(mins => i.duree_prevue_min))
         && tstzrange(new.date_programmee, new.date_programmee + make_interval(mins => new.duree_prevue_min))
    ) then
      raise exception '% est déjà occupée sur ce créneau', new.salle_operation;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_controler_intervention on public.interventions_bloc;
create trigger trg_controler_intervention
  before insert or update on public.interventions_bloc
  for each row execute function public.controler_intervention();

-- ---------------------------------------------------------------------
-- 5. Facturation automatique à la fin de l'intervention
--    (SECURITY DEFINER : le chirurgien n'a pas accès aux factures)
-- ---------------------------------------------------------------------
create or replace function public.facturer_intervention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_facture uuid;
begin
  if new.statut <> 'termine' or old.statut = 'termine' or new.facture_id is not null then
    return new;
  end if;

  insert into public.factures (patient_id, statut, cree_par)
  values (new.patient_id, 'en_attente', auth.uid())
  returning id into v_facture;

  insert into public.lignes_facture (facture_id, type_acte, description, quantite, prix_unitaire, tarif_id)
  values (v_facture, 'bloc', new.libelle_intervention, 1, coalesce(new.prix, 0), new.tarif_id);

  update public.interventions_bloc set facture_id = v_facture where id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_facturer_intervention on public.interventions_bloc;
create trigger trg_facturer_intervention
  after update of statut on public.interventions_bloc
  for each row execute function public.facturer_intervention();

-- Tarifs de bloc de départ, À ADAPTER dans Caisse > Tarifs
insert into public.tarifs (code, libelle, type_acte, prix) values
  ('BLOC_PETITE', 'Petite chirurgie', 'bloc', 25000),
  ('BLOC_MAJEURE', 'Chirurgie majeure', 'bloc', 150000)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- 6. Temps réel : le planning se met à jour sur tous les postes
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'interventions_bloc'
  ) then
    alter publication supabase_realtime add table public.interventions_bloc;
  end if;
end;
$$;
