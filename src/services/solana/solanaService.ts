import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAccount,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { SplTokenAccount } from "solanaTypes";
import { encode } from "bs58";

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

      console.log("Token Account =====", sourceTokenAccount);

      return {
        mint: accountData.mint, // The mint address this token account is associated with
        owner: accountData.owner, // Owner of this token account
        tokenAccount: sourceTokenAccount, // The token account address
        tokenAmount: accountData.tokenAmount.uiAmount, // The token balance
        // You might include more details as necessary
      };
    })
  );

  console.log("Parsed Accounts:", parsedAccounts);
  return parsedAccounts;
}
