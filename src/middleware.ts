import { NextResponse, type NextRequest } from 'next/server';

function unauthorized() {
  const response = new NextResponse('Authentication required', { status: 401 });
  response.headers.set('WWW-Authenticate', 'Basic realm="AutoAuction Dealer", charset="UTF-8"');
  return response;
}

export function middleware(request: NextRequest) {
  const user = process.env.DEALER_BASIC_AUTH_USER;
  const pass = process.env.DEALER_BASIC_AUTH_PASS;
  const isProd = process.env.NODE_ENV === 'production';

  if (!user || !pass) return isProd ? unauthorized() : NextResponse.next();

  const header = request.headers.get('authorization');
  if (!header) return unauthorized();

  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return unauthorized();

  try {
    const decoded = atob(encoded);
    const idx = decoded.indexOf(':');
    if (idx === -1) return unauthorized();
    const username = decoded.slice(0, idx);
    const password = decoded.slice(idx + 1);
    if (username !== user || password !== pass) return unauthorized();
    return NextResponse.next();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: ['/dealer/:path*', '/api/dealer/:path*', '/api/offers/:path*'],
};
