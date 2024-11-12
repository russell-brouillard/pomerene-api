import { Response } from "express";

import { AuthRequest } from "../middleware/authMiddleware";
import { getSuiKeypairForUser } from "../services/users/usersServices";
import {
  createScanner,
  deleteScanner,
  fetchScannersByOwner,
  fetchScannersLocationsByOwner,
} from "../services/sui/scannerService";


export async function createScannerController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { name, description, blobId } = req.body;

    console.log("Creating scanner with name:", name);
    console.log("Creating scanner with description:", description);
    console.log("Creating scanner with blobId:", blobId);

    if (!req.user) {
      throw new Error("Missing required fields");
    }

    const payer = await getSuiKeypairForUser(req.user.uid);

    const secret = await createScanner(payer, name, description, blobId);

    res.status(200).json({ success: true, secret });
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

    const owner = await getSuiKeypairForUser(req.user.uid);

    const scanners = await fetchScannersByOwner(owner); // Using publicKey from the user object

    res.status(200).json({ success: true, scanners });
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteScannerController(
  req: AuthRequest,
  res: Response
): Promise<any> {
  try {
    // Extract mint public key from URL parameters
    const { scannerObjectId } = req.params;

    if (!req.user) {
      return res
        .status(403)
        .json({ success: false, error: "User not authorized." });
    }

    const owner = await getSuiKeypairForUser(req.user.uid);

    const del = deleteScanner(owner, scannerObjectId);

    res.status(200).json({ success: true, message: del });
  } catch (error: any) {
    console.error("Error deleting item:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleFetchScannersLastLocation(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      // Assuming publicKey is the correct property for the wallet address
      throw new Error("Missing required fields");
    }

    const owner = await getSuiKeypairForUser(req.user.uid);

    const items = await fetchScannersLocationsByOwner(owner); // Using publicKey from the user object

    res.status(200).json(items);
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
