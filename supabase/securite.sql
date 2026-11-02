-- =====================================================================
-- Clinique Nematoullah — Sécurité (RLS), code patient et statistiques admin
-- À exécuter UNE FOIS dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans danger (idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Rôles autorisés (ajout du rôle « infirmier »)
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'reception', 'medecin', 'sage_femme', 'infirmier', 'pharmacien', 'chirurgien', 'caisse'));

-- ---------------------------------------------------------------------
-- 1. Fonction utilitaire : rôle de l'utilisateur connecté
--    SECURITY DEFINER pour lire `profiles` sans boucler sur ses propres
--    règles RLS.
-- ---------------------------------------------------------------------
create or replace function public.mon_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------------------
-- 2. Création automatique du profil à l'inscription
--    AVANT : le rôle venait des métadonnées envoyées par l'utilisateur
--    lui-même, et valait 'admin' par défaut. N'importe qui pouvant
--    s'inscrire devenait administrateur.
--    MAINTENANT : rôle 'reception' par défaut, l'admin l'ajuste ensuite
--    depuis la page Personnel & Rôles.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nom, prenom, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nom', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'prenom', ''),
    'reception'
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. PROFILES : tout le personnel connecté voit la liste (nécessaire pour
--    choisir un médecin, afficher un prescripteur…), seul l'admin modifie
--    les rôles.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (true);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.mon_role() = 'admin')
  with check (public.mon_role() = 'admin');

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Garde-fou : un non-admin qui modifie son profil ne peut pas toucher au rôle
create or replace function public.bloquer_changement_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(public.mon_role(), '') <> 'admin'
     and auth.uid() is not null then
    raise exception 'Seul un administrateur peut modifier un rôle';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bloquer_changement_role on public.profiles;
create trigger trg_bloquer_changement_role
  before update on public.profiles
  for each row execute function public.bloquer_changement_role();

-- ---------------------------------------------------------------------
-- 4. PATIENTS : tout le personnel lit, réception et admin créent
-- ---------------------------------------------------------------------
alter table public.patients enable row level security;

drop policy if exists "patients_select" on public.patients;
create policy "patients_select" on public.patients
  for select to authenticated
  using (public.mon_role() in ('admin', 'reception', 'medecin', 'sage_femme', 'infirmier', 'chirurgien', 'pharmacien', 'caisse'));

drop policy if exists "patients_insert" on public.patients;
create policy "patients_insert" on public.patients
  for insert to authenticated
  with check (public.mon_role() in ('admin', 'reception'));

drop policy if exists "patients_update" on public.patients;
create policy "patients_update" on public.patients
  for update to authenticated
  using (public.mon_role() in ('admin', 'reception', 'medecin', 'sage_femme'))
  with check (public.mon_role() in ('admin', 'reception', 'medecin', 'sage_femme'));

-- ---------------------------------------------------------------------
-- 5. RENDEZ-VOUS / FILE D'ATTENTE (appointments)
-- ---------------------------------------------------------------------
alter table public.appointments enable row level security;

drop policy if exists "appointments_select" on public.appointments;
create policy "appointments_select" on public.appointments
  for select to authenticated
  using (public.mon_role() in ('admin', 'reception', 'medecin', 'sage_femme', 'infirmier', 'chirurgien', 'caisse'));

drop policy if exists "appointments_insert" on public.appointments;
create policy "appointments_insert" on public.appointments
  for insert to authenticated
  with check (public.mon_role() in ('admin', 'reception'));

drop policy if exists "appointments_update" on public.appointments;
create policy "appointments_update" on public.appointments
  for update to authenticated
  using (public.mon_role() in ('admin', 'reception', 'medecin', 'sage_femme'))
  with check (public.mon_role() in ('admin', 'reception', 'medecin', 'sage_femme'));

-- ---------------------------------------------------------------------
-- 6. CONSULTATIONS : médecins et admin ; lecture pour chirurgiens et infirmiers
-- ---------------------------------------------------------------------
alter table public.consultations enable row level security;

drop policy if exists "consultations_all" on public.consultations;
create policy "consultations_all" on public.consultations
  for all to authenticated
  using (public.mon_role() in ('admin', 'medecin', 'sage_femme'))
  with check (public.mon_role() in ('admin', 'medecin', 'sage_femme'));

drop policy if exists "consultations_select_chirurgien" on public.consultations;
drop policy if exists "consultations_select_lecture" on public.consultations;
create policy "consultations_select_lecture" on public.consultations
  for select to authenticated
  using (public.mon_role() in ('chirurgien', 'infirmier'));

-- ---------------------------------------------------------------------
-- 7. PRESCRIPTIONS : le médecin prescrit, le pharmacien lit et délivre
-- ---------------------------------------------------------------------
alter table public.prescriptions enable row level security;

