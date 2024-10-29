//src/services/google/users.ts

import { secretManagerServiceClient } from "../google/secretManager";
import { UserCredential, signInWithEmailAndPassword } from "firebase/auth";
import { CreateUserAndStoreSolanaKeypairResult } from "solanaTypes";
import { UserRecord } from "firebase-admin/lib/auth/user-record";
import { ListUsersResult } from "firebase-admin/lib/auth/base-auth";

import { getFirebaseAdmin } from "../google/firebase";
import { initializeFirebaseWeb } from "../google/firebaseWeb";
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Keypair } from "@mysten/sui/dist/cjs/cryptography";
import { getSuiKeypairFromSecret } from "../sui/suiService";

export async function createUserAndStoreSolanaKeypair(
  email: string,
  password: string
): Promise<CreateUserAndStoreSolanaKeypairResult> {
  try {
    // Create user in Firebase Auth

    const firebase = await getFirebaseAdmin();
    if (!firebase) {
      throw new Error("Failed to get Firebase admin");
    }

    const userRecord = await firebase.auth().createUser({
      email: email,
      password: password,
    });

    // Generate a new Solana keypair
    const keypair = new Ed25519Keypair();

    await firebase.auth().updateUser(userRecord.uid, {
      displayName: keypair.getPublicKey().toSuiAddress(),
    });

    // Store the Solana keypair in Google Cloud Secret Manager
    const secretId = `sui-keypair-${userRecord.uid}`;
    const parent = `projects/${process.env.GOOGLE_CLOUD_PROJECT}`;
    const [secret] = await secretManagerServiceClient.createSecret({
      parent,
      secretId,
      secret: {
        replication: {
          automatic: {},
        },
      },
    });

    const [version] = await secretManagerServiceClient.addSecretVersion({
      parent: secret.name,
      payload: {
        data: Buffer.from(keypair.getSecretKey(), "utf8"),
      },
    });

    return {
      firebaseUserId: userRecord.uid,
      solanaPublic: keypair.getPublicKey().toSuiAddress(),
    };
  } catch (error) {
    console.error("Error creating user and storing Solana keypair:", error);
    throw error;
  }
}

export async function getSuiKeypairForUser(userId: string): Promise<Keypair> {
  const secretId = `sui-keypair-${userId}`;
  const secretVersionName = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/secrets/${secretId}/versions/latest`;

  try {
    const [accessResponse] =
      await secretManagerServiceClient.accessSecretVersion({
        name: secretVersionName,
      });
    const secretKeyString = accessResponse.payload?.data?.toString();
    if (!secretKeyString) {
      throw new Error("Sui keypair not found for user");
    }

    // Create a Keypair instance from the Uint8Array secret key
    const keypair = getSuiKeypairFromSecret(secretKeyString);

    return keypair;
  } catch (error) {
    console.error("Error retrieving Solana keypair for user:", error);
    throw error; // Rethrow the error to handle it in the controller
  }
}

export async function getUser(
  email: string,
  password: string
): Promise<UserCredential | null> {
  try {
    // Sign in the user with email and password

    const authWeb = await initializeFirebaseWeb();
    const userCredential: UserCredential = await signInWithEmailAndPassword(
      authWeb,
      email,
      password
    );

    // Return the userCredential
    return userCredential;
  } catch (error: any) {
    console.error("Error signing in:", error.message);
    return null;
  }
}

// Function to get user by UID
export async function getUserByUID(uid: string): Promise<UserRecord | null> {
  try {
    const firebase = await getFirebaseAdmin();
    if (!firebase) {
      throw new Error("Failed to get Firebase admin");
    }
    const userRecord = await firebase.auth().getUser(uid);
    return userRecord;
  } catch (error: any) {
    console.error("Error retrieving user by UID:", error.message);
    return null;
  }
}

// Function to get user by Email
export async function getUserByEmail(
  email: string
): Promise<UserRecord | null> {
  try {
    // Retrieve user record from Firebase Auth

    const firebase = await getFirebaseAdmin();
    if (!firebase) {
      throw new Error("Failed to get Firebase admin");
    }
    const userRecord = await firebase.auth().getUserByEmail(email);
    return userRecord;
  } catch (error: any) {
    console.error("Error retrieving user by email:", error.message);
    return null;
  }
}

// Function to get all users
export async function getAllUsers(): Promise<UserRecord[]> {
  try {
    // Fetch all users from Firebase Auth
    const firebase = await getFirebaseAdmin();
    if (!firebase) {
      throw new Error("Failed to get Firebase admin");
    }
    const listUsersResult: ListUsersResult = await firebase.auth().listUsers();
    const users: UserRecord[] = listUsersResult.users;
    return users;
  } catch (error: any) {
    console.error("Error retrieving all users:", error.message);
    throw error;
  }
}
