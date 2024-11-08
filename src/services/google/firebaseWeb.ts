import { FirebaseOptions, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { loadSecret } from "./secretManager";

let appWeb: ReturnType<typeof getAuth> | null = null;

async function loadFirebaseWebSecret(): Promise<FirebaseOptions> {
  const secretVersionName = `projects/1043799128332/secrets/api-firebase-web-key/versions/latest`;
  const secretString = await loadSecret(secretVersionName);

  return JSON.parse(secretString);
}

export async function initializeFirebaseWeb() {
  if (appWeb) {
    return appWeb;
  }

  try {
    const firebaseWebSecret = await loadFirebaseWebSecret();
    const firebaseApp = initializeApp(firebaseWebSecret);

    console.info("Firebase web initialized successfully");
    appWeb = getAuth(firebaseApp);
    return appWeb;
  } catch (err) {
    console.error("Failed to initialize Firebase Web", err);
    throw new Error("Firebase Web initialization failed");
  }
}
