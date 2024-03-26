import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createScannerController,
  createScannerTransactionController,
} from "../controllers/scannerController";

const router = express.Router();

// Scanner endpoints
// router.post("/create", authMiddleware, createScannerController);
router.post("/scan", authMiddleware, createScannerTransactionController);
router.post("/create", authMiddleware, createScannerController);

export default router;
