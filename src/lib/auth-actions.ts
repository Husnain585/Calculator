'use server';

import admin from '@/lib/firebase-admin';

export async function hasAdminUser(): Promise<boolean> {
  try {
    const userRecords = await admin.auth().listUsers();
    for (const user of userRecords.users) {
      if (user.customClaims?.admin === true) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking for admin user:', error);
    // In case of an error, default to preventing new admin creation
    // to be on the safe side.
    return true;
  }
}
