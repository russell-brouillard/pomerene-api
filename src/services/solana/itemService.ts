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
      console.log(snapshot.docs.map((doc) => doc.data().tokens));

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

export async function fetchItemsByOwner(
  owner: Ed25519Keypair
): Promise<ItemTokenAccount[]> {
  // const ownerAddress = owner.publicKey.toString();
  // const cacheKey = ownerAddress;

  // // Attempt to get cached data first
  // let cachedTokens = await getCache(cacheKey);

  // if (cachedTokens && cachedTokens.length > 0) {
  //   // Update the cache in the background without waiting for it to complete
  //   updateCache(owner, cacheKey).catch((error) =>
  //     console.error("Cache update failed", error)
  //   );
  //   return cachedTokens;
  // }

  // // If no cache or cache is empty, fetch from blockchain and update cache
  // return updateCache(owner, cacheKey);

  return [];
}

export async function getItemsByOwner(
  owner: PublicKey
): Promise<ItemTokenAccount[]> {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // Fetch all token accounts for the owner
  const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: TOKEN_2022_PROGRAM_ID,
  });

  // Process each account in parallel
  const parsedAccounts = await Promise.all(
    accounts.value.map(async (accountInfo) => {
      const accountData = accountInfo.account.data.parsed.info;

      const metadata = await getTokenMetadata(
        connection,
        new PublicKey(accountData.mint)
      );

      let lastTransaction = await fetchTransactions(
        metadata!.additionalMetadata[2][1],
        1
      );

      return {
        mint: accountData.mint,
        owner: accountData.owner,
        tokenAccount: accountInfo.pubkey.toString(),
        public: metadata?.additionalMetadata[2][1],
        secret: metadata?.additionalMetadata[0][1],
        tokenAmount: accountData.tokenAmount.uiAmount,
        description: metadata?.additionalMetadata[1][1],
        type: metadata?.name.toLowerCase(),
        lastTransaction:
          lastTransaction && lastTransaction.length > 0
            ? lastTransaction[0]
            : null,
      };
    })
  );

  return parsedAccounts;
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
