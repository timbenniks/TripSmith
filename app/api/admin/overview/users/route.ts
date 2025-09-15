import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { isAdmin } from '@/lib/auth-roles';

export async function GET() {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = getAdminClient();

    // Use Admin API to list users (paginated) and compute aggregates
    const perPage = 200;
    let page = 1;
    let total = 0;
    let usersAccum: any[] = [];
    let keepGoing = true;
    let safety = 0;

    while (keepGoing && safety < 50) {
      safety++;
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error('[admin/users] listUsers error', error);
        return NextResponse.json({ error: 'Failed to list users', code: 'LIST_USERS_ERROR' }, { status: 500 });
      }
      const users = data?.users || [];
      total = data?.total ?? Math.max(total, usersAccum.length + users.length);
      usersAccum = usersAccum.concat(users);
      // Stop if returned less than perPage or we already collected >= total
      if (users.length < perPage || (data?.total && usersAccum.length >= data.total)) {
        keepGoing = false;
      } else {
        page += 1;
      }
    }

    const since = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const activeWithin = (days: number) => {
      const threshold = since(days);
      return usersAccum.filter((u) => {
        const last = (u as any).last_sign_in_at ? new Date((u as any).last_sign_in_at) : null;
        return last ? last >= threshold : false;
      }).length;
    };

    const active7d = activeWithin(7);
    const active30d = activeWithin(30);
    const active90d = activeWithin(90);

    return NextResponse.json({
      total: total || usersAccum.length,
      active_7d: active7d,
      active_30d: active30d,
      active_90d: active90d,
    });
  } catch (e) {
    console.error('[admin/users] error', e);
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service role key not configured', code: 'SERVICE_KEY_MISSING' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to compute active users', code: 'UNKNOWN' }, { status: 500 });
  }
}


