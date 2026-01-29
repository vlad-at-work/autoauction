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

// Parse dealer credentials from env: DEALER_CREDENTIALS="user1:pass1,user2:pass2"
// Falls back to single DEALER_BASIC_AUTH_USER/PASS for backwards compatibility
function checkDealerAuth(request: NextRequest): boolean {
  const header = request.headers.get('authorization');
  if (!header) return false;

  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return false;

  let username: string;
  let password: string;

  try {
    const decoded = atob(encoded);
    const idx = decoded.indexOf(':');
    if (idx === -1) return false;
    username = decoded.slice(0, idx);
    password = decoded.slice(idx + 1);
  } catch {
    return false;
  }

  // Check multiple dealers from DEALER_CREDENTIALS
  const dealerCredentials = process.env.DEALER_CREDENTIALS;
  if (dealerCredentials) {
    const dealers = dealerCredentials.split(',');
    for (const dealer of dealers) {
      const [user, pass] = dealer.split(':');
      if (user === username && pass === password) {
        return true;
      }
    }
  }

  // Fallback to single dealer credentials
  const dealerUser = process.env.DEALER_BASIC_AUTH_USER;
  const dealerPass = process.env.DEALER_BASIC_AUTH_PASS;
  if (dealerUser && dealerPass && username === dealerUser && password === dealerPass) {
    return true;
  }

  return false;
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
    // Check for any configured dealer credentials
    const hasCredentials =
      process.env.DEALER_CREDENTIALS ||
      (process.env.DEALER_BASIC_AUTH_USER && process.env.DEALER_BASIC_AUTH_PASS);

    if (!hasCredentials) {
      return isProd ? unauthorizedDealer() : NextResponse.next();
    }

    if (!checkDealerAuth(request)) {
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
