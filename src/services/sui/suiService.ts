import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromHEX, fromB64 } from "@mysten/sui/utils";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { getFaucetHost, requestSuiFromFaucetV0 } from "@mysten/sui/faucet";

// Function to get Sui Keypair from various secret key formats
export function getSuiKeypairFromSecret(secret: string | Uint8Array) {
  if (typeof secret === "string") {
    // Determine if the string is HEX or Bech32 encoded
    if (secret.startsWith("0x")) {
      // HEX encoded
      return Ed25519Keypair.fromSecretKey(fromHEX(secret));
    } else if (secret.startsWith("suiprivkey")) {
      // Bech32 encoded
      const { secretKey } = decodeSuiPrivateKey(secret);
      return Ed25519Keypair.fromSecretKey(secretKey);
    } else {
      // Assuming Base64 encoding as fallback
      return Ed25519Keypair.fromSecretKey(fromB64(secret));
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
export async function getSuiMoney(address: string):Promise<any> {
  const recipient = getSuiKeypairFromSecret(address)
    .getPublicKey()
    .toSuiAddress();

  console.log("Recipient Sui Address:", recipient);

  return await requestSuiFromFaucetV0({
    host: getFaucetHost("devnet"),
    recipient,
  });
}
