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
  getAccountLen,
  createInitializeAccountInstruction,
  createAccount,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";
import { it } from "node:test";
import base58, { encode } from "bs58";

export async function createItem(
  payer: Keypair,
  name: string,
  symbol: string,
  additionalMetadata: [string, string][],
  uri: string
): Promise<{
  owner: PublicKey;
  mint: PublicKey;
  tokenAccount: string;
  itemSecret: string;
}> {
  // Initialize connection to Solana cluster

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const itemKeyPair = Keypair.generate();

  // Create Mint Account
  const mintKeyPair = Keypair.generate();

  const mint = mintKeyPair.publicKey;

  // Define authorities
  const updateAuthority = itemKeyPair.publicKey;
  const mintAuthority = itemKeyPair.publicKey;
  const decimals = 0;

  // Define metadata for the mint
  const metaData: TokenMetadata = {
    updateAuthority,
    mint: mint,
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
    newAccountPubkey: mint,
    space: mintLen,
    lamports,
    programId: TOKEN_2022_PROGRAM_ID,
  });

  console.log("create Item !!!!");

  // Initialize metadata pointer instruction
  const initializeMetadataPointerInstruction =
    createInitializeMetadataPointerInstruction(
      mint,
      updateAuthority,
      mint,
      TOKEN_2022_PROGRAM_ID
    );

  // Initialize mint instruction
  const initializeMintInstruction = createInitializeMintInstruction(
    mint,
    decimals,
    mintAuthority,
    null,
    TOKEN_2022_PROGRAM_ID
  );

  // Initialize metadata instruction
  const initializeMetadataInstruction = createInitializeInstruction({
    programId: TOKEN_2022_PROGRAM_ID,
    metadata: mint,
    updateAuthority,
    mint: mint,
    mintAuthority,
    name: metaData.name,
    symbol: metaData.symbol,
    uri: metaData.uri,
  });

  // Update metadata instruction
  const updateFieldInstruction = createUpdateFieldInstruction({
    programId: TOKEN_2022_PROGRAM_ID,
    metadata: mint,
    updateAuthority,
    field: metaData.additionalMetadata[0][0],
    value: metaData.additionalMetadata[0][1],
  });

  // Create transaction
  const transaction = new Transaction().add(
    createAccountInstruction,
    initializeMetadataPointerInstruction,
    initializeMintInstruction,
    initializeMetadataInstruction,
    updateFieldInstruction
  );

  console.log("create Item !!!!2");
  // Send transaction
  const transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, itemKeyPair, mintKeyPair] // Signers
  );

  const tokenAccount = await createAccount(
    connection,
    payer, // Payer to create Token Account
    mint, // Mint Account address
    itemKeyPair.publicKey, // Token Account owner
    undefined, // Optional keypair, default to Associated Token Account
    undefined, // Confirmation options
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  const transactionSignatureMint = await mintTo(
    connection,
    payer, // Transaction fee payer
    mint, // Mint Account address
    tokenAccount, // Mint to
    mintAuthority, // Mint Authority address
    101, // Amount
    [itemKeyPair], // Additional signers
    undefined, // Confirmation options
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  console.log(
    "\nMint Tokens:",
    `https://solana.fm/tx/${transactionSignatureMint}?cluster=devnet-solana`
  );

  return {
    owner: payer.publicKey,
    mint: mint,
    tokenAccount: tokenAccount.toString(),
    itemSecret: encode(itemKeyPair.secretKey),
  };
}
