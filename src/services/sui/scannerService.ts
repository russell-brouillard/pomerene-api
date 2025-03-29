import {
  getFullnodeUrl,
  PaginatedObjectsResponse,
  SuiClient,
} from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";

export async function createScanner(
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

  tx.moveCall({
    package:
      "0x6af8009ae6ada685032be9606a77145b9e983ec335a681e9ee7f7b79a9ddcb8c",
    module: "scanner",
    function: "mint_to_sender",
    arguments: [
      tx.pure.string(name),
      tx.pure.string(description),
      tx.pure.string("https://www.pomerene.net/yellow-black-small.png"),
      tx.pure.address(itemKeypair.getPublicKey().toSuiAddress()),
      tx.pure.string(itemKeypair.getSecretKey()),
      tx.pure.string(blobId),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer,
    transaction: tx,
  });

  return itemKeypair.getSecretKey();
}

export async function fetchScannersByOwner(
  owner: Ed25519Keypair
): Promise<any[]> {
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
        "0x6af8009ae6ada685032be9606a77145b9e983ec335a681e9ee7f7b79a9ddcb8c::scanner::ScannerNFT"
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

export async function deleteScanner(
  signer: Ed25519Keypair,
  scannerObjectId: string
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
      "0x6af8009ae6ada685032be9606a77145b9e983ec335a681e9ee7f7b79a9ddcb8c",
    module: "scanner",
    function: "burn",
    // The burn function expects the ItemNFT object, which we pass as a reference
    arguments: [tx.object(scannerObjectId)],
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

export async function fetchScannersLocationsByOwner(
  owner: Ed25519Keypair
): Promise<{ name: string; message: string }[]> {
  // Fetch items owned by the given owner
  const scanners = await fetchScannersByOwner(owner);

  const client = new SuiClient({
    url: getFullnodeUrl("devnet"),
  });

  // Fetch scans for each item
  const scans = await Promise.all(
    scanners.map(async (scanner) => {
      return await client.getOwnedObjects({
        owner: scanner.scannerAddress,
      });
    })
  );

  // Filter out scans with no data and fetch locations
  const locations: any = await Promise.all(
    scans.map(async (scan, index) => {
      // Skip if scan has no data
      if (!scan.data || scan.data.length === 0) {
        console.error(`No scan data found for item: ${scanners[index].name}`);
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
            `No object ID found for scan in item: ${scanners[index].name}`
          );
          return null;
        }

        return await client.getObject({
          id: sortedScans[0].data.objectId,
          options: { showContent: true },
        });
      } catch (error) {
        console.error(
          `Error fetching location for item ${scanners[index].name}:`,
          error
        );
        return null;
      }
    })
  );

  // Pair each item's name with its corresponding location message
  const pairedData = scanners.map((item, index) => {
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


export async function fetchscanEventsByScanner(scannerPublicKey: string) {
  const client = new SuiClient({
    url: getFullnodeUrl("devnet"),
  });

  const scans = await client.getOwnedObjects({
    owner: scannerPublicKey,
  });

  const scanEvents = await Promise.all(
    scans.data.map(async (obj) => {
      const item = await client.getObject({
        id: obj.data?.objectId!,
        options: {
          showContent: true,
          showOwner: true,
          showPreviousTransaction: true,
          showType: true,
          showDisplay: true,
        },
      });

      const t: any = item.data?.content;

      if (
        t?.type ===
        "0x6af8009ae6ada685032be9606a77145b9e983ec335a681e9ee7f7b79a9ddcb8c::pomerene::PomeNFT"
      ) {
        const lastTransaction = await client.getTransactionBlock({
          digest: item.data!.previousTransaction!,
        });

        t.fields.timestampMs = lastTransaction.timestampMs;

        return t.fields;
      }
      return null;
    })
  );

  // Filter out null values and return clean array of messages
  return scanEvents;
}