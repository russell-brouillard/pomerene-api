import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  getAccountLen,
  createInitializeAccountInstruction,
  createEnableRequiredMemoTransfersInstruction,
} from "@solana/spl-token";

import { decode, encode } from "bs58";
import {
  createMetadataMint,
  getAccountsByOwner,
  mintToAccount,
} from "./solanaService";
import { TokenMetadata } from "@solana/spl-token-metadata";
import { TokenObject } from "userTypes";

export async function createScanner(payer: Keypair, description: string) {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const scannerKeypair = Keypair.generate();
  const scannerPublic = scannerKeypair.publicKey.toString();
  const secrect = encode(scannerKeypair.secretKey);
  const updateAuthority = payer.publicKey;
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  const mintAuthority = payer.publicKey;
  const decimals = 0;

  const name = "SCANNER";
  const symbol = "POM";
  const uri =
    "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json";
  const additionalMetadata: [string, string][] = [
    ["secret", secrect],
    ["description", description],
    ["public", scannerPublic],
  ];

  const metaData: TokenMetadata = {
    updateAuthority,
    mint: mintKeypair.publicKey,
    name,
    symbol,
    uri,
    additionalMetadata,
  };

  const mintData = await createMetadataMint(
    metaData,
    payer,
    mint,
    mintAuthority,
    decimals,
    connection,
    mintKeypair,
    updateAuthority
  );

  const tokenAccount = await mintToAccount(
    payer,
    mint,
    mintAuthority,
    connection,
    scannerKeypair,
    payer.publicKey,
    1
  );

  return {
    owner: payer.publicKey,
    mint: mint,
    scannerAccount: tokenAccount.toString(),
    scannerSecret: encode(scannerKeypair.secretKey),
    scannerPublic: scannerPublic,
    description,
  };
}

export async function fetchScanner(owner: Keypair) {
  const tokens = await getAccountsByOwner(owner);

  return tokens.filter(
    (token: TokenObject) => token.metadata.name.toLowerCase() === "scanner"
  );
}
