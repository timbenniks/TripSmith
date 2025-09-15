import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/auth-roles';
import { getAdminClient } from '@/lib/supabase-admin';

export async function GET() {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let admin;
  try {
    admin = getAdminClient();
  } catch (e) {
    console.error('[admin/trips] admin client error', e);
    return NextResponse.json({ error: 'Service role key not configured', code: 'SERVICE_KEY_MISSING' }, { status: 500 });
  }

  const countTotal = async () => {
    const { count, error } = await admin
      .from('trips')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  };

  const countSince = async (days: number) => {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await admin
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since);
    if (error) throw error;
    return count ?? 0;
  };

  try {
    const [total, created7d, created30d] = await Promise.all([
      countTotal(),
      countSince(7),
      countSince(30),
    ]);
    return NextResponse.json({ total, created_7d: created7d, created_30d: created30d });
  } catch (e) {
    console.error('[admin/trips] error', e);
    return NextResponse.json({ error: 'Failed to load trips stats', code: 'UNKNOWN' }, { status: 500 });
  }
}


