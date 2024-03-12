//src/services/google/users.ts

import { secretManagerServiceClient } from "../google/secretManager";
import { Keypair } from "@solana/web3.js";
import { authWeb } from "../google/firebaseWeb";
import {
  User,
  UserCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { CreateUserAndStoreSolanaKeypairResult } from "solanaTypes";
import { auth } from "../google/firebase";
import { UserRecord } from "firebase-admin/lib/auth/user-record";
import { ListUsersResult } from "firebase-admin/lib/auth/base-auth";

export async function createUserAndStoreSolanaKeypair(
  email: string,
  password: string
): Promise<CreateUserAndStoreSolanaKeypairResult> {
  console.log("Creating user and storing Solana keypair");

  console.log("Russell");
  try {
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
    });

    // Generate a new Solana keypair
    const keypair = Keypair.generate();
    const secretKeyArray = Array.from(keypair.secretKey); // Convert Uint8Array to Array
    const secretKeyString = JSON.stringify(secretKeyArray);

    const publicKey = keypair.publicKey.toString();

    if (!publicKey || !secretKeyString) {
      throw new Error("Failed to generate Solana keypair");
    }

    await auth.updateUser(userRecord.uid, {
      displayName: publicKey,
    });

    // Store the Solana keypair in Google Cloud Secret Manager
    const secretId = `solana-keypair-${userRecord.uid}`;
    const parent = `projects/pomerene-416519`;
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
        data: Buffer.from(secretKeyString, "utf8"),
      },
    });

    console.log(
      `Saved Solana keypair to Secret Manager with version ${version.name}`
    );

    return {
      firebaseUserId: userRecord.uid,
      solanaPublic: publicKey,
    };
  } catch (error) {
    console.error("Error creating user and storing Solana keypair:", error);
    throw error;
  }
}

export async function getSolanaKeypairForUser(
  userId: string
): Promise<Keypair> {
  const secretId = `solana-keypair-${userId}`;
  const secretVersionName = `projects/pomerene-416519/secrets/${secretId}/versions/latest`;

  try {
    const [accessResponse] =
      await secretManagerServiceClient.accessSecretVersion({
        name: secretVersionName,
      });
    const secretKeyString = accessResponse.payload?.data?.toString();
    if (!secretKeyString) {
      throw new Error("Solana keypair not found for user");
    }

    // Parse the secret key string directly
    const secretKeyArray = JSON.parse(secretKeyString);

    // Convert the array of numbers to a Uint8Array
    const secretKeyUint8Array = Uint8Array.from(secretKeyArray);

    // Create a Keypair instance from the Uint8Array secret key
    const keypair = Keypair.fromSecretKey(secretKeyUint8Array);

    console.log("payerSecretKey", keypair);

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
    const userCredential: UserCredential = await signInWithEmailAndPassword(
      authWeb,
      email,
      password
    );

    // Get the user's JWT token
    const idToken: string = await userCredential.user.getIdToken();
    console.log("User's JWT token:", idToken);

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
    // Retrieve user record from Firebase Auth
    const userRecord = await auth.getUser(uid);
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
    const userRecord = await auth.getUserByEmail(email);
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
    const listUsersResult: ListUsersResult = await auth.listUsers();
    const users: UserRecord[] = listUsersResult.users;
    return users;
  } catch (error: any) {
    console.error("Error retrieving all users:", error.message);
    throw error;
  }
}
