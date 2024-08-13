import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromHEX } from "@mysten/sui/utils";
import { getFaucetHost, requestSuiFromFaucetV0 } from "@mysten/sui/faucet";

export function getSuiKeypairFromSecret(secret: string) {
  return Ed25519Keypair.fromSecretKey(fromHEX(secret));
}

export function getNewSuiKeyPair() {
  return new Ed25519Keypair();
}

export async function getSuiMoney(address: string) {
  return await requestSuiFromFaucetV0({
    host: getFaucetHost("testnet"),
    recipient: address,
  });
}
