-- =====================================================================
-- Clinique Nematoullah — Module Pharmacie
-- À exécuter UNE FOIS dans Supabase : SQL Editor > New query > Run.
-- Nécessite supabase/securite.sql (fonction mon_role). Relançable.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Historique des mouvements de stock (traçabilité : qui, quoi, quand)
--    quantite : positive pour une entrée ou une sortie,
--               écart signé (+/-) pour un ajustement d'inventaire.
-- ---------------------------------------------------------------------
create table if not exists public.mouvements_stock (
  id uuid primary key default gen_random_uuid(),
  medicament_id uuid not null references public.medicaments(id) on delete restrict,
  type varchar not null check (type in ('entree', 'sortie', 'ajustement')),
  quantite integer not null,
  stock_apres integer not null,
  motif text,
  fournisseur text,
  numero_lot text,
  date_peremption date,
  prescription_id uuid references public.prescriptions(id) on delete set null,
  cree_par uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists mouvements_stock_medicament_idx on public.mouvements_stock (medicament_id, created_at desc);

alter table public.mouvements_stock enable row level security;

-- Lecture et ajout seulement : un mouvement ne se modifie ni ne se supprime
drop policy if exists "mouvements_select" on public.mouvements_stock;
create policy "mouvements_select" on public.mouvements_stock
  for select to authenticated
  using (public.mon_role() in ('admin', 'pharmacien'));

drop policy if exists "mouvements_insert" on public.mouvements_stock;
create policy "mouvements_insert" on public.mouvements_stock
  for insert to authenticated
  with check (public.mon_role() in ('admin', 'pharmacien'));

-- Quantités toujours positives sur les prescriptions
alter table public.prescriptions drop constraint if exists prescriptions_quantite_positive;
alter table public.prescriptions add constraint prescriptions_quantite_positive check (quantite > 0);

alter table public.medicaments drop constraint if exists medicaments_stock_positif;
alter table public.medicaments add constraint medicaments_stock_positif check (stock_actuel >= 0);

-- ---------------------------------------------------------------------
-- 2. Entrée de stock (réception d'une commande)
-- ---------------------------------------------------------------------
create or replace function public.entree_stock(
  p_medicament_id uuid,
  p_quantite integer,
  p_fournisseur text default null,
  p_numero_lot text default null,
  p_date_peremption date default null,
  p_motif text default null
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_stock integer;
begin
  if coalesce(public.mon_role(), '') not in ('admin', 'pharmacien') then
    raise exception 'Réservé à la pharmacie';
  end if;
  if coalesce(p_quantite, 0) <= 0 then
    raise exception 'La quantité doit être supérieure à 0';
  end if;

  -- La date de péremption retenue est celle du lot qui périme le plus tôt
  -- (parmi les lots non encore périmés).
  update public.medicaments
  set stock_actuel = stock_actuel + p_quantite,
      date_peremption = case
        when p_date_peremption is null then date_peremption
        when date_peremption is null or date_peremption < current_date then p_date_peremption
        else least(date_peremption, p_date_peremption)
      end
  where id = p_medicament_id
  returning stock_actuel into v_stock;

  if not found then
    raise exception 'Médicament introuvable';
  end if;

  insert into public.mouvements_stock
    (medicament_id, type, quantite, stock_apres, motif, fournisseur, numero_lot, date_peremption)
  values
    (p_medicament_id, 'entree', p_quantite, v_stock,
     coalesce(nullif(p_motif, ''), 'Réception de stock'),
     nullif(p_fournisseur, ''), nullif(p_numero_lot, ''), p_date_peremption);

  return v_stock;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Ajustement d'inventaire (comptage physique, casse, périmés jetés…)
-- ---------------------------------------------------------------------
create or replace function public.ajuster_stock(
  p_medicament_id uuid,
  p_nouveau_stock integer,
  p_motif text
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ancien integer;
begin
  if coalesce(public.mon_role(), '') not in ('admin', 'pharmacien') then
    raise exception 'Réservé à la pharmacie';
  end if;
  if p_nouveau_stock is null or p_nouveau_stock < 0 then
    raise exception 'Le stock ne peut pas être négatif';
  end if;
  if coalesce(trim(p_motif), '') = '' then
    raise exception 'Indiquez le motif de l''ajustement';
  end if;

  select stock_actuel into v_ancien
  from public.medicaments where id = p_medicament_id
  for update;

  if not found then
    raise exception 'Médicament introuvable';
  end if;
  if v_ancien = p_nouveau_stock then
    return v_ancien;
  end if;

  update public.medicaments set stock_actuel = p_nouveau_stock where id = p_medicament_id;

  insert into public.mouvements_stock (medicament_id, type, quantite, stock_apres, motif)
  values (p_medicament_id, 'ajustement', p_nouveau_stock - v_ancien, p_nouveau_stock, trim(p_motif));

  return p_nouveau_stock;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Délivrance d'ordonnance : retire le stock, marque « délivré » et
--    trace le mouvement, en une seule transaction (tout ou rien).
-- ---------------------------------------------------------------------
create or replace function public.delivrer_prescriptions(p_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  r record;
  v_stock integer;
  v_nom text;
  n integer := 0;
begin
  if coalesce(public.mon_role(), '') not in ('admin', 'pharmacien') then
    raise exception 'Réservé à la pharmacie';
  end if;

  for r in
    select pr.id, pr.quantite, pr.medicament_id, pr.statut
    from public.prescriptions pr
    where pr.id = any(p_ids)
    for update
  loop
    if r.statut <> 'prescrit' then
      raise exception 'Une des lignes a déjà été délivrée';
    end if;

    update public.medicaments
    set stock_actuel = stock_actuel - r.quantite
    where id = r.medicament_id and stock_actuel >= r.quantite
    returning stock_actuel into v_stock;

    if not found then
      select nom into v_nom from public.medicaments where id = r.medicament_id;
      raise exception 'Stock insuffisant pour %', v_nom;
    end if;

    update public.prescriptions set statut = 'delivre' where id = r.id;

    insert into public.mouvements_stock (medicament_id, type, quantite, stock_apres, motif, prescription_id)
    values (r.medicament_id, 'sortie', r.quantite, v_stock, 'Délivrance d''ordonnance', r.id);

    n := n + 1;
  end loop;

  if n = 0 then
    raise exception 'Aucune ligne à délivrer';
  end if;

  return n;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Ordonnances vues par la pharmacie.
--    Le pharmacien n'a pas accès aux consultations (diagnostics) : cette
--    fonction ne lui renvoie que le nécessaire (patient, médecin, lignes).
-- ---------------------------------------------------------------------
create or replace function public.ordonnances_pharmacie(p_statut text default 'prescrit')
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(public.mon_role(), '') not in ('admin', 'pharmacien') then
    raise exception 'Réservé à la pharmacie';
  end if;

  return coalesce((
    select json_agg(o order by o.created_at desc)
    from (
      select
        c.id as consultation_id,
        c.created_at,
        json_build_object('id', p.id, 'code_patient', p.code_patient, 'nom', p.nom,
                          'prenom', p.prenom, 'allergies', p.allergies) as patient,
        json_build_object('nom', d.nom, 'prenom', d.prenom) as doctor,
        (
          select json_agg(json_build_object(
            'id', pr.id, 'quantite', pr.quantite, 'posologie', pr.posologie, 'statut', pr.statut,
            'medicament', json_build_object('id', m.id, 'nom', m.nom, 'dosage', m.dosage, 'forme', m.forme,
                                            'stock_actuel', m.stock_actuel, 'prix_vente', m.prix_vente)
          ) order by m.nom)
          from public.prescriptions pr
          join public.medicaments m on m.id = pr.medicament_id
          where pr.consultation_id = c.id
        ) as lignes
      from public.consultations c
      join public.patients p on p.id = c.patient_id
      left join public.profiles d on d.id = c.doctor_id
      where exists (
        select 1 from public.prescriptions pr
        where pr.consultation_id = c.id and pr.statut = p_statut
      )
      and (p_statut = 'prescrit' or c.created_at > now() - interval '30 days')
      order by c.created_at desc
      limit 100
    ) o
  ), '[]'::json);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Droits d'exécution
-- ---------------------------------------------------------------------
revoke execute on function public.entree_stock(uuid, integer, text, text, date, text) from anon;
revoke execute on function public.ajuster_stock(uuid, integer, text) from anon;
revoke execute on function public.delivrer_prescriptions(uuid[]) from anon;
revoke execute on function public.ordonnances_pharmacie(text) from anon;
grant execute on function public.entree_stock(uuid, integer, text, text, date, text) to authenticated;
grant execute on function public.ajuster_stock(uuid, integer, text) to authenticated;
grant execute on function public.delivrer_prescriptions(uuid[]) to authenticated;
grant execute on function public.ordonnances_pharmacie(text) to authenticated;

-- ---------------------------------------------------------------------
-- 7. Temps réel : les nouvelles ordonnances apparaissent sans recharger
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'prescriptions'
  ) then
    alter publication supabase_realtime add table public.prescriptions;
  end if;
end;
$$;
