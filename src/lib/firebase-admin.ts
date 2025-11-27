import * as admin from "firebase-admin";

function initializeFirebaseAdmin() {
  // Skip initialization during build time
  if (typeof window !== 'undefined') {
    throw new Error('Firebase Admin SDK should only be used on the server side');
  }

  // Check if already initialized
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Validate required environment variables
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase Admin environment variables');
    console.error('Required: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY');
    throw new Error('Firebase Admin SDK not configured properly');
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

// Lazy initialization - only initialize when actually needed
function getAdminAuth() {
  if (admin.apps.length === 0) {
    initializeFirebaseAdmin();
  }
  return admin.auth();
}

function getAdminDB() {
  if (admin.apps.length === 0) {
    initializeFirebaseAdmin();
  }
  return admin.firestore();
}

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get: (target, prop) => {
    const auth = getAdminAuth();
    const value = auth[prop as keyof admin.auth.Auth];
    return typeof value === 'function' ? value.bind(auth) : value;
  }
});

export const adminDB = new Proxy({} as admin.firestore.Firestore, {
  get: (target, prop) => {
    const db = getAdminDB();
    const value = db[prop as keyof admin.firestore.Firestore];
    return typeof value === 'function' ? value.bind(db) : value;
  }
});

export const db = adminDB;
export default admin;