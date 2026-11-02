-- =====================================================================
-- Clinique Nematoullah — Rôle sage-femme et suivi de grossesse (CPN)
-- À exécuter UNE FOIS dans Supabase : SQL Editor > New query > Run.
-- Nécessite securite.sql, consultation.sql, caisse.sql et bloc.sql.
-- Relançable.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Rôle « sage_femme » (sage-femme / maïeuticien)
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'reception', 'medecin', 'sage_femme', 'infirmier', 'pharmacien', 'chirurgien', 'caisse'));

-- La sage-femme a les mêmes accès cliniques que le médecin
drop policy if exists "patients_select" on public.patients;
create policy "patients_select" on public.patients
  for select to authenticated
  using (public.mon_role() in ('admin', 'reception', 'medecin', 'sage_femme', 'infirmier', 'chirurgien', 'pharmacien', 'caisse'));

drop policy if exists "patients_update" on public.patients;
create policy "patients_update" on public.patients
  for update to authenticated
  using (public.mon_role() in ('admin', 'reception', 'medecin', 'sage_femme'))
  with check (public.mon_role() in ('admin', 'reception', 'medecin', 'sage_femme'));

drop policy if exists "appointments_select" on public.appointments;
create policy "appointments_select" on public.appointments
  for select to authenticated
  using (public.mon_role() in ('admin', 'reception', 'medecin', 'sage_femme', 'infirmier', 'chirurgien', 'caisse'));

drop policy if exists "appointments_update" on public.appointments;
create policy "appointments_update" on public.appointments
  for update to authenticated
  using (public.mon_role() in ('admin', 'reception', 'medecin', 'sage_femme'))
  with check (public.mon_role() in ('admin', 'reception', 'medecin', 'sage_femme'));

drop policy if exists "consultations_all" on public.consultations;
create policy "consultations_all" on public.consultations
  for all to authenticated
  using (public.mon_role() in ('admin', 'medecin', 'sage_femme'))
  with check (public.mon_role() in ('admin', 'medecin', 'sage_femme'));

drop policy if exists "prescriptions_all" on public.prescriptions;
create policy "prescriptions_all" on public.prescriptions
  for all to authenticated
  using (public.mon_role() in ('admin', 'medecin', 'sage_femme'))
  with check (public.mon_role() in ('admin', 'medecin', 'sage_femme'));

drop policy if exists "medicaments_select_medecin" on public.medicaments;
create policy "medicaments_select_medecin" on public.medicaments
  for select to authenticated
  using (public.mon_role() in ('medecin', 'sage_femme', 'chirurgien', 'infirmier'));

drop policy if exists "interventions_bloc_select_medecin" on public.interventions_bloc;
create policy "interventions_bloc_select_medecin" on public.interventions_bloc
  for select to authenticated
  using (public.mon_role() in ('medecin', 'sage_femme', 'infirmier', 'caisse'));

drop policy if exists "interventions_bloc_insert_demande" on public.interventions_bloc;
create policy "interventions_bloc_insert_demande" on public.interventions_bloc
  for insert to authenticated
  with check (public.mon_role() in ('medecin', 'sage_femme') and statut = 'demande');

