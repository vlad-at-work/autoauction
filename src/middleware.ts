import { NextResponse, type NextRequest } from 'next/server';

function unauthorizedDealer() {
  const response = new NextResponse('Authentication required', { status: 401 });
  response.headers.set('WWW-Authenticate', 'Basic realm="AutoAuction Dealer", charset="UTF-8"');
  return response;
}

function unauthorizedAdmin() {
  const response = new NextResponse('Admin authentication required', { status: 401 });
  response.headers.set('WWW-Authenticate', 'Basic realm="AutoAuction Admin", charset="UTF-8"');
  return response;
}

function checkBasicAuth(request: NextRequest, user: string, pass: string): boolean {
  const header = request.headers.get('authorization');
  if (!header) return false;

  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return false;

  try {
    const decoded = atob(encoded);
    const idx = decoded.indexOf(':');
    if (idx === -1) return false;
    const username = decoded.slice(0, idx);
    const password = decoded.slice(idx + 1);
    return username === user && password === pass;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProd = process.env.NODE_ENV === 'production';

  // Admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;

    if (!adminUser || !adminPass) {
      return isProd ? unauthorizedAdmin() : NextResponse.next();
    }

    if (!checkBasicAuth(request, adminUser, adminPass)) {
      return unauthorizedAdmin();
    }

    return NextResponse.next();
  }

  // Dealer routes
  if (
    pathname.startsWith('/dealer') ||
    pathname.startsWith('/api/dealer') ||
    pathname.startsWith('/api/offers')
  ) {
    const dealerUser = process.env.DEALER_BASIC_AUTH_USER;
    const dealerPass = process.env.DEALER_BASIC_AUTH_PASS;

    if (!dealerUser || !dealerPass) {
      return isProd ? unauthorizedDealer() : NextResponse.next();
    }

    if (!checkBasicAuth(request, dealerUser, dealerPass)) {
      return unauthorizedDealer();
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dealer/:path*',
    '/api/dealer/:path*',
    '/api/offers/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
