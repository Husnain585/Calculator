import { NextRequest, NextResponse } from 'next/server';

// This tells Next.js NOT to pre-render this route at build time
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Lazy import Firebase Admin (only loads at runtime)
    const { adminAuth, adminDB } = await import('@/lib/firebase-admin');
    
    const { uid, isAdmin } = await request.json();

    if (!uid || typeof isAdmin !== 'boolean') {
      return NextResponse.json(
        { error: 'uid and isAdmin are required' },
        { status: 400 }
      );
    }

    // Set custom claims
    await adminAuth.setCustomUserClaims(uid, { admin: isAdmin });

    // Update Firestore
    await adminDB.collection('users').doc(uid).set(
      { isAdmin },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: `User ${uid} admin status set to ${isAdmin}`
    });

  } catch (error) {
    console.error('Error setting admin status:', error);
    return NextResponse.json(
      { error: 'Failed to set admin status' },
      { status: 500 }
    );
  }
}