import { NextResponse } from 'next/server';

/**
 * Logout dealer by clearing session cookie
 */
export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear the session cookie
  response.cookies.set('dealer_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // Expire immediately
    path: '/',
  });

  return response;
}
