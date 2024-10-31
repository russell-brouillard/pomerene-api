import {
  getFullnodeUrl,
  PaginatedObjectsResponse,
  SuiClient,
} from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";

export async function createScanner(
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
      "0x9aa2ed39c8fffc404cd983f2070510c4c7a8b66fddad64d19acffd16cb511356",
    module: "scanner",
    function: "mint_to_sender",
    arguments: [
      tx.pure.string(description),
      tx.pure.string("SCNR"),
      tx.pure.string("https://www.pomerene.net/yellow-black-small.png"),
      tx.pure.address(itemKeypair.getPublicKey().toSuiAddress()),
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
        "0x9aa2ed39c8fffc404cd983f2070510c4c7a8b66fddad64d19acffd16cb511356::scanner::ScannerNFT"
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
      "0x9aa2ed39c8fffc404cd983f2070510c4c7a8b66fddad64d19acffd16cb511356",
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
