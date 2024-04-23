import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createScannerTransactionController,
  getTransactionController,
} from "../controllers/eventController";

const router = express.Router();

// Scanner endpoints
// router.post("/create", authMiddleware, createScannerController);
router.post("/scan", authMiddleware, createScannerTransactionController);
router.get("/:address", authMiddleware, getTransactionController);

export default router;
