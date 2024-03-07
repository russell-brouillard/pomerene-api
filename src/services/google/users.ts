//src/services/google/users.ts
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { secretManagerServiceClient } from "./googleCloud";
import { Keypair } from "@solana/web3.js";
import { auth } from "firebase-admin";

interface CreateUserAndStoreSolanaKeypairResult {
  firebaseUserId: string;
  solanaPrivate: string;
  solanaPublic: string;
}

async function createUserAndStoreSolanaKeypair(
  email: string,
  password: string
): Promise<CreateUserAndStoreSolanaKeypairResult> {
  try {
    // Create user in Firebase Auth
    const userRecord = await auth().createUser({
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

    await auth().updateUser(userRecord.uid, {
      displayName: publicKey,
    });

    // Store the Solana keypair in Google Cloud Secret Manager
    const projectId = "your-google-cloud-project-id";
    const secretId = `solana-keypair-${userRecord.uid}`;
    const parent = `projects/${projectId}`;
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

    const secretName = `projects/${projectId}/secrets/${secretId}/versions/latest`;


    return {
      firebaseUserId: userRecord.uid,
      solanaPrivate: secretName,
      solanaPublic: publicKey,
    };
  } catch (error) {
    console.error("Error creating user and storing Solana keypair:", error);
    throw error;
  }
}

export { createUserAndStoreSolanaKeypair };
