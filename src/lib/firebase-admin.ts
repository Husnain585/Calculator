// src/lib/firebase-admin.ts
import * as admin from "firebase-admin";

// Only initialize if credentials are available
if (!admin.apps.length && process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminAuth = admin.auth();
export const adminDB = admin.firestore();
export const db = adminDB;
export default admin;