import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/auth-roles';
import { getAdminClient } from '@/lib/supabase-admin';
import { getEventAggregate, getEventsTimeseries, getAggregate } from '@/lib/plausible-server';

export async function GET(req: Request) {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const period = (url.searchParams.get('period') as any) || '30d';

  let admin;
  try {
    admin = getAdminClient();
  } catch (e) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
  }

  try {
    // DB aggregates
    const [usersCount, tripsCount, sharesCount] = await Promise.all([
      admin.schema('auth').from('users').select('id', { count: 'exact', head: true }),
      admin.from('trips').select('id', { count: 'exact', head: true }),
      admin.from('trip_shares').select('id', { count: 'exact', head: true }),
    ]);

    // Plausible aggregates (graceful fallback to zeros)
    let exportsTotal = 0;
    let messagesTotal = 0;
    let visitorsToSignup = undefined as number | undefined;
    try {
      if (process.env.PLAUSIBLE_SITE_ID && process.env.PLAUSIBLE_API_KEY) {
        const [pdf, ics, messages, visitors] = await Promise.all([
          getEventAggregate('trip_export_pdf', period),
          getEventAggregate('trip_export_ics', period),
          getEventAggregate('chat_message_sent', period),
          getAggregate('visitors', period),
        ]);
        exportsTotal = (pdf?.results?.events?.value || 0) + (ics?.results?.events?.value || 0);
        messagesTotal = messages?.results?.events?.value || 0;
        const visitorCount = visitors?.results?.visitors?.value || undefined;
        visitorsToSignup = visitorCount;
      }
    } catch (e) {
      // ignore plausible errors, keep zeros
    }

    return NextResponse.json({
      overview: {
        totalUsers: usersCount.count || 0,
        activeUsers: undefined, // optional to compute later
        totalTrips: tripsCount.count || 0,
        totalExports: exportsTotal,
        totalShares: sharesCount.count || 0,
        totalMessages: messagesTotal,
      },
      // Additional optional series (wire minimal timeseries as proof)
      // Future: add top destinations via DB aggregation
    });
  } catch (e) {
    console.error('[admin/analytics] error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


