import {
    Connection,
    Keypair,
    SystemProgram,
    Transaction,
    clusterApiUrl,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL,
  } from "@solana/web3.js";
  import {
    ExtensionType,
    TOKEN_2022_PROGRAM_ID,
    createInitializeMintInstruction,
    getMintLen,
    createInitializeMetadataPointerInstruction,
    getMint,
    getMetadataPointerState,
    getTokenMetadata,
    TYPE_SIZE,
    LENGTH_SIZE,
  } from "@solana/spl-token";
  import {
    createInitializeInstruction,
    createUpdateFieldInstruction,
    createRemoveKeyInstruction,
    pack,
    TokenMetadata,
  } from "@solana/spl-token-metadata";

  import dotenv from 'dotenv';
  import bs58 from 'bs58';

    
  
dotenv.config();
  
// Decode the Base58 private key
const base58PrivateKey = process.env.SOLANA_PRIVATE_KEY;

console.log("base58PrivateKey", base58PrivateKey);

if (!base58PrivateKey) {
  throw new Error('SOLANA_PRIVATE_KEY is not set');
}

const decodedPrivateKey = bs58.decode(base58PrivateKey);

console.log("decodedPrivateKey", decodedPrivateKey);

// Generate the Keypair from the decoded private key
const payer = Keypair.fromSecretKey(decodedPrivateKey);

// Connection to devnet cluster
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// Transaction to send
let transaction = new Transaction();

(async () => {
    console.log("My address:", payer.publicKey.toString());
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`My balance: ${balance / LAMPORTS_PER_SOL} SOL`);
})().catch(console.error);