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
  getMetadataPointerState,
  getMint,
  getMintLen,
  getOrCreateAssociatedTokenAccount,
  getTokenMetadata,
  mintTo,
} from "@solana/spl-token";
import { SplTokenAccount } from "solanaTypes";
import { encode } from "bs58";
import { TokenMetadata, pack } from "@solana/spl-token-metadata";

const MAX_TRANSACTION_BATCH_SIZE = 10;

// Function to get balance
export async function getBalance(publicKey: string): Promise<number> {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const balance = await connection.getBalance(new PublicKey(publicKey));
  return balance / LAMPORTS_PER_SOL;
}

export async function airdropSol(publicKeyString: string) {
  // Connect to the Solana devnet cluster.
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const recipientPublicKey = new PublicKey(publicKeyString);

  const lamports = 0.9 * LAMPORTS_PER_SOL;

  try {
    // Request airdrop
    const airdropSignature = await connection.requestAirdrop(
      recipientPublicKey,
      lamports
    );

    // Confirm the transaction
    const latestBlockHash = await connection.getLatestBlockhash();

    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: airdropSignature,
    });

    return 0.9;
  } catch (error) {
    console.error("Airdrop failed try again!:", error);
    throw error;
  }
}

export async function getSPLTokens(
  publicKey: string
): Promise<SplTokenAccount[]> {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const ownerPublicKey = new PublicKey(publicKey);

  // Fetch all SPL Token accounts for the specified wallet
  const { value: tokenAccounts } =
    await connection.getParsedTokenAccountsByOwner(ownerPublicKey, {
      programId: TOKEN_2022_PROGRAM_ID,
    });

  // Process and return the token accounts data
  return tokenAccounts.map((account) => ({
    mint: account.account.data.parsed.info.mint,
    owner: account.account.data.parsed.info.owner,
    tokenAmount: account.account.data.parsed.info.tokenAmount.uiAmount,
  }));
}

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

export async function getAccountsByOwner(owner: Keypair): Promise<any[]> {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // Fetch all token accounts for the owner
  const accounts = await connection.getParsedTokenAccountsByOwner(
    owner.publicKey,
    {
      programId: TOKEN_2022_PROGRAM_ID,
    }
  );

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

export async function deleteItem(payer: Keypair, mint: PublicKey) {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const transactionSignature = await closeAccount(
    connection,
    payer, // Transaction fee payer
    mint, // Mint Account address
    payer.publicKey, // Account to receive lamports from closed account
    payer.publicKey, // Close Authority for Mint Account
    undefined, // Additional signers
    undefined, // Confirmation options
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  return transactionSignature;
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
