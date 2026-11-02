-- =====================================================================
-- Clinic ERP — Tableau de bord administrateur enrichi
-- À exécuter UNE FOIS dans Supabase : SQL Editor > New query > Run.
-- Nécessite securite.sql, pharmacie.sql et caisse.sql. Relançable.
--
-- Une seule fonction calcule tous les indicateurs côté base, pour une
-- période de p_jours jours (au-delà de 92 jours : regroupement par mois).
-- Les dates sont calculées à l'heure de Ouagadougou.
-- =====================================================================

create or replace function public.tableau_de_bord(p_jours integer default 30)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz constant text := 'Africa/Ouagadougou';
  v_today date := (now() at time zone v_tz)::date;
  v_mensuel boolean;
  v_debut date;
  v_debut_prec date;
  v_from timestamptz;
  v_from_prec timestamptz;
  v_from_jour timestamptz;
begin
  if coalesce(public.mon_role(), '') <> 'admin' then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  p_jours := greatest(1, least(coalesce(p_jours, 30), 366));
  v_mensuel := p_jours > 92;

  if v_mensuel then
    v_debut := (date_trunc('month', v_today) - interval '11 months')::date;
  else
    v_debut := v_today - (p_jours - 1);
  end if;
  -- Période précédente de même durée, pour les comparaisons
  v_debut_prec := v_debut - (v_today - v_debut + 1);

  v_from := v_debut::timestamp at time zone v_tz;
  v_from_prec := v_debut_prec::timestamp at time zone v_tz;
  v_from_jour := v_today::timestamp at time zone v_tz;

  return json_build_object(
    'periode', json_build_object('debut', v_debut, 'fin', v_today, 'mensuel', v_mensuel),

    'kpis', json_build_object(
      'recettes', (select coalesce(sum(montant), 0) from public.paiements where created_at >= v_from),
      'recettes_prec', (select coalesce(sum(montant), 0) from public.paiements
                        where created_at >= v_from_prec and created_at < v_from),
      'recettes_jour', (select coalesce(sum(montant), 0) from public.paiements where created_at >= v_from_jour),
      'consultations', (select count(*) from public.consultations where created_at >= v_from),
      'consultations_prec', (select count(*) from public.consultations
                             where created_at >= v_from_prec and created_at < v_from),
      'nouveaux_patients', (select count(*) from public.patients where created_at >= v_from),
      'nouveaux_patients_prec', (select count(*) from public.patients
                                 where created_at >= v_from_prec and created_at < v_from),
      'factures_ouvertes', (select count(*) from public.factures
                            where statut in ('en_attente', 'partielle') and montant_total > 0),
      'reste_a_encaisser', (select coalesce(sum(montant_total - montant_paye), 0) from public.factures
                            where statut in ('en_attente', 'partielle')),
      'en_attente', (select count(*) from public.appointments where statut in ('en_attente', 'en_consultation')),
      'ruptures', (select count(*) from public.medicaments where stock_actuel <= 0),
      'stock_bas', (select count(*) from public.medicaments where stock_actuel > 0 and stock_actuel <= seuil_alerte),
      'total_patients', (select count(*) from public.patients),
      'total_staff', (select count(*) from public.profiles)
    ),

    -- Recettes encaissées par jour (ou par mois), jours sans recette inclus
    'recettes_serie', (
      select json_agg(json_build_object('date', b.d, 'montant', coalesce(s.m, 0)) order by b.d)
      from (
        select generate_series(
          v_debut, v_today,
          case when v_mensuel then interval '1 month' else interval '1 day' end
        )::date as d
      ) b
      left join (
        select (date_trunc(case when v_mensuel then 'month' else 'day' end,
                           created_at at time zone v_tz))::date as d,
               sum(montant) as m
        from public.paiements
        where created_at >= v_from
        group by 1
      ) s on s.d = b.d
    ),

    'par_mode', (
      select coalesce(json_agg(json_build_object('mode', mode, 'montant', m) order by m desc), '[]'::json)
      from (select mode, sum(montant) as m from public.paiements where created_at >= v_from group by mode) x
    ),

    'par_medecin', (
      select coalesce(json_agg(json_build_object(
               'nom', coalesce(nullif(concat_ws(' ', p.nom, p.prenom), ''), 'Inconnu'),
               'consultations', x.n) order by x.n desc), '[]'::json)
      from (select doctor_id, count(*) as n from public.consultations
            where created_at >= v_from group by doctor_id) x
      left join public.profiles p on p.id = x.doctor_id
    ),

    'top_medicaments', (
      select coalesce(json_agg(json_build_object('nom', concat_ws(' ', x.nom, x.dosage), 'quantite', x.q)
                               order by x.q desc), '[]'::json)
      from (
        select m.nom, m.dosage, sum(ms.quantite) as q
        from public.mouvements_stock ms
        join public.medicaments m on m.id = ms.medicament_id
        where ms.type = 'sortie' and ms.created_at >= v_from
        group by m.id, m.nom, m.dosage
        order by q desc
        limit 8
      ) x
    ),

    'facture_par_type', (
      select coalesce(json_agg(json_build_object('type', type_acte, 'montant', mt) order by mt desc), '[]'::json)
      from (
        select lf.type_acte, sum(lf.montant_total) as mt
        from public.lignes_facture lf
        join public.factures f on f.id = lf.facture_id
        where f.statut <> 'annulee' and f.created_at >= v_from
        group by lf.type_acte
      ) x
    )
  );
end;
$$;

revoke execute on function public.tableau_de_bord(integer) from anon;
grant execute on function public.tableau_de_bord(integer) to authenticated;