-- NB : la version à jour de terminer_consultation (avec le type de
-- consultation) est dans supabase/prestations.sql. Après avoir relancé
-- ce fichier, relancez aussi prestations.sql.
-- La sage-femme peut aussi terminer une consultation (même fonction qu'avant,
-- seule la liste des rôles autorisés change)
create or replace function public.terminer_consultation(
  p_appointment_id uuid,
  p_poids numeric,
  p_temperature numeric,
  p_tension text,
  p_symptomes text,
  p_diagnostic text,
  p_prescriptions jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_statut text;
  v_consultation_id uuid;
begin
  if coalesce(public.mon_role(), '') not in ('admin', 'medecin', 'sage_femme') then
    raise exception 'Seuls les médecins et sages-femmes peuvent enregistrer une consultation';
  end if;

  select patient_id, statut into v_patient_id, v_statut
  from public.appointments
  where id = p_appointment_id
  for update;

  if v_patient_id is null then
    raise exception 'Passage introuvable';
  end if;
  if v_statut in ('termine', 'annule') then
    raise exception 'Ce passage est déjà clôturé';
  end if;

  insert into public.consultations
    (appointment_id, patient_id, doctor_id, poids, temperature, tension, symptomes, diagnostic)
  values
    (p_appointment_id, v_patient_id, auth.uid(), p_poids, p_temperature,
     nullif(p_tension, ''), nullif(p_symptomes, ''), nullif(p_diagnostic, ''))
  returning id into v_consultation_id;

  insert into public.prescriptions (consultation_id, medicament_id, quantite, posologie)
  select v_consultation_id, x.medicament_id, x.quantite, x.posologie
  from jsonb_to_recordset(coalesce(p_prescriptions, '[]'::jsonb))
    as x(medicament_id uuid, quantite int, posologie text);

  update public.appointments
  set statut = 'termine', doctor_id = coalesce(doctor_id, auth.uid())
  where id = p_appointment_id;

  return v_consultation_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Grossesses
-- ---------------------------------------------------------------------
create table if not exists public.grossesses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  ddr date,                                   -- date des dernières règles
  date_terme_prevue date,                     -- calculée (DDR + 280 j) ou corrigée à l'écho
  gestite integer check (gestite >= 1),
  parite integer check (parite >= 0),
  avortements integer check (avortements >= 0),
  enfants_vivants integer check (enfants_vivants >= 0),
  antecedents text,
  grossesse_a_risque boolean not null default false,
  facteurs_risque text,
  statut varchar not null default 'en_cours'
    check (statut in ('en_cours', 'accouchee', 'interrompue')),
  issue text,
  date_cloture date,
  suivi_par uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  constraint grossesses_date_reference check (ddr is not null or date_terme_prevue is not null)
);

-- Une seule grossesse en cours par patiente
create unique index if not exists grossesses_une_en_cours
  on public.grossesses (patient_id) where statut = 'en_cours';

create or replace function public.controler_grossesse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and (select genre from public.patients where id = new.patient_id) <> 'F' then
    raise exception 'Un suivi de grossesse ne peut concerner qu''une patiente';
  end if;

  -- Terme prévu = DDR + 280 jours (40 SA), sauf s'il a été saisi ou corrigé
  if new.ddr is not null and (
       new.date_terme_prevue is null
       or (tg_op = 'UPDATE' and new.ddr is distinct from old.ddr
           and new.date_terme_prevue is not distinct from old.date_terme_prevue)
     ) then
    new.date_terme_prevue := new.ddr + 280;
  end if;

  if new.statut <> 'en_cours' and (tg_op = 'INSERT' or old.statut = 'en_cours') then
    new.date_cloture := coalesce(new.date_cloture, current_date);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_controler_grossesse on public.grossesses;
create trigger trg_controler_grossesse
  before insert or update on public.grossesses
  for each row execute function public.controler_grossesse();

