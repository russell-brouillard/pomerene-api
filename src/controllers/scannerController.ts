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
    console.log(req.user);

    const { description } = req.body;

    if (!req.user) {
      throw new Error("Missing required fields");
    }

    const payer = await getSolanaKeypairForUser(req.user.uid);

    const scanner = await createScanner(payer, description);


    // this is the scanner object that is returned
    // {
    //   "owner": "Fe839miamnUS6cY23JBr5K8dVD6aGErzuSJQX6eqwkzW",
    //   "mint": "9ecViYvsNrjydTWE3XTpGcgBgZz1DiNNh76DqKCyHeKU",
    //   "tokenAccount": "8UYjXs4bjNW8LHHqvWHjtrYn14buZ5NNvoFm3rGpG2Pp",
    //   "itemSecret": "9j1e3ZseyjWfCm2ZVZrG9GWFmaSvr9KVUsjxAkUx9Wyqjsy3empsAzcw7e7AvSuDNHHh2UsStbNDSs1KeoQQW8E",
    //   "description": "string"
    // }

    // Send success response with token metadata
    res.status(200).json({ success: true , scanner});
  } catch (error: any) {
    // Send error response
    console.error("Error creating device:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * @swagger
 * /api/v1/scanner/transaction:
 *   post:
 *     summary: Create a scanner transaction
 *     description: Creates a new scanner transaction with the provided details.
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
 *                 description: Secret key for the scanner.
 *               itemSecret:
 *                 type: string
 *                 description: Secret key for the item.
 *               message:
 *                 type: string
 *                 description: Message to include in the transaction.
 *     responses:
 *       200:
 *         description: Scanner transaction created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 transactionId:
 *                   type: string
 *                   description: The ID of the created transaction.
 *                 message:
 *                   type: string
 *                   description: A message related to the transaction creation.
 *       400:
 *         description: Missing required fields to scan item.
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
 *       500:
 *         description: Error creating the transaction.
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
