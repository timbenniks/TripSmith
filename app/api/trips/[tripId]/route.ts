import { getServerClient } from '@/lib/supabase-server';
import { jsonError, jsonOk } from '@/lib/api-errors';

// DELETE /api/trips/:tripId
// Authenticated deletion with ownership check.
// Returns 200 { success: true } on success
// 401 Unauthorized (no user), 403 Forbidden (not owner), 404 Not Found (no trip), 500 on unexpected error

export async function DELETE(
  req: Request,
  { params }: { params: { tripId: string } }
) {
  const started = Date.now();
  const tripId = params.tripId;
  if (!tripId) {
    return jsonError('INVALID_INPUT', 'tripId param required', 400);
  }

  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const supabase = await getServerClient(token);

    const { data: userResult, error: userErr } = await supabase.auth.getUser();
    const user = userResult?.user;
    if (userErr || !user) {
      return jsonError('NO_SESSION', 'User session missing or invalid', 401);
    }

    // Fetch trip for ownership validation
    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .select('id, user_id')
      .eq('id', tripId)
      .maybeSingle();

    if (tripErr) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[deleteTrip] trip lookup error', { tripErr, tripId, userId: user.id });
      }
      return jsonError('SERVER_ERROR', 'Trip lookup failed', 500);
    }

    if (!trip) {
      return jsonError('NOT_FOUND', 'Trip not found', 404);
    }
    if ((trip as any).user_id !== user.id) {
      return jsonError('NOT_OWNER', 'You do not own this trip', 403);
    }

    // Perform deletion
    const { error: delErr } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId);

    if (delErr) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[deleteTrip] deletion error', { delErr, tripId, userId: user.id });
      }
      return jsonError('SERVER_ERROR', 'Delete failed', 500);
    }
    return jsonOk({ success: true });
  } catch (err) {
    console.error('[deleteTrip] unexpected error', err);
    return jsonError('SERVER_ERROR', 'Internal error', 500);
  } finally {
    const ms = Date.now() - started;
    if (ms > 500 && process.env.NODE_ENV !== 'production') {
      console.log(`[deleteTrip] latency ${ms}ms`);
    }
  }
}