-- ---------------------------------------------------------------------
-- 3. Consultations prénatales (CPN)
-- ---------------------------------------------------------------------
create table if not exists public.cpn (
  id uuid primary key default gen_random_uuid(),
  grossesse_id uuid not null references public.grossesses(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  numero integer not null,
  date_cpn timestamptz not null default now(),
  age_gestationnel_jours integer,             -- calculé à l'enregistrement
  poids numeric check (poids > 0),
  tension_sys integer check (tension_sys between 40 and 300),
  tension_dia integer check (tension_dia between 20 and 200),
  hauteur_uterine numeric check (hauteur_uterine between 0 and 60),
  bcf integer check (bcf between 0 and 250),  -- bruits du cœur fœtal (bpm)
  presentation varchar check (presentation in ('cephalique', 'siege', 'transverse', 'indeterminee')),
  mouvements_actifs boolean,
  oedemes boolean,
  albuminurie varchar check (albuminurie in ('negatif', 'traces', '+', '++', '+++')),
  tpi_dose integer check (tpi_dose between 1 and 10),       -- SP / TPI n°
  vat_dose integer check (vat_dose between 1 and 5),        -- vaccin antitétanique n°
  fer_acide_folique boolean not null default false,
  moustiquaire boolean not null default false,
  examens text,
  observations text,
  conduite text,
  prochaine_cpn date,
  realisee_par uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists cpn_grossesse_idx on public.cpn (grossesse_id, date_cpn);

-- Avant enregistrement : numéro de la CPN et âge gestationnel
create or replace function public.preparer_cpn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
begin
  select * into g from public.grossesses where id = new.grossesse_id;
  if g.statut <> 'en_cours' then
    raise exception 'Cette grossesse est clôturée';
  end if;

  if tg_op = 'INSERT' then
    new.numero := coalesce((select max(numero) from public.cpn where grossesse_id = new.grossesse_id), 0) + 1;
  end if;

  new.age_gestationnel_jours :=
    (new.date_cpn at time zone 'Africa/Ouagadougou')::date - coalesce(g.ddr, g.date_terme_prevue - 280);
  return new;
end;
$$;

drop trigger if exists trg_preparer_cpn on public.cpn;
create trigger trg_preparer_cpn
  before insert or update on public.cpn
  for each row execute function public.preparer_cpn();

-- Après enregistrement : facturation (tarif CPN) et clôture du passage
create or replace function public.facturer_cpn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient uuid;
  v_facture uuid;
  v_tarif_id uuid;
  v_libelle text;
  v_prix numeric;
begin
  select patient_id into v_patient from public.grossesses where id = new.grossesse_id;
  select id, libelle, prix into v_tarif_id, v_libelle, v_prix
  from public.tarifs where code = 'CPN' and actif;

  insert into public.factures (patient_id, statut, cree_par)
  values (v_patient, 'en_attente', auth.uid())
  returning id into v_facture;

  insert into public.lignes_facture (facture_id, type_acte, description, quantite, prix_unitaire, tarif_id)
  values (v_facture, 'consultation', coalesce(v_libelle, 'Consultation prénatale') || ' (CPN' || new.numero || ')',
          1, coalesce(v_prix, 0), v_tarif_id);

  if new.appointment_id is not null then
    update public.appointments
    set statut = 'termine', doctor_id = coalesce(doctor_id, auth.uid())
    where id = new.appointment_id and statut in ('en_attente', 'en_consultation');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_facturer_cpn on public.cpn;
create trigger trg_facturer_cpn
  after insert on public.cpn
  for each row execute function public.facturer_cpn();

-- Tarifs maternité de départ, À ADAPTER dans Caisse > Tarifs
insert into public.tarifs (code, libelle, type_acte, prix) values
  ('CPN', 'Consultation prénatale', 'consultation', 2500),
  ('ECHO_OBST', 'Échographie obstétricale', 'autre', 10000)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- 4. Droits d'accès
-- ---------------------------------------------------------------------
alter table public.grossesses enable row level security;
alter table public.cpn enable row level security;

drop policy if exists "grossesses_select" on public.grossesses;
create policy "grossesses_select" on public.grossesses
  for select to authenticated
  using (public.mon_role() in ('admin', 'medecin', 'sage_femme', 'infirmier', 'chirurgien'));

drop policy if exists "grossesses_write" on public.grossesses;
create policy "grossesses_write" on public.grossesses
  for all to authenticated
  using (public.mon_role() in ('admin', 'medecin', 'sage_femme'))
  with check (public.mon_role() in ('admin', 'medecin', 'sage_femme'));

drop policy if exists "cpn_select" on public.cpn;
create policy "cpn_select" on public.cpn
  for select to authenticated
  using (public.mon_role() in ('admin', 'medecin', 'sage_femme', 'infirmier', 'chirurgien'));

drop policy if exists "cpn_write" on public.cpn;
create policy "cpn_write" on public.cpn
  for all to authenticated
  using (public.mon_role() in ('admin', 'medecin', 'sage_femme'))
  with check (public.mon_role() in ('admin', 'medecin', 'sage_femme'));
