import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { TOKEN_2022_PROGRAM_ID, getTokenMetadata } from "@solana/spl-token";
import { getFirebaseAdmin } from "../google/firebase";
import { fetchTransactions } from "./eventService";

export interface ItemTokenAccount {
  mint: string;
  owner: PublicKey;
  tokenAccount: string;
  public: string | undefined;
  secret: string | undefined;
  tokenAmount: number;
  description: string | undefined;
  type: string | undefined;
  lastTransaction: any;
}

export async function fetchAllItems(): Promise<ItemTokenAccount[]> {
  try {
    const firebase = await getFirebaseAdmin();

    if (!firebase) {
      throw new Error("Failed to get Firebase admin");
    }

    const snapshot = await firebase.firestore().collection("items").get(); // Correctly retrieve documents
    if (!snapshot.empty) {
     

      return snapshot.docs.flatMap(
        (doc) => doc.data().tokens as ItemTokenAccount[]
      ); // Map over documents and cast to ItemTokenAccount
    }
    return []; // Return an empty array if no documents found
  } catch (error) {
    console.error("Error fetching items:", error);
    throw new Error("Failed to fetch items from Firestore");
  }
}

async function getCache(cacheKey: string) {
  const firebase = await getFirebaseAdmin();

  if (!firebase) {
    throw new Error("Failed to get Firebase admin");
  }
  try {
    const doc = await firebase
      .firestore()
      .collection("items")
      .doc(cacheKey)
      .get();
    if (doc.exists) {
      return doc.data()?.tokens;
    }
  } catch (error) {
    console.error("Error getting cache:", error);
  }
  return null;
}
