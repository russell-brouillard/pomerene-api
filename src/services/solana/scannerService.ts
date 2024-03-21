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
import bs58 from "bs58";

export async function createScanner(
  payer: Keypair
): Promise<{ owner: PublicKey; mint: PublicKey; tokenAccount: PublicKey }> {
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
  const tokenAccountKeypair = Keypair.generate();
  // Address for Token Account
  const tokenAccount = tokenAccountKeypair.publicKey;

  // Size of Token Account with extension
  const accountLen = getAccountLen([ExtensionType.MemoTransfer]);
  // Minimum lamports required for Token Account
  const lamports = await connection.getMinimumBalanceForRentExemption(
    accountLen
  );

  // Instruction to invoke System Program to create new account
  const createAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey, // Account that will transfer lamports to created account
    newAccountPubkey: tokenAccount, // Address of the account to create
    space: accountLen, // Amount of bytes to allocate to the created account
    lamports, // Amount of lamports transferred to created account
    programId: TOKEN_2022_PROGRAM_ID, // Program assigned as owner of created account
  });

  // Instruction to initialize Token Account data
  const initializeAccountInstruction = createInitializeAccountInstruction(
    tokenAccount, // Token Account Address
    mint, // Mint Account
    payer.publicKey, // Token Account Owner
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  // Instruction to initialize the MemoTransfer Extension
  const enableRequiredMemoTransfersInstruction =
    createEnableRequiredMemoTransfersInstruction(
      tokenAccount, // Token Account address
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
    [payer, tokenAccountKeypair] // Signers
  );

  console.log(
    "\nCreate Token Account:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`
  );

  return { owner: payer.publicKey, mint: mint, tokenAccount: tokenAccount };
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
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  console.log("createScannerTransaction", scannerSecret, itemSecret);

  const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer, // Payer to create Token Account
    new PublicKey(itemMint), // Mint Account address
    payer.publicKey, // Token Account owner
    false, // Skip owner check
    undefined, // Optional keypair, default to Associated Token Account
    undefined, // Confirmation options
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  ).then((ata) => ata.address);

  const itemAccount = Keypair.fromSecretKey(bs58.decode(itemSecret));

  // Instruction to transfer tokens
  const transferInstruction = createTransferInstruction(
    itemAccount.publicKey, // Source Token Account
    associatedTokenAccount, // Destination Token Account
    payer.publicKey, // Source Token Account owner
    1, // Amount
    undefined, // Additional signers
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  // Add instructions to new transaction
  const transaction = new Transaction().add(transferInstruction);

  console.log("test 2");
  // Send transaction

  const scannerAccount = Keypair.fromSecretKey(bs58.decode(scannerSecret));

  const transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, scannerAccount, itemAccount] // Signers
  );

  console.log(
    "\nTransfer with Memo:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`
  );

  return `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`;
}
