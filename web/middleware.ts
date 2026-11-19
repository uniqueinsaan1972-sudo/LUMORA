import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/privacy', '/terms', '/auth/callback'];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options?: any }[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser(); // verifies JWT with Supabase (not just cookie presence)
  const path = req.nextUrl.pathname;
  if (!user && !PUBLIC.includes(path) && !path.startsWith('/invite/')) return NextResponse.redirect(new URL('/login', req.url));
  if (user && (path === '/login' || path === '/register')) return NextResponse.redirect(new URL('/dashboard', req.url));
  return res; // role checks happen in layouts/pages AND in RLS — middleware is only the first gate
}
// Static assets (logo, favicon, PWA icons, manifest) must be reachable without a session, otherwise the login page shows a broken logo.
export const config = { matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|jpe?g|svg|webp|ico|webmanifest)$|manifest.webmanifest).*)'] };
