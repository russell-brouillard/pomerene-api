import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
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
  createEnableRequiredMemoTransfersInstruction,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";

export async function createItem(
  payer: Keypair,
  mint: Keypair,
  name: string,
  symbol: string,
  additionalMetadata: [string, string][],
  uri: string
): Promise<TokenMetadata | null> {
  // Initialize connection to Solana cluster

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  try {
    const mintInfoCheck = await getMint(
      connection,
      mint.publicKey,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );

    console.log("mintInfoCheck", mintInfoCheck);

    const metadataCheck = await getTokenMetadata(connection, mint.publicKey);

    if (metadataCheck) {
      console.log("metadataCheck", metadataCheck);
      return metadataCheck;
    }
  } catch (error) {}

  // Define authorities
  const updateAuthority = payer.publicKey;
  const mintAuthority = payer.publicKey;
  const decimals = 0;

  // Define metadata for the mint
  const metaData: TokenMetadata = {
    updateAuthority,
    mint: mint.publicKey,
    name,
    symbol,
    uri,
    additionalMetadata,
  };

  // Calculate sizes
  const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
  const metadataLen = pack(metaData).length;
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);

  // Calculate minimum lamports required for Mint Account
  const lamports = await connection.getMinimumBalanceForRentExemption(
    mintLen + metadataExtension + metadataLen
  );

  // Create account instruction
  const createAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mint.publicKey,
    space: mintLen,
    lamports,
    programId: TOKEN_2022_PROGRAM_ID,
  });

  // Initialize metadata pointer instruction
  const initializeMetadataPointerInstruction =
    createInitializeMetadataPointerInstruction(
      mint.publicKey,
      updateAuthority,
      mint.publicKey,
      TOKEN_2022_PROGRAM_ID
    );

  // Initialize mint instruction
  const initializeMintInstruction = createInitializeMintInstruction(
    mint.publicKey,
    decimals,
    mintAuthority,
    null,
    TOKEN_2022_PROGRAM_ID
  );

  // Initialize metadata instruction
  const initializeMetadataInstruction = createInitializeInstruction({
    programId: TOKEN_2022_PROGRAM_ID,
    metadata: mint.publicKey,
    updateAuthority,
    mint: mint.publicKey,
    mintAuthority,
    name: metaData.name,
    symbol: metaData.symbol,
    uri: metaData.uri,
  });

  // Update metadata instruction
  const updateFieldInstruction = createUpdateFieldInstruction({
    programId: TOKEN_2022_PROGRAM_ID,
    metadata: mint.publicKey,
    updateAuthority,
    field: metaData.additionalMetadata[0][0],
    value: metaData.additionalMetadata[0][1],
  });

  const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer, // Payer to create Token Account
    mint.publicKey, // Mint Account address
    payer.publicKey, // Token Account owner
    false, // Skip owner check
    undefined, // Optional keypair, default to Associated Token Account
    undefined, // Confirmation options
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  ).then((ata) => ata.address);

  const enableRequiredMemoTransfersInstruction =
    createEnableRequiredMemoTransfersInstruction(
      sourceTokenAccount, // Token Account address
      payer.publicKey, // Token Account Owner
      undefined, // Additional signers
      TOKEN_2022_PROGRAM_ID // Token Program ID
    );

  // Create transaction
  const transaction = new Transaction().add(
    createAccountInstruction,
    initializeMetadataPointerInstruction,
    initializeMintInstruction,
    initializeMetadataInstruction,
    updateFieldInstruction, 
    enableRequiredMemoTransfersInstruction
  );

  // Send transaction
  const transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, mint]
  );

  // Log transaction details
  console.log(
    "\nCreate Mint Account:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`
  );

  // Retrieve mint information
  const mintInfo = await getMint(
    connection,
    mint.publicKey,
    "confirmed",
    TOKEN_2022_PROGRAM_ID
  );

  // Log metadata pointer state
  const metadataPointer = getMetadataPointerState(mintInfo);
  console.log("\nMetadata Pointer:", JSON.stringify(metadataPointer, null, 2));

  // Retrieve and log metadata state
  console.log("mint = ", mint);
  const metadata = await getTokenMetadata(connection, mint.publicKey);
  console.log("\nMetadata:", JSON.stringify(metadata, null, 2));

  console.log("Token Account:", sourceTokenAccount);

  const transactionSignatureMint = await mintTo(
    connection,
    payer, // Transaction fee payer
    mint.publicKey, // Mint Account address
    sourceTokenAccount, // Mint to
    mintAuthority, // Mint Authority address
    1, // Amount
    undefined, // Additional signers
    undefined, // Confirmation options
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  console.log(
    "\nMint Tokens:",
    `https://solana.fm/tx/${transactionSignatureMint}?cluster=devnet-solana`
  );

  console.log("russell new");

  return metaData;
}
