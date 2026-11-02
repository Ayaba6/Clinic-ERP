-- =====================================================================
-- Clinique Nematoullah — Rendez-vous
-- À exécuter UNE FOIS dans Supabase : SQL Editor > New query > Run.
-- Nécessite securite.sql et grossesse.sql. Relançable.
--
-- Cycle : prévu -> confirmé (appel de la veille) -> arrivé (la patiente
-- passe en file d'attente) -> terminé | absent | annulé
-- Chaque CPN crée automatiquement le rendez-vous de la CPN suivante.
-- =====================================================================

create table if not exists public.rendez_vous (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  praticien_id uuid references public.profiles(id) on delete set null,
  grossesse_id uuid references public.grossesses(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  type varchar not null default 'consultation'
    check (type in ('consultation', 'cpn', 'controle', 'echographie', 'postnatal', 'vaccination', 'autre')),
  date_heure timestamptz not null,
  duree_min integer not null default 20 check (duree_min between 5 and 240),
  heure_a_confirmer boolean not null default false,   -- créé automatiquement, heure à fixer
  motif text,
  notes text,
  statut varchar not null default 'prevu'
    check (statut in ('prevu', 'confirme', 'arrive', 'termine', 'absent', 'annule')),
  motif_annulation text,
  cree_par uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists rendez_vous_date_idx on public.rendez_vous (date_heure);
create index if not exists rendez_vous_patient_idx on public.rendez_vous (patient_id, date_heure);

-- ---------------------------------------------------------------------
-- Contrôles : grossesse rattachée aux CPN, pas de double réservation
-- ---------------------------------------------------------------------
create or replace function public.controler_rendez_vous()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type in ('cpn', 'echographie', 'postnatal') and new.grossesse_id is null then
    select id into new.grossesse_id from public.grossesses
    where patient_id = new.patient_id and statut = 'en_cours';
  end if;

  if new.statut = 'annule' and coalesce(trim(new.motif_annulation), '') = '' then
    new.motif_annulation := 'Non précisé';
  end if;

  -- Un praticien ne peut avoir deux rendez-vous qui se chevauchent
  if new.praticien_id is not null and not new.heure_a_confirmer
     and new.statut in ('prevu', 'confirme') then
    if exists (
      select 1 from public.rendez_vous r
      where r.id <> new.id
        and r.praticien_id = new.praticien_id
        and r.statut in ('prevu', 'confirme')
        and not r.heure_a_confirmer
        and tstzrange(r.date_heure, r.date_heure + make_interval(mins => r.duree_min))
         && tstzrange(new.date_heure, new.date_heure + make_interval(mins => new.duree_min))
    ) then
      raise exception 'Ce praticien a déjà un rendez-vous sur ce créneau';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_controler_rendez_vous on public.rendez_vous;
create trigger trg_controler_rendez_vous
  before insert or update on public.rendez_vous
  for each row execute function public.controler_rendez_vous();

-- ---------------------------------------------------------------------
-- Arrivée de la patiente : passage en file d'attente du praticien
-- ---------------------------------------------------------------------
create or replace function public.arriver_rendez_vous(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_appointment uuid;
begin
  if coalesce(public.mon_role(), '') not in ('admin', 'reception', 'medecin', 'sage_femme') then
    raise exception 'Action non autorisée';
  end if;

  select * into r from public.rendez_vous where id = p_id for update;
  if not found then
    raise exception 'Rendez-vous introuvable';
  end if;
  if r.statut not in ('prevu', 'confirme') then
    raise exception 'Ce rendez-vous n''est plus en attente';
  end if;

  -- Déjà dans la file ? On réutilise le passage existant
  select id into v_appointment from public.appointments
  where patient_id = r.patient_id and statut in ('en_attente', 'en_consultation')
  limit 1;

  if v_appointment is null then
    insert into public.appointments (patient_id, doctor_id, motif, statut)
    values (
      r.patient_id,
      r.praticien_id,
      'RDV ' || case r.type
        when 'cpn' then 'CPN' when 'controle' then 'contrôle' when 'echographie' then 'échographie'
        when 'postnatal' then 'consultation postnatale' when 'vaccination' then 'vaccination'
        else 'consultation' end
        || coalesce(' — ' || nullif(trim(r.motif), ''), ''),
      'en_attente'
    )
    returning id into v_appointment;
  end if;

  update public.rendez_vous
  set statut = 'arrive', appointment_id = v_appointment
  where id = p_id;

  return v_appointment;
end;
$$;

revoke execute on function public.arriver_rendez_vous(uuid) from anon;
grant execute on function public.arriver_rendez_vous(uuid) to authenticated;

-- Quand le passage est terminé (consultation ou CPN), le rendez-vous l'est aussi
create or replace function public.terminer_rendez_vous_lie()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.statut = 'termine' and old.statut <> 'termine' then
    update public.rendez_vous set statut = 'termine'
    where appointment_id = new.id and statut = 'arrive';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_terminer_rendez_vous_lie on public.appointments;
create trigger trg_terminer_rendez_vous_lie
  after update of statut on public.appointments
  for each row execute function public.terminer_rendez_vous_lie();

-- ---------------------------------------------------------------------
-- Chaque CPN programme la suivante (heure à confirmer par la réception)
-- ---------------------------------------------------------------------
create or replace function public.programmer_cpn_suivante()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient uuid;
  v_praticien uuid;
  v_existant uuid;
  v_date timestamptz;
begin
  if new.prochaine_cpn is null then
    return new;
  end if;

  select patient_id into v_patient from public.grossesses where id = new.grossesse_id;
  select id into v_praticien from public.profiles
  where id = new.realisee_par and role in ('medecin', 'sage_femme');
  v_date := (new.prochaine_cpn::timestamp + time '08:00') at time zone 'Africa/Ouagadougou';

  -- Une seule CPN à venir par grossesse : on la déplace si elle existe déjà
  select id into v_existant from public.rendez_vous
  where grossesse_id = new.grossesse_id and type = 'cpn'
    and statut in ('prevu', 'confirme') and date_heure >= now() - interval '1 day'
  order by date_heure
  limit 1;

  if v_existant is not null then
    update public.rendez_vous
    set date_heure = v_date, heure_a_confirmer = true
    where id = v_existant;
  else
    insert into public.rendez_vous
      (patient_id, praticien_id, grossesse_id, type, date_heure, heure_a_confirmer, motif)
    values
      (v_patient, v_praticien, new.grossesse_id, 'cpn', v_date, true, 'CPN' || (new.numero + 1));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_programmer_cpn_suivante on public.cpn;
create trigger trg_programmer_cpn_suivante
  after insert on public.cpn
  for each row execute function public.programmer_cpn_suivante();

-- ---------------------------------------------------------------------
-- Droits d'accès
-- ---------------------------------------------------------------------
alter table public.rendez_vous enable row level security;

drop policy if exists "rendez_vous_select" on public.rendez_vous;
create policy "rendez_vous_select" on public.rendez_vous
  for select to authenticated
  using (public.mon_role() in ('admin', 'reception', 'medecin', 'sage_femme', 'infirmier', 'chirurgien'));

drop policy if exists "rendez_vous_write" on public.rendez_vous;
create policy "rendez_vous_write" on public.rendez_vous
  for all to authenticated
  using (public.mon_role() in ('admin', 'reception', 'medecin', 'sage_femme'))
  with check (public.mon_role() in ('admin', 'reception', 'medecin', 'sage_femme'));

-- Temps réel : l'agenda se met à jour sur tous les postes
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rendez_vous') then
    alter publication supabase_realtime add table public.rendez_vous;
  end if;
end;
$$;
