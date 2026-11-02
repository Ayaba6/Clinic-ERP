-- =====================================================================
-- Clinique Nematoullah — Salle de naissance et nouveau-nés
-- À exécuter UNE FOIS dans Supabase : SQL Editor > New query > Run.
-- Nécessite securite.sql, caisse.sql et grossesse.sql. Relançable.
--
-- Parcours : admission en travail -> surveillance -> accouchement
--   (nouveau-nés, dossier du bébé créé et relié à la mère, grossesse
--   clôturée, facturation) | transfert / évacuation | faux travail
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Lien mère / enfant dans les dossiers patients
-- ---------------------------------------------------------------------
alter table public.patients add column if not exists mere_id uuid references public.patients(id) on delete set null;
create index if not exists patients_mere_idx on public.patients (mere_id);

-- ---------------------------------------------------------------------
-- 2. Accouchements (une ligne par admission en salle de naissance)
-- ---------------------------------------------------------------------
create table if not exists public.accouchements (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  grossesse_id uuid references public.grossesses(id) on delete set null,
  statut varchar not null default 'travail'
    check (statut in ('travail', 'accouchee', 'transferee', 'annule')),
  admission_le timestamptz not null default now(),
  motif_admission text,
  poche_eaux varchar check (poche_eaux in ('intacte', 'rompue')),
  rupture_le timestamptz,
  accouchement_le timestamptz,
  mode varchar check (mode in ('voie_basse', 'instrumentale', 'cesarienne')),
  presentation varchar check (presentation in ('cephalique', 'siege', 'transverse', 'indeterminee')),
  episiotomie boolean,
  dechirure varchar check (dechirure in ('aucune', '1', '2', '3', '4')),
  delivrance varchar check (delivrance in ('naturelle', 'dirigee', 'artificielle')),
  gatpa boolean,                              -- gestion active de la 3e période (ocytocine)
  pertes_sang_ml integer check (pertes_sang_ml between 0 and 10000),
  complications text,
  etat_mere text,
  observations text,
  motif_cloture text,                         -- transfert / faux travail
  responsable_id uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- Une seule admission en cours par patiente
create unique index if not exists accouchements_un_travail
  on public.accouchements (patient_id) where statut = 'travail';
create index if not exists accouchements_date_idx on public.accouchements (accouchement_le desc);

create or replace function public.preparer_accouchement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select genre from public.patients where id = new.patient_id) <> 'F' then
    raise exception 'Une admission en salle de naissance ne peut concerner qu''une patiente';
  end if;
  -- Rattachement automatique à la grossesse suivie
  if new.grossesse_id is null then
    select id into new.grossesse_id from public.grossesses
    where patient_id = new.patient_id and statut = 'en_cours';
  end if;
  if new.poche_eaux = 'rompue' and new.rupture_le is null then
    new.rupture_le := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_preparer_accouchement on public.accouchements;
create trigger trg_preparer_accouchement
  before insert on public.accouchements
  for each row execute function public.preparer_accouchement();

