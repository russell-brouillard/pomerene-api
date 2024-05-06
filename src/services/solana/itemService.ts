import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { auth } from "firebase-admin";
import { TokenMetadata } from "@solana/spl-token-metadata";
import { encode } from "bs58";
import { createMetadataMint, mintToAccount } from "./solanaService";

import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createEnableRequiredMemoTransfersInstruction,
  createInitializeAccountInstruction,
  getAccountLen,
  getTokenMetadata,
} from "@solana/spl-token";
import { getFirebaseAdmin } from "../google/firebase";
import { fetchTransactions } from "./eventService";

export async function createItem(
  payer: Keypair,
  description: string
): Promise<{
  owner: PublicKey;
  mint: PublicKey;
  tokenAccount: string;
  itemSecret: string;
  description: string;
  itemPublic: string;
}> {
  // Initialize connection to Solana cluster

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const itemKeyPair = Keypair.generate();
  const itemPublic = itemKeyPair.publicKey.toString();
  const mintKeypair = Keypair.generate();

  // Define authorities
  const updateAuthority = payer.publicKey;
  const mintAuthority = payer.publicKey;
  const decimals = 0;
  const mint = mintKeypair.publicKey;
  const secrect = encode(itemKeyPair.secretKey);

  // Define metadata for the mint
  const metaData: TokenMetadata = {
    updateAuthority,
    mint: mintKeypair.publicKey,
    name: "ITEM",
    symbol: "POME",
    uri: "https://www.pomerene.net/api/v1/json/metadata.json",
    additionalMetadata: [
      ["secret", secrect],
      ["description", description],
      ["public", itemPublic],
    ],
  };

  // CREATE MINTMETADATA

  await createMetadataMint(
    metaData,
    payer,
    mint,
    mintAuthority,
    decimals,
    connection,
    mintKeypair,
    updateAuthority
  );

  // Size of Token Account with extension
  const accountLen = getAccountLen([ExtensionType.MemoTransfer]);
  // Minimum lamports required for Token Account
  const lamports = await connection.getMinimumBalanceForRentExemption(
    accountLen
  );

  const memoAccountKeyPair = Keypair.generate();

  // Instruction to invoke System Program to create new account
  const createAccountInstructionMemo = SystemProgram.createAccount({
    fromPubkey: payer.publicKey, // Account that will transfer lamports to created account
    newAccountPubkey: memoAccountKeyPair.publicKey, // Address of the account to create
    space: accountLen, // Amount of bytes to allocate to the created account
    lamports, // Amount of lamports transferred to created account
    programId: TOKEN_2022_PROGRAM_ID, // Program assigned as owner of created account
  });

  // Instruction to initialize Token Account data
  const initializeAccountInstructionMemo = createInitializeAccountInstruction(
    memoAccountKeyPair.publicKey, // Token Account Address
    mint, // Mint Account
    payer.publicKey, // Token Account Owner
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  // Instruction to initialize the MemoTransfer Extension
  const enableRequiredMemoTransfersInstruction =
    createEnableRequiredMemoTransfersInstruction(
      memoAccountKeyPair.publicKey, // Token Account address
      payer.publicKey, // Token Account Owner
      undefined, // Additional signers
      TOKEN_2022_PROGRAM_ID // Token Program ID
    );

  // Add instructions to new transaction
  const transactionMemo = new Transaction().add(
    createAccountInstructionMemo,
    initializeAccountInstructionMemo,
    enableRequiredMemoTransfersInstruction
  );

  // Send transaction
  await sendAndConfirmTransaction(
    connection,
    transactionMemo,
    [payer, memoAccountKeyPair] // Signers
  );

  // SEND NEW TOKENS

  const tokenAccount = await mintToAccount(
    payer,
    mint,
    mintAuthority,
    connection,
    itemKeyPair,
    payer.publicKey,
    1
  );

  const tokenAccountMint = await mintToAccount(
    payer,
    mint,
    mintAuthority,
    connection,
    itemKeyPair,
    itemKeyPair.publicKey,
    0
  );

  return {
    owner: payer.publicKey,
    mint: mint,
    tokenAccount: tokenAccount.toString(),
    itemSecret: encode(itemKeyPair.secretKey),
    itemPublic: itemPublic,
    description,
  };
}

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

export async function fetchItems(owner: Keypair): Promise<ItemTokenAccount[]> {
  const ownerAddress = owner.publicKey.toString();
  const cacheKey = `itemTokenAccounts-${ownerAddress}`;

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
): Promise<ItemTokenAccount[]> {
  const tokens = await getItemsByOwner(owner.publicKey);
  const filteredTokens = tokens.filter(
    (token: ItemTokenAccount) => token.type === "item" && token.tokenAmount > 0
  );

  console.log("Fetched data from blockchain");
  console.log(filteredTokens);

  // Cache the newly fetched data
  await setCache(cacheKey, filteredTokens);
  return filteredTokens;
}

async function setCache(cacheKey: string, tokens: ItemTokenAccount[]) {
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
