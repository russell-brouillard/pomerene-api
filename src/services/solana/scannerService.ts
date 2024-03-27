import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  getAccountLen,
  createInitializeAccountInstruction,
  createEnableRequiredMemoTransfersInstruction,
} from "@solana/spl-token";

import { decode, encode } from "bs58";
import {
  createMetadataMint,
  getAccountsByOwner,
  mintToAccount,
} from "./solanaService";
import { TokenMetadata } from "@solana/spl-token-metadata";
import { TokenObject } from "userTypes";

export async function createScanner(payer: Keypair, description: string) {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const scannerKeypair = Keypair.generate();

  const itemKeyPair = Keypair.generate();

  const scanner = encode(scannerKeypair.secretKey);

  const name = "SCANNER";
  const symbol = "POM";
  const uri =
    "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json";
  const additionalMetadata: [string, string][] = [
    ["scanner", scanner],
    ["description", description],
  ];

  const updateAuthority = payer.publicKey;

  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  const mintAuthority = payer.publicKey;
  const decimals = 0;

  const metaData: TokenMetadata = {
    updateAuthority,
    mint: mintKeypair.publicKey,
    name,
    symbol,
    uri,
    additionalMetadata,
  };

  const mintData = await createMetadataMint(
    metaData,
    payer,
    mint,
    mintAuthority,
    decimals,
    connection,
    mintKeypair,
    updateAuthority
  );

  const tokenAccount = await mintToAccount(
    payer,
    mint,
    mintAuthority,
    connection,
    itemKeyPair,
    payer.publicKey,
    1
  );

  return {
    owner: payer.publicKey,
    mint: mint,
    scannerAccount: tokenAccount.toString(),
    itemSecret: encode(itemKeyPair.secretKey),
    description,
  };
}

/**
 * Creates a transaction for a scanner to interact with an item, transferring tokens.
 *
 * @param payer - The payer of the transaction fees and creator of associated token accounts.
 * @param scannerAccount - The scanner's Keypair.
 * @param itemAccount - The item's Keypair.
 * @returns A promise that resolves to the transaction URL.
 */
export async function createScannerTransaction(
  payer: Keypair,
  scannerSecret: string,
  itemSecret: string,
  message: string
): Promise<string> {
  console.log("createScannerTransaction", payer.publicKey.toString());
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const itemAccount = Keypair.fromSecretKey(decode(itemSecret));

  console.log("ITEM = ", itemAccount.publicKey);

  const itemMint = await getAccountsByOwner(itemAccount).then(
    (parsedAccounts: any) => new PublicKey(decode(parsedAccounts[0].mint))
  );

  console.log("MINT = ", itemMint);

  const scannerAccountKeypair = Keypair.fromSecretKey(decode(scannerSecret));
  const scannerAccount = scannerAccountKeypair.publicKey;

  // Size of Token Account with extension
  const accountLen = getAccountLen([ExtensionType.MemoTransfer]);
  // Minimum lamports required for Token Account
  const lamports = await connection.getMinimumBalanceForRentExemption(
    accountLen
  );

  const scannerTokenAccountKeypair = Keypair.generate();

  console.log("SCANNER = ", scannerTokenAccountKeypair.publicKey);

  // Instruction to invoke System Program to create new account
  const createAccountInstructionMemo = SystemProgram.createAccount({
    fromPubkey: payer.publicKey, // Account that will transfer lamports to created account
    newAccountPubkey: scannerTokenAccountKeypair.publicKey, // Address of the account to create
    space: accountLen, // Amount of bytes to allocate to the created account
    lamports, // Amount of lamports transferred to created account
    programId: TOKEN_2022_PROGRAM_ID, // Program assigned as owner of created account
  });

  console.log("Test 0");

  // Instruction to initialize Token Account data
  const initializeAccountInstructionMemo = createInitializeAccountInstruction(
    scannerTokenAccountKeypair.publicKey, // Token Account Address
    itemMint, // Mint Account
    scannerAccount, // Token Account Owner
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  // Instruction to initialize the MemoTransfer Extension
  const enableRequiredMemoTransfersInstruction =
    createEnableRequiredMemoTransfersInstruction(
      scannerTokenAccountKeypair.publicKey, // Token Account address
      scannerAccount, // Token Account Owner
      undefined, // Additional signers
      TOKEN_2022_PROGRAM_ID // Token Program ID
    );

  // Add instructions to new transaction
  const transactionMemo = new Transaction().add(
    createAccountInstructionMemo,
    initializeAccountInstructionMemo,
    enableRequiredMemoTransfersInstruction
  );

  console.log("Test 1");
  // Send transaction
  const transactionSignaturememo = await sendAndConfirmTransaction(
    connection,
    transactionMemo,
    [payer, scannerAccountKeypair, scannerTokenAccountKeypair] // Signers
  );

  console.log("Test 2");

  const associatedTokenAccountItem = await getOrCreateAssociatedTokenAccount(
    connection,
    payer, // Payer to create Token Account
    itemMint, // Mint Account address
    itemAccount.publicKey, // Token Account owner
    false, // Skip owner check
    undefined, // Optional keypair, default to Associated Token Account
    undefined, // Confirmation options
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  ).then((ata) => ata.address);

  // Instruction to transfer tokens
  const transferInstruction = createTransferInstruction(
    associatedTokenAccountItem, // Source Token Account
    scannerTokenAccountKeypair.publicKey, // Destination Token Account
    itemAccount.publicKey, // Source Token Account owner
    1, // Amount
    undefined, // Additional signers
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  // Instruction to add memo
  const memoInstruction = new TransactionInstruction({
    keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
    data: Buffer.from(JSON.stringify(message), "utf-8"),
    programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
  });

  // Add instructions to new transaction
  const transaction = new Transaction().add(
    memoInstruction,
    transferInstruction
  );

  const transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, itemAccount] // Signers
  );

  return `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`;
}

export async function fetchScanner(owner: Keypair) {
  const tokens = await getAccountsByOwner(owner);

  return tokens.filter(
    (token: TokenObject) => token.metadata.name.toLowerCase() === "scanner"
  );
}
