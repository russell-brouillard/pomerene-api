import { Ed25519Keypair, Ed25519PublicKey } from "@mysten/sui/keypairs/ed25519";
import { fromHex, fromBase64 } from "@mysten/sui/utils";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { getFaucetHost, requestSuiFromFaucetV1 } from "@mysten/sui/faucet";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import * as crypto from "crypto";

// Function to get Sui Keypair from various secret key formats
export function getSuiKeypairFromSecret(secret: string | Uint8Array) {
  if (typeof secret === "string") {
    // Determine if the string is HEX or Bech32 encoded
    if (secret.startsWith("0x")) {
      // HEX encoded
      return Ed25519Keypair.fromSecretKey(fromHex(secret));
    } else if (secret.startsWith("suiprivkey")) {
      // Bech32 encoded
      const { secretKey } = decodeSuiPrivateKey(secret);
      return Ed25519Keypair.fromSecretKey(secretKey);
    } else {
      // Assuming Base64 encoding as fallback
      return Ed25519Keypair.fromSecretKey(fromBase64(secret));
    }
  } else {
    // Handle Uint8Array directly
    return Ed25519Keypair.fromSecretKey(secret);
  }
}

// Function to generate a new Sui key pair
export function getNewSuiSecretKeyString(): string {
  return new Ed25519Keypair().getSecretKey();
}

// Function to get Sui money for an address
export async function getSuiMoney(recipient: string): Promise<any> {
  // return await requestSuiFromFaucetV1({
  //   host: getFaucetHost("mainnet"),
  //   recipient,
  // });
}

export async function getBalance(address: string): Promise<number> {
  // create a new SuiClient object pointing to the network you want to use
  const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });

  // store the JSON representation for the SUI the address owns before using faucet
  const sui = await suiClient.getBalance({
    owner: address,
  });

  const balance = (balance: any) => {
    return Number.parseInt(balance.totalBalance) / Number(MIST_PER_SUI);
  };

  return balance(sui);
}

export function encrypt(plaintext: string, passphrase: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, "sha256");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const encryptedBuffer = Buffer.concat([salt, iv, authTag, encrypted]);
  return encryptedBuffer.toString("base64");
}

export function decrypt(encryptedData: string, passphrase: string): string {
  const data = Buffer.from(encryptedData, "base64");
  const salt = data.subarray(0, 16);
  const iv = data.subarray(16, 28);
  const authTag = data.subarray(28, 44);
  const encrypted = data.subarray(44);
  const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, "sha256");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
