import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/auth-roles';
import { getEventAggregate } from '@/lib/plausible-server';

export async function GET(request: Request) {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const period = (url.searchParams.get('period') as any) || '30d';

  try {
    // If Plausible is not configured, return zeros gracefully
    if (!process.env.PLAUSIBLE_SITE_ID || !process.env.PLAUSIBLE_API_KEY) {
      return NextResponse.json({ pdf_total: 0, ics_total: 0, note: 'plausible_not_configured' });
    }

    const [pdf, ics] = await Promise.all([
      getEventAggregate('trip_export_pdf', period),
      getEventAggregate('trip_export_ics', period),
    ]);

    const pdfTotal = pdf?.results?.events?.value ?? 0;
    const icsTotal = ics?.results?.events?.value ?? 0;

    return NextResponse.json({ pdf_total: pdfTotal, ics_total: icsTotal });
  } catch (e) {
    // Return zeros on error to avoid blocking other admin metrics
    return NextResponse.json({ pdf_total: 0, ics_total: 0, note: 'plausible_error' });
  }
}


