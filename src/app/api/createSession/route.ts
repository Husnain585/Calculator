// app/api/createSession/route.ts
import { NextRequest, NextResponse } from 'next/server';
// Add at the top of EVERY route.ts that uses Firebase Admin
export const dynamic = 'force-dynamic';

// Use dynamic import
const { adminAuth, adminDB } = await import('@/lib/firebase-admin');

export async function POST(request: NextRequest) {
  try {
    // Lazy import to avoid initialization during build
    const { adminAuth } = await import('@/lib/firebase-admin');
    
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
      );
    }

    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Create session cookie (expires in 5 days)
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    // Set the cookie
    const response = NextResponse.json(
      { status: 'success' },
      { status: 200 }
    );

    response.cookies.set('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs'; // Ensure it runs on Node.js runtime