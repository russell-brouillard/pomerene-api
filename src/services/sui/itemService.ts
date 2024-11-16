import {
  getFullnodeUrl,
  PaginatedObjectsResponse,
  SuiClient,
} from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { decrypt, encrypt } from "./suiService";

export async function createItem(
  signer: Ed25519Keypair,
  name: string,
  description: string,
  blobId: string
): Promise<string> {
  const client = new SuiClient({
    url: getFullnodeUrl("devnet"),
  });

  const itemKeypair = new Ed25519Keypair();

  const tx = new Transaction();

  const itemSecretKey = encrypt(
    itemKeypair.getSecretKey(),
    signer.getSecretKey()
  );

  tx.moveCall({
    package:
      "0xd688a3f211e89df51b1e88e3e2113051fb800111147f3917623b7060f27f8940",
    module: "item",
    function: "mint_to_sender",
    arguments: [
      tx.pure.string(name),
      tx.pure.string(description),
      tx.pure.string("https://www.pomerene.net/white-small.png"),
      tx.pure.address(itemKeypair.getPublicKey().toSuiAddress()),
      tx.pure.string(itemSecretKey),
      tx.pure.string(blobId),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer,
    transaction: tx,
  });

  return itemKeypair.getPublicKey().toSuiAddress();
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
        "0xd688a3f211e89df51b1e88e3e2113051fb800111147f3917623b7060f27f8940::item::ItemNFT"
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
      "0xd688a3f211e89df51b1e88e3e2113051fb800111147f3917623b7060f27f8940",
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

  // Filter out scans with no data and fetch locations
  const locations: any = await Promise.all(
    scans.map(async (scan, index) => {
      // Skip if scan has no data
      if (!scan.data || scan.data.length === 0) {
        console.error(`No scan data found for item: ${items[index].name}`);
        return null;
      }

      try {
        const sortedScans = scan.data
          .filter((scan) => scan.data?.version) // ensure version exists
          .sort((a, b) => {
            const versionA = parseInt(a.data?.version || "0");
            const versionB = parseInt(b.data?.version || "0");
            return versionB - versionA; // sort in descending order
          });

        if (!sortedScans[0].data?.objectId) {
          console.error(
            `No object ID found for scan in item: ${items[index].name}`
          );
          return null;
        }

        return await client.getObject({
          id: sortedScans[0].data.objectId,
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

export async function fetchLocationsByItem(itemPublicKey: string) {
  const client = new SuiClient({
    url: getFullnodeUrl("devnet"),
  });

  const scans = await client.getOwnedObjects({
    owner: itemPublicKey,
  });

  const locations = await Promise.all(
    scans.data.map(async (obj) => {
      const item = await client.getObject({
        id: obj.data?.objectId!,
        options: { showContent: true },
      });

      const t: any = item.data?.content;

      if (
        t?.type ===
        "0xa5609da45ec804a43803e48ae0cc6708aaeddc61f3e6640cea51d89cc76928c5::pomerene::PomeNFT"
      ) {
        // Only return the message field
        return t.fields;
      }
      return null;
    })
  );

  // Filter out null values and return clean array of messages
  return locations;
}

export async function fetchGPSByItem(itemPublicKey: string) {
  const locations = await fetchLocationsByItem(itemPublicKey);

  // Filter out null values and return clean array of messages
  return locations.filter((location) => location !== null);
}

export async function getQrCode(itemPublicKey: string, owner: Ed25519Keypair) {
  const client = new SuiClient({
    url: getFullnodeUrl("devnet"),
  });

  const item: any = await client.getObject({
    id: itemPublicKey,
    options: { showContent: true },
  });

  const qrCode: any = item.data?.content?.fields?.qr;

  return decrypt(qrCode, owner.getSecretKey());
}
