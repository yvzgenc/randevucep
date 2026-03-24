import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieItem = {
  name: string
  value: string
  options?: Record<string, unknown>
}

// Routes that require authentication (any user)
const PROTECTED_BUSINESS = [
  '/dashboard',
  '/appointments',
  '/services',
  '/staff',
  '/customers',
  '/settings',
  '/onboarding',
]

// Routes that require admin access
const PROTECTED_ADMIN = ['/admin']

// Routes only for unauthenticated users
const AUTH_ONLY = ['/login', '/register']

/** Read admin emails from env — same logic as lib/admin.ts */
function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? ''
  return new Set(
    raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  )
}

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmails().has(email.toLowerCase())
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieItem[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isBusinessRoute = PROTECTED_BUSINESS.some((p) => pathname.startsWith(p))
  const isAdminRoute    = PROTECTED_ADMIN.some((p) => pathname.startsWith(p))
  const isAuthOnly      = AUTH_ONLY.some((p) => pathname.startsWith(p))

  // ── Unauthenticated: redirect to login ──────────────────────────────────
  if ((isBusinessRoute || isAdminRoute) && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Authenticated user on auth-only pages → send home ──────────────────
  if (isAuthOnly && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user) {
    const userIsAdmin = isAdmin(user.email)

    // ── Admin user tries to access a business route → /admin ──────────────
    if (isBusinessRoute && userIsAdmin) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // ── Normal user tries to access /admin → /dashboard ───────────────────
    if (isAdminRoute && !userIsAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
