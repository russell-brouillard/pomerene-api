//src/config/firebaseConfig.ts

import * as admin from "firebase-admin";

import serviceAccount from "../../secrets/firebaseAdminKey.json";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

export const auth = admin.auth();

export const firebase = admin;
