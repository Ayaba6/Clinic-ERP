-- =====================================================================
-- Clinic ERP — Module Caisse & Facturation
-- À exécuter UNE FOIS dans Supabase : SQL Editor > New query > Run.
-- Nécessite securite.sql, consultation.sql et pharmacie.sql. Relançable.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Grille tarifaire des actes
-- ---------------------------------------------------------------------
create table if not exists public.tarifs (
  id uuid primary key default gen_random_uuid(),
  code varchar unique,
  libelle varchar not null,
  type_acte varchar not null default 'autre'
    check (type_acte in ('consultation', 'medicament', 'bloc', 'autre')),
  prix numeric not null default 0 check (prix >= 0),
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.tarifs enable row level security;

drop policy if exists "tarifs_select" on public.tarifs;
create policy "tarifs_select" on public.tarifs
  for select to authenticated using (true);

drop policy if exists "tarifs_write_admin" on public.tarifs;
create policy "tarifs_write_admin" on public.tarifs
  for all to authenticated
  using (public.mon_role() = 'admin')
  with check (public.mon_role() = 'admin');

-- Tarifs de départ, À ADAPTER dans Caisse > Tarifs.
-- Le code CONSULTATION est utilisé pour facturer automatiquement chaque consultation.
insert into public.tarifs (code, libelle, type_acte, prix) values
  ('CONSULTATION', 'Consultation générale', 'consultation', 5000),
  ('CONSULT_SPE', 'Consultation spécialiste', 'consultation', 10000),
  ('PANSEMENT', 'Pansement', 'autre', 2000),
  ('INJECTION', 'Injection', 'autre', 1000),
  ('PERFUSION', 'Pose de perfusion', 'autre', 3000),
  ('HOSPI_NUIT', 'Hospitalisation (par nuit)', 'autre', 10000)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- 2. Factures : numéro, montant payé, lien avec la consultation
-- ---------------------------------------------------------------------
alter table public.factures add column if not exists numero varchar unique;
alter table public.factures add column if not exists montant_paye numeric not null default 0;
alter table public.factures add column if not exists consultation_id uuid references public.consultations(id) on delete set null;
alter table public.factures add column if not exists motif_annulation text;

alter table public.factures drop constraint if exists factures_statut_check;
alter table public.factures add constraint factures_statut_check
  check (statut in ('en_attente', 'partielle', 'payee', 'annulee'));

create index if not exists factures_statut_idx on public.factures (statut, created_at desc);

create sequence if not exists public.factures_numero_seq;

create or replace function public.generer_numero_facture()
returns trigger
language plpgsql
as $$
begin
  if new.numero is null or new.numero = '' then
    new.numero := 'FAC-' || extract(year from now())::int || '-'
      || lpad(nextval('public.factures_numero_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_numero_facture on public.factures;
create trigger trg_numero_facture
  before insert on public.factures
  for each row execute function public.generer_numero_facture();

-- ---------------------------------------------------------------------
-- 3. Lignes de facture : lien tarif / prescription, calcul automatique
-- ---------------------------------------------------------------------
alter table public.lignes_facture add column if not exists tarif_id uuid references public.tarifs(id) on delete set null;
alter table public.lignes_facture add column if not exists prescription_id uuid unique references public.prescriptions(id) on delete set null;
alter table public.lignes_facture add column if not exists created_at timestamptz not null default now();

-- Avant écriture : contrôle du statut de la facture + calcul du montant de la ligne
create or replace function public.controler_ligne_facture()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_statut text;
begin
  select statut into v_statut from public.factures
  where id = coalesce(new.facture_id, old.facture_id);

  if tg_op = 'DELETE' then
    if v_statut <> 'en_attente' then
      raise exception 'Impossible de retirer une ligne : la facture a déjà reçu un paiement ou est annulée';
    end if;
    return old;
  end if;

  if v_statut not in ('en_attente', 'partielle') then
    raise exception 'Cette facture est clôturée : créez une nouvelle facture';
  end if;
  if tg_op = 'UPDATE' and v_statut <> 'en_attente' then
    raise exception 'Impossible de modifier une ligne après un paiement';
  end if;
  if new.quantite <= 0 or new.prix_unitaire < 0 then
    raise exception 'Quantité ou prix invalide';
  end if;

  new.montant_total := new.quantite * new.prix_unitaire;
  return new;
end;
$$;

drop trigger if exists trg_controler_ligne_facture on public.lignes_facture;
create trigger trg_controler_ligne_facture
  before insert or update or delete on public.lignes_facture
  for each row execute function public.controler_ligne_facture();

-- Après écriture : recalcul du total de la facture
create or replace function public.maj_total_facture()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(new.facture_id, old.facture_id);
begin
  update public.factures
  set montant_total = coalesce((select sum(montant_total) from public.lignes_facture where facture_id = v_id), 0)
  where id = v_id;
  return null;
end;
$$;

drop trigger if exists trg_maj_total_facture on public.lignes_facture;
create trigger trg_maj_total_facture
  after insert or update or delete on public.lignes_facture
  for each row execute function public.maj_total_facture();

-- ---------------------------------------------------------------------
-- 4. Paiements (plusieurs paiements possibles par facture)
-- ---------------------------------------------------------------------
create table if not exists public.paiements (
  id uuid primary key default gen_random_uuid(),
  facture_id uuid not null references public.factures(id) on delete restrict,
  montant numeric not null check (montant > 0),
  mode varchar not null
    check (mode in ('especes', 'orange_money', 'moov_money', 'carte', 'assurance', 'autre')),
  reference text,
  encaisse_par uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists paiements_date_idx on public.paiements (created_at desc);
create index if not exists paiements_facture_idx on public.paiements (facture_id);

alter table public.paiements enable row level security;

-- Lecture et ajout seulement : un paiement ne se modifie ni ne se supprime
drop policy if exists "paiements_select" on public.paiements;
create policy "paiements_select" on public.paiements
  for select to authenticated
  using (public.mon_role() in ('admin', 'caisse'));

drop policy if exists "paiements_insert" on public.paiements;
create policy "paiements_insert" on public.paiements
  for insert to authenticated
  with check (public.mon_role() in ('admin', 'caisse'));

-- ---------------------------------------------------------------------
-- 5. Encaissement (transaction : paiement + mise à jour de la facture)
-- ---------------------------------------------------------------------
create or replace function public.encaisser(
  p_facture_id uuid,
  p_montant numeric,
  p_mode text,
  p_reference text default null
)
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  f record;
  v_paye numeric;
  v_statut text;
begin
  if coalesce(public.mon_role(), '') not in ('admin', 'caisse') then
    raise exception 'Réservé à la caisse';
  end if;

  select * into f from public.factures where id = p_facture_id for update;
  if not found then
    raise exception 'Facture introuvable';
  end if;
  if f.statut not in ('en_attente', 'partielle') then
    raise exception 'Cette facture est déjà soldée ou annulée';
  end if;
  if f.montant_total <= 0 then
    raise exception 'La facture est vide';
  end if;
  if p_montant is null or p_montant <= 0 then
    raise exception 'Montant invalide';
  end if;
  if p_montant > f.montant_total - f.montant_paye then
    raise exception 'Le montant dépasse le reste à payer (% FCFA)', f.montant_total - f.montant_paye;
  end if;

  insert into public.paiements (facture_id, montant, mode, reference)
  values (p_facture_id, p_montant, p_mode, nullif(trim(p_reference), ''));

  v_paye := f.montant_paye + p_montant;
  v_statut := case when v_paye >= f.montant_total then 'payee' else 'partielle' end;

  update public.factures
  set montant_paye = v_paye, statut = v_statut, mode_paiement = p_mode
  where id = p_facture_id;

  return json_build_object('montant_paye', v_paye, 'statut', v_statut, 'reste', f.montant_total - v_paye);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Annulation (seulement si rien n'a été encaissé)
-- ---------------------------------------------------------------------
create or replace function public.annuler_facture(p_facture_id uuid, p_motif text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  f record;
begin
  if coalesce(public.mon_role(), '') not in ('admin', 'caisse') then
    raise exception 'Réservé à la caisse';
  end if;
  if coalesce(trim(p_motif), '') = '' then
    raise exception 'Indiquez le motif de l''annulation';
  end if;

  select * into f from public.factures where id = p_facture_id for update;
  if not found then
    raise exception 'Facture introuvable';
  end if;
  if f.montant_paye > 0 then
    raise exception 'Impossible d''annuler une facture qui a déjà reçu un paiement';
  end if;
  if f.statut = 'annulee' then
    return;
  end if;

  update public.factures
  set statut = 'annulee', motif_annulation = trim(p_motif)
  where id = p_facture_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Facturation automatique
--    SECURITY DEFINER : le médecin et le pharmacien n'ont pas accès aux
--    factures, mais leurs actions doivent en créer.
-- ---------------------------------------------------------------------

-- Chaque consultation terminée crée une facture avec l'acte « Consultation »
create or replace function public.facturer_consultation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_facture uuid;
  v_tarif_id uuid;
  v_libelle text;
  v_prix numeric;
begin
  select id, libelle, prix into v_tarif_id, v_libelle, v_prix
  from public.tarifs where code = 'CONSULTATION' and actif;

  insert into public.factures (patient_id, consultation_id, statut, cree_par)
  values (new.patient_id, new.id, 'en_attente', auth.uid())
  returning id into v_facture;

  insert into public.lignes_facture (facture_id, type_acte, description, quantite, prix_unitaire, tarif_id)
  values (v_facture, 'consultation', coalesce(v_libelle, 'Consultation'), 1, coalesce(v_prix, 0), v_tarif_id);

  return new;
end;
$$;

drop trigger if exists trg_facturer_consultation on public.consultations;
create trigger trg_facturer_consultation
  after insert on public.consultations
  for each row execute function public.facturer_consultation();

-- Chaque médicament délivré est ajouté à la facture ouverte de la consultation
-- (ou à une nouvelle facture si celle-ci est déjà soldée)
create or replace function public.facturer_prescription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient uuid;
  v_facture uuid;
  v_nom text;
  v_prix numeric;
begin
  if new.statut <> 'delivre' or old.statut = 'delivre' then
    return new;
  end if;
  if exists (select 1 from public.lignes_facture where prescription_id = new.id) then
    return new;
  end if;

  select patient_id into v_patient from public.consultations where id = new.consultation_id;
  select concat_ws(' ', nom, dosage), prix_vente into v_nom, v_prix
  from public.medicaments where id = new.medicament_id;

  select id into v_facture from public.factures
  where consultation_id = new.consultation_id and statut in ('en_attente', 'partielle')
  order by created_at desc
  limit 1;

  if v_facture is null then
    insert into public.factures (patient_id, consultation_id, statut, cree_par)
    values (v_patient, new.consultation_id, 'en_attente', auth.uid())
    returning id into v_facture;
  end if;

  insert into public.lignes_facture (facture_id, type_acte, description, quantite, prix_unitaire, prescription_id)
  values (v_facture, 'medicament', v_nom, new.quantite, coalesce(v_prix, 0), new.id);

  return new;
end;
$$;

drop trigger if exists trg_facturer_prescription on public.prescriptions;
create trigger trg_facturer_prescription
  after update of statut on public.prescriptions
  for each row execute function public.facturer_prescription();

-- ---------------------------------------------------------------------
-- 8. Tableau de bord admin : le chiffre d'affaires = sommes encaissées
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
    'totalRevenue',  (select coalesce(sum(montant), 0) from public.paiements)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 9. Droits d'exécution et temps réel
-- ---------------------------------------------------------------------
revoke execute on function public.encaisser(uuid, numeric, text, text) from anon;
revoke execute on function public.annuler_facture(uuid, text) from anon;
grant execute on function public.encaisser(uuid, numeric, text, text) to authenticated;
grant execute on function public.annuler_facture(uuid, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'factures'
  ) then
    alter publication supabase_realtime add table public.factures;
  end if;
end;
$$;
