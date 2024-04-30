import * as admin from "firebase-admin";
import { secretManagerServiceClient } from "./secretManager";

export async function getFirebaseAdmin() {
  // Check if an instance already exists
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  try {
    console.log("Initializing Firebase Admin");
    const secretVersionName = `projects/${process.env.PROJECT_ID}/secrets/api-firebase-admin-key/versions/latest`;
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
    });

    console.log("Firebase Admin Initialized Successfully");
    return app;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    throw error; // Rethrow to handle the error upstream
  }
}
