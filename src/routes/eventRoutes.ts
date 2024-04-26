import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createScannerTransactionController,
  getItemTransactionController,
  getTransactionController,
} from "../controllers/eventController";

const router = express.Router();

// Scanner endpoints
// router.post("/create", authMiddleware, createScannerController);
router.post("/scan", authMiddleware, createScannerTransactionController);

router.get('/items', authMiddleware, getItemTransactionController);  // Create an item transaction
router.get('/item/:address', authMiddleware, getTransactionController);  // Retrieve item transaction by some identifier

// router.get('/scanner', authMiddleware, getScannerTransactionController);
// router.get('/scanner/:id', authMiddleware, getTransactionController);

export default router;
