import { Request, Response } from "express";
import {
  fetchAllItems,
  fetchItemsByOwner,
} from "../services/solana/itemService";
import { AuthRequest } from "../middleware/authMiddleware";
import { getSuiKeypairForUser } from "../services/users/usersServices";
import { PublicKey } from "@solana/web3.js";
import { closeMintAccount } from "../services/solana/solanaService";
import { createItem } from "../services/sui/itemService";

/**
 * @swagger
 * /api/v1/item/create:
 *   post:
 *     summary: Creates a new item
 *     description: This endpoint allows the creation of a new item with a description. The user must be authenticated to perform this action.
 *     tags:
 *       - Item
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 description: The description of the item to be created.
 *     responses:
 *       200:
 *         description: Item created successfully. Returns the item object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 item:
 *                   type: object
 *                   properties:
 *                     owner:
 *                       type: string
 *                       description: Owner's wallet address.
 *                     mint:
 *                       type: string
 *                       description: Mint address of the item.
 *                     tokenAccount:
 *                       type: string
 *                       description: Token account address for the item.
 *                     itemSecret:
 *                       type: string
 *                       description: Secret key for the item associated with the item.
 *                     description:
 *                       type: string
 *                       description: Description of the item.
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   description: A descriptive error message about what is missing.
 *       500:
 *         description: Internal server error due to a failure in creating the item
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   description: Detailed error message explaining the server error.
 */
export async function createItemController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // Extract necessary data from request body
    const { description } = req.body;

    if (!req.user || !description) {
      throw new Error("Missing required fields");
    }

    const payer = await getSuiKeypairForUser(req.user.uid);

    console.log("Payer ", payer);

    // Call createScanner function
    const item = await createItem(payer, description);

    // Send success response with token metadata
    res.status(200).json({ success: true });
  } catch (error: any) {
    // Send error response
    console.error("Error creating device:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// /**
//  * @swagger
//  * /api/v1/item/delete/{mint}:
//  *   delete:
//  *     summary: Deletes an item by closing its mint account.
//  *     tags: [Item]
//  *     parameters:
//  *       - in: path
//  *         name: mint
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: The public key of the mint to be deleted.
//  *     responses:
//  *       200:
//  *         description: Item deleted successfully.
//  *       500:
//  *         description: Error deleting the item.
//  */
export async function deleteItemController(
  req: AuthRequest,
  res: Response
): Promise<any> {
  try {
    // Extract mint public key from URL parameters
    const { mint, account } = req.params;
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

    const payer = await getSuiKeypairForUser(req.user.uid);

    // Validate payer
    if (!payer) {
      return res.status(403).json({
        success: false,
        error: "User not authorized or payer keypair not found.",
      });
    }

    // Convert mint string to PublicKey
    const mintPublicKey = new PublicKey(mint);
    const accountPublicKey = new PublicKey(account);

    // Call deleteItem (close mint account)
    // await closeMintAccount(payer, mintPublicKey, accountPublicKey);

    res
      .status(200)
      .json({ success: true, message: "Item deleted successfully." });
  } catch (error: any) {
    console.error("Error deleting item:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * @swagger
 * /api/v1/item/user:
 *   get:
 *     summary: Fetch item information for a user
 *     tags: [Item]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of items associated with the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       mint:
 *                         type: string
 *                         description: Mint address of the item.
 *                       owner:
 *                         type: string
 *                         description: Owner's wallet address.
 *                       tokenAccount:
 *                         type: string
 *                         description: Token account address for the item.
 *                       tokenAmount:
 *                         type: integer
 *                         description: Amount of tokens.
 *                       metadata:
 *                         type: object
 *                         properties:
 *                           updateAuthority:
 *                             type: string
 *                             description: Authority allowed to update the metadata.
 *                           mint:
 *                             type: string
 *                             description: Mint address of the item.
 *                           name:
 *                             type: string
 *                             description: Name of the item.
 *                           symbol:
 *                             type: string
 *                             description: Symbol of the item.
 *                           uri:
 *                             type: string
 *                             description: URI pointing to the metadata of the item.
 *                           additionalMetadata:
 *                             type: array
 *                             items:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             description: Additional metadata associated with the scanner. Each entry is an array of two strings, the first being a key and the second its value.
 *                             example: [["item", "potatoes"]]
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
export async function handleFetchItemsForUser(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      // Assuming publicKey is the correct property for the wallet address
      throw new Error("Missing required fields");
    }

    const owner = await getSuiKeypairForUser(req.user.uid);

    // const items = await fetchItemsByOwner(owner); // Using publicKey from the user object

    res.status(200).json();
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleFetchItems(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const items = await fetchAllItems(); // Using publicKey from the user object

    res.status(200).json({ success: true, items });
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
