import * as admin from "firebase-admin";

let adminAuth: admin.auth.Auth;
let adminDB: admin.firestore.Firestore;

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  adminAuth = admin.auth();
  adminDB = admin.firestore();
} catch (error) {
  console.warn("Firebase Admin init failed (likely missing env vars during build). Using mocks.");
  // Mock objects for build time
  adminAuth = {
    createSessionCookie: async () => "mock-session-cookie",
    verifyIdToken: async () => ({ uid: "mock-uid", admin: true }),
    getUser: async () => ({ uid: "mock-uid" }),
    updateUser: async () => ({}),
  } as unknown as admin.auth.Auth;
  
  adminDB = {
    collection: () => ({
      doc: () => ({
        set: async () => {},
        get: async () => ({ exists: false, data: () => undefined }),
      }),
    }),
  } as unknown as admin.firestore.Firestore;
}

export { adminAuth, adminDB };
export const db = adminDB;
export default admin;
