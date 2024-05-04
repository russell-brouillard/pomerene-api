import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import Memcached from "memcached";
import { TokenMetadata } from "@solana/spl-token-metadata";
import { encode } from "bs58";
import {
  createMetadataMint,
  getTokensByOwner,
  mintToAccount,
} from "./solanaService";
import { TokenObject } from "userTypes";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createEnableRequiredMemoTransfersInstruction,
  createInitializeAccountInstruction,
  getAccountLen,
  getTokenMetadata,
} from "@solana/spl-token";

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

// Create a Memcached client instance
const memcached = new Memcached("localhost:11211");

// Cache keys
const TOKEN_ACCOUNTS_CACHE_KEY = "tokenAccounts";
const METADATA_CACHE_PREFIX = "metadata";

interface TokenAccount {
  mint: string;
  owner: PublicKey;
  tokenAccount: PublicKey;
  itemPublic: string;
  itemSecret: string;
  tokenAmount: number;
  itemDescription: string;
  type: string;
}

export async function fetchItems(owner: Keypair): Promise<TokenAccount[]> {
  const tokens = await getItemsByOwner(owner.publicKey);
  return tokens.filter(
    (token: TokenAccount) => token.type === "item" && token.tokenAmount > 0
  );
}

export async function getItemsByOwner(
  owner: PublicKey
): Promise<TokenAccount[]> {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // Check if token accounts are cached
  const cachedTokenAccounts = await getCachedData<TokenAccount[]>(
    TOKEN_ACCOUNTS_CACHE_KEY,
    owner.toString()
  );
  if (cachedTokenAccounts) {
    return cachedTokenAccounts;
  }

  // Fetch all token accounts for the owner
  const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: TOKEN_2022_PROGRAM_ID,
  });

  // Process each account in parallel, leveraging the cache for metadata
  const parsedAccounts = await Promise.all(
    accounts.value.map(async (accountInfo) => {
      const accountData = accountInfo.account.data.parsed.info;
      const metadata = await getCachedMetadata(accountData.mint);

      return {
        mint: accountData.mint,
        owner: accountData.owner,
        tokenAccount: accountInfo.pubkey,
        itemPublic: metadata.additionalMetadata[2][1],
        itemSecret: metadata.additionalMetadata[0][1],
        tokenAmount: accountData.tokenAmount.uiAmount,
        itemDescription: metadata.additionalMetadata[1][1],
        type: metadata.name.toLowerCase(),
      };
    })
  );

  // Cache token accounts
  await cacheData(TOKEN_ACCOUNTS_CACHE_KEY, owner.toString(), parsedAccounts);

  return parsedAccounts;
}

async function getCachedData<T>(
  cacheKey: string,
  id: string
): Promise<T | null> {
  return new Promise((resolve, reject) => {
    memcached.get(
      `${cacheKey}:${id}`,
      (err: Error | null, data: string | null) => {
        if (err) {
          reject(err);
        } else {
          resolve(data ? JSON.parse(data) : null);
        }
      }
    );
  });
}

async function getCachedMetadata(mint: string): Promise<any> {
  const cachedMetadata = await getCachedData<any>(METADATA_CACHE_PREFIX, mint);
  if (cachedMetadata) {
    return cachedMetadata;
  }

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const metadata = await getTokenMetadata(connection, new PublicKey(mint));
  await cacheData(METADATA_CACHE_PREFIX, mint, metadata);
  return metadata;
}

async function cacheData<T>(
  cacheKey: string,
  id: string,
  data: T,
  lifetime: number = 36000
): Promise<void> {
  return new Promise((resolve, reject) => {
    memcached.set(
      `${cacheKey}:${id}`,
      JSON.stringify(data),
      lifetime,
      (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}
