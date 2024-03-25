import { Request, Response } from "express";
import { createItem } from "../services/solana/itemService";
import { AuthRequest } from "../middleware/authMiddleware";
import { getSolanaKeypairForUser } from "../services/users/usersServices";
import { PublicKey } from "@solana/web3.js";
import { deleteItem } from "../services/solana/solanaService";

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
    const { name, symbol, additionalMetadata, uri } = req.body;

    console.log(
      "createScannerController",
      name,
      symbol,
      additionalMetadata,
      uri,
      req.user
    );

    if (!name || !symbol || !req.user) {
      throw new Error("Missing required fields");
    }

    const payer = await getSolanaKeypairForUser(req.user.uid);

    // Call createScanner function
    const tokenMetadata = await createItem(
      payer,
      name,
      symbol,
      additionalMetadata
    );

    console.log("test", tokenMetadata);

    // Send success response with token metadata
    res.status(200).json({ success: true, tokenMetadata });
  } catch (error: any) {
    // Send error response
    console.error("Error creating device:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * @swagger
 * /item/delete/{mint}:
 *   delete:
 *     summary: Deletes an item by closing its mint account.
 *     tags: [Item]
 *     parameters:
 *       - in: path
 *         name: mint
 *         required: true
 *         schema:
 *           type: string
 *         description: The public key of the mint to be deleted.
 *     responses:
 *       200:
 *         description: Item deleted successfully.
 *       500:
 *         description: Error deleting the item.
 */
export async function deleteItemController(
  req: AuthRequest,
  res: Response
): Promise<any> {
  try {
    // Extract mint public key from URL parameters
    const { mint } = req.params;
    if (!mint) {
      return res
        .status(400)
        .json({ success: false, error: "Mint public key is required." });
    }

    if (!req.user) {
      return res
        .status(403)
        .json({ success: false, error: "User not authorized." });
    }

    const payer = await getSolanaKeypairForUser(req.user.uid);

    // Validate payer
    if (!payer) {
      return res.status(403).json({
        success: false,
        error: "User not authorized or payer keypair not found.",
      });
    }

    // Convert mint string to PublicKey
    const mintPublicKey = new PublicKey(mint);

    // Call deleteItem (close mint account)
    await deleteItem(payer, mintPublicKey);

    res
      .status(200)
      .json({ success: true, message: "Item deleted successfully." });
  } catch (error: any) {
    console.error("Error deleting item:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}
