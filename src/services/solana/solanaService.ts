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
  TOKEN_PROGRAM_ID,
  TYPE_SIZE,
  closeAccount,
  createAccount,
  createInitializeInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintCloseAuthorityInstruction,
  createInitializeMintInstruction,
  createUpdateFieldInstruction,
  getAccount,
  getMetadataPointerState,
  getMint,
  getMintLen,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { SplTokenAccount } from "solanaTypes";
import { encode } from "bs58";
import { TokenMetadata, pack } from "@solana/spl-token-metadata";

// Function to get balance
export async function getBalance(publicKey: string): Promise<number> {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const balance = await connection.getBalance(new PublicKey(publicKey));
  return balance / LAMPORTS_PER_SOL;
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

export async function fetchOwnedMintAddresses(
  ownerAddress: string
): Promise<string[]> {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const ownerPublicKey = new PublicKey(ownerAddress); // Ensure ownerAddress is a PublicKey

  console.log("ownerPublicKey = ", ownerPublicKey.toBase58());
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    ownerPublicKey, // Use the converted PublicKey instance
    {
      programId: TOKEN_2022_PROGRAM_ID,
    }
  );

  const mintAddresses = tokenAccounts.value.map((accountInfo) => {
    const accountData = accountInfo.account.data.parsed.info;
    return accountData.mint;
  });

  return mintAddresses;
}

export async function getAccountsByOwner(owner: Keypair) {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // Fetch all token accounts for the owner
  const accounts = await connection.getParsedTokenAccountsByOwner(
    owner.publicKey,
    {
      programId: TOKEN_2022_PROGRAM_ID,
    }
  );

  console.log("accounts = ", accounts);

  // Parse the accounts to differentiate between mints and token balances (if necessary)
  const parsedAccounts = await Promise.all(
    accounts.value.map(async (accountInfo) => {
      const accountData = accountInfo.account.data.parsed.info;

      const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        owner, // Payer to create Token Account
        new PublicKey(accountData.mint), // Mint Account address
        owner.publicKey, // Token Account owner
        false, // Skip owner check
        undefined, // Optional keypair, default to Associated Token Account
        undefined, // Confirmation options
        TOKEN_2022_PROGRAM_ID // Token Extension Program ID
      ).then((ata) => ata.address);

      return {
        mint: accountData.mint, // The mint address this token account is associated with
        owner: accountData.owner, // Owner of this token account
        tokenAccount: sourceTokenAccount, // The token account address
        tokenAmount: accountData.tokenAmount.uiAmount, // The token balance
        // You might include more details as necessary
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

  // Send transaction
  let transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, mintKeypair] // Signers
  );

  console.log(
    "\nCreate Mint Account:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`
  );

  // Retrieve mint information
  const mintInfo = await getMint(
    connection,
    mint,
    "confirmed",
    TOKEN_2022_PROGRAM_ID
  );

  // Retrieve and log the metadata pointer state
  const metadataPointer = getMetadataPointerState(mintInfo);
  console.log("\nMetadata Pointer:", JSON.stringify(metadataPointer, null, 2));
}

export async function mintToAccount(
  payer: Keypair,
  mint: PublicKey,
  mintAuthority: PublicKey,
  connection: Connection,
  itemKeyPair: Keypair | undefined,
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

  console.log("Token Account:", tokenAccount);

  const transactionSignatureMint = await mintTo(
    connection,
    payer, // Transaction fee payer
    mint, // Mint Account address
    tokenAccount, // Mint to
    mintAuthority, // Mint Authority address
    amount, // Amount
    itemKeyPair ? [itemKeyPair] : [], // Additional signers
    undefined, // Confirmation options
    TOKEN_2022_PROGRAM_ID // Token Extension Program ID
  );

  console.log(
    "\nMint Tokens:",
    `https://solana.fm/tx/${transactionSignatureMint}?cluster=devnet-solana`
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

  console.log(
    "\nClose Mint Account:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`
  );

  return transactionSignature;
}
