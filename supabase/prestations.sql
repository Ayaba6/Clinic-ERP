-- =====================================================================
-- Clinique Nematoullah — Prestations et type de consultation
-- À exécuter UNE FOIS dans Supabase : SQL Editor > New query > Run.
-- Nécessite securite.sql, consultation.sql, caisse.sql et grossesse.sql.
-- Relançable.
--
-- 1. Grille des prestations de la clinique (prix à saisir dans
--    Caisse > Tarifs : ceux à 0 FCFA restent à compléter).
-- 2. Chaque consultation est facturée selon son TYPE (consultation
--    médecin, sage-femme, gynéco, cardiologie, planification familiale…).
-- 3. Médecins et sages-femmes peuvent ouvrir une consultation eux-mêmes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Prestations
-- ---------------------------------------------------------------------
insert into public.tarifs (code, libelle, type_acte, prix) values
  ('CONSULT_SF', 'Consultation sage-femme', 'consultation', 0),
  ('CONSULT_GYNECO', 'Consultation gynécologique', 'consultation', 0),
  ('CONSULT_CARDIO', 'Consultation cardiologie', 'consultation', 0),
  ('CONSULT_INF', 'Consultation infirmier', 'consultation', 0),
  ('PLANIF_FAM', 'Planification familiale', 'consultation', 0),
  ('CONSULT_POSTPARTUM', 'Consultation du post-partum', 'consultation', 0),
  ('CONSULT_POSTABORTUM', 'Consultation post-abortum', 'consultation', 0),
  ('SOINS_APRES_AVORT', 'Soins après avortement', 'autre', 0),
  ('TRAIT_AMBU', 'Traitement ambulatoire', 'autre', 0),
  ('SOINS_POSTOP', 'Soins post-opératoires', 'autre', 0),
  ('BLOC_CHIRURGIE', 'Chirurgie', 'bloc', 0),
  ('BLOC_CESARIENNE', 'Césarienne', 'bloc', 0),
  ('BLOC_CIRCONCISION', 'Circoncision', 'bloc', 0)
on conflict (code) do nothing;

-- Libellés alignés sur ceux de la clinique (seulement s'ils n'ont pas été modifiés)
update public.tarifs set libelle = 'Consultation médecin' where code = 'CONSULTATION' and libelle = 'Consultation générale';
update public.tarifs set libelle = 'Hospitalisation' where code = 'HOSPI_NUIT' and libelle = 'Hospitalisation (par nuit)';

-- Exemples de départ remplacés par les prestations réelles
update public.tarifs set actif = false
where code in ('CONSULT_SPE', 'BLOC_PETITE', 'BLOC_MAJEURE', 'INJECTION', 'PERFUSION');

-- ---------------------------------------------------------------------
-- 2. Type de consultation (= tarif facturé)
-- ---------------------------------------------------------------------
alter table public.appointments add column if not exists tarif_id uuid references public.tarifs(id) on delete set null;
alter table public.consultations add column if not exists tarif_id uuid references public.tarifs(id) on delete set null;

-- terminer_consultation reçoit désormais le type de consultation
drop function if exists public.terminer_consultation(uuid, numeric, numeric, text, text, text, jsonb);

create or replace function public.terminer_consultation(
  p_appointment_id uuid,
  p_poids numeric,
  p_temperature numeric,
  p_tension text,
  p_symptomes text,
  p_diagnostic text,
  p_prescriptions jsonb default '[]'::jsonb,
  p_tarif_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_statut text;
  v_tarif uuid;
  v_consultation_id uuid;
begin
  if coalesce(public.mon_role(), '') not in ('admin', 'medecin', 'sage_femme') then
    raise exception 'Seuls les médecins et sages-femmes peuvent enregistrer une consultation';
  end if;

  select patient_id, statut, tarif_id into v_patient_id, v_statut, v_tarif
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
    (appointment_id, patient_id, doctor_id, poids, temperature, tension, symptomes, diagnostic, tarif_id)
  values
    (p_appointment_id, v_patient_id, auth.uid(), p_poids, p_temperature,
     nullif(p_tension, ''), nullif(p_symptomes, ''), nullif(p_diagnostic, ''),
     coalesce(p_tarif_id, v_tarif))
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

revoke execute on function public.terminer_consultation(uuid, numeric, numeric, text, text, text, jsonb, uuid) from anon;
grant execute on function public.terminer_consultation(uuid, numeric, numeric, text, text, text, jsonb, uuid) to authenticated;

-- La facture de la consultation utilise le type choisi
-- (à défaut : consultation sage-femme pour une sage-femme, sinon consultation médecin)
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
  if new.tarif_id is not null then
    select id, libelle, prix into v_tarif_id, v_libelle, v_prix
    from public.tarifs where id = new.tarif_id;
  else
    select id, libelle, prix into v_tarif_id, v_libelle, v_prix
    from public.tarifs
    where actif and code = case
      when (select role from public.profiles where id = new.doctor_id) = 'sage_femme' then 'CONSULT_SF'
      else 'CONSULTATION' end;
  end if;

  insert into public.factures (patient_id, consultation_id, statut, cree_par)
  values (new.patient_id, new.id, 'en_attente', auth.uid())
  returning id into v_facture;

  insert into public.lignes_facture (facture_id, type_acte, description, quantite, prix_unitaire, tarif_id)
  values (v_facture, 'consultation', coalesce(v_libelle, 'Consultation'), 1, coalesce(v_prix, 0), v_tarif_id);

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Médecins et sages-femmes peuvent ouvrir une consultation
--    (création du passage dans la file, directement « en consultation »)
-- ---------------------------------------------------------------------
drop policy if exists "appointments_insert" on public.appointments;
create policy "appointments_insert" on public.appointments
  for insert to authenticated
  with check (public.mon_role() in ('admin', 'reception', 'medecin', 'sage_femme'));
