import {
  getFullnodeUrl,
  PaginatedObjectsResponse,
  SuiClient,
} from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";

export async function createItem(
  signer: Ed25519Keypair,
  description: string
): Promise<string> {
  const client = new SuiClient({
    url: getFullnodeUrl("devnet"),
  });

  const itemKeypair = new Ed25519Keypair();

  const tx = new Transaction();

  tx.moveCall({
    package:
      "0xc6b85a217806c30492c1abfba8b54c8f223792ad50f433bcd9255251ebf2d418",
    module: "item",
    function: "mint_to_sender",
    arguments: [
      tx.pure.string(description),
      tx.pure.string("ITEM"),
      tx.pure.string("https://www.pomerene.net/white-small.png"),
      tx.pure.address(itemKeypair.getPublicKey().toSuiAddress()),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer,
    transaction: tx,
  });

  return itemKeypair.getSecretKey();
}

export async function fetchItemsByOwner(owner: Ed25519Keypair): Promise<any[]> {
  const client = new SuiClient({
    url: getFullnodeUrl("devnet"),
  });

  const myObjects = await client.getOwnedObjects({
    owner: owner.getPublicKey().toSuiAddress(),
  });

  const test = await Promise.all(
    myObjects.data.map(async (obj) => {
      const item = await client.getObject({
        id: obj.data?.objectId!,
        options: { showContent: true },
      });

      const t: any = item.data?.content;

      if (
        t?.type ===
        "0xc6b85a217806c30492c1abfba8b54c8f223792ad50f433bcd9255251ebf2d418::item::ItemNFT"
      ) {
        return t.fields;
      }
      return null; // Explicitly return null for non-matching types
    })
  );

  // Filter out null or undefined entries
  const valid = test.filter(Boolean);

  return valid;
}

export async function deleteItem(
  signer: Ed25519Keypair,
  itemObjectId: string
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
      "0xc6b85a217806c30492c1abfba8b54c8f223792ad50f433bcd9255251ebf2d418",
    module: "item",
    function: "burn",
    // The burn function expects the ItemNFT object, which we pass as a reference
    arguments: [tx.object(itemObjectId)],
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

export async function fetchItemsLocationsByOwner(
  owner: Ed25519Keypair
): Promise<{ name: string; message: string }[]> {
  // Fetch items owned by the given owner
  const items = await fetchItemsByOwner(owner);
  console.log("Items:", items);

  const client = new SuiClient({
    url: getFullnodeUrl("devnet"),
  });

  // Fetch scans for each item
  const scans = await Promise.all(
    items.map(async (item) => {
      return await client.getOwnedObjects({
        owner: item.itemAddress,
      });
    })
  );

  console.log("Scans:", scans);

  // Filter out scans with no data and fetch locations
  const locations:any = await Promise.all(
    scans.map(async (scan, index) => {
      // Skip if scan has no data
      if (!scan.data || scan.data.length === 0) {
        console.log(`No scan data found for item: ${items[index].name}`);
        return null;
      }

      try {
        const lastScan = scan.data[scan.data.length - 1];
        if (!lastScan.data?.objectId) {
          console.log(
            `No object ID found for scan in item: ${items[index].name}`
          );
          return null;
        }

        return await client.getObject({
          id: lastScan.data.objectId,
          options: { showContent: true },
        });
      } catch (error) {
        console.error(
          `Error fetching location for item ${items[index].name}:`,
          error
        );
        return null;
      }
    })
  );

  console.log("Locations:", locations);

  // Pair each item's name with its corresponding location message
  const pairedData = items.map((item, index) => {
    const location = locations[index];
    let message = "No location data available";

    if (location?.data?.content?.fields?.message) {
      message = location.data.content.fields.message;
    }

    return {
      name: item.name,
      message: message,
    };
  });

  return pairedData;
}