-- ---------------------------------------------------------------------
-- 3. Surveillance du travail (partogramme simplifié)
-- ---------------------------------------------------------------------
create table if not exists public.surveillance_travail (
  id uuid primary key default gen_random_uuid(),
  accouchement_id uuid not null references public.accouchements(id) on delete cascade,
  mesure_le timestamptz not null default now(),
  dilatation_cm numeric check (dilatation_cm between 0 and 10),
  bcf integer check (bcf between 0 and 250),
  contractions_10min integer check (contractions_10min between 0 and 10),
  tension_sys integer check (tension_sys between 40 and 300),
  tension_dia integer check (tension_dia between 20 and 200),
  temperature numeric check (temperature between 30 and 45),
  liquide varchar check (liquide in ('intact', 'clair', 'teinte', 'meconial', 'sanglant')),
  remarques text,
  auteur_id uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists surveillance_travail_idx on public.surveillance_travail (accouchement_id, mesure_le);

-- ---------------------------------------------------------------------
-- 4. Nouveau-nés
-- ---------------------------------------------------------------------
create table if not exists public.nouveau_nes (
  id uuid primary key default gen_random_uuid(),
  accouchement_id uuid not null references public.accouchements(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,   -- dossier du bébé (si né vivant)
  rang integer not null default 1,
  sexe char(1) not null check (sexe in ('M', 'F')),
  vivant boolean not null default true,
  poids_g integer check (poids_g between 200 and 7000),
  taille_cm numeric check (taille_cm between 20 and 70),
  perimetre_cranien_cm numeric check (perimetre_cranien_cm between 15 and 50),
  apgar_1 integer check (apgar_1 between 0 and 10),
  apgar_5 integer check (apgar_5 between 0 and 10),
  reanimation boolean not null default false,
  malformations text,
  vitamine_k boolean not null default false,
  collyre boolean not null default false,
  mise_au_sein_precoce boolean not null default false,
  observations text,
  created_at timestamptz not null default now()
);

create index if not exists nouveau_nes_accouchement_idx on public.nouveau_nes (accouchement_id);

-- ---------------------------------------------------------------------
-- 5. Enregistrement de l'accouchement (transaction unique)
--    SECURITY DEFINER : crée le dossier patient du bébé, clôture la
--    grossesse et facture, ce que la sage-femme ne peut pas faire seule.
-- ---------------------------------------------------------------------
create or replace function public.terminer_accouchement(p_id uuid, p_data jsonb, p_enfants jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  m record;
  e jsonb;
  v_naissance timestamptz;
  v_mode text := p_data->>'mode';
  v_nb integer := jsonb_array_length(coalesce(p_enfants, '[]'::jsonb));
  v_rang integer := 0;
  v_bebe uuid;
  v_facture uuid;
  v_tarif_id uuid;
  v_libelle text;
  v_prix numeric;
begin
  if coalesce(public.mon_role(), '') not in ('admin', 'medecin', 'sage_femme') then
    raise exception 'Réservé aux sages-femmes et médecins';
  end if;

  select * into a from public.accouchements where id = p_id for update;
  if not found then
    raise exception 'Admission introuvable';
  end if;
  if a.statut <> 'travail' then
    raise exception 'Cette admission est déjà clôturée';
  end if;
  if v_nb = 0 then
    raise exception 'Indiquez au moins un nouveau-né';
  end if;
  if v_mode is null then
    raise exception 'Indiquez le mode d''accouchement';
  end if;

  v_naissance := coalesce(nullif(p_data->>'accouchement_le', '')::timestamptz, now());
  select * into m from public.patients where id = a.patient_id;

  update public.accouchements set
    statut = 'accouchee',
    accouchement_le = v_naissance,
    mode = v_mode,
    presentation = nullif(p_data->>'presentation', ''),
    episiotomie = (p_data->>'episiotomie')::boolean,
    dechirure = nullif(p_data->>'dechirure', ''),
    delivrance = nullif(p_data->>'delivrance', ''),
    gatpa = (p_data->>'gatpa')::boolean,
    pertes_sang_ml = nullif(p_data->>'pertes_sang_ml', '')::integer,
    complications = nullif(trim(p_data->>'complications'), ''),
    etat_mere = nullif(trim(p_data->>'etat_mere'), ''),
    observations = nullif(trim(p_data->>'observations'), '')
  where id = p_id;

  for e in select * from jsonb_array_elements(p_enfants) loop
    v_rang := v_rang + 1;
    v_bebe := null;

    -- Dossier patient du bébé, relié à la mère (téléphone de la mère)
    if coalesce((e->>'vivant')::boolean, true) then
      insert into public.patients (nom, prenom, date_naissance, genre, telephone, mere_id)
      values (
        m.nom,
        coalesce(nullif(trim(e->>'prenom'), ''), 'Bébé' || case when v_nb > 1 then ' ' || v_rang else '' end),
        (v_naissance at time zone 'Africa/Ouagadougou')::date,
        e->>'sexe',
        m.telephone,
        m.id
      )
      returning id into v_bebe;
    end if;

    insert into public.nouveau_nes (
      accouchement_id, patient_id, rang, sexe, vivant, poids_g, taille_cm, perimetre_cranien_cm,
      apgar_1, apgar_5, reanimation, malformations, vitamine_k, collyre, mise_au_sein_precoce, observations
    ) values (
      p_id, v_bebe, v_rang, e->>'sexe', coalesce((e->>'vivant')::boolean, true),
      nullif(e->>'poids_g', '')::integer, nullif(e->>'taille_cm', '')::numeric,
      nullif(e->>'perimetre_cranien_cm', '')::numeric,
      nullif(e->>'apgar_1', '')::integer, nullif(e->>'apgar_5', '')::integer,
      coalesce((e->>'reanimation')::boolean, false), nullif(trim(e->>'malformations'), ''),
      coalesce((e->>'vitamine_k')::boolean, false), coalesce((e->>'collyre')::boolean, false),
      coalesce((e->>'mise_au_sein_precoce')::boolean, false), nullif(trim(e->>'observations'), '')
    );
  end loop;

  -- Clôture de la grossesse suivie
  if a.grossesse_id is not null then
    update public.grossesses
    set statut = 'accouchee',
        date_cloture = (v_naissance at time zone 'Africa/Ouagadougou')::date,
        issue = case v_mode when 'cesarienne' then 'Césarienne' when 'instrumentale' then 'Voie basse instrumentale' else 'Voie basse' end
                || ' — ' || v_nb || ' enfant(s)'
    where id = a.grossesse_id and statut = 'en_cours';
  end if;

  -- Facturation (la césarienne est facturée par le bloc opératoire)
  if v_mode <> 'cesarienne' then
    select id, libelle, prix into v_tarif_id, v_libelle, v_prix
    from public.tarifs where code = 'ACC_VB' and actif;

    insert into public.factures (patient_id, statut, cree_par)
    values (a.patient_id, 'en_attente', auth.uid())
    returning id into v_facture;

    insert into public.lignes_facture (facture_id, type_acte, description, quantite, prix_unitaire, tarif_id)
    values (v_facture, 'autre', coalesce(v_libelle, 'Accouchement par voie basse'), 1, coalesce(v_prix, 0), v_tarif_id);
  end if;

  return json_build_object('accouchement_id', p_id, 'facture_id', v_facture);
end;
$$;

revoke execute on function public.terminer_accouchement(uuid, jsonb, jsonb) from anon;
grant execute on function public.terminer_accouchement(uuid, jsonb, jsonb) to authenticated;

-- Tarif de départ, À ADAPTER dans Caisse > Tarifs
insert into public.tarifs (code, libelle, type_acte, prix) values
  ('ACC_VB', 'Accouchement par voie basse', 'autre', 30000),
  ('KIT_ACC', 'Kit d''accouchement', 'autre', 10000)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- 6. Droits d'accès
-- ---------------------------------------------------------------------
alter table public.accouchements enable row level security;
alter table public.surveillance_travail enable row level security;
alter table public.nouveau_nes enable row level security;

drop policy if exists "accouchements_select" on public.accouchements;
create policy "accouchements_select" on public.accouchements
  for select to authenticated
  using (public.mon_role() in ('admin', 'medecin', 'sage_femme', 'infirmier', 'chirurgien'));

drop policy if exists "accouchements_write" on public.accouchements;
create policy "accouchements_write" on public.accouchements
  for all to authenticated
  using (public.mon_role() in ('admin', 'medecin', 'sage_femme'))
  with check (public.mon_role() in ('admin', 'medecin', 'sage_femme'));

drop policy if exists "surveillance_select" on public.surveillance_travail;
create policy "surveillance_select" on public.surveillance_travail
  for select to authenticated
  using (public.mon_role() in ('admin', 'medecin', 'sage_femme', 'infirmier', 'chirurgien'));

-- L'infirmier(ère) peut aussi relever les constantes pendant le travail
drop policy if exists "surveillance_insert" on public.surveillance_travail;
create policy "surveillance_insert" on public.surveillance_travail
  for insert to authenticated
  with check (public.mon_role() in ('admin', 'medecin', 'sage_femme', 'infirmier'));

drop policy if exists "nouveau_nes_select" on public.nouveau_nes;
create policy "nouveau_nes_select" on public.nouveau_nes
  for select to authenticated
  using (public.mon_role() in ('admin', 'medecin', 'sage_femme', 'infirmier', 'chirurgien', 'reception'));

-- ---------------------------------------------------------------------
-- 7. Temps réel : la salle de naissance se met à jour sur tous les postes
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'accouchements') then
    alter publication supabase_realtime add table public.accouchements;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'surveillance_travail') then
    alter publication supabase_realtime add table public.surveillance_travail;
  end if;
end;
$$;
