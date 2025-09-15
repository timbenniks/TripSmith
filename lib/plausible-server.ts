export interface PlausibleAggregateParams {
  event?: string;
  period?: '7d' | '30d' | '90d' | '6mo' | '12mo' | 'all';
}

async function plausibleFetch(path: string, init?: RequestInit) {
  const base = process.env.PLAUSIBLE_API_BASE || 'https://plausible.io/api/v1';
  const site = process.env.PLAUSIBLE_SITE_ID;
  const key = process.env.PLAUSIBLE_API_KEY;
  if (!site || !key) throw new Error('Missing PLAUSIBLE_SITE_ID or PLAUSIBLE_API_KEY');
  const url = new URL(base + path);
  url.searchParams.set('site_id', site);
  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Plausible error ${res.status}`);
  return res.json();
}

export async function getEventAggregate(event: string, period: PlausibleAggregateParams['period'] = '30d') {
  const filters = encodeURIComponent(`event:name==${event}`);
  return plausibleFetch(`/stats/aggregate?metrics=events&period=${period}&filters=${filters}`);
}

export async function getEventsTimeseries(event: string, period: PlausibleAggregateParams['period'] = '30d') {
  const filters = encodeURIComponent(`event:name==${event}`);
  return plausibleFetch(`/stats/timeseries?metrics=events&period=${period}&filters=${filters}`);
}

export async function getAggregate(metrics: string, period: PlausibleAggregateParams['period'] = '30d', filters?: string) {
  const qsFilters = filters ? `&filters=${encodeURIComponent(filters)}` : '';
  return plausibleFetch(`/stats/aggregate?metrics=${encodeURIComponent(metrics)}&period=${period}${qsFilters}`);
}


