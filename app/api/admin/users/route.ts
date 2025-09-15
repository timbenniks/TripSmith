import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/auth-roles';
import { getAdminClient } from '@/lib/supabase-admin';

type AdminUserRow = {
  id: string;
  email?: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata?: Record<string, any> | null;
};

export async function GET(req: Request) {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let admin;
  try {
    admin = getAdminClient();
  } catch (e) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
  }

  // Search/pagination params
  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page') || '1');
  const perPage = Math.min(Number(url.searchParams.get('perPage') || '50'), 200);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();

  try {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('[admin/users:list] error', error);
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }
    const users: AdminUserRow[] = (data?.users || []) as any;

    // Optionally filter on email client-side (PIT: listUsers has no filter)
    const filtered = q
      ? users.filter((u) => (u.email || '').toLowerCase().includes(q))
      : users;

    // Trip counts per user (aggregate with RPC to public.trips)
    // Fetch counts in one round-trip using in('user_id', ...)
    const userIds = filtered.map((u) => u.id);
    let tripCounts: Record<string, number> = {};
    if (userIds.length > 0) {
      const { data: rows, error: tripsErr } = await admin
        .from('trips')
        .select('user_id, count: id', { count: 'exact' })
        .in('user_id', userIds);
      if (!tripsErr && Array.isArray(rows)) {
        // rows returns selected tuples; .select with aggregation is limited, fallback to separate count query per user if needed
        // Here we do per-user counts to be accurate across supabase-js limitations
        const counts = await Promise.all(userIds.map(async (uid) => {
          const { count } = await admin.from('trips').select('id', { count: 'exact', head: true }).eq('user_id', uid);
          return [uid, count ?? 0] as const;
        }));
        tripCounts = Object.fromEntries(counts);
      }
    }

    const result = filtered.map((u) => {
      const role = (u.user_metadata as any)?.role === 'admin' ? 'admin' : 'user';
      const status = u.last_sign_in_at ? 'active' : 'inactive';
      return {
        id: u.id,
        email: u.email || '',
        role,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        trip_count: tripCounts[u.id] ?? 0,
        status,
      };
    });

    return NextResponse.json({
      users: result,
      total: data?.total ?? result.length,
      page,
      perPage,
    });
  } catch (e) {
    console.error('[admin/users:list] unknown error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


