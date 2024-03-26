import { Request, Response } from "express";
import {
  createScanner,
  createScannerTransaction,
} from "../services/solana/scannerService";
import { AuthRequest } from "../middleware/authMiddleware";
import { getSolanaKeypairForUser } from "../services/users/usersServices";

/**
 * @swagger
 * /api/v1/scanner/create:
 *   post:
 *     summary: Create a new device and its corresponding token metadata
 *     tags: [Scanner]
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

    const accounts = await createScanner(payer);

    console.log("acocunts", accounts);

    // Send success response with token metadata
    res.status(200).json({ success: true });
  } catch (error: any) {
    // Send error response
    console.error("Error creating device:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}


/**
 * @swagger
 * /api/v1/scanner/scan:
 *   post:
 *     summary: Create a scanner transaction
 *     tags: [Scanner]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scannerSecret
 *               - itemSecret
 *               - message
 *             properties:
 *               scannerSecret:
 *                 type: string
 *                 description: Secret key of the scanner
 *               itemSecret:
 *                 type: string
 *                 description: Secret key of the item to be scanned
 *               message:
 *                 type: string
 *                 description: A message associated with the scanning action
 *     responses:
 *       '200':
 *         description: Scanner transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactionId:
 *                   type: string
 *                   description: The ID of the created transaction
 *                 message:
 *                   type: string
 *                   description: A message associated with the transaction
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Timestamp of the transaction
 *       '400':
 *         description: Missing required fields to scan item
 *       '500':
 *         description: Server error
 */
export async function createScannerTransactionController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // Extract necessary data from request body
    const { scannerSecret, itemSecret, message } = req.body;

    if (!itemSecret || !scannerSecret || !message || !req.user) {
      throw new Error("Missing required fields to scan item.");
    }

    const payer = await getSolanaKeypairForUser(req.user.uid);

    const response = await createScannerTransaction(
      payer,
      scannerSecret,
      itemSecret,
      message
    );

    res.status(200).json(response);
  } catch (error: any) {
    // Send error response
    console.error("Error creating device:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
