import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createScannerController,
  deleteScannerController,
  fetchEventsByScannerController,
  handleFetchScannerForUser,
  handleFetchScannersLastLocation,
} from "../controllers/scannerController";

const router = express.Router();

router.delete("/:scannerObjectId", authMiddleware, deleteScannerController);
router.post("/create", authMiddleware, createScannerController);
router.get("/user", authMiddleware, handleFetchScannerForUser);
router.get("/map", authMiddleware, handleFetchScannersLastLocation);

router.get("/:scannerPublicKey", authMiddleware, fetchEventsByScannerController);

export default router;
