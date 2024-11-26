import { SuiClient, Transaction, TransactionBlock } from "@mysten/sui";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const rpcUrl = getFullnodeUrl("devnet");
const client = new SuiClient({ url: rpcUrl });
const keypair = new Ed25519Keypair();

console.log("Keypair:", keypair.toSuiAddress());

async function addAndMutateChild() {
  const tx = new Transaction();

  const packageId = "0xYourPackageID";

  // Create Parent
  const createParent = tx.moveCall({
    target: `${packageId}::dynamic_fields::create_parent`,
    arguments: [],
  });
  const [parent] = createParent;

  // Create Child
  const createChild = tx.moveCall({
    target: `${packageId}::dynamic_fields::create_child`,
    arguments: [tx.pure.string(description)],
  });
  const [child] = createChild;

  // Add Child to Parent
  tx.moveCall({
    target: `${packageId}::dynamic_fields::add_child`,
    arguments: [tx.object(parent), tx.object(child)],
  });

  // Mutate Child via Parent
  tx.moveCall({
    target: `${packageId}::dynamic_fields::mutate_child_via_parent`,
    arguments: [tx.object(parent)],
  });

  // Execute the transaction
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });

  // Wait for finalization
  await client.waitForTransaction({ digest: result.digest });

  console.log("Parent and Child have been added and mutated:", result);
}

addAndMutateChild().catch(console.error);
