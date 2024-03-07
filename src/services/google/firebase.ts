//src/config/firebaseConfig.ts

import * as admin from "firebase-admin";

import serviceAccount from "../../secrets/firebaseAdminKey.json";

console.log("serviceAccount",serviceAccount)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

console.log("Firebase Admin initialized");

export const auth = admin.auth();

export const firebase = admin;
