-- =====================================================================
-- Clinique Nematoullah — Module Consultation
-- À exécuter UNE FOIS dans Supabase : SQL Editor > New query > Run.
-- Nécessite supabase/securite.sql (fonction mon_role). Relançable.
-- =====================================================================

-- NB : la version à jour de terminer_consultation (avec le type de
-- consultation) est dans supabase/prestations.sql. Après avoir relancé
-- ce fichier, relancez aussi prestations.sql.
-- ---------------------------------------------------------------------
-- 1. Terminer une consultation en une seule transaction :
--    fiche de consultation + ordonnance + passage marqué « terminé ».
--    Si une étape échoue, rien n'est enregistré.
--    SECURITY INVOKER : les règles RLS de l'utilisateur s'appliquent.
-- ---------------------------------------------------------------------
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
    raise exception 'Seuls les médecins peuvent enregistrer une consultation';
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

revoke execute on function public.terminer_consultation(uuid, numeric, numeric, text, text, text, jsonb) from anon;
grant execute on function public.terminer_consultation(uuid, numeric, numeric, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Temps réel sur la file d'attente : le médecin voit arriver les
--    patients sans recharger la page (les règles RLS s'appliquent).
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;
end;
$$;
