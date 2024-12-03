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
      res
        .status(401)
        .json({ success: false, error: "User not authenticated." });
      return;
    }

    const items = req.body.items;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: "Invalid payload: 'items' must be a non-empty array.",
      });
      return;
    }

    console.log("Received items:", items);

    const payer = await getSuiKeypairForUser(req.user.uid);

    const createdItems = [];
    const errors = [];

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const { name, description } = item;

      // Validate item fields
      if (!name || !description) {
        errors.push({
          index,
          error: "Missing required fields: 'name' or 'description'.",
        });
        continue;
      }

      const maxRetries = 3;
      const initialDelay = 1000; // 1 second

      let attempt = 0;
      let success = false;

      while (attempt < maxRetries && !success) {
        try {
          attempt++;
          const createdItemAddress = await createItem(
            payer,
            name,
            description,
            ""
          );
          createdItems.push({ index, createdItem: createdItemAddress });
          success = true;
        } catch (err: any) {
          console.error(
            `Error creating item at index ${index}, attempt ${attempt}:`,
            err.message || err
          );
          if (attempt >= maxRetries) {
            errors.push({ index, error: err.message || err });
          } else {
            const delay = initialDelay * Math.pow(2, attempt - 1);
            console.warn(`Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    }

    const overallSuccess = errors.length === 0;

    res.status(200).json({
      success: overallSuccess,
      createdItems,
      errors,
    });
  } catch (error: any) {
    console.error("Error in bulk upload:", error.message || error);
    res.status(500).json({ success: false, error: error.message || error });
  }
}
