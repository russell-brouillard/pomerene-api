import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { getSuiKeypairForUser } from "../services/users/usersServices";
import {
  createSuiScannerTransaction,
  validateGPSDataFromNFT,
} from "../services/sui/eventService";

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

    const payer = await getSuiKeypairForUser(req.user.uid);

    // const response = await createScannerTransaction(
    //   payer,
    //   scannerSecret,
    //   itemSecret,
    //   message
    // );

    res.status(200).json();
  } catch (error: any) {
    // Send error response
    console.error("Error creating device:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createSuiScannerTransactionController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // Extract necessary data from request body
    const { scannerSecret, itemSecret, message } = req.body;

    if (!itemSecret || !scannerSecret || !message) {
      throw new Error("Missing required fields to scan item.");
    }

    const response = await createSuiScannerTransaction(
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

export async function validateSuiScannerTransactionController(
  req: Request,
  res: Response
) {
  try {
    const { nftId } = req.body;
    const isValid = await validateGPSDataFromNFT(nftId);
    res.status(200).json(isValid);
  } catch (error: any) {
    console.error(error.message);
  }
}

/**
 * @swagger
 * /api/v1/event/last-transaction/{mint}:
 *   get:
 *     summary: Get last transaction for a specified SPL token mint
 *     description: Retrieves the last transaction made with a specified SPL token mint address.
 *     tags: [Event]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mint
 *         required: true
 *         schema:
 *           type: string
 *         description: The mint address of the SPL token to retrieve the last transaction for.
 *     responses:
 *       200:
 *         description: Successfully retrieved the last transaction.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 transactions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       mint:
 *                         type: string
 *                         description: The mint address this token account is associated with.
 *                       owner:
 *                         type: string
 *                         description: Owner of this token account.
 *                       tokenAccount:
 *                         type: string
 *                         description: The token account address.
 *                       tokenAmount:
 *                         type: integer
 *                         description: The token balance.
 *                       metadata:
 *                         type: object
 *                         description: Metadata associated with the token.
 *                       lastTransaction:
 *                         type: object
 *                         description: Details of the last transaction.
 *       400:
 *         description: Missing required fields.
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
 *         description: Error retrieving the transaction.
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
 */
export async function getTransactionController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { address } = req.params;

    if (!req.user || !address) {
      throw new Error("Missing required fields to scan item.");
    }

    // const response = await fetchTransactions(address);

    res.status(200).json();
  } catch (error: any) {
    console.error("Error creating device:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getItemTransactionController(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.user) {
      // Assuming publicKey is the correct property for the wallet address
      throw new Error("Missing required fields");
    }

    const owner = await getSuiKeypairForUser(req.user.uid);

    // const transaction = await fetchItemsTransaction(owner);

    res.status(200).json();
  } catch (error) {
    console.error("Failed to fetch scanner transaction:", error);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
}

export async function getScannerTransactionController(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.user) {
      // Assuming publicKey is the correct property for the wallet address
      throw new Error("Missing required fields");
    }

    const owner = await getSuiKeypairForUser(req.user.uid);

    // const transaction = await fetchScannersTransaction(owner);

    res.status(200).json();
  } catch (error) {
    console.error("Failed to fetch scanner transaction:", error);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
}
