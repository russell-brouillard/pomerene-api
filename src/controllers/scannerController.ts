import { Request, Response } from "express";
import { Keypair } from "@solana/web3.js";
import {
  createScanner,
  createScannerTransaction,
} from "../services/solana/scannerService";
import { AuthRequest } from "../middleware/authMiddleware";
import { getSolanaKeypairForUser } from "../services/users/usersServices";
import bs58 from "bs58";

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
    const tokenMetadata = await createScanner(
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

export async function createScannerTransactionController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // Extract necessary data from request body
    const { itemSecretKey, scannerSecretKey } = req.body;

    console.log(
      "createScannerTransactionController",
      itemSecretKey,
      scannerSecretKey,
      req.user
    );

    if (!itemSecretKey || !scannerSecretKey || !req.user) {
      throw new Error("Missing required fields");
    }

    const payer = await getSolanaKeypairForUser(req.user.uid);

    console.log("keypair payer", payer);

    const itemSecretKeyDecoded = bs58.decode(itemSecretKey);

    // Recreate the keypair using the private key Uint8Array
    const itemKeypair = Keypair.fromSecretKey(itemSecretKeyDecoded);

    const scannerSecretKeyDecoded = bs58.decode(scannerSecretKey);

    // Recreate the keypair using the private key Uint8Array
    const scannerKeypair = Keypair.fromSecretKey(scannerSecretKeyDecoded);

    const response = await createScannerTransaction(
      payer,
      scannerKeypair,
      itemKeypair,
    );
    // Send success response with token metadata
    res.status(200).json(response);
  } catch (error: any) {
    // Send error response
    console.error("Error creating device:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
