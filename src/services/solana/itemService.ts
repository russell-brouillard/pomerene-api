import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";

import { TokenMetadata } from "@solana/spl-token-metadata";
import { encode } from "bs58";
import { createMetadataMint, mintToAccount } from "./solanaService";

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
  const updateAuthority = payer.publicKey;
  const mintAuthority = payer.publicKey;
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

  await createMetadataMint(
    metaData,
    payer,
    mint,
    mintAuthority,
    decimals,
    connection,
    mintKeypair,
    updateAuthority
  );

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
