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
import { getTokensByOwner } from "./solanaService";
import { fetchItem } from "./itemService";

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

  const itemMint = await getTokensByOwner(itemAccount).then(
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
    data: Buffer.from(
      JSON.stringify(
        `${itemAccount.publicKey},${scannerAccountKeypair.publicKey},${message}`
      ),
      "utf-8"
    ),
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

export async function fetchTransactions(
  accountAddress: string,
  limit: number = 10
) {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const pubKey = new PublicKey(accountAddress);

  const before = undefined;
  const until = undefined;

  try {
    const options = {
      limit,
      before,
      until,
    };
    const res = await connection.getConfirmedSignaturesForAddress2(
      pubKey,
      options
    );

    return res.filter((sig) => sig.memo !== null);
  } catch (error) {
    console.error("Failed to fetch transaction signatures:", error);
    throw error;
  }
}

export async function fetchItemsTransaction(owner: Keypair) {
  const data = await fetchItem(owner);

  const publicKeys: string[] = [];

  console.log(data);

  // Extract public keys from data
  data.forEach((tx: any) => {
    const publicEntry = tx.metadata.additionalMetadata.find(
      (entry: any) => entry[0] === "public"
    );
    if (publicEntry) {
      publicKeys.push(publicEntry[1]);
    }
  });

  // Use Promise.all to fetch all transactions concurrently
  const results = await Promise.all(
    publicKeys.map((key) => fetchTransactions(key, 1))
  );

  // Filter out any empty results and flatten the array
  return results.filter((result) => result && result.length > 0).flat();
}
