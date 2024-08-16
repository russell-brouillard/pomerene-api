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

  const valid = validateGPSDataFromNFT(nftId);

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

  // Mint an NFT and embed the message and signatures
  const tx = new Transaction();
  tx.moveCall({
    package:
      "0xf1c5c1d220e5cd1e619d583ff73f88e7a407f53d22b915368e3fce0d607630b8", // Replace with your package address
    module: "pomerene",
    function: "mint_to_sender", // Assume this function exists to mint your NFT
    arguments: [
      tx.pure.string("PomeNew"),
      tx.pure.string("https://www.pomerene.net/white-small.png"),
    
      tx.pure.address(toHEX(scannerKeypair.getPublicKey().toRawBytes())),
      tx.pure.address(toHEX(itemKeypair.getPublicKey().toRawBytes())),
      tx.pure.string(scannerKeypair.getPublicKey().toSuiAddress()),
      tx.pure.string(itemKeypair.getPublicKey().toSuiAddress()),
      tx.pure.string(message),
      tx.pure.string(combinedSignature),
    ],
  });

  console.log("test 1");
  const initialResult = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: scannerKeypair,
  });

  console.log("test 2");

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

  return nftId;
}

async function validateGPSDataFromNFT(nftId: string) {
  const rpcUrl = getFullnodeUrl("devnet");
  const client = new SuiClient({ url: rpcUrl });

  const nftDetails: any = await client.getObject({
    id: nftId,
    options: { showContent: true },
  });

  const content = nftDetails.data?.content?.fields;
  if (content) {
    const message = content.message; // Assuming GPS data is stored here
    const storedSignature = content.combinedSignature; // Assuming signature is stored here

    const scannerPK = content.scannerBytes;
    const itemPK = content.itemBytes;

    const scannerPublicKey = new Ed25519PublicKey(fromHEX(scannerPK));
    const itemPublicKey = new Ed25519PublicKey(fromHEX(itemPK));

    const multiSigPublicKey = MultiSigPublicKey.fromPublicKeys({
      threshold: 1,
      publicKeys: [
        { publicKey: scannerPublicKey, weight: 1 },
        { publicKey: itemPublicKey, weight: 1 },
      ],
    });

    const encodedMessage = new TextEncoder().encode(message);

    // Validate the signature using the original MultiSigPublicKey
    const isValid = await multiSigPublicKey.verifyPersonalMessage(
      encodedMessage,
      storedSignature
    );

    return {
      isValid,
      itemAddress: content.itemAddress,
      scannerAddress: content.scannerAddress,
      nftId
    };
  } else {
    throw new Error(`No content found for NFT with ID: ${nftId}`);
  }
}
