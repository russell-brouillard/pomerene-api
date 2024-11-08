import * as admin from "firebase-admin";
import { loadSecret } from "./secretManager";

export async function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  try {
    console.info("Initializing Firebase Admin");
    const secretVersionName = `projects/1043799128332/secrets/api-firebase-admin-key/versions/latest`;

    const secretKeyString = await loadSecret(secretVersionName);

    if (!secretKeyString) {
      throw new Error("Firebase service account key not found");
    }

    const serviceAccount = JSON.parse(secretKeyString);

    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    console.info("Firebase Admin Initialized Successfully");
    return app;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    throw error;
  }
}
