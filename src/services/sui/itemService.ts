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
      "0x147d1e39eca47e6b047d1e8e415d837794fc67133ba752eae6d4069a7a5b838e",
    module: "item",
    function: "mint_to_sender",
    arguments: [
      tx.pure.string(description),
      tx.pure.string("ITEM"),
      tx.pure.string("https://www.pomerene.net/white-small.png"),
      tx.pure.address(itemKeypair.getPublicKey().toSuiAddress()),
    ],
  });

  console.log("test ", itemKeypair.getPublicKey().toSuiAddress());

  const result = await client.signAndExecuteTransaction({
    signer,
    transaction: tx,
  });

  console.log({ result });

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
        "0x147d1e39eca47e6b047d1e8e415d837794fc67133ba752eae6d4069a7a5b838e::item::ItemNFT"
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
