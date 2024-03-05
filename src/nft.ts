import {
  TOKEN_2022_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Connection, clusterApiUrl, Keypair } from "@solana/web3.js";
import path from "path";

import fs from "fs";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

const keypairPath = path.resolve(process.env.HOME!, ".config/solana/id.json");
const secretKeyString = fs.readFileSync(keypairPath, { encoding: "utf-8" });
const secretKeyUint8Array = new Uint8Array(JSON.parse(secretKeyString));

const payer = Keypair.fromSecretKey(secretKeyUint8Array);
const mintKeypair = Keypair.generate();

const mint = await createMint(
  connection,
  payer,
  payer.publicKey,
  null, // this is the freeze authority
  9, //decimals
  mintKeypair,
  {},
  TOKEN_2022_PROGRAM_ID
);

console.log("mint", mint);

const tokenAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  payer,
  mint,
  payer.publicKey,
  false,
  undefined,
  undefined,
  TOKEN_2022_PROGRAM_ID
);

console.log("tokenAccount", tokenAccount);

const mintToAdress = await mintTo(
  connection,
  payer,
  mint,
  tokenAccount.address,
  payer.publicKey,
  1000000000000,
  [],
  undefined,
  TOKEN_2022_PROGRAM_ID
);

console.log("mintToAdress", mintToAdress);
