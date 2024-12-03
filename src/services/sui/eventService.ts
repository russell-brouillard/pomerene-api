import { MultiSigPublicKey } from "@mysten/sui/multisig";
import { Transaction } from "@mysten/sui/transactions";
import { getSuiKeypairFromSecret } from "./suiService";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair, Ed25519PublicKey } from "@mysten/sui/keypairs/ed25519";
import { fromHex } from "@mysten/sui/utils";

export async function createSuiScannerTransaction(
  scannerSecret: string,
  itemSecret: string,
  payer: Ed25519Keypair,
  message: string
) {
  const rpcUrl = getFullnodeUrl("devnet");
  const client = new SuiClient({ url: rpcUrl });

  const combinedSignature = await signGPSData(
    scannerSecret,
    itemSecret,
    payer,
    message
  );

  const nftId = await createScanNFT(
    scannerSecret,
    itemSecret,
    message,
    combinedSignature,
    client,
    payer
  );

  return nftId;
}

export async function signGPSData(
  scannerSecret: string,
  itemSecret: string,
  payerKeypair: Ed25519Keypair,
  message: string
) {
  const scannerKeypair = getSuiKeypairFromSecret(scannerSecret);
  const itemKeypair = getSuiKeypairFromSecret(itemSecret);

  const scannerPublicKey = scannerKeypair.getPublicKey();
  const itemPublicKey = itemKeypair.getPublicKey();
  const payerPublicKey = payerKeypair.getPublicKey();

  const multiSigPublicKey = MultiSigPublicKey.fromPublicKeys({
    threshold: 1,
    publicKeys: [
      { publicKey: scannerPublicKey, weight: 1 },
      { publicKey: itemPublicKey, weight: 1 },
      { publicKey: payerPublicKey, weight: 1 },
    ],
  });

  const encodedMessage = new TextEncoder().encode(message);

  const signatureScanner = (
    await scannerKeypair.signPersonalMessage(encodedMessage)
  ).signature;

  const signatureItem = (await itemKeypair.signPersonalMessage(encodedMessage))
    .signature;

  const signaturePayer = (
    await payerKeypair.signPersonalMessage(encodedMessage)
  ).signature;

  // Optionally, combine the signatures if using a multi-signature scheme
  const combinedSignature = multiSigPublicKey.combinePartialSignatures([
    signatureScanner,
    signatureItem,
    signaturePayer,
  ]);

  return combinedSignature;
}

export async function createScanNFT(
  scannerSecret: string,
  itemSecret: string,
  message: string,
  combinedSignature: string,
  client: SuiClient,
  payerKeypair: Ed25519Keypair
): Promise<string> {

  
  const scannerKeypair = getSuiKeypairFromSecret(scannerSecret);
  const itemKeypair = getSuiKeypairFromSecret(itemSecret);


  // Mint an NFT and embed the message and signatures
  const tx = new Transaction();
  tx.moveCall({
    package:
      "0x21c02e9e141304cab170342e265e99da162d035a3b6df0a8ba4023b779a76601", // Replace with your package address
    module: "pomerene",
    function: "scan", // Assume this function exists to mint your NFT
    arguments: [
      tx.pure.string("https://www.pomerene.net/green-small.png"),
      tx.pure.address(scannerKeypair.getPublicKey().toSuiAddress()),
      tx.pure.address(itemKeypair.getPublicKey().toSuiAddress()),
      tx.pure.string(message),
      tx.pure.string(combinedSignature),
    ],
  });

  const initialResult = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: payerKeypair,
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

  return nftId;
}

export async function validateGPSDataFromNFT(nftId: string): Promise<any> {
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

    const scannerPK = content.scannerAddress;
    const itemPK = content.itemBytes;

    const scannerPublicKey = new Ed25519PublicKey(fromHex(scannerPK));
    const itemPublicKey = new Ed25519PublicKey(fromHex(itemPK));

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
      nftId,
    };
  } else {
    throw new Error(`No content found for NFT with ID: ${nftId}`);
  }
}

