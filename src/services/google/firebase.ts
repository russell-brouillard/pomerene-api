import * as admin from "firebase-admin";
import { secretManagerServiceClient } from "./secretManager";

export async function getFirebaseAdmin() {
  // Check if an instance already exists
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  try {
    console.log("Initializing Firebase Admin");
    const secretVersionName = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/secrets/api-firebase-admin-key/versions/latest`;
    console.log("Secret Version Name: ", secretVersionName);
    const [accessResponse] =
      await secretManagerServiceClient.accessSecretVersion({
        name: secretVersionName,
      });

    const secretKeyString = accessResponse.payload?.data?.toString();

    if (!secretKeyString) {
      throw new Error("Firebase service account key not found");
    }

    const serviceAccount = JSON.parse(secretKeyString);

    // Explicitly initialize the Firebase app
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    console.log("Firebase Admin Initialized Successfully");
    return app;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    throw error; // Rethrow to handle the error upstream
  }
}
