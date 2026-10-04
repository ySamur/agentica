// Deletes the calling member's account: their profile photos, then the auth user (guide_progress
// goes with it: `on delete cascade`). Only the server may delete users, so this runs as an Edge
// Function with the service role key the platform provides; the browser never holds it.
//
// Deployed with verify_jwt off: the function checks the caller itself, asking Supabase Auth about the
// bearer token (works with legacy and new JWT signing keys alike), and asks for the account's email
// as a second, deliberate confirmation.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

  const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return reply(401, { error: 'not_signed_in' });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return reply(401, { error: 'not_signed_in' });
  if (user.is_anonymous) return reply(403, { error: 'anonymous' });

  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!user.email || email !== user.email.toLowerCase()) return reply(400, { error: 'email_mismatch' });

  // Photos first: once the user is gone, nothing points to their folder any more.
  const avatars = admin.storage.from('avatars');
  const { data: files, error: listError } = await avatars.list(user.id, { limit: 1000 });
  if (listError) return reply(500, { error: 'storage_unavailable' });
  if (files.length) {
    const { error: removeError } = await avatars.remove(files.map(file => `${user.id}/${file.name}`));
    if (removeError) return reply(500, { error: 'storage_unavailable' });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return reply(500, { error: 'delete_failed' });
  return reply(200, { deleted: true });
});
