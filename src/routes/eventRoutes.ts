import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createSuiScannerTransactionController,
  validateSuiScannerTransactionController,
} from "../controllers/eventController";

const router = express.Router();

router.post("/sui/scan", authMiddleware, createSuiScannerTransactionController);
router.post("/sui/validate", validateSuiScannerTransactionController);

export default router;
