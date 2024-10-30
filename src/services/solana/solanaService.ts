import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ExtensionType,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
  closeAccount,
  createInitializeInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintCloseAuthorityInstruction,
  createInitializeMintInstruction,
  createUpdateFieldInstruction,
  getMint,
  getMintLen,
  getTokenMetadata,
  mintTo,
  burn,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";

import { encode } from "bs58";
import { TokenMetadata, pack } from "@solana/spl-token-metadata";

export function generateSolanaKeypair(): {
  publicKey: string;
  privateKey: string;
} {
  const keypair = Keypair.generate();

  // Encode the secret key as a base58 string
  const privateKeyBase58 = encode(keypair.secretKey);

  // Return both the public key and the private key as strings
  return {
    publicKey: keypair.publicKey.toString(),
    privateKey: privateKeyBase58,
  };
}

export async function getTokensByOwner(owner: PublicKey): Promise<any[]> {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // Fetch all token accounts for the owner
  const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: TOKEN_2022_PROGRAM_ID,
  });

  // Cache for metadata to avoid fetching the same data multiple times
  const metadataCache = new Map<string, any>();

  // Process each account in parallel, leveraging the cache for metadata
  const parsedAccounts = await Promise.all(
    accounts.value.map(async (accountInfo) => {
      const accountData = accountInfo.account.data.parsed.info;
      let metadata = metadataCache.get(accountData.mint);

      if (!metadata) {
        // Fetch metadata if not already cached
        metadata = await getTokenMetadata(
          connection,
          new PublicKey(accountData.mint)
        );
        metadataCache.set(accountData.mint, metadata);
      }

      return {
        mint: accountData.mint,
        owner: accountData.owner,
        tokenAccount: accountInfo.pubkey,
        itemPublic: metadata.additionalMetadata[2][1],
        itemSecret: metadata.additionalMetadata[0][1],
        tokenAmount: accountData.tokenAmount.uiAmount,
        metadata,
        //lastTokenTransaction
      };
    })
  );

  return parsedAccounts;
}

export async function createMetadataMint(
  metaData: TokenMetadata,
  payer: Keypair,
  mint: PublicKey,
  mintAuthority: PublicKey,
  decimals: number,
  connection: Connection,
  mintKeypair: Keypair,
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

  const updateFieldInstruction2 = createUpdateFieldInstruction({
    programId: TOKEN_2022_PROGRAM_ID,
    metadata: mint,
    updateAuthority,
    field: metaData.additionalMetadata[1][0],
    value: metaData.additionalMetadata[1][1],
  });

  const updateFieldInstruction3 = createUpdateFieldInstruction({
    programId: TOKEN_2022_PROGRAM_ID,
    metadata: mint,
    updateAuthority,
    field: metaData.additionalMetadata[2][0],
    value: metaData.additionalMetadata[2][1],
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
    updateFieldInstruction,
    updateFieldInstruction2,
    updateFieldInstruction3
  );

  // Send transaction
  let transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, mintKeypair] // Signers
  );

  // Retrieve mint information
  const mintInfo = await getMint(
    connection,
    mint,
    "confirmed",
    TOKEN_2022_PROGRAM_ID
  );

  return mint;
}

export async function mintToAccount(
  payer: Keypair,
  mint: PublicKey,
  mintAuthority: PublicKey,
  connection: Connection,
  additionalSigners: Keypair,
  tokenAccountOwner: PublicKey,
  amount: number
): Promise<PublicKey> {
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer, // Payer to create Token Account
    mint, // Mint Account address
    tokenAccountOwner, //  Owner of the account to set or verify
    false, // Skip owner check
    undefined, // Optional keypair, default to Associated Token Account
    undefined, // Confirmation options
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  ).then((ata) => ata.address);

  const transactionSignatureMint = await mintTo(
    connection,
    payer, // Transaction fee payer
    mint, // Mint Account address
    tokenAccount, // Mint to
    mintAuthority, // Mint Authority address
    amount, // Amount
    [additionalSigners], // Additional signers
    undefined, // Confirmation options
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  return tokenAccount;
}

export async function closeMintAccount(
  payer: Keypair,
  mint: PublicKey,
  account: PublicKey
) {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const burnConfirmMint = await burn(
    connection,
    payer,
    account,
    mint,
    payer.publicKey,
    1,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  const closeAuthority = payer.publicKey;

  const transactionSignature = await closeAccount(
    connection,
    payer, // Transaction fee payer
    mint, // Mint Account address
    payer.publicKey, // Account to receive lamports from closed account
    closeAuthority, // Close Authority for Mint Account
    undefined, // Additional signers
    undefined, // Confirmation options
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );
  return transactionSignature;
}

export async function fundScannerAccount(
  connection: Connection,
  payer: Keypair,
  scannerPublicKey: PublicKey,
  lamports: number
) {
  // const lamports = 0.01 * LAMPORTS_PER_SOL;
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: scannerPublicKey,
    lamports,
  });

  const transaction = new Transaction().add(transferInstruction);
  await sendAndConfirmTransaction(connection, transaction, [payer]);
}
