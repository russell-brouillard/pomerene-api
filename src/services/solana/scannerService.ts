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
import { encode } from "bs58";
import { createMetadataMint, fundScannerAccount, getAccountsByOwner, mintToAccount } from "./solanaService";
import { TokenMetadata } from "@solana/spl-token-metadata";
import { TokenObject } from "userTypes";

// Constants
const DEVNET = "devnet";
const CONFIRMED = "confirmed";
const SCANNER_NAME = "SCANNER";
const SCANNER_SYMBOL = "POME";
const METADATA_URI = "https://www.pomerene.net/api/v1/json/metadata.json";

export async function createScanner(payer: Keypair, description: string) {
  const connection = new Connection(clusterApiUrl(DEVNET), CONFIRMED);

  const scannerKeypair = Keypair.generate();
  const mintKeypair = Keypair.generate();

  const metaData = createTokenMetadata(scannerKeypair, description, payer);

  await createMetadataMint(
    metaData,
    payer,
    mintKeypair.publicKey,
    payer.publicKey, // mintAuthority
    0, // decimals
    connection,
    mintKeypair,
    payer.publicKey // updateAuthority
  );

  const tokenAccount = await mintToAccount(
    payer,
    mintKeypair.publicKey,
    payer.publicKey, // mintAuthority
    connection,
    scannerKeypair,
    payer.publicKey, // Owner of the new token account
    1 // Amount to mint
  );

  await fundScannerAccount(connection, payer, scannerKeypair.publicKey, 0.01 * LAMPORTS_PER_SOL);

  return assembleScannerData(payer, mintKeypair.publicKey, scannerKeypair, description, tokenAccount);
}

function createTokenMetadata(scannerKeypair: Keypair, description: string, payer: Keypair): TokenMetadata {
  return {
    updateAuthority: payer.publicKey,
    mint: scannerKeypair.publicKey,
    name: SCANNER_NAME,
    symbol: SCANNER_SYMBOL,
    uri: METADATA_URI,
    additionalMetadata: [
      ["secret", encode(scannerKeypair.secretKey)],
      ["description", description],
      ["public", scannerKeypair.publicKey.toString()],
    ],
  };
}



function assembleScannerData(payer: Keypair, mintPublicKey: PublicKey, scannerKeypair: Keypair, description: string, tokenAccount: PublicKey) {
  return {
    owner: payer.publicKey.toString(),
    mint: mintPublicKey.toString(),
    scannerAccount: tokenAccount.toString(),
    scannerSecret: encode(scannerKeypair.secretKey),
    scannerPublic: scannerKeypair.publicKey.toString(),
    description,
  };
}

export async function fetchScanner(owner: Keypair) {
  const tokens = await getAccountsByOwner(owner);
  return tokens.filter((token: TokenObject) => token.metadata.name.toLowerCase() === SCANNER_NAME.toLowerCase());
}
