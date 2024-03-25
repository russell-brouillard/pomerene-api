import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";

import { TokenMetadata } from "@solana/spl-token-metadata";
import { encode } from "bs58";
import { createMetadataMint, mintToAccount } from "./solanaService";

export async function createItem(
  payer: Keypair,
  name: string,
  symbol: string,
  additionalMetadata: [string, string][]
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
    name,
    symbol,
    uri: "https://fff92daf64249444b6df2714ba34f0beff31b03bac80f0873b50d1f-apidata.googleusercontent.com/download/storage/v1/b/pomerene-bucket/o/public%2Fjson%2Fcargo.json?jk=AWNiL9IQkG32BjAGac0Y3aVb6Qx__oLL9e7-vfGpb2C2_ZmeOVkQ0ck-zOI-CWSz02-Md8_SdGTal7ZP73pxH10Emh-368MNXYcUxL33MxwUwhD_czqiHTYQyyoQnIIgV99xbDy_2kXP4UyW5KL5flZGOWGkkeOw7xf4L-hFNbWHoosepIrjU3HAqsu1_7noEbr3kOTYFKA0L6D9tM_oebYuMEGmxmwACiKYYMBY2endyVo26vKdPkdstH3gPzM7aaKAX_pT2UwVJqqwb2KWyjTfqP8BNP-gFnEIOUzHvOL2I-EFLljj11h4jEwRUWgwi2X_yEdXnSuwMEAFXETcrOa-2fTf5MOWbcktWPk1LqoFDR0-3MskIC2-iebDiyD_xrQyqdth2jv2CGOxzcI8HSDLIIXgnSA9FyorBD0vyX7T-0-nJdtp-lcTZMc3-fescwwfnlXAffOlV6ImfmmZMVjfS2qXunzVJM39HfuLAG5xhFGHJnAO8r_wDu0swURk4GuqBvZ9R9ls_Ie1hwiwSnMxGTtRoSegUF0MjqOegRBYKwpPBt7G4jtcjG_lTOvotyajLXt7gHrcZDE_QpUsqMtKmLDYdOb9mgLNFc13nhoRhALZxnrLujRsnshAnYEBqRtNG25_UQwAWXlwCWOL7rFUCUTxYjPpz9JizUyJ6WBwN1afwKWPugQkNvmdvqe1g1VY_5GocNrnNHqxT5rBLzsaHBTbVWLzbuJ1PCVpERnmNRcM6VHbIyD87gCWKdfeyua0tci3uWDB-0EXoW4w0BNPgn6C5AeldxEw456ZN9snUexKN6SD2E_hC73V2ijfeXtSnCiUBXElU-YXPyYpZRFHCX2hS4vlAje_BsDvElgQ_oil5aNRZUiZuzUwFnnSSnfh6jE1W_Rg5CJhFEfTczbXMJYQvmMQxAJNcAuiaKLHqH57myfE5NATBNfIakPT-hDaU7ZnwK_RMwpuGJp4QmnmK_FGIqqiA_v8azqRjVOoN9k_6VfD3xO1yIq2--DEBl3UuNbPlHqGmFPhdvQvfyXXjOnOnSu46CwOd5zQ4RCVEdbAtfcVHHEw6fAc6uGmRr6E5palN1Ja_9_C7Ak-Y37wfWojS89dkVz7UYz4ZOxLMyb8PxMbuUQ68EnCGhE2_Fk4dxD0670zyoMWV7H_OnQ&isca=1",
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
  };
}
