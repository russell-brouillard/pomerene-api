import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createEnableRequiredMemoTransfersInstruction,
  createInitializeAccountInstruction,
  createTransferInstruction,
  getAccountLen,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
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
import { decode } from "bs58";
import { getAccountsByOwner, getBalance } from "./solanaService";

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
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const itemAccount = Keypair.fromSecretKey(decode(itemSecret));

  const itemMint = await getAccountsByOwner(itemAccount).then(
    (parsedAccounts: any) => new PublicKey(decode(parsedAccounts[0].mint))
  );

  const scannerAccountKeypair = Keypair.fromSecretKey(decode(scannerSecret));
  const scannerAccount = scannerAccountKeypair.publicKey;

  await fundScannerAccount(connection, payer, scannerAccount);

  const associatedTokenAccountItem = await getOrCreateAssociatedTokenAccount(
    connection,
    scannerAccountKeypair, // Payer to create Token Account
    itemMint, // Mint Account address
    itemAccount.publicKey, // Token Account owner
    false, // Skip owner check
    undefined, // Optional keypair, default to Associated Token Account
    undefined, // Confirmation options
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  ).then((ata) => ata.address);

  const scannerTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    scannerAccountKeypair,
    itemMint,
    scannerAccountKeypair.publicKey,
    false, // Skip owner check
    undefined, // Optional keypair, default to Associated Token Account
    undefined, // Confirmation options
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  ).then((ata) => ata.address);

  // Instruction to add memo
  const memoInstruction = new TransactionInstruction({
    keys: [
      {
        pubkey: scannerAccountKeypair.publicKey,
        isSigner: true,
        isWritable: true,
      },
    ],
    data: Buffer.from(JSON.stringify(`${itemAccount.publicKey}:${scannerAccountKeypair.publicKey}:${message}`), "utf-8"),
    programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
  });

  // Instruction to transfer tokens
  const transferInstruction = createTransferInstruction(
    associatedTokenAccountItem, // Source Token Account
    scannerTokenAccount, // Destination Token Account
    itemAccount.publicKey, // Source Token Account owner
    1, // Amount
    undefined, // Additional signers
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  // Add instructions to new transaction
  const transaction = new Transaction().add(
    memoInstruction,
    transferInstruction
  );

  const transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [scannerAccountKeypair, itemAccount] // Signers
  );

  return `https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`;
}

async function fundScannerAccount(
  connection: Connection,
  payer: Keypair,
  scannerPublicKey: PublicKey
) {
  const lamportsForRentExemption =
    await connection.getMinimumBalanceForRentExemption(
      getAccountLen([ExtensionType.MemoTransfer])
    );

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: scannerPublicKey,
      lamports:
        lamportsForRentExemption + Math.round(0.00001 * LAMPORTS_PER_SOL),
    })
  );

  await sendAndConfirmTransaction(connection, transaction, [payer]);
}

export async function fetchTransactions(accountAddress: string) {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const pubKey = new PublicKey(accountAddress);
  const limit = 10;

  const before = undefined;
  const until = undefined;

  try {
    const options = {
      limit,
      before,
      until,
    };
    return await connection.getConfirmedSignaturesForAddress2(pubKey, options);
  } catch (error) {
    console.error("Failed to fetch transaction signatures:", error);
    throw error;
  }
}

// export async function findTokenTransactions(publicKeyString: string) {
//   const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
//   const publicKey = new PublicKey(publicKeyString);

//   // Fetch the signatures of the last N transactions. Adjust 'limit' as needed.
//   const signatures = await connection.getSignaturesForAddress(publicKey, {
//     limit: 10,
//   });

//   // Fetch the actual transactions using the signatures
//   const transactions = await Promise.all(
//     signatures.map((signatureInfo) =>
//       connection.getTransaction(signatureInfo.signature)
//     )
//   );

//   return transactions.filter((tx) => tx !== null); // Filter out any null transactions
// }
