import { Request, Response } from "express";
import { Keypair } from "@solana/web3.js";
import { createDevice } from "../services/solana/devices";
import { AuthRequest } from "../middleware/authMiddleware";
import { getSolanaKeypairForUser } from "../services/users/usersServices";

/**
 * @swagger
 * /devices/create:
 *   post:
 *     summary: Create a new device and its corresponding token metadata
 *     tags:
 *       tags: [Devices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mintSecretKey
 *               - name
 *               - symbol
 *               - uri
 *             properties:
 *               mintSecretKey:
 *                 type: string
 *                 description: Base64 encoded secret key for minting the token.
 *               name:
 *                 type: string
 *                 description: Name of the device.
 *               symbol:
 *                 type: string
 *                 description: Symbol for the device token.
 *               additionalMetadata:
 *                 type: object
 *                 description: Additional metadata for the token.
 *                 example: { "color": "red", "size": "large" }
 *               uri:
 *                 type: string
 *                 description: URI for the token's metadata.
 *     responses:
 *       200:
 *         description: Successfully created device and token metadata.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 tokenMetadata:
 *                   type: object
 *                   description: Metadata of the created token.
 *       400:
 *         description: Missing required fields in the request.
 *       500:
 *         description: Error occurred during device creation.
 */
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
