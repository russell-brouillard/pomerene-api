import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { getSuiKeypairForUser } from "../services/users/usersServices";

import {
  createItem,
  deleteItem,
  fetchItemsByOwner,
  fetchItemsLocationsByOwner,
  fetchLocationsByItem,
  getQrCode,
} from "../services/sui/itemService";

export async function createItemController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // Extract necessary data from request body
    const { name, description, blobId } = req.body;

    if (!req.user || !description || !name) {
      throw new Error("Missing required fields");
    }

    const payer = await getSuiKeypairForUser(req.user.uid);

    // Call createScanner function
    const item = await createItem(payer, name, description, blobId);

    // Send success response with token metadata
    res.status(200).json({ success: true, item });
  } catch (error: any) {
    // Send error response
    console.error("Error creating device:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getQrCodeController(
  req: AuthRequest,
  res: Response
): Promise<any> {
  try {
    const { itemObjectId } = req.params;

    if (!req.user) {
      return res
        .status(403)
        .json({ success: false, error: "User not authorized." });
    }

    const owner = await getSuiKeypairForUser(req.user.uid);

    const item = await getQrCode(itemObjectId, owner);

    res.status(200).json({ success: true, item });
  } catch (error: any) {
    console.error("Error fetching item:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteItemController(
  req: AuthRequest,
  res: Response
): Promise<any> {
  try {
    // Extract mint public key from URL parameters
    const { itemObjectId } = req.params;

    if (!req.user) {
      return res
        .status(403)
        .json({ success: false, error: "User not authorized." });
    }

    const owner = await getSuiKeypairForUser(req.user.uid);

    const del = deleteItem(owner, itemObjectId);

    res.status(200).json({ success: true, message: del });
  } catch (error: any) {
    console.error("Error deleting item:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

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

    const items = await fetchItemsByOwner(owner); // Using publicKey from the user object

    res.status(200).json(items);
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleFetchItemsLastLocation(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      // Assuming publicKey is the correct property for the wallet address
      throw new Error("Missing required fields");
    }

    const owner = await getSuiKeypairForUser(req.user.uid);

    const items = await fetchItemsLocationsByOwner(owner); // Using publicKey from the user object

    res.status(200).json(items);
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function fetchLocationsByItemController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { itemPublicKey } = req.params;
    if (!req.user) {
      // Assuming publicKey is the correct property for the wallet address
      throw new Error("Missing required fields");
    }

    const locations = await fetchLocationsByItem(itemPublicKey); // Using publicKey from the user object

    res.status(200).json(locations);
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function fetchGPSByItemController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { itemPublicKey } = req.params;
    if (!req.user) {
      // Assuming publicKey is the correct property for the wallet address
      throw new Error("Missing required fields");
    }

    const locations = await fetchLocationsByItem(itemPublicKey); // Using publicKey from the user object

    res.status(200).json(locations);
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function bulkUploadController(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error("User not authenticated.");
    }

    const items = req.body.items; // Expecting an array of items with name and description

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Invalid payload: 'items' must be a non-empty array.");
    }

    console.log("items ", items);

    const payer = await getSuiKeypairForUser(req.user.uid);

    const createdItems = [];
    const errors = [];

    for (const [index, item] of items.entries()) {
      const { name, description, blobId } = item;

      // Validate item fields
      if (!name || !description) {
        errors.push({
          index,
          error: "Missing required fields: 'name' or 'description'.",
        });
        continue;
      }

      try {
        // Call createItem function
        const createdItem = await createItem(payer, name, description, '');
        createdItems.push(createdItem);
      } catch (err: any) {
        console.error(`Error creating item at index ${index}:`, err.message);
        errors.push({ index, error: err.message });
      }
    }

    // Send response
    res.status(200).json({
      success: errors.length === 0,
      createdItems,
      errors,
    });
  } catch (error: any) {
    console.error("Error in bulk upload:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}
