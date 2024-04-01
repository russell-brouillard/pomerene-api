import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
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

  // Size of Token Account with extension
  const accountLen = getAccountLen([ExtensionType.MemoTransfer]);
  // Minimum lamports required for Token Account
  const lamports = await connection.getMinimumBalanceForRentExemption(
    accountLen
  );

  const amountLamports = 0.00001 * LAMPORTS_PER_SOL;

  console.log("LAMPORTS", amountLamports + lamports)

  const transferInstructionSOL = SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: scannerAccount,
    lamports: amountLamports + lamports,
  });

  // Create a transaction
  const transactionSOL = new Transaction().add(transferInstructionSOL);

  // Sign and send the transaction
  const signature = await sendAndConfirmTransaction(
    connection,
    transactionSOL,
    [payer]
  );


  console.log(scannerAccount);
  console.log("SOL TRANSER", signature);

  const scannerTokenAccountKeypair = Keypair.generate();

  // Instruction to invoke System Program to create new account
  const createAccountInstructionMemo = SystemProgram.createAccount({
    fromPubkey: scannerAccount, // Account that will transfer lamports to created account
    newAccountPubkey: scannerTokenAccountKeypair.publicKey, // Address of the account to create
    space: accountLen, // Amount of bytes to allocate to the created account
    lamports, // Amount of lamports transferred to created account
    programId: TOKEN_2022_PROGRAM_ID, // Program assigned as owner of created account
  });

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
    [scannerAccountKeypair, scannerTokenAccountKeypair] // Signers
  );

  console.log("Test 2");

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
    keys: [
      {
        pubkey: scannerAccountKeypair.publicKey,
        isSigner: true,
        isWritable: true,
      },
    ],
    data: Buffer.from(JSON.stringify(message), "utf-8"),
    programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
  });

  // Add instructions to new transaction
  const transaction = new Transaction().add(
    memoInstruction,
    transferInstruction
  );

  console.log("SCANNER", await getBalance(scannerAccount.toString()));
  console.log("PAYER", await getBalance(payer.publicKey.toString()));
  const transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [scannerAccountKeypair, itemAccount] // Signers
  );

  return `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`;
}

/////////////////////////////////////

export async function findTokenTransactions(publicKeyString: string) {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const publicKey = new PublicKey(publicKeyString);

  // Fetch the signatures of the last N transactions. Adjust 'limit' as needed.
  const signatures = await connection.getSignaturesForAddress(publicKey, {
    limit: 10,
  });

  // Fetch the actual transactions using the signatures
  const transactions = await Promise.all(
    signatures.map((signatureInfo) =>
      connection.getTransaction(signatureInfo.signature)
    )
  );

  return transactions.filter((tx) => tx !== null); // Filter out any null transactions
}
