import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase-server";

type Body = {
  tripId: string;
  expiresAt?: string | null; // ISO timestamp
};

function randomToken(length = 32) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(req: Request) {
  try {
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Body;
    const { tripId, expiresAt } = body || {};
    if (!tripId) return NextResponse.json({ error: "tripId required" }, { status: 400 });

    // Load trip and ensure ownership
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select("id,user_id,name,destination,travel_dates,purpose,status,itinerary_data,created_at,updated_at")
      .eq("id", tripId)
      .single();
    if (tripErr || !trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    if (trip.user_id !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Build public snapshot (read-only safe fields)
    const snapshot = {
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      travel_dates: trip.travel_dates,
      purpose: trip.purpose,
      status: trip.status,
      itinerary_data: trip.itinerary_data ?? null,
      created_at: trip.created_at,
      updated_at: trip.updated_at,
    };

    const token = randomToken(32);
    const { data: row, error: insErr } = await supabase
      .from("trip_shares")
      .insert({
        trip_id: trip.id,
        public_token: token,
        created_by: user.id,
        expires_at: expiresAt ?? null,
        public_snapshot: snapshot,
      })
      .select("public_token, expires_at")
      .single();

    if (insErr || !row) {
      return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
    }

    // Build absolute URL that works in prod and local dev
    const envBase = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "";
    let origin: string;
    if (envBase) {
      origin = envBase.startsWith("http") ? envBase : `https://${envBase}`;
    } else {
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
      const xfProto = req.headers.get("x-forwarded-proto");
      const isLocal = /localhost|127\.0\.0\.1/.test(host);
      const proto = xfProto || (isLocal ? "http" : "https");
      origin = `${proto}://${host}`;
    }
    const url = `${origin.replace(/\/$/, "")}/share/${row.public_token}`;

    return NextResponse.json({ url, token: row.public_token, expiresAt: row.expires_at }, { status: 201 });
  } catch (e) {
    console.error("/api/share POST error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// List shares for a given tripId (auth + ownership)
export async function GET(req: Request) {
  try {
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId");
    if (!tripId) return NextResponse.json({ error: "tripId required" }, { status: 400 });

    // Ensure ownership
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select("id,user_id")
      .eq("id", tripId)
      .single();
    if (tripErr || !trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    if (trip.user_id !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: rows, error } = await supabase
      .from("trip_shares")
      .select("public_token, created_at, expires_at")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Failed to load shares" }, { status: 500 });

    const envBase = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "";
    let origin: string;
    if (envBase) {
      origin = envBase.startsWith("http") ? envBase : `https://${envBase}`;
    } else {
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
      const xfProto = req.headers.get("x-forwarded-proto");
      const isLocal = /localhost|127\.0\.0\.1/.test(host);
      const proto = xfProto || (isLocal ? "http" : "https");
      origin = `${proto}://${host}`;
    }

    const data = (rows || []).map((r) => ({
      token: r.public_token,
      url: `${origin.replace(/\/$/, "")}/share/${r.public_token}`,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
    }));

    return NextResponse.json({ shares: data }, { status: 200 });
  } catch (e) {
    console.error("/api/share GET error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Revoke a share by token (auth + ownership)
export async function DELETE(req: Request) {
  try {
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

    // Load share row to derive trip and validate ownership
    const { data: share, error: shareErr } = await supabase
      .from("trip_shares")
      .select("public_token, trip_id, created_by")
      .eq("public_token", token)
      .single();
    if (shareErr || !share) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Ensure the current user owns the trip
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select("id, user_id")
      .eq("id", share.trip_id)
      .single();
    if (tripErr || !trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    if (trip.user_id !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error: delErr } = await supabase
      .from("trip_shares")
      .delete()
      .eq("public_token", token);
    if (delErr) return NextResponse.json({ error: "Failed to revoke" }, { status: 500 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("/api/share DELETE error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
