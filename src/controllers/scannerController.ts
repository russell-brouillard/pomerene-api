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
