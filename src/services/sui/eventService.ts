import { MultiSigPublicKey, MultiSigSigner } from "@mysten/sui/multisig";
import { Transaction } from "@mysten/sui/transactions";
import { getSuiKeypairFromSecret } from "./suiService";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519PublicKey } from "@mysten/sui/keypairs/ed25519";
import { fromHEX } from "@mysten/sui/utils";

export async function createSuiScannerTransaction(
  scannerSecret: string,
  itemSecret: string,
  message: string
) {
  const rpcUrl = getFullnodeUrl("devnet");
  const client = new SuiClient({ url: rpcUrl });

  const { gpsData, combinedSignature } = await signGPSData(
    scannerSecret,
    itemSecret,
    message
  );

  const nftId = await createScanNFT(
    scannerSecret,
    itemSecret,
    gpsData,
    combinedSignature,
    client
  );

  // Retrieve and validate NFT later
  // const response = await client.getOwnedObjects({
  //   owner: scannerKeypair.getPublicKey().toSuiAddress(),
  //   options: { showContent: true },
  // });

  const valid = validateGPSDataFromNFT(client, nftId);

  return valid;
}

export async function signGPSData(
  scannerSecret: string,
  itemSecret: string,
  gpsData: string
) {
  const scannerKeypair = getSuiKeypairFromSecret(scannerSecret);
  const itemKeypair = getSuiKeypairFromSecret(itemSecret);
  const multiSigPublicKey = MultiSigPublicKey.fromPublicKeys({
    threshold: 1, // You can increase the threshold if you want both signatures to be required
    publicKeys: [
      { publicKey: scannerKeypair.getPublicKey(), weight: 1 },
      { publicKey: itemKeypair.getPublicKey(), weight: 1 },
    ],
  });

  const encodedMessage = new TextEncoder().encode(gpsData);

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

  return { gpsData, combinedSignature };
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

  // Mint an NFT and embed the message and signatures
  const tx = new Transaction();
  tx.moveCall({
    package:
      "0x5d1558120005ba6d93824c954d9ff2cd0c764458014ffe64fab6c248976a47fb", // Replace with your package address
    module: "pomerene",
    function: "mint_to_sender", // Assume this function exists to mint your NFT
    arguments: [
      tx.pure.string("PomeNFT"),
      tx.pure.string("https://example.com/nft-image.png"),
      tx.pure.address(scannerKeypair.getPublicKey().toSuiAddress()),
      tx.pure.address(itemKeypair.getPublicKey().toSuiAddress()),
      tx.pure.string(message), // Embed the original message
      tx.pure.string(combinedSignature), // Embed the combined signature
    ],
  });

  const initialResult = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: scannerKeypair,
  });

  console.log("Initial Transaction Result: ", initialResult);

  // Wait for the transaction to be confirmed and processed
  const finalResult = await client.waitForTransaction({
    digest: initialResult.digest,
    options: { showEffects: true, showEvents: true },
  });

  console.log("Final Transaction Result: ", finalResult);

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
    const storedGPSData = content.message; // Assuming GPS data is stored here
    const storedSignature = content.combinedSignature; // Assuming signature is stored here

    const scannerPK = content.scanner;
    const itemPK = content.item;

    console.log("scannerPK ", itemPK);
    console.log("itemPK ", itemPK);

    const scannerPublicKey = new Ed25519PublicKey(fromHEX(scannerPK));
    const itemPublicKey = new Ed25519PublicKey(fromHEX(itemPK));

    const multiSigPublicKey = MultiSigPublicKey.fromPublicKeys({
      threshold: 1, // Adjust the threshold if both signatures are required
      publicKeys: [
        { publicKey: scannerPublicKey, weight: 1 },
        { publicKey: itemPublicKey, weight: 1 },
      ],
    });

    const encodedMessage = new TextEncoder().encode(storedGPSData);

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
