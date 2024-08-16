import { MultiSigPublicKey, MultiSigSigner } from "@mysten/sui/multisig";
import { Transaction } from "@mysten/sui/transactions";
import { getSuiKeypairFromSecret } from "./suiService";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519PublicKey } from "@mysten/sui/keypairs/ed25519";
import { fromHEX, toHEX } from "@mysten/sui/utils";

export async function createSuiScannerTransaction(
  scannerSecret: string,
  itemSecret: string,
  message: string
) {
  const rpcUrl = getFullnodeUrl("devnet");
  const client = new SuiClient({ url: rpcUrl });

  const combinedSignature = await signGPSData(
    scannerSecret,
    itemSecret,
    message
  );

  const nftId = await createScanNFT(
    scannerSecret,
    itemSecret,
    message,
    combinedSignature,
    client
  );

  const valid = validateGPSDataFromNFT(client, nftId);

  return valid;
}

export async function signGPSData(
  scannerSecret: string,
  itemSecret: string,
  message: string
) {
  const scannerKeypair = getSuiKeypairFromSecret(scannerSecret);
  const itemKeypair = getSuiKeypairFromSecret(itemSecret);

  const scannerPublicKey = scannerKeypair.getPublicKey();
  const itemPublicKey = itemKeypair.getPublicKey();

  console.log("Order during signing:");
  console.log(
    "Scanner Public Key:",
    scannerKeypair.getPublicKey().toSuiAddress()
  );
  console.log("Item Public Key:", itemKeypair.getPublicKey().toSuiAddress());

  const multiSigPublicKey = MultiSigPublicKey.fromPublicKeys({
    threshold: 1,
    publicKeys: [
      { publicKey: scannerPublicKey, weight: 1 },
      { publicKey: itemPublicKey, weight: 1 },
    ],
  });

  const encodedMessage = new TextEncoder().encode(message);

  const signatureScanner = (
    await scannerKeypair.signPersonalMessage(encodedMessage)
  ).signature;

  const signatureItem = (await itemKeypair.signPersonalMessage(encodedMessage))
    .signature;

  // Optionally, combine the signatures if using a multi-signature scheme
  const combinedSignature = multiSigPublicKey.combinePartialSignatures([
    signatureScanner,
    signatureItem,
  ]);

  console.log("storedSignature 1", combinedSignature);
  console.log("encodedMessage 1", encodedMessage);
  console.log("multiSigPublicKey 1", multiSigPublicKey);

  const isValid = await multiSigPublicKey.verifyPersonalMessage(
    encodedMessage,
    combinedSignature
  );

  console.log("VALID? ", isValid);

  return combinedSignature;
}

export async function createScanNFT(
  scannerSecret: string,
  itemSecret: string,
  message: string,
  combinedSignature: string,
  client: SuiClient
): Promise<string> {
  const scannerKeypair = getSuiKeypairFromSecret(scannerSecret);
  const itemKeypair = getSuiKeypairFromSecret(itemSecret);

  console.log("message 1 ", message);
  


  console.log(scannerKeypair.getPublicKey().toRawBytes())
  console.log(toHEX(scannerKeypair.getPublicKey().toRawBytes()))
  console.log("DONE")

  // Mint an NFT and embed the message and signatures
  const tx = new Transaction();
  tx.moveCall({
    package:
      "0xd7511cf3a30f5ad6003a6a8a58f21513351cec5b213252b78ede08fe8f673962", // Replace with your package address
    module: "pomerene",
    function: "mint_to_sender", // Assume this function exists to mint your NFT
    arguments: [
      tx.pure.string("PomeScan"),
      tx.pure.string("https://www.pomerene.net/white-small.png"),
      tx.pure.address(toHEX(scannerKeypair.getPublicKey().toRawBytes())),
      tx.pure.address(toHEX(itemKeypair.getPublicKey().toRawBytes())),
      tx.pure.string(message), // Embed the original message
      tx.pure.string(combinedSignature), // Embed the combined signature
    ],
  });

  const initialResult = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: scannerKeypair,
  });

  // Wait for the transaction to be confirmed and processed
  const finalResult = await client.waitForTransaction({
    digest: initialResult.digest,
    options: { showEffects: true, showEvents: true },
  });

  // Extract the new NFT ID from the transaction response
  const nftId = finalResult.effects?.created?.[0]?.reference?.objectId;

  if (!nftId) {
    throw new Error(
      "Failed to create NFT: No NFT ID returned in transaction response"
    );
  }

  console.log("NFT ID: ", nftId);
  return nftId;
}

async function validateGPSDataFromNFT(client: SuiClient, nftId: string) {
  const nftDetails: any = await client.getObject({
    id: nftId,
    options: { showContent: true },
  });

  const content = nftDetails.data?.content?.fields;
  if (content) {
    const message = content.message; // Assuming GPS data is stored here
    const storedSignature = content.combinedSignature; // Assuming signature is stored here

    console.log("message 2", message);

    const scannerPK = content.scanner;
    const itemPK = content.item;

    console.log("scannerPK ", scannerPK);
    console.log("itemPK ", itemPK);

    const scannerPublicKey = new Ed25519PublicKey(fromHEX(scannerPK));
    const itemPublicKey = new Ed25519PublicKey(fromHEX(itemPK));

    console.log("Scanner Public Key:", scannerPublicKey.toSuiAddress());
    console.log("Item Public Key:", itemPublicKey.toSuiAddress());

    const multiSigPublicKey = MultiSigPublicKey.fromPublicKeys({
      threshold: 1,
      publicKeys: [
        { publicKey: scannerPublicKey, weight: 1 },
        { publicKey: itemPublicKey, weight: 1 },
      ],
    });

    const encodedMessage = new TextEncoder().encode(message);

    console.log("Order during validation:");

    console.log("multiSigPublicKey 2", multiSigPublicKey);

    // Validate the signature using the original MultiSigPublicKey
    const isValid = await multiSigPublicKey.verifyPersonalMessage(
      encodedMessage,
      storedSignature
    );

    return isValid;
  } else {
    throw new Error(`No content found for NFT with ID: ${nftId}`);
  }
}
