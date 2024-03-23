import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
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
  createInitializeMintInstruction,
  getMintLen,
  createInitializeMetadataPointerInstruction,
  getMint,
  getMetadataPointerState,
  getTokenMetadata,
  TYPE_SIZE,
  LENGTH_SIZE,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createTransferInstruction,
  createMint,
  getAccountLen,
  createInitializeAccountInstruction,
  createEnableRequiredMemoTransfersInstruction,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";
import bs58, { encode } from "bs58";

export async function createScanner(
  payer: Keypair
): Promise<{ owner: PublicKey; mint: PublicKey; accountSecret: string }> {
  // Connection to devnet cluster
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // Transaction to send
  let transaction: Transaction;
  // Transaction signature returned from sent transaction
  let transactionSignature: string;

  // Authority that can mint new tokens
  const mintAuthority = payer.publicKey;
  // Decimals for Mint Account
  const decimals = 0;

  // Create Mint Account
  const mint = await createMint(
    connection,
    payer, // Payer of the transaction and initialization fees
    mintAuthority, // Mint Authority
    null, // Optional Freeze Authority
    decimals, // Decimals of Mint
    undefined, // Optional keypair
    undefined, // Options for confirming the transaction
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  // Random keypair to use as owner of Token Account
  const accountKeypair = Keypair.generate();
  // Address for Token Account
  const account = accountKeypair.publicKey;

  // Size of Token Account with extension
  const accountLen = getAccountLen([ExtensionType.MemoTransfer]);
  // Minimum lamports required for Token Account
  const lamports = await connection.getMinimumBalanceForRentExemption(
    accountLen
  );

  // Instruction to invoke System Program to create new account
  const createAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey, // Account that will transfer lamports to created account
    newAccountPubkey: account, // Address of the account to create
    space: accountLen, // Amount of bytes to allocate to the created account
    lamports, // Amount of lamports transferred to created account
    programId: TOKEN_2022_PROGRAM_ID, // Program assigned as owner of created account
  });

  // Instruction to initialize Token Account data
  const initializeAccountInstruction = createInitializeAccountInstruction(
    account, // Token Account Address
    mint, // Mint Account
    payer.publicKey, // Token Account Owner
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  // Instruction to initialize the MemoTransfer Extension
  const enableRequiredMemoTransfersInstruction =
    createEnableRequiredMemoTransfersInstruction(
      account, // Token Account address
      payer.publicKey, // Token Account Owner
      undefined, // Additional signers
      TOKEN_2022_PROGRAM_ID // Token Program ID
    );

  // Add instructions to new transaction
  transaction = new Transaction().add(
    createAccountInstruction,
    initializeAccountInstruction,
    enableRequiredMemoTransfersInstruction
  );

  // Send transaction
  transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, accountKeypair] // Signers
  );

  console.log(
    "\nCreate Token Account:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`
  );

  return {
    owner: payer.publicKey,
    mint: mint,
    accountSecret: encode(accountKeypair.secretKey),
  };
}
////////////////////////////

/**
 * Creates a transaction for a scanner to interact with an item, transferring tokens.
 *
 * @param payer - The payer of the transaction fees and creator of associated token accounts.
 * @param scannerAccount - The scanner's Keypair.
 * @param itemAccount - The item's Keypair.
 * @param itemMint - The mint address of the item's SPL token.
 * @returns A promise that resolves to the transaction URL.
 */
export async function createScannerTransaction(
  payer: Keypair,
  scannerSecret: string,
  itemSecret: string,
  itemMint: string
): Promise<string> {
  console.log("createScannerTransaction", payer.publicKey.toString());
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const payerSOLBalance = await connection.getBalance(payer.publicKey);
  console.log(
    "Payer SOL Balance:",
    payerSOLBalance / LAMPORTS_PER_SOL + " SOL"
  );

  console.log("createScannerTransaction", scannerSecret, itemSecret);

  const scannerAccount = Keypair.fromSecretKey(bs58.decode(scannerSecret));

  console.log("createScannerTransaction", scannerAccount.publicKey);

  const itemAccount = Keypair.fromSecretKey(bs58.decode(itemSecret));

  // Size of Token Account with extension
  const accountLen = getAccountLen([ExtensionType.MemoTransfer]);
  // Minimum lamports required for Token Account
  const lamports = await connection.getMinimumBalanceForRentExemption(
    accountLen
  );

  // // Instruction to invoke System Program to create new account
  // const createAccountInstructionMemo = SystemProgram.createAccount({
  //   fromPubkey: payer.publicKey, // Account that will transfer lamports to created account
  //   newAccountPubkey: scannerAccount.publicKey, // Address of the account to create
  //   space: accountLen, // Amount of bytes to allocate to the created account
  //   lamports, // Amount of lamports transferred to created account
  //   programId: TOKEN_2022_PROGRAM_ID, // Program assigned as owner of created account
  // });

  // // Instruction to initialize Token Account data
  // const initializeAccountInstructionMemo = createInitializeAccountInstruction(
  //   scannerAccount.publicKey, // Token Account Address
  //   new PublicKey(itemMint), // Mint Account
  //   payer.publicKey, // Token Account Owner
  //   TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  // );

  // // Instruction to initialize the MemoTransfer Extension
  // const enableRequiredMemoTransfersInstruction =
  //   createEnableRequiredMemoTransfersInstruction(
  //     scannerAccount.publicKey, // Token Account address
  //     payer.publicKey, // Token Account Owner
  //     undefined, // Additional signers
  //     TOKEN_2022_PROGRAM_ID // Token Program ID
  //   );

  // // Add instructions to new transaction
  // const transactionMemo = new Transaction().add(
  //   createAccountInstructionMemo,
  //   initializeAccountInstructionMemo,
  //   enableRequiredMemoTransfersInstruction
  // );

  // // Send transaction
  // const transactionSignaturememo = await sendAndConfirmTransaction(
  //   connection,
  //   transactionMemo,
  //   [payer, scannerAccount] // Signers
  // );

  const associatedTokenAccountItem = new PublicKey(
    "5KPK2EjpRZg5fHVWhCEU4WdVxYx2mnpKXBFwvkYFQNhr"
  );

  console.log("test 69");

  // Instruction to transfer tokens
  const transferInstruction = createTransferInstruction(
    associatedTokenAccountItem, // Source Token Account
    scannerAccount.publicKey, // Destination Token Account
    itemAccount.publicKey, // Source Token Account owner
    1, // Amount
    undefined, // Additional signers
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  // Message for the memo
const message = "Latitude: 40.696062 / N 40° 41' 45.823' 'Longitude: -111.794433 / W 111° 47' 39.959''";
// Instruction to add memo
const memoInstruction = new TransactionInstruction({
  keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
  data: Buffer.from(message, "utf-8"),
  programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
});

  // Add instructions to new transaction
  const transaction = new Transaction().add(memoInstruction, transferInstruction);

  console.log("test 2");
  // Send transaction

  console.log("test 3");




  const transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, itemAccount] // Signers
  );

  console.log(
    "\nTransfer with Memo:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`
  );

  return `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`;
}
