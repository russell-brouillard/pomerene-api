import { Request, Response } from "express";
import { Keypair } from "@solana/web3.js";
import { createDevice } from "../services/solana/devices";
import { AuthRequest } from "../middleware/authMiddleware";
import { getSolanaKeypairForUser } from "../services/users/usersServices";

export async function createDeviceController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // Extract necessary data from request body
    const { mintSecretKey, name, symbol, additionalMetadata, uri } = req.body;

    console.log(
      "createDeviceController",
      mintSecretKey,
      name,
      symbol,
      additionalMetadata,
      uri,
      req.user
    );

    if (!mintSecretKey || !name || !symbol || !req.user) {
      throw new Error("Missing required fields");
    }

    // // Generate a new keypair
    // const keypair = Keypair.generate();

    // console.log("key pub", keypair.publicKey.toString());

    // // Convert the private key to a base64 string
    // const privateKeyBase64 = Buffer.from(keypair.secretKey).toString("base64");

    // // Store the privateKeyBase64 string wherever you need it
    // console.log("Private key (base64):", privateKeyBase64);

    const payer = await getSolanaKeypairForUser(req.user.uid);

    console.log("keypair payer", payer);

    // Convert the base64 string back to a Uint8Array
    const privateKeyUint8Array = Uint8Array.from(
      Buffer.from(mintSecretKey, "base64")
    );

    // Recreate the keypair using the private key Uint8Array
    const mint = Keypair.fromSecretKey(privateKeyUint8Array);

    // Now you can use the keypair as needed
    console.log("key pair mint:", mint);

    console.log("mint", mint);

    // Call createDevice function
    const tokenMetadata = await createDevice(
      payer,
      mint,
      name,
      symbol,
      additionalMetadata,
      uri
    );

    // Send success response with token metadata
    res.status(200).json({ success: true, tokenMetadata });

    res.status(200).json({ success: true });
  } catch (error: any) {
    // Send error response
    console.error("Error creating device:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}