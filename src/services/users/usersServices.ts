//src/services/google/users.ts
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { secretManagerServiceClient } from "../google/googleCloud";
import { Keypair } from "@solana/web3.js";
import { auth } from "firebase-admin";
import { CreateUserAndStoreSolanaKeypairResult } from "solanaTypes";

export async function createUserAndStoreSolanaKeypair(
  email: string,
  password: string
): Promise<CreateUserAndStoreSolanaKeypairResult> {

  console.log("Creating user and storing Solana keypair")
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
    // const projectId = "your-google-cloud-project-id";
    // const secretId = `solana-keypair-${userRecord.uid}`;
    // const parent = `projects/${projectId}`;
    // const [secret] = await secretManagerServiceClient.createSecret({
    //   parent,
    //   secretId,
    //   secret: {
    //     replication: {
    //       automatic: {},
    //     },
    //   },
    // });

    // const [version] = await secretManagerServiceClient.addSecretVersion({
    //   parent: secret.name,
    //   payload: {
    //     data: Buffer.from(secretKeyString, "utf8"),
    //   },
    // });

    // console.log(
    //   `Saved Solana keypair to Secret Manager with version ${version.name}`
    // );

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
): Promise<string[]> {
  const projectId = "your-google-cloud-project-id"; // Replace with your actual project ID
  const secretId = `solana-keypair-${userId}`;
  const secretVersionName = `projects/${projectId}/secrets/${secretId}/versions/latest`;

  try {
    const [accessResponse] =
      await secretManagerServiceClient.accessSecretVersion({
        name: secretVersionName,
      });
    const secretKeyString = accessResponse.payload?.data?.toString();
    if (!secretKeyString) {
      throw new Error("Solana keypair not found for user");
    }

    const secretKeyArray = JSON.parse(secretKeyString);
    return secretKeyArray;
  } catch (error) {
    console.error("Error retrieving Solana keypair for user:", error);
    throw error; // Rethrow the error to handle it in the controller
  }
}
