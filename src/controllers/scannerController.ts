import { Response } from "express";
import { createScanner, fetchScanner } from "../services/solana/scannerService";
import { AuthRequest } from "../middleware/authMiddleware";
import { getSolanaKeypairForUser } from "../services/users/usersServices";

/**
 * @swagger
 * /api/v1/scanner/create:
 *   post:
 *     summary: Create a new scanner
 *     description: Creates a new scanner entity for the authenticated user on the Solana blockchain.
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
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 description: The description of the scanner being created.
 *     responses:
 *       200:
 *         description: Scanner created successfully. Returns the scanner object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 scanner:
 *                   type: object
 *                   properties:
 *                     owner:
 *                       type: string
 *                       description: Owner's wallet address.
 *                     mint:
 *                       type: string
 *                       description: Mint address of the scanner.
 *                     tokenAccount:
 *                       type: string
 *                       description: Token account address for the scanner.
 *                     scannerSecret:
 *                       type: string
 *                       description: Secret key for the item associated with the scanner.
 *                     description:
 *                       type: string
 *                       description: Description of the scanner.
 *       400:
 *         description: Missing required fields - typically indicates the user is not authenticated or missing description.
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
 *                   example: Missing required fields
 *       500:
 *         description: Error creating the scanner.
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
 *                   description: Detailed error message.
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
export async function createScannerController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { description } = req.body;

    if (!req.user) {
      throw new Error("Missing required fields");
    }

    const payer = await getSolanaKeypairForUser(req.user.uid);

    const scanner = await createScanner(payer, description);

    res.status(200).json({ success: true, scanner });
  } catch (error: any) {
    console.error("Error creating device:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * @swagger
 * /api/v1/scanner/user:
 *   get:
 *     summary: Fetch item information for a user
 *     tags: [Scanner]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of scanners associated with the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 scanners:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       mint:
 *                         type: string
 *                         description: Mint address of the scanner.
 *                       owner:
 *                         type: string
 *                         description: Owner's wallet address.
 *                       tokenAccount:
 *                         type: string
 *                         description: Token account address for the scanner.
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
 *                             description: Mint address of the scanner.
 *                           name:
 *                             type: string
 *                             description: Name of the scanner.
 *                           symbol:
 *                             type: string
 *                             description: Symbol of the scanner.
 *                           uri:
 *                             type: string
 *                             description: URI pointing to the metadata of the scanner.
 *                           additionalMetadata:
 *                             type: array
 *                             items:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             description: Additional metadata associated with the scanner. Each entry is an array of two strings, the first being a key and the second its value.
 *                             example: [["scanner", "jTW2SfoRecY4eaShFpq5M7qEFUVSEPaS5drhyj7Tnk54S2A6yAPu8r5qxWrormLd1Anbw5aBYhNDe3eebPuXVHC"]]
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
export async function handleFetchScannerForUser(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error("Missing required fields");
    }

    const owner = await getSolanaKeypairForUser(req.user.uid);

    const scanners = await fetchScanner(owner); // Using publicKey from the user object

    res.status(200).json({ success: true, scanners });
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
