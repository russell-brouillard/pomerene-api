import { Request, Response } from "express";
import { Keypair } from "@solana/web3.js";
import { createItem } from "../services/solana/itemService";
import { AuthRequest } from "../middleware/authMiddleware";
import { getSolanaKeypairForUser } from "../services/users/usersServices";
import bs58 from "bs58";

/**
 * @swagger
 * /item/create:
 *   post:
 *     summary: Creates a new item
 *     tags: [Item]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mintSecretKey:
 *                 type: string
 *                 description: The base58 encoded secret key.
 *               name:
 *                 type: string
 *               symbol:
 *                 type: string
 *               additionalMetadata:
 *                 type: object
 *                 description: Additional metadata for the item.
 *               uri:
 *                 type: string
 *                 description: URI for the item's metadata.
 *     responses:
 *       200:
 *         description: Item created successfully.
 *       500:
 *         description: Error creating the item.
 */
export async function createItemController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // Extract necessary data from request body
    const { mintSecretKey, name, symbol, additionalMetadata, uri } = req.body;

    console.log(
      "createScannerController",
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

    const secretKey = bs58.decode(mintSecretKey);

    // Recreate the keypair using the private key Uint8Array
    const mint = Keypair.fromSecretKey(secretKey);

    // Now you can use the keypair as needed
    console.log("key pair mint:", mint);

    // Call createScanner function
    const tokenMetadata = await createItem(
      payer,
      mint,
      name,
      symbol,
      additionalMetadata,
      "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json"
    );

    console.log("tokenMetadata", tokenMetadata);

    // Send success response with token metadata
    res.status(200).json({ success: true, tokenMetadata });
  } catch (error: any) {
    // Send error response
    console.error("Error creating device:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
