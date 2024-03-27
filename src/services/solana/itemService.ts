import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";

import { TokenMetadata } from "@solana/spl-token-metadata";
import { encode } from "bs58";
import { createMetadataMint, getAccountsByOwner, mintToAccount } from "./solanaService";
import { TokenObject } from "userTypes";

export async function createItem(
  payer: Keypair,
  description: string,
): Promise<{
  owner: PublicKey;
  mint: PublicKey;
  tokenAccount: string;
  itemSecret: string;
  description: string;
}> {
  // Initialize connection to Solana cluster

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const itemKeyPair = Keypair.generate();
  const mintKeypair = Keypair.generate();

  console.log("PUBLIC KEY", payer.publicKey.toString());

  // Define authorities
  const updateAuthority = payer.publicKey;
  const mintAuthority = payer.publicKey;
  const decimals = 0;
  const mint = mintKeypair.publicKey;

  // Define metadata for the mint
  const metaData: TokenMetadata = {
    updateAuthority,
    mint: mintKeypair.publicKey,
    name:"ITEM",
    symbol: "POM",
    uri: "https://www.pomerene.net/api/v1/json/metadata.json",
    additionalMetadata:[["description", description]],
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

  console.log("TEST 2");

  mintToAccount(
    payer,
    mint,
    mintAuthority,
    connection,
    itemKeyPair,
    payer.publicKey,
    1
  );

  console.log("TEST 3");
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
    description,
  };
}

export async function fetchItem(owner: Keypair) {
  const tokens = await getAccountsByOwner(owner);

  return tokens.filter(
    (token: TokenObject) => token.metadata.name.toLowerCase() === "item"
  );
}
