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
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";

export async function createScanner(
  payer: Keypair,
  scanner: Keypair
): Promise<TokenMetadata | null> {
  // Connection to devnet cluster
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // Transaction to send
  let transaction: Transaction;
  // Transaction signature returned from sent transaction
  let transactionSignature: string;

  // Authority that can mint new tokens
  const mintAuthority = payer.publicKey;
  // Decimals for Mint Account
  const decimals = 2;

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

  return null;
}
////////////////////////////

////// Create Scanner Transaction
export async function createScannerTransaction(
  payer: Keypair,
  scanner: Keypair,
  sourceTokenAccount: PublicKey
): Promise<string> {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  



  


  // Instruction to transfer tokens
  const transferInstruction = createTransferInstruction(
    sourceTokenAccount, // Source Token Account
    scanner.publicKey, // Destination Token Account
    payer.publicKey, // Source Token Account owner
    1 // Amount
    // undefined, // Additional signers
    // TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  // Message for the memo
  // const message = "Hello, Solana";
  // // Instruction to add memo
  // const memoInstruction = new TransactionInstruction({
  //   keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
  //   data: Buffer.from(message, "utf-8"),
  //   programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
  // });

  // Add instructions to new transaction
  const transaction = new Transaction().add(
    // memoInstruction,
    transferInstruction
  );

  // Send transaction
  const transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer] // Signers
  );

  console.log(
    "\nTransfer with Memo:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`
  );

  return `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`;
}
