import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * getServerClient
 * Official Supabase SSR pattern for Next.js (App Router) using the cookies store.
 * Centralizes server-side client creation so all API routes share identical auth semantics.
 *
 * Usage:
 *   const supabase = getServerClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */
export async function getServerClient(bearerToken?: string) {
  // Next.js 15: cookies() is async in dynamic routes; must await before access.
  const cookieStore = await cookies();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try { cookieStore.set({ name, value, ...options }); } catch { /* noop */ }
        },
        remove(name: string, options: any) {
          try { cookieStore.set({ name, value: '', ...options }); } catch { /* noop */ }
        }
      }
    }
  );

  // If a bearer token is passed (header), set session manually (Supabase JS v2 helper)
  if (bearerToken) {
    try {
      // setSession with access token only; refresh token not available client-side here.
      await client.auth.setSession({ access_token: bearerToken, refresh_token: '' });
    } catch { /* ignore */ }
  }
  return client;
}