drop policy if exists "prescriptions_all" on public.prescriptions;
create policy "prescriptions_all" on public.prescriptions
  for all to authenticated
  using (public.mon_role() in ('admin', 'medecin', 'sage_femme'))
  with check (public.mon_role() in ('admin', 'medecin', 'sage_femme'));

drop policy if exists "prescriptions_select_pharmacien" on public.prescriptions;
create policy "prescriptions_select_pharmacien" on public.prescriptions
  for select to authenticated
  using (public.mon_role() in ('pharmacien', 'caisse', 'infirmier', 'chirurgien'));

drop policy if exists "prescriptions_update_pharmacien" on public.prescriptions;
create policy "prescriptions_update_pharmacien" on public.prescriptions
  for update to authenticated
  using (public.mon_role() = 'pharmacien')
  with check (public.mon_role() = 'pharmacien');

-- ---------------------------------------------------------------------
-- 8. BLOC OPÉRATOIRE : chirurgiens et admin ; lecture pour les médecins
-- ---------------------------------------------------------------------
alter table public.interventions_bloc enable row level security;

drop policy if exists "interventions_bloc_all" on public.interventions_bloc;
create policy "interventions_bloc_all" on public.interventions_bloc
  for all to authenticated
  using (public.mon_role() in ('admin', 'chirurgien'))
  with check (public.mon_role() in ('admin', 'chirurgien'));

drop policy if exists "interventions_bloc_select_medecin" on public.interventions_bloc;
create policy "interventions_bloc_select_medecin" on public.interventions_bloc
  for select to authenticated
  using (public.mon_role() in ('medecin', 'sage_femme', 'infirmier', 'caisse'));

-- ---------------------------------------------------------------------
-- 9. LIGNES DE FACTURE : caisse et admin
-- ---------------------------------------------------------------------
alter table public.lignes_facture enable row level security;

drop policy if exists "lignes_facture_all" on public.lignes_facture;
create policy "lignes_facture_all" on public.lignes_facture
  for all to authenticated
  using (public.mon_role() in ('admin', 'caisse'))
  with check (public.mon_role() in ('admin', 'caisse'));

-- ---------------------------------------------------------------------
-- 10. MEDICAMENTS : pharmacie et admin
-- ---------------------------------------------------------------------
alter table public.medicaments enable row level security;

drop policy if exists "medicaments_all" on public.medicaments;
create policy "medicaments_all" on public.medicaments
  for all to authenticated
  using (public.mon_role() in ('admin', 'pharmacien'))
  with check (public.mon_role() in ('admin', 'pharmacien'));

drop policy if exists "medicaments_select_medecin" on public.medicaments;
create policy "medicaments_select_medecin" on public.medicaments
  for select to authenticated
  using (public.mon_role() in ('medecin', 'sage_femme', 'chirurgien', 'infirmier'));

-- ---------------------------------------------------------------------
-- 11. FACTURES : caisse et admin
-- ---------------------------------------------------------------------
alter table public.factures enable row level security;

drop policy if exists "factures_all" on public.factures;
create policy "factures_all" on public.factures
  for all to authenticated
  using (public.mon_role() in ('admin', 'caisse'))
  with check (public.mon_role() in ('admin', 'caisse'));

-- ---------------------------------------------------------------------
-- 12. Code patient unique généré par la base : PAT-2026-00001
-- ---------------------------------------------------------------------
create sequence if not exists public.patients_code_seq;

create or replace function public.generer_code_patient()
returns trigger
language plpgsql
as $$
begin
  if new.code_patient is null or new.code_patient = '' then
    new.code_patient := 'PAT-' || extract(year from now())::int || '-'
      || lpad(nextval('public.patients_code_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_code_patient on public.patients;
create trigger trg_code_patient
  before insert on public.patients
  for each row execute function public.generer_code_patient();
-- (L'unicité est déjà garantie par la contrainte patients_code_patient_key.)

-- ---------------------------------------------------------------------
-- 13. Statistiques du tableau de bord admin (calculées côté base)
-- ---------------------------------------------------------------------
create or replace function public.stats_admin()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(public.mon_role(), '') <> 'admin' then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  return json_build_object(
    'totalPatients', (select count(*) from public.patients),
    'totalStaff',    (select count(*) from public.profiles),
    'lowStockCount', (select count(*) from public.medicaments where stock_actuel <= seuil_alerte),
    'totalRevenue',  (select coalesce(sum(montant_total), 0) from public.factures where statut = 'payee')
  );
end;
$$;

revoke execute on function public.stats_admin() from anon;
grant execute on function public.stats_admin() to authenticated;
