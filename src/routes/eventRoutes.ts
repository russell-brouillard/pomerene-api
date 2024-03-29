import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createScannerTransactionController,
  getLastTransactionController,
} from "../controllers/eventController";

const router = express.Router();

// Scanner endpoints
// router.post("/create", authMiddleware, createScannerController);
router.post("/scan", authMiddleware, createScannerTransactionController);
router.get("/last-transaction/:mint", authMiddleware, getLastTransactionController);

export default router;
