import { Request, Response } from "express";
import {
  createScanner,
  createScannerTransaction,
} from "../services/solana/scannerService";
import { AuthRequest } from "../middleware/authMiddleware";
import { getSolanaKeypairForUser } from "../services/users/usersServices";

/**
 * @swagger
 * /Scanner/create:
 *   post:
 *     summary: Create a new device and its corresponding token metadata
 *     tags: [Scanners]
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
export async function createScannerController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    console.log(req.user);

    if (!req.user) {
      throw new Error("Missing required fields");
    }

    const payer = await getSolanaKeypairForUser(req.user.uid);

    // Call createScanner function
    const accounts = await createScanner(payer);

    console.log("acocunts", accounts);

    // Send success response with token metadata
    res.status(200).json({ success: true, accounts });
  } catch (error: any) {
    // Send error response
    console.error("Error creating device:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

//note to self item secret key could be the signer for transfer of tokens from scanner to scanner
export async function createScannerTransactionController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    console.log("createScannerTransactionController", req.body);
    // Extract necessary data from request body
    const { scannerSecret, itemSecret, itemMint } = req.body;

    console.log(
      "createScannerTransactionController",
      scannerSecret,
      itemSecret,
      itemMint,
      req.user
    );

    if (!itemSecret || !scannerSecret || !itemMint || !req.user) {
      throw new Error("Missing required fields to scan item.");
    }

    const payer = await getSolanaKeypairForUser(req.user.uid);

    const response = await createScannerTransaction(
      payer,
      scannerSecret,
      itemSecret,
      itemMint
    );

    res.status(200).json(response);
  } catch (error: any) {
    // Send error response
    console.error("Error creating device:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
