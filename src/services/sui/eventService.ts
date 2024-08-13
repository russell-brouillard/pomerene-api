import { MultiSigPublicKey } from "@mysten/sui/multisig";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

export async function createSuiScannerTransaction(
  scannerKeypair: Ed25519Keypair,
  packageKeypair: Ed25519Keypair,
  message: string
) {
  // Define weights and threshold for MultiSigPublicKey
  const threshold = 2;
  const publicKeys = [
    {
      publicKey: scannerKeypair.getPublicKey(),
      weight: 1,
    },
    {
      publicKey: packageKeypair.getPublicKey(),
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
    await packageKeypair.signPersonalMessage(encodedMessage)
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

  if (isValid) {
    // Simulate recording the transaction on-chain
    // Note: Replace this with actual on-chain transaction code
    console.log("Message signed and verified successfully!");
    console.log("Scanner Key:", scannerKeypair.getPublicKey().toString());
    console.log("Package Key:", packageKeypair.getPublicKey().toString());
    console.log("Message:", message);
    console.log("Combined Signature:", combinedSignature.toString());

    // Simulate storing and retrieving transaction data
    // For a real-world application, you'd interact with the Sui network to record and query transactions
    const transactionId = "example-transaction-id"; // Simulate a transaction ID

    return {
      transactionId,
      scannerKey: scannerKeypair.getPublicKey().toString(),
      packageKey: packageKeypair.getPublicKey().toString(),
      message,
      combinedSignature: combinedSignature.toString(),
    };
  } else {
    throw new Error("Signature verification failed.");
  }
}
