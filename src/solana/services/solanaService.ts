import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";

// Function to get balance
export async function getBalance(publicKey: string): Promise<number> {
  const connection = new Connection(process.env.solanaCluster!, "confirmed");
  const balance = await connection.getBalance(new PublicKey(publicKey));
  return balance / LAMPORTS_PER_SOL;
}
