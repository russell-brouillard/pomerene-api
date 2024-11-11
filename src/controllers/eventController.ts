import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { getSuiKeypairForUser } from "../services/users/usersServices";
import {
  createSuiScannerTransaction,
  deleteEvent,
  fetchEventsByOwner,
  validateGPSDataFromNFT,
} from "../services/sui/eventService";

export async function createSuiScannerTransactionController(
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

    const response = await createSuiScannerTransaction(
      scannerSecret,
      itemSecret,
      payer,
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

export async function fetchEventsForUersController(
  req: AuthRequest,
  res: Response
) {
  try {
    // Fetch events for a user

    if (!req.user) {
      throw new Error("User not authenticated");
    }

    const payer = await getSuiKeypairForUser(req.user.uid);

    const events = await fetchEventsByOwner(payer);

    res.status(200).json({ success: true, events });
  } catch (error: any) {
    console.error(error.message);
  }
}

export async function deleteEventForUersController(
  req: AuthRequest,
  res: Response
) {
  try {
    const { eventId } = req.params;

    if (!req.user) {
      throw new Error("User not authenticated");
    }

    const payer = await getSuiKeypairForUser(req.user.uid);

    const events = await deleteEvent(payer, eventId);

    res.status(200).json({ success: true, events });
  } catch (error: any) {
    console.error(error.message);
  }
}
