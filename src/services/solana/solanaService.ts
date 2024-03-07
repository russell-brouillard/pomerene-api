import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { SplTokenAccount } from "solanaTypes";

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