export async function fetchEventsByOwner(owner: Ed25519Keypair): Promise<any> {
  const client = new SuiClient({
    url: getFullnodeUrl("devnet"),
  });

  try {
    // Fetch objects owned by the owner
    const myObjects = await client.getOwnedObjects({
      owner: owner.getPublicKey().toSuiAddress(),
    });

    // Process each owned object
    const scans = await Promise.all(
      myObjects.data.map(async (obj) => {
        if (!obj.data) {
          console.warn(`Object data is null or undefined for object`);
          return null;
        }

        // Fetch detailed object information
        const item = await client.getObject({
          id: obj.data.objectId,
          options: {
            showContent: true,
            showOwner: true,
            showPreviousTransaction: true,
            showType: true,
            showDisplay: true,
          },
        });

        if (!item.data) {
          console.warn(`Object data is null or undefined for object`);
          return null;
        }

        // Fetch the last transaction related to the object
        const lastTransaction = await client.getTransactionBlock({
          digest: item.data.previousTransaction!,
        });

        const fields = (item.data.content as any).fields;

        // Check if the object is a PomeNFT
        if (
          item.data.type ===
          "0x21c02e9e141304cab170342e265e99da162d035a3b6df0a8ba4023b779a76601::pomerene::PomeNFT"
        ) {
          return { ...fields, lastTransaction };
        }

        // Check if the object is an ItemNFT
        if (
          item.data.type ===
          "0x21c02e9e141304cab170342e265e99da162d035a3b6df0a8ba4023b779a76601::item::ItemNFT"
        ) {
          // Fetch objects owned by the item's address
          const itemsScansResponse = await client.getOwnedObjects({
            owner: fields.itemAddress,
          });

          // Process each scan owned by the item
          const itemScans = await Promise.all(
            itemsScansResponse.data.map(async (itemObj) => {
              if (!itemObj.data) {
                console.warn(`Object data is null or undefined for object`);
                return null;
              }
              try {
                const scanItem = await client.getObject({
                  id: itemObj.data.objectId,
                  options: {
                    showContent: true,
                    showOwner: true,
                    showPreviousTransaction: true,
                    showType: true,
                    showDisplay: true,
                  },
                });

                if (!scanItem.data) {
                  console.warn(`Object data is null or undefined for object`);
                  return null;
                }

                const scanFields = (scanItem.data.content as any).fields;

                // Check if the scan item is a PomeNFT
                if (
                  scanItem.data.type ===
                  "0x21c02e9e141304cab170342e265e99da162d035a3b6df0a8ba4023b779a76601::pomerene::PomeNFT"
                ) {
                  return { ...scanFields, lastTransaction };
                }

                // If not a PomeNFT, ignore
                return null;
              } catch (error) {
                console.error(
                  `Error fetching scan object ${itemObj.data.objectId}:`,
                  error
                );
                return null;
              }
            })
          );

          // Filter out any null results from the scans
          const validItemScans = itemScans.filter((scan) => scan !== null);
          return validItemScans;
        }

        // If the object type doesn't match, ignore it
        return null;
      })
    );

    // Flatten the scans array and filter out any null or undefined entries
    const validScans = scans
      .flat()
      .filter((scan) => scan !== null && scan !== undefined);

    return validScans;
  } catch (error) {
    console.error("Error fetching events by owner:", error);
    return [];
  }
}

export async function deleteEvent(
  signer: Ed25519Keypair,
  eventObjectId: string
): Promise<string> {
  // Initialize the Sui client pointing to the devnet
  const client = new SuiClient({
    url: getFullnodeUrl("devnet"),
  });

  // Create a new transaction
  const tx = new Transaction();

  // Add the burn Move call to the transaction
  tx.moveCall({
    package:
      "0x21c02e9e141304cab170342e265e99da162d035a3b6df0a8ba4023b779a76601",
    module: "pomerene",
    function: "burn",
    // The burn function expects the ItemNFT object, which we pass as a reference
    arguments: [tx.object(eventObjectId)],
    // Specify the type arguments if any (not needed in this case)
    typeArguments: [],
  });

  try {
    // Sign and execute the transaction
    const result = await client.signAndExecuteTransaction({
      signer,
      transaction: tx,
      options: {
        // Optional: Adjust transaction options as needed
        showEffects: true,
        showEvents: true,
      },
    });

    // Return the transaction digest for reference
    return result.digest;
  } catch (error) {
    console.error("Error burning ItemNFT:", error);
    throw error;
  }
}