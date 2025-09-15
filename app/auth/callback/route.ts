import { NextResponse, type NextRequest } from 'next/server'
import { getServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_param = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // Log for debugging
  console.log('Auth callback received:', {
    code: code ? 'present' : 'missing',
    error_param,
    error_description,
    origin,
    searchParams: Object.fromEntries(searchParams.entries())
  })

  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) {
    // if "next" is not a relative URL, use the default
    next = '/'
  }

  // Check if there's an OAuth error first
  if (error_param) {
    console.error('OAuth error:', error_param, error_description)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${error_param}`)
  }

  if (code) {
    try {
      const supabase = await getServerClient()

      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      console.log('Code exchange result:', {
        success: !error,
        error: error?.message,
        user: data?.user?.email
      })

      if (!error && data?.user) {
        console.log('Auth successful, redirecting to:', next)
        const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
        const isLocalEnv = process.env.NODE_ENV === 'development'
        if (isLocalEnv) {
          // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
          return NextResponse.redirect(`${origin}${next}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`)
        } else {
          return NextResponse.redirect(`${origin}${next}`)
        }
      }

      console.error('Auth code exchange failed:', error)
    } catch (err) {
      console.error('Auth callback exception:', err)
    }
  } else {
    console.error('No code parameter received')
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
