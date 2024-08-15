import { MultiSigPublicKey, MultiSigSigner } from "@mysten/sui/multisig";
import { Transaction } from "@mysten/sui/transactions";
import { getSuiKeypairFromSecret, getSuiMoney } from "./suiService";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

export async function createSuiScannerTransaction(
  scannerSecret: string,
  itemSecret: string,
  message: string
) {
  const rpcUrl = getFullnodeUrl("devnet");

  const client = new SuiClient({ url: rpcUrl });

  const scannerKeypair = getSuiKeypairFromSecret(scannerSecret);

  const itemKeypair = getSuiKeypairFromSecret(itemSecret);

  const threshold = 1;
  const publicKeys = [
    {
      publicKey: scannerKeypair.getPublicKey(),
      weight: 1,
    },
    {
      publicKey: itemKeypair.getPublicKey(),
      weight: 1,
    },
  ];

  const multiSigPublicKey = MultiSigPublicKey.fromPublicKeys({
    threshold,
    publicKeys,
  });

  const encodedMessage = new TextEncoder().encode(message);

  const signatureScanner = (
    await scannerKeypair.signPersonalMessage(encodedMessage)
  ).signature;

  const signatureItem = (await itemKeypair.signPersonalMessage(encodedMessage))
    .signature;

  console.log("sig ", signatureItem);

  // Combine the signatures
  const combinedSignature = multiSigPublicKey.combinePartialSignatures([
    signatureScanner,
    signatureItem,
  ]);

  const isValid = await multiSigPublicKey.verifyPersonalMessage(
    encodedMessage,
    combinedSignature
  );

  // const multiSigSigner = new MultiSigSigner(multiSigPublicKey, [
  //   scannerKeypair,
  //   itemKeypair,
  // ]);

  const multiSigSigner = multiSigPublicKey.getSigner(scannerKeypair);

  const tx = new Transaction();

  tx.moveCall({
    package:
      "0x47efced7dd35aac26a52ded022419b510edc804da10cd17a801f144098f2bda2",
    module: "pomerene",
    function: "mint_to_sender",
    arguments: [
      tx.pure.string("Pome"),
      tx.pure.string("https://www.pomerene.net/white-small.png"),
      tx.pure.address(scannerKeypair.getPublicKey().toSuiAddress()),
      tx.pure.address(itemKeypair.getPublicKey().toSuiAddress()),
      tx.pure.string("hello world"),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: scannerKeypair,
  });

  console.log("===> ", result.digest);

  const transaction = await client.waitForTransaction({
    digest: result.digest,
    options: {
      showInput: true,
    },
  });

  console.log(transaction.transaction?.txSignatures[0]);

  return result.digest;
}
