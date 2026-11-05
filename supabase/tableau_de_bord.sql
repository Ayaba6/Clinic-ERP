-- =====================================================================
-- Clinique Nematoullah — Tableau de bord administrateur enrichi
-- À exécuter UNE FOIS dans Supabase : SQL Editor > New query > Run.
-- Nécessite securite.sql, pharmacie.sql, caisse.sql, grossesse.sql,
-- naissance.sql et rendezvous.sql. Relançable.
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
      'total_staff', (select count(*) from public.profiles),

      -- Facturé sur la période (hors factures annulées) : base du taux de recouvrement
      'facture', (select coalesce(sum(montant_total), 0) from public.factures
                  where statut <> 'annulee' and created_at >= v_from),
      -- Impayés de plus de 7 jours : à relancer
      'impayes_anciens', (select count(*) from public.factures
                          where statut in ('en_attente', 'partielle') and montant_total > montant_paye
                            and created_at < now() - interval '7 days'),
      'impayes_anciens_montant', (select coalesce(sum(montant_total - montant_paye), 0) from public.factures
                                  where statut in ('en_attente', 'partielle')
                                    and created_at < now() - interval '7 days'),
      -- Activité du jour
      'consultations_jour', (select count(*) from public.consultations where created_at >= v_from_jour),
      'accouchements_jour', (select count(*) from public.accouchements
                             where statut = 'accouchee' and accouchement_le >= v_from_jour),
      'cpn_jour', (select count(*) from public.cpn where date_cpn >= v_from_jour)
    ),

    -- Par jour (ou par mois), périodes vides incluses : recettes encaissées
    -- et activité (consultations, accouchements, CPN, nouveaux patients)
    'recettes_serie', (
      select json_agg(json_build_object(
        'date', b.d,
        'montant', coalesce(s.m, 0),
        'consultations', coalesce(c.n, 0),
        'accouchements', coalesce(a.n, 0),
        'cpn', coalesce(k.n, 0),
        'patients', coalesce(p.n, 0)
      ) order by b.d)
      from (
        select generate_series(
          v_debut, v_today,
          case when v_mensuel then interval '1 month' else interval '1 day' end
        )::date as d
      ) b
      left join (
        select (date_trunc(case when v_mensuel then 'month' else 'day' end, created_at at time zone v_tz))::date as d,
               sum(montant) as m
        from public.paiements where created_at >= v_from group by 1
      ) s on s.d = b.d
      left join (
        select (date_trunc(case when v_mensuel then 'month' else 'day' end, created_at at time zone v_tz))::date as d,
               count(*) as n
        from public.consultations where created_at >= v_from group by 1
      ) c on c.d = b.d
      left join (
        select (date_trunc(case when v_mensuel then 'month' else 'day' end, accouchement_le at time zone v_tz))::date as d,
               count(*) as n
        from public.accouchements where statut = 'accouchee' and accouchement_le >= v_from group by 1
      ) a on a.d = b.d
      left join (
        select (date_trunc(case when v_mensuel then 'month' else 'day' end, date_cpn at time zone v_tz))::date as d,
               count(*) as n
        from public.cpn where date_cpn >= v_from group by 1
      ) k on k.d = b.d
      left join (
        select (date_trunc(case when v_mensuel then 'month' else 'day' end, created_at at time zone v_tz))::date as d,
               count(*) as n
        from public.patients where created_at >= v_from group by 1
      ) p on p.d = b.d
    ),

    -- Prestations qui rapportent le plus (montant facturé, hors annulations)
    'top_prestations', (
      select coalesce(json_agg(json_build_object('libelle', x.description, 'montant', x.mt, 'nombre', x.n)
                               order by x.mt desc), '[]'::json)
      from (
        select lf.description, sum(lf.montant_total) as mt, sum(lf.quantite) as n
        from public.lignes_facture lf
        join public.factures f on f.id = lf.facture_id
        where f.statut <> 'annulee' and f.created_at >= v_from and lf.type_acte <> 'medicament'
        group by lf.description
        order by mt desc
        limit 6
      ) x
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
    ),

    -- Maternité : activité de la période et situation en ce moment
    'maternite', json_build_object(
      'accouchements', (select count(*) from public.accouchements
                        where statut = 'accouchee' and accouchement_le >= v_from),
      'accouchements_prec', (select count(*) from public.accouchements
                             where statut = 'accouchee' and accouchement_le >= v_from_prec and accouchement_le < v_from),
      'cesariennes', (select count(*) from public.accouchements
                      where statut = 'accouchee' and mode = 'cesarienne' and accouchement_le >= v_from),
      'naissances_vivantes', (select count(*) from public.nouveau_nes n join public.accouchements a on a.id = n.accouchement_id
                              where n.vivant and a.accouchement_le >= v_from),
      'filles', (select count(*) from public.nouveau_nes n join public.accouchements a on a.id = n.accouchement_id
                 where n.vivant and n.sexe = 'F' and a.accouchement_le >= v_from),
      'garcons', (select count(*) from public.nouveau_nes n join public.accouchements a on a.id = n.accouchement_id
                  where n.vivant and n.sexe = 'M' and a.accouchement_le >= v_from),
      'mort_nes', (select count(*) from public.nouveau_nes n join public.accouchements a on a.id = n.accouchement_id
                   where not n.vivant and a.accouchement_le >= v_from),
      'hemorragies', (select count(*) from public.accouchements
                      where statut = 'accouchee' and pertes_sang_ml >= 500 and accouchement_le >= v_from),
      'apgar_bas', (select count(*) from public.nouveau_nes n join public.accouchements a on a.id = n.accouchement_id
                    where n.apgar_5 < 7 and a.accouchement_le >= v_from),
      'petits_poids', (select count(*) from public.nouveau_nes n join public.accouchements a on a.id = n.accouchement_id
                       where n.vivant and n.poids_g < 2500 and a.accouchement_le >= v_from),
      'transferts', (select count(*) from public.accouchements
                     where statut = 'transferee' and admission_le >= v_from),
      'cpn', (select count(*) from public.cpn where date_cpn >= v_from),
      'cpn_prec', (select count(*) from public.cpn where date_cpn >= v_from_prec and date_cpn < v_from),
      'grossesses_suivies', (select count(*) from public.grossesses where statut = 'en_cours'),
      'grossesses_a_risque', (select count(*) from public.grossesses where statut = 'en_cours' and grossesse_a_risque),
      'en_travail', (select count(*) from public.accouchements where statut = 'travail'),
      'rdv_aujourdhui', (select count(*) from public.rendez_vous
                         where statut not in ('annule') and date_heure >= v_from_jour
                           and date_heure < v_from_jour + interval '1 day'),
      'par_mode', (
        select coalesce(json_agg(json_build_object('mode', mode, 'nombre', n) order by n desc), '[]'::json)
        from (select mode, count(*) as n from public.accouchements
              where statut = 'accouchee' and accouchement_le >= v_from group by mode) x
      )
    )
  );
end;
$$;

revoke execute on function public.tableau_de_bord(integer) from anon;
grant execute on function public.tableau_de_bord(integer) to authenticated;
