import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { encode } from "bs58";
import { createMetadataMint, fundScannerAccount, getTokensByOwner, mintToAccount } from "./solanaService";
import { TokenMetadata } from "@solana/spl-token-metadata";
import { TokenObject } from "userTypes";
import { getFirebaseAdmin } from "../google/firebase";
import { TOKEN_2022_PROGRAM_ID, getTokenMetadata } from "@solana/spl-token";
import { fetchTransactions } from "./eventService";

// Constants
const DEVNET = "devnet";
const CONFIRMED = "confirmed";
const SCANNER_NAME = "SCANNER";
const SCANNER_SYMBOL = "POME";
const METADATA_URI = "https://www.pomerene.net/api/v1/json/metadata.json";

export async function createScanner(payer: Keypair, description: string) {
  const connection = new Connection(clusterApiUrl(DEVNET), CONFIRMED);

  const scannerKeypair = Keypair.generate();
  const mintKeypair = Keypair.generate();

  const metaData = createTokenMetadata(scannerKeypair, description, payer);

  await createMetadataMint(
    metaData,
    payer,
    mintKeypair.publicKey,
    payer.publicKey, // mintAuthority
    0, // decimals
    connection,
    mintKeypair,
    payer.publicKey // updateAuthority
  );

  const tokenAccount = await mintToAccount(
    payer,
    mintKeypair.publicKey,
    payer.publicKey, // mintAuthority
    connection,
    scannerKeypair,
    payer.publicKey, // Owner of the new token account
    1 // Amount to mint
  );

  await fundScannerAccount(connection, payer, scannerKeypair.publicKey, 0.01 * LAMPORTS_PER_SOL);

  return assembleScannerData(payer, mintKeypair.publicKey, scannerKeypair, description, tokenAccount);
}

function createTokenMetadata(scannerKeypair: Keypair, description: string, payer: Keypair): TokenMetadata {
  return {
    updateAuthority: payer.publicKey,
    mint: scannerKeypair.publicKey,
    name: SCANNER_NAME,
    symbol: SCANNER_SYMBOL,
    uri: METADATA_URI,
    additionalMetadata: [
      ["secret", encode(scannerKeypair.secretKey)],
      ["description", description],
      ["public", scannerKeypair.publicKey.toString()],
    ],
  };
}



function assembleScannerData(payer: Keypair, mintPublicKey: PublicKey, scannerKeypair: Keypair, description: string, tokenAccount: PublicKey) {
  return {
    owner: payer.publicKey.toString(),
    mint: mintPublicKey.toString(),
    scannerAccount: tokenAccount.toString(),
    scannerSecret: encode(scannerKeypair.secretKey),
    scannerPublic: scannerKeypair.publicKey.toString(),
    description,
  };
}



export interface ScannerTokenAccount {
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

export async function fetchScanners(owner: Keypair): Promise<ScannerTokenAccount[]> {
  const ownerAddress = owner.publicKey.toString();
  const cacheKey = `scannerTokenAccount-${ownerAddress}`;

  // Attempt to get cached data first
  let cachedTokens = await getCache(cacheKey);

  if (cachedTokens && cachedTokens.length > 0) {
    console.log("Returning cached data");
    // Update the cache in the background without waiting for it to complete
    updateCache(owner, cacheKey).catch((error) =>
      console.error("Cache update failed", error)
    );
    return cachedTokens;
  }

  // If no cache or cache is empty, fetch from blockchain and update cache
  return updateCache(owner, cacheKey);
}

export async function getScannersByOwner(
  owner: PublicKey
): Promise<ScannerTokenAccount[]> {
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
        description: metadata?.additionalMetadata[1][1],
        secret: metadata?.additionalMetadata[0][1],
        tokenAmount: accountData.tokenAmount.uiAmount,
        type: metadata?.name.toLowerCase(),
        lastTransaction:
          lastTransaction && lastTransaction.length > 0
            ? lastTransaction[0]
            : [],
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
      .collection("cache")
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

async function updateCache(
  owner: Keypair,
  cacheKey: string
): Promise<ScannerTokenAccount[]> {
  const tokens = await getScannersByOwner(owner.publicKey);
  const filteredTokens = tokens.filter(
    (token: ScannerTokenAccount) => token.type === "scanner" && token.tokenAmount > 0
  );

  console.log("Fetched data from blockchain");
  console.log(filteredTokens);

  // Cache the newly fetched data
  await setCache(cacheKey, filteredTokens);
  return filteredTokens;
}

async function setCache(cacheKey: string, tokens: ScannerTokenAccount[]) {
  const firebase = await getFirebaseAdmin();

  if (!firebase) {
    throw new Error("Failed to get Firebase admin");
  }
  try {
    await firebase
      .firestore()
      .collection("cache")
      .doc(cacheKey)
      .set({ tokens });
    console.log("Cache updated");
  } catch (error) {
    console.error("Error setting cache:", error);
  }
}

