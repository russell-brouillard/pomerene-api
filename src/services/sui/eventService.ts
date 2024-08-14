import { MultiSigPublicKey, MultiSigSigner } from "@mysten/sui/multisig";
import { Transaction } from "@mysten/sui/transactions";
import { getSuiKeypairFromSecret } from "./suiService";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

export async function createSuiScannerTransaction(
  scannerSecret: string,
  itemSecret: string,
  message: string
) {
  const scannerKeypair = getSuiKeypairFromSecret(scannerSecret);

  const itemKeypair = getSuiKeypairFromSecret(itemSecret);

  console.log("scanner ", scannerKeypair.getPublicKey().toSuiAddress());
  console.log("item ", itemKeypair.getPublicKey().toSuiAddress());

  console.log("scanner ", scannerKeypair.getSecretKey());
  console.log("item ", itemKeypair.getSecretKey());

  const threshold = 2;
  const publicKeys = [
    {
      publicKey: scannerKeypair.getPublicKey(),
      weight: 1,
    },
    {
      publicKey: itemKeypair.getPublicKey(),
      weight: 1,
    },
  ];

  // Create MultiSigPublicKey
  const multiSigPublicKey = MultiSigPublicKey.fromPublicKeys({
    threshold,
    publicKeys,
  });

  // Sign the message with each keypair
  const encodedMessage = new TextEncoder().encode(message);

  const signatureScanner = (
    await scannerKeypair.signPersonalMessage(encodedMessage)
  ).signature;

  const signaturePackage = (
    await itemKeypair.signPersonalMessage(encodedMessage)
  ).signature;

  // Combine the signatures
  const combinedSignature = multiSigPublicKey.combinePartialSignatures([
    signatureScanner,
    signaturePackage,
  ]);

  // Verify the combined signature
  const isValid = await multiSigPublicKey.verifyPersonalMessage(
    encodedMessage,
    combinedSignature
  );

  // Create the MultiSigSigner
  const multiSigSigner = new MultiSigSigner(multiSigPublicKey, [
    scannerKeypair,
    itemKeypair,
  ]);

  if (isValid) {
    // Simulate recording the transaction on-chain
    // Note: Replace this with actual on-chain transaction code
    console.log("Message signed and verified successfully!");
    console.log("Scanner Key:", scannerKeypair.getPublicKey());
    console.log("Package Key:", itemKeypair.getPublicKey());
    console.log("Message:", message);
    console.log("Combined Signature:", combinedSignature);

    const tx = new Transaction();

    const [coin] = tx.splitCoins(tx.gas, [1]);

    console.log("test 1");

    // transfer the split coin to a specific address
    tx.transferObjects([coin], scannerKeypair.getPublicKey().toSuiAddress());

    console.log("test 2");

    // use getFullnodeUrl to define Devnet RPC location
    const rpcUrl = getFullnodeUrl("devnet");

    

    // create a client connected to devnet
    const client = new SuiClient({ url: rpcUrl });

    const transactionId = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: multiSigSigner,
    });

    console.log("test 3");

    return {
      transactionId,
      scannerKey: scannerKeypair.getPublicKey(),
      packageKey: itemKeypair.getPublicKey(),
      message,
      combinedSignature: combinedSignature,
    };
  } else {
    throw new Error("Signature verification failed.");
  }
}
