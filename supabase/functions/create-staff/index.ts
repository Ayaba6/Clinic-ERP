// =====================================================================
// Edge Function « create-staff » : création d'un compte du personnel
// par un administrateur, depuis la page Personnel & Rôles.
//
// La création d'un compte nécessite la clé service_role, qui ne doit
// JAMAIS être dans le navigateur : elle n'existe qu'ici, côté serveur
// (variable SUPABASE_SERVICE_ROLE_KEY fournie automatiquement par Supabase).
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2'

const ROLES = ['admin', 'reception', 'medecin', 'infirmier', 'pharmacien', 'chirurgien', 'caisse']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 1. Qui appelle ? (jeton de l'utilisateur connecté)
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'Non connecté' }, 401)

  // 2. Seul un administrateur peut créer un compte
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return json({ error: 'Réservé aux administrateurs' }, 403)

  // 3. Validation des données
  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Requête invalide' }, 400)
  }
  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''
  const nom = (body.nom ?? '').trim()
  const prenom = (body.prenom ?? '').trim()
  const role = body.role ?? ''
  const specialite = (body.specialite ?? '').trim() || null
  const telephone = (body.telephone ?? '').trim() || null

  if (!email || !nom || !prenom) return json({ error: 'Nom, prénom et email sont obligatoires' }, 400)
  if (!ROLES.includes(role)) return json({ error: 'Rôle invalide' }, 400)
  if (password.length < 8) return json({ error: 'Le mot de passe doit faire au moins 8 caractères' }, 400)

  // 4. Création du compte (email confirmé d'office : pas d'email à valider)
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nom, prenom },
  })
  if (createError || !created.user) {
    const msg = createError?.message?.includes('already been registered')
      ? 'Un compte existe déjà avec cet email'
      : createError?.message ?? 'Création impossible'
    return json({ error: msg }, 400)
  }

  // 5. Le trigger handle_new_user a créé le profil avec le rôle par défaut :
  //    on applique le rôle et les informations choisis par l'admin.
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .update({ nom, prenom, role, specialite, telephone })
    .eq('id', created.user.id)
    .select()
    .single()

  if (profileError) {
    // Annulation : pas de compte sans profil correct
    await admin.auth.admin.deleteUser(created.user.id)
    return json({ error: `Profil non enregistré : ${profileError.message}` }, 500)
  }

  return json({ profile })
})
