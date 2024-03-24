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
  TYPE_SIZE,
  LENGTH_SIZE,
  mintTo,
  createAccount,
  createInitializeMintCloseAuthorityInstruction,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";
import { encode } from "bs58";

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
  const mintKeypair = Keypair.generate();

  // Define authorities
  const updateAuthority = itemKeyPair.publicKey;
  const mintAuthority = itemKeyPair.publicKey;
  const decimals = 0;
  const mint = mintKeypair.publicKey;

  // Define metadata for the mint
  const metaData: TokenMetadata = {
    updateAuthority,
    mint: mintKeypair.publicKey,
    name,
    symbol,
    uri,
    additionalMetadata,
  };

  // CREATE MINTMETADATA
  console.log("START Create Metadata Mint");

  await createMetadataMint(
    metaData,
    payer,
    mint,
    mintAuthority,
    decimals,
    connection,
    mintKeypair,
    itemKeyPair,
    updateAuthority
  );

  console.log("END Create Metadata Mint");

  // SEND NEW TOKENS

  mintToAccount(
    payer,
    mint,
    mintAuthority,
    connection,
    itemKeyPair,
    payer.publicKey,
    1
  );

  const tokenAccount = await mintToAccount(
    payer,
    mint,
    mintAuthority,
    connection,
    itemKeyPair,
    itemKeyPair.publicKey,
    100
  );

  return {
    owner: payer.publicKey,
    mint: mint,
    tokenAccount: tokenAccount.toString(),
    itemSecret: encode(itemKeyPair.secretKey),
  };
}

async function createMetadataMint(
  metaData: TokenMetadata,
  payer: Keypair,
  mint: PublicKey,
  mintAuthority: PublicKey,
  decimals: number,
  connection: Connection,
  mintKeypair: Keypair,
  itemKeyPair: Keypair,
  updateAuthority: PublicKey
) {
  // Calculate sizes
  const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
  const metadataLen = pack(metaData).length;
  const mintLen = getMintLen([
    ExtensionType.MetadataPointer,
    ExtensionType.MintCloseAuthority,
  ]);

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
    mint,
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

  // Instruction to initialize the MintCloseAuthority Extension
  const initializeMintCloseAuthorityInstruction =
    createInitializeMintCloseAuthorityInstruction(
      mint, // Mint Account address
      payer.publicKey, // Designated Close Authority
      TOKEN_2022_PROGRAM_ID // Token Extension Program ID
    );

  // Create transaction
  let transaction = new Transaction().add(
    createAccountInstruction,
    initializeMintCloseAuthorityInstruction,
    initializeMetadataPointerInstruction,

    initializeMintInstruction,
    initializeMetadataInstruction,
    updateFieldInstruction
  );

  console.log("start");
  // Send transaction
  let transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, mintKeypair, itemKeyPair] // Signers
  );

  console.log("end");
}

async function mintToAccount(
  payer: Keypair,
  mint: PublicKey,
  mintAuthority: PublicKey,
  connection: Connection,
  itemKeyPair: Keypair,
  tokenAccountOwner: PublicKey,
  amount: number
): Promise<PublicKey> {
  const tokenAccount = await createAccount(
    connection,
    payer, // Payer to create Token Account
    mint, // Mint Account address
    tokenAccountOwner, // Token Account owner
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
    amount, // Amount
    [itemKeyPair], // Additional signers
    undefined, // Confirmation options
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  console.log(
    "\nMint Tokens:",
    `https://solana.fm/tx/${transactionSignatureMint}?cluster=devnet-solana`
  );

  return tokenAccount;
}
