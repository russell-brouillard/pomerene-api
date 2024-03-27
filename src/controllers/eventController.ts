import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";

import { getSolanaKeypairForUser } from "../services/users/usersServices";
import { createScannerTransaction } from "../services/solana/eventService";

/**
 * @swagger
 * /api/v1/event/scan:
 *   post:
 *     summary: Create a scanner transaction
 *     description: Creates a new scanner transaction with the provided details.
 *     tags: [Event]
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
